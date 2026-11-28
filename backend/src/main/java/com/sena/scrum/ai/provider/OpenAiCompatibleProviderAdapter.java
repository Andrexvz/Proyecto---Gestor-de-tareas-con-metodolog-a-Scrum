package com.sena.scrum.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sena.scrum.ai.config.AiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/**
 * Provider-agnostic adapter for OpenAI-compatible APIs:
 * Groq (https://api.groq.com/openai/v1), OpenAI (https://api.openai.com/v1), and Ollama (http://localhost:11434/v1).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiCompatibleProviderAdapter implements AiProviderAdapter {

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private volatile String lastLoadedOllamaModel;

    public String getActiveSubProvider() {
        String p = properties.getProvider() != null ? properties.getProvider().toLowerCase() : "auto";
        if ("groq".equals(p) || ("auto".equals(p) && isValidKey(properties.getGroqApiKey()))) return "groq";
        if ("openai".equals(p) || ("auto".equals(p) && isValidKey(properties.getOpenaiApiKey()))) return "openai";
        if ("ollama".equals(p) || "true".equalsIgnoreCase(properties.getOllamaEnabled())) return "ollama";
        return "groq";
    }

    @Override
    public String getProviderName() {
        return getActiveSubProvider();
    }

    @Override
    public boolean isConfigured() {
        String sub = getActiveSubProvider();
        return switch (sub) {
            case "groq" -> isValidKey(properties.getGroqApiKey());
            case "openai" -> isValidKey(properties.getOpenaiApiKey());
            case "ollama" -> "true".equalsIgnoreCase(properties.getOllamaEnabled());
            default -> false;
        };
    }

    @Override
    public String resolveModel(boolean deepReasoning) {
        return switch (getActiveSubProvider()) {
            case "groq" -> deepReasoning ? properties.getGroqModelDeep() : properties.getGroqModelFast();
            case "openai" -> deepReasoning ? properties.getOpenaiModelDeep() : properties.getOpenaiModelFast();
            case "ollama" -> deepReasoning ? properties.getOllamaModelDeep() : properties.getOllamaModelFast();
            default -> properties.getGroqModelFast();
        };
    }

    @Override
    public AiProviderResponse generate(AiProviderRequest request) throws AiProviderException {
        ensureConfigured();
        String sub = getActiveSubProvider();
        String model = request.getModel() != null ? request.getModel() : resolveModel(false);
        String url = resolveBaseUrl(sub) + "/chat/completions";

        long start = System.currentTimeMillis();
        try {
            if ("ollama".equals(sub)) {
                return generateOllamaNative(request, model, start);
            }
            String bodyJson = objectMapper.writeValueAsString(buildPayload(request, model, false));
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8));

            String apiKey = resolveApiKey(sub);
            if (apiKey != null && !apiKey.isBlank()) {
                reqBuilder.header("Authorization", "Bearer " + apiKey);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            handleErrorStatus(response.statusCode(), sub);

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            JsonNode usage = root.path("usage");
            int promptTokens = usage.path("prompt_tokens").asInt(0);
            int completionTokens = usage.path("completion_tokens").asInt(0);

            return AiProviderResponse.builder()
                    .content(content)
                    .provider(sub)
                    .model(model)
                    .promptTokens(promptTokens)
                    .completionTokens(completionTokens)
                    .totalTokens(promptTokens + completionTokens)
                    .latencyMs(System.currentTimeMillis() - start)
                    .build();
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[OpenAiCompatibleAdapter:{}] Request failed: {}", sub, e.getMessage());
            throw new AiProviderException("Error al comunicarse con el proveedor " + sub + ".", 503, "AI_PROVIDER_ERROR", e);
        }
    }

    @Override
    public void streamGenerate(AiProviderRequest request, Consumer<String> onDelta, Runnable onComplete) throws AiProviderException {
        streamGenerate(request, onDelta, onComplete, () -> false, null);
    }

    @Override
    public void streamGenerate(
            AiProviderRequest request,
            Consumer<String> onDelta,
            Runnable onComplete,
            BooleanSupplier isCancelled
    ) throws AiProviderException {
        streamGenerate(request, onDelta, onComplete, isCancelled, null);
    }

    @Override
    public void streamGenerate(
            AiProviderRequest request,
            Consumer<String> onDelta,
            Runnable onComplete,
            BooleanSupplier isCancelled,
            Consumer<StreamMetrics> onMetrics
    ) throws AiProviderException {
        ensureConfigured();
        String sub = getActiveSubProvider();
        String model = request.getModel() != null ? request.getModel() : resolveModel(false);
        if ("ollama".equals(sub)) {
            streamOllamaNative(request, model, onDelta, onComplete, isCancelled, onMetrics);
            return;
        }
        String url = resolveBaseUrl(sub) + "/chat/completions";
        int timeoutSec = (request.getMaxTokens() > 0 && request.getMaxTokens() <= 900)
                ? Math.max(15, properties.getFastTimeoutSeconds())
                : Math.max(30, properties.getTimeoutSeconds());

        try {
            String bodyJson = objectMapper.writeValueAsString(buildPayload(request, model, true, sub));
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(timeoutSec))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8));

            String apiKey = resolveApiKey(sub);
            if (apiKey != null && !apiKey.isBlank()) {
                reqBuilder.header("Authorization", "Bearer " + apiKey);
            }

            HttpResponse<java.io.InputStream> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 400) {
                try (var errStream = response.body()) {
                    // drain quietly
                } catch (Exception ignored) {}
                handleErrorStatus(response.statusCode(), sub);
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (Thread.currentThread().isInterrupted() || (isCancelled != null && isCancelled.getAsBoolean())) {
                        log.debug("[OpenAiCompatibleAdapter:{}] Stream cancelled by client", sub);
                        break;
                    }
                    if (!line.startsWith("data:")) continue;
                    String json = line.substring(5).trim();
                    if (json.isEmpty()) continue;
                    if ("[DONE]".equals(json)) {
                        break;
                    }
                    try {
                        JsonNode root = objectMapper.readTree(json);
                        JsonNode deltaNode = root.path("choices").path(0).path("delta");
                        String delta = deltaNode.path("content").asText("");
                        if (!delta.isEmpty()) {
                            onDelta.accept(delta);
                        }
                    } catch (Exception parseEx) {
                        log.debug("[OpenAiCompatibleAdapter:{}] Ignored malformed SSE chunk: {}", sub, parseEx.getMessage());
                    }
                }
            }
            if (isCancelled == null || !isCancelled.getAsBoolean()) {
                onComplete.run();
            }
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            if (isCancelled != null && isCancelled.getAsBoolean()) {
                log.debug("[OpenAiCompatibleAdapter:{}] Stream aborted cleanly", sub);
                return;
            }
            log.warn("[OpenAiCompatibleAdapter:{}] Stream failed: {}", sub, e.getMessage());
            throw new AiProviderException("Error de streaming con el proveedor " + sub + ".", 503, "AI_STREAM_ERROR", e);
        }
    }

    private AiProviderResponse generateOllamaNative(AiProviderRequest request, String model, long start) throws Exception {
        unloadOtherOllamaModelIfNeeded(model);
        String url = resolveOllamaNativeBase() + "/api/chat";
        String bodyJson = objectMapper.writeValueAsString(buildOllamaNativePayload(request, model, false));
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(Math.max(30, properties.getTimeoutSeconds())))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        handleErrorStatus(response.statusCode(), "ollama");
        lastLoadedOllamaModel = model;

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("message").path("content").asText("");
        int promptTokens = root.path("prompt_eval_count").asInt(0);
        int completionTokens = root.path("eval_count").asInt(0);

        return AiProviderResponse.builder()
                .content(content)
                .provider("ollama")
                .model(model)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(promptTokens + completionTokens)
                .latencyMs(System.currentTimeMillis() - start)
                .build();
    }

    private void streamOllamaNative(
            AiProviderRequest request,
            String model,
            Consumer<String> onDelta,
            Runnable onComplete,
            BooleanSupplier isCancelled,
            Consumer<StreamMetrics> onMetrics
    ) throws AiProviderException {
        unloadOtherOllamaModelIfNeeded(model);
        String url = resolveOllamaNativeBase() + "/api/chat";
        int timeoutSec = (request.getMaxTokens() > 0 && request.getMaxTokens() <= 900)
                ? Math.max(15, properties.getFastTimeoutSeconds())
                : Math.max(30, properties.getTimeoutSeconds());

        try {
            String bodyJson = objectMapper.writeValueAsString(buildOllamaNativePayload(request, model, true));
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(timeoutSec))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<java.io.InputStream> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 400) {
                try (var errStream = response.body()) {
                    // drain quietly
                } catch (Exception ignored) {}
                handleErrorStatus(response.statusCode(), "ollama");
            }
            lastLoadedOllamaModel = model;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (Thread.currentThread().isInterrupted() || (isCancelled != null && isCancelled.getAsBoolean())) {
                        log.debug("[OllamaNative] Stream cancelled by client, closing body");
                        response.body().close();
                        break;
                    }
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;
                    try {
                        JsonNode root = objectMapper.readTree(trimmed);
                        String delta = root.path("message").path("content").asText("");
                        if (!delta.isEmpty()) {
                            onDelta.accept(delta);
                        }
                        if (root.path("done").asBoolean(false)) {
                            if (onMetrics != null) {
                                long loadMs = root.path("load_duration").asLong(0L) / 1_000_000L;
                                long evalCount = root.path("eval_count").asLong(0L);
                                long evalNs = root.path("eval_duration").asLong(0L);
                                double tps = evalNs > 0 ? (evalCount / (evalNs / 1_000_000_000.0)) : 0.0;
                                onMetrics.accept(new StreamMetrics(loadMs, evalCount, Math.round(tps * 100.0) / 100.0));
                            }
                            break;
                        }
                    } catch (Exception parseEx) {
                        log.debug("[OllamaNative] Ignored malformed NDJSON line: {}", parseEx.getMessage());
                    }
                }
            }
            if (isCancelled == null || !isCancelled.getAsBoolean()) {
                onComplete.run();
            }
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            if (isCancelled != null && isCancelled.getAsBoolean()) {
                log.debug("[OllamaNative] Stream aborted cleanly");
                return;
            }
            log.warn("[OllamaNative] Stream failed: {}", e.getMessage());
            throw new AiProviderException("Error de streaming con Ollama.", 503, "AI_STREAM_ERROR", e);
        }
    }

    private void unloadOtherOllamaModelIfNeeded(String targetModel) {
        String prev = lastLoadedOllamaModel;
        if (prev == null || prev.equals(targetModel)) return;
        try {
            String url = resolveOllamaNativeBase() + "/api/generate";
            String payload = objectMapper.writeValueAsString(Map.of("model", prev, "keep_alive", 0));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();
            httpClient.send(req, HttpResponse.BodyHandlers.discarding());
            log.info("[OllamaMemory] Unloaded previous model {} before loading {}", prev, targetModel);
        } catch (Exception e) {
            log.debug("[OllamaMemory] Could not unload {}: {}", prev, e.getMessage());
        }
    }

    private String resolveOllamaNativeBase() {
        String base = properties.getOllamaBaseUrl() != null ? properties.getOllamaBaseUrl().trim() : "http://localhost:11434/v1";
        if (base.endsWith("/v1")) {
            return base.substring(0, base.length() - 3);
        }
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private Map<String, Object> buildOllamaNativePayload(AiProviderRequest request, String model, boolean stream) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("stream", stream);
        payload.put("keep_alive", properties.getOllamaKeepAlive() != null ? properties.getOllamaKeepAlive() : "15m");
        if (request.isDisableThinking()) {
            payload.put("think", false);
        }
        if (request.isJsonMode() && !stream) {
            payload.put("format", "json");
        }

        Map<String, Object> options = new LinkedHashMap<>();
        options.put("temperature", request.getTemperature() > 0 ? request.getTemperature() : 0.35);
        options.put("num_thread", Math.max(2, properties.getOllamaNumThread()));
        int ctx = request.getNumCtx() > 0 ? request.getNumCtx() : properties.getOllamaNumCtxFast();
        options.put("num_ctx", ctx);
        if (request.getMaxTokens() > 0) {
            options.put("num_predict", request.getMaxTokens());
        }
        payload.put("options", options);

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        if (request.getMessages() != null) {
            for (AiProviderRequest.AiMessage msg : request.getMessages()) {
                String role = "assistant".equalsIgnoreCase(msg.getRole()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", msg.getContent() != null ? msg.getContent() : ""));
            }
        }
        payload.put("messages", messages);
        return payload;
    }

    private Map<String, Object> buildPayload(AiProviderRequest request, String model, boolean stream) {
        return buildPayload(request, model, stream, getActiveSubProvider());
    }

    private Map<String, Object> buildPayload(AiProviderRequest request, String model, boolean stream, String sub) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("stream", stream);
        payload.put("temperature", request.getTemperature() > 0 ? request.getTemperature() : 0.4);
        if (request.getMaxTokens() > 0) {
            payload.put("max_tokens", request.getMaxTokens());
        }
        if (request.isJsonMode() && !stream) {
            payload.put("response_format", Map.of("type", "json_object"));
        }
        if ("ollama".equals(sub)) {
            payload.put("keep_alive", properties.getOllamaKeepAlive() != null ? properties.getOllamaKeepAlive() : "15m");
        }

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        if (request.getMessages() != null) {
            for (AiProviderRequest.AiMessage msg : request.getMessages()) {
                String role = "assistant".equalsIgnoreCase(msg.getRole()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", msg.getContent() != null ? msg.getContent() : ""));
            }
        }
        payload.put("messages", messages);
        return payload;
    }

    private void ensureConfigured() throws AiProviderException {
        if (!isConfigured()) {
            throw new AiProviderException(
                    "El proveedor " + getActiveSubProvider() + " no tiene credenciales configuradas.",
                    503,
                    "AI_PROVIDER_NOT_CONFIGURED"
            );
        }
    }

    private String resolveBaseUrl(String sub) {
        return switch (sub) {
            case "groq" -> properties.getGroqBaseUrl();
            case "openai" -> properties.getOpenaiBaseUrl();
            case "ollama" -> properties.getOllamaBaseUrl();
            default -> properties.getGroqBaseUrl();
        };
    }

    private String resolveApiKey(String sub) {
        return switch (sub) {
            case "groq" -> properties.getGroqApiKey();
            case "openai" -> properties.getOpenaiApiKey();
            default -> null;
        };
    }

    private boolean isValidKey(String key) {
        return key != null && !key.isBlank() && !key.startsWith("MY_");
    }

    private void handleErrorStatus(int status, String sub) throws AiProviderException {
        if (status >= 200 && status < 300) return;
        if (status == 401 || status == 403) {
            throw new AiProviderException("Credenciales inválidas para " + sub + ".", 502, "AI_AUTH_ERROR");
        }
        if (status == 429) {
            throw new AiProviderException("Límite de solicitudes o cuota excedido en " + sub + " (429).", 429, "AI_RATE_LIMIT");
        }
        throw new AiProviderException("Error HTTP " + status + " en proveedor " + sub + ".", 503, "AI_PROVIDER_UNAVAILABLE");
    }
}
