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
import java.util.function.Consumer;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiProviderAdapter implements AiProviderAdapter {

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public boolean isConfigured() {
        String key = properties.getGeminiApiKey();
        return key != null && !key.isBlank() && !key.contains("MY_GEMINI_API_KEY");
    }

    @Override
    public String resolveModel(boolean deepReasoning) {
        return deepReasoning ? properties.getGeminiModelDeep() : properties.getGeminiModelFast();
    }

    @Override
    public AiProviderResponse generate(AiProviderRequest request) throws AiProviderException {
        ensureConfigured();
        String model = request.getModel() != null ? request.getModel() : resolveModel(false);
        String url = String.format("%s/models/%s:generateContent?key=%s",
                properties.getGeminiBaseUrl(), model, properties.getGeminiApiKey());

        long start = System.currentTimeMillis();
        try {
            String bodyJson = objectMapper.writeValueAsString(buildPayload(request));
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            handleErrorStatus(response.statusCode(), response.body());

            JsonNode root = objectMapper.readTree(response.body());
            String text = extractTextFromCandidate(root);
            JsonNode usage = root.path("usageMetadata");
            int promptTokens = usage.path("promptTokenCount").asInt(0);
            int completionTokens = usage.path("candidatesTokenCount").asInt(0);

            return AiProviderResponse.builder()
                    .content(text)
                    .provider(getProviderName())
                    .model(model)
                    .promptTokens(promptTokens)
                    .completionTokens(completionTokens)
                    .totalTokens(promptTokens + completionTokens)
                    .latencyMs(System.currentTimeMillis() - start)
                    .build();
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[GeminiAdapter] Request failed: {}", e.getMessage());
            throw new AiProviderException("Error al comunicarse con Google Gemini.", 503, "AI_PROVIDER_ERROR", e);
        }
    }

    @Override
    public void streamGenerate(AiProviderRequest request, Consumer<String> onDelta, Runnable onComplete) throws AiProviderException {
        ensureConfigured();
        String model = request.getModel() != null ? request.getModel() : resolveModel(false);
        String url = String.format("%s/models/%s:streamGenerateContent?alt=sse&key=%s",
                properties.getGeminiBaseUrl(), model, properties.getGeminiApiKey());

        try {
            String bodyJson = objectMapper.writeValueAsString(buildPayload(request));
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<java.io.InputStream> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 400) {
                String errBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
                handleErrorStatus(response.statusCode(), errBody);
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("data:")) {
                        String json = line.substring(5).trim();
                        if (json.isEmpty() || "[DONE]".equals(json)) continue;
                        JsonNode root = objectMapper.readTree(json);
                        String delta = extractTextFromCandidate(root);
                        if (!delta.isEmpty()) {
                            onDelta.accept(delta);
                        }
                    }
                }
            }
            onComplete.run();
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[GeminiAdapter] Stream failed: {}", e.getMessage());
            throw new AiProviderException("Error de streaming con Google Gemini.", 503, "AI_STREAM_ERROR", e);
        }
    }

    private void ensureConfigured() throws AiProviderException {
        if (!isConfigured()) {
            throw new AiProviderException(
                    "El proveedor Google Gemini no tiene configurada la variable GEMINI_API_KEY.",
                    503,
                    "AI_PROVIDER_NOT_CONFIGURED"
            );
        }
    }

    private Map<String, Object> buildPayload(AiProviderRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            payload.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", request.getSystemPrompt()))
            ));
        }

        List<Map<String, Object>> contents = new ArrayList<>();
        if (request.getMessages() != null) {
            for (AiProviderRequest.AiMessage msg : request.getMessages()) {
                String role = "assistant".equalsIgnoreCase(msg.getRole()) ? "model" : "user";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", msg.getContent() != null ? msg.getContent() : ""))
                ));
            }
        }
        payload.put("contents", contents);

        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("temperature", request.getTemperature() > 0 ? request.getTemperature() : 0.4);
        if (request.getMaxTokens() > 0) {
            genConfig.put("maxOutputTokens", request.getMaxTokens());
        }
        if (request.isJsonMode()) {
            genConfig.put("responseMimeType", "application/json");
        }
        payload.put("generationConfig", genConfig);
        return payload;
    }

    private String extractTextFromCandidate(JsonNode root) {
        JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
        if (parts.isArray() && !parts.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.has("text")) {
                    sb.append(part.get("text").asText(""));
                }
            }
            return sb.toString();
        }
        return "";
    }

    private void handleErrorStatus(int status, String body) throws AiProviderException {
        if (status >= 200 && status < 300) return;
        log.warn("[GeminiAdapter] HTTP {} from provider", status);
        if (status == 401 || status == 403) {
            throw new AiProviderException("Credenciales inválidas o sin permiso para Google Gemini.", 502, "AI_AUTH_ERROR");
        }
        if (status == 429) {
            throw new AiProviderException("Cuota o límite de tasa excedido en Google Gemini (429).", 429, "AI_RATE_LIMIT");
        }
        throw new AiProviderException("El proveedor de IA respondió con error HTTP " + status, 503, "AI_PROVIDER_UNAVAILABLE");
    }
}
