package com.sena.scrum.ai.provider;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiProviderResponse {
    private String content;
    private String provider;
    private String model;
    private int promptTokens;
    private int completionTokens;
    private int totalTokens;
    private long latencyMs;
}
