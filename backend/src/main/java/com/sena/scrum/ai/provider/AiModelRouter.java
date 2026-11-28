package com.sena.scrum.ai.provider;

import com.sena.scrum.ai.config.AiProperties;
import com.sena.scrum.ai.model.AiMode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiModelRouter {

    private final AiProperties properties;
    private final GeminiProviderAdapter geminiAdapter;
    private final OpenAiCompatibleProviderAdapter openAiCompatibleAdapter;

    public AiProviderAdapter resolveAdapter() {
        String configured = properties.getProvider() != null ? properties.getProvider().toLowerCase(Locale.ROOT) : "auto";
        return switch (configured) {
            case "gemini" -> geminiAdapter;
            case "groq", "openai", "ollama" -> openAiCompatibleAdapter;
            default -> {
                if (geminiAdapter.isConfigured()) yield geminiAdapter;
                if (openAiCompatibleAdapter.isConfigured()) yield openAiCompatibleAdapter;
                yield geminiAdapter;
            }
        };
    }

    public boolean isAnyProviderConfigured() {
        return geminiAdapter.isConfigured() || openAiCompatibleAdapter.isConfigured();
    }

    public boolean isDeepReasoningMode(AiMode mode) {
        return mode == AiMode.DEEP || mode == AiMode.DOCUMENTS;
    }

    public String resolveModelForRequest(AiMode requestedMode, AiMode effectiveMode) {
        AiProviderAdapter adapter = resolveAdapter();
        // Reserve deep model (Qwen3 4B) strictly for explicit DEEP mode; AUTO and FAST use fast model (Qwen2.5 3B)
        boolean useDeep = requestedMode == AiMode.DEEP;
        return adapter.resolveModel(useDeep);
    }

    public AiMode resolveEffectiveMode(AiMode requestedMode, String prompt, boolean hasAttachments) {
        if (requestedMode != null && requestedMode != AiMode.AUTO) {
            return requestedMode;
        }
        if (hasAttachments) {
            return AiMode.DOCUMENTS;
        }
        String lower = prompt != null ? prompt.toLowerCase(Locale.ROOT) : "";
        if (lower.contains("crea ") || lower.contains("crear ") || lower.contains("agrega ")
                || lower.contains("genera una historia") || lower.contains("divide ")
                || lower.contains("prepara un sprint") || lower.contains("actualiza ")) {
            return AiMode.AGENT;
        }
        if (lower.contains("cómo ") || lower.contains("como ") || lower.contains("qué es")
                || lower.contains("que es") || lower.contains("enséñame") || lower.contains("explica")) {
            return AiMode.TUTOR;
        }
        if (lower.contains("analiza") || lower.contains("análisis profundo") || lower.contains("riesgo")
                || lower.contains("métrica") || lower.contains("cuello") || lower.contains("backlog")
                || lower.contains("retrospectiva") || lower.contains("capacidad") || lower.contains("planifica")
                || lower.contains("informe")) {
            return AiMode.DEEP;
        }
        return AiMode.FAST;
    }

    public AiProviderResponse executeWithRetry(AiProviderRequest request, AiMode mode) throws AiProviderException {
        AiProviderAdapter adapter = resolveAdapter();
        boolean deep = isDeepReasoningMode(mode);
        if (request.getModel() == null || request.getModel().isBlank()) {
            request.setModel(adapter.resolveModel(deep));
        }

        int maxAttempts = 1 + Math.max(0, properties.getMaxRetries());
        AiProviderException lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return adapter.generate(request);
            } catch (AiProviderException ex) {
                lastError = ex;
                if (ex.getStatusCode() == 401 || ex.getStatusCode() == 403 || ex.getStatusCode() == 429
                        || "AI_PROVIDER_NOT_CONFIGURED".equals(ex.getCode())) {
                    throw ex;
                }
                log.warn("[AiModelRouter] Attempt {}/{} failed ({}): {}", attempt, maxAttempts, ex.getCode(), ex.getMessage());
            }
        }
        throw lastError != null ? lastError : new AiProviderException("Error inesperado del router IA.", 503, "AI_ROUTER_ERROR");
    }

    public void streamExecute(AiProviderRequest request, AiMode mode, Consumer<String> onDelta, Runnable onComplete) throws AiProviderException {
        streamExecute(request, mode, onDelta, onComplete, () -> false);
    }

    public void streamExecute(
            AiProviderRequest request,
            AiMode mode,
            Consumer<String> onDelta,
            Runnable onComplete,
            java.util.function.BooleanSupplier isCancelled
    ) throws AiProviderException {
        streamExecute(request, mode, onDelta, onComplete, isCancelled, null);
    }

    public void streamExecute(
            AiProviderRequest request,
            AiMode mode,
            Consumer<String> onDelta,
            Runnable onComplete,
            java.util.function.BooleanSupplier isCancelled,
            Consumer<AiProviderAdapter.StreamMetrics> onMetrics
    ) throws AiProviderException {
        AiProviderAdapter adapter = resolveAdapter();
        boolean deep = isDeepReasoningMode(mode);
        if (request.getModel() == null || request.getModel().isBlank()) {
            request.setModel(adapter.resolveModel(deep));
        }
        adapter.streamGenerate(request, onDelta, onComplete, isCancelled, onMetrics);
    }
}
