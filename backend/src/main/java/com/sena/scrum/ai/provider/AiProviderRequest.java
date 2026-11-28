package com.sena.scrum.ai.provider;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiProviderRequest {

    private String systemPrompt;
    private List<AiMessage> messages;
    private String model;
    private double temperature;
    private int maxTokens;
    private int numCtx;
    private boolean disableThinking;
    private boolean jsonMode;
    private Map<String, Object> jsonSchema;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiMessage {
        private String role; // "user" | "assistant" | "system"
        private String content;
    }
}
