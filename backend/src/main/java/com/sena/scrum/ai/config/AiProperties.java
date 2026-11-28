package com.sena.scrum.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "agile.ai")
public class AiProperties {

    /**
     * Active provider: gemini | groq | openai | ollama | auto
     */
    private String provider = "auto";

    private String geminiApiKey = "";
    private String geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private String geminiModelFast = "gemini-2.5-flash";
    private String geminiModelDeep = "gemini-2.5-pro";

    private String groqApiKey = "";
    private String groqBaseUrl = "https://api.groq.com/openai/v1";
    private String groqModelFast = "openai/gpt-oss-20b";
    private String groqModelDeep = "openai/gpt-oss-120b";

    private String openaiApiKey = "";
    private String openaiBaseUrl = "https://api.openai.com/v1";
    private String openaiModelFast = "gpt-4o-mini";
    private String openaiModelDeep = "gpt-4o";

    private String ollamaBaseUrl = "http://localhost:11434/v1";
    private String ollamaEnabled = "false";
    private String ollamaModelFast = "qwen2.5:3b";
    private String ollamaModelDeep = "qwen3:4b";
    private String ollamaKeepAlive = "15m";
    private int ollamaNumThread = 8;
    private int ollamaNumCtxFast = 2048;
    private int ollamaNumCtxDeep = 3072;

    private int timeoutSeconds = 150;
    private int fastTimeoutSeconds = 45;
    private int maxRetries = 1;
    private int maxRequestsPerMinutePerUser = 20;
    private int dailyTokenBudgetPerUser = 100000;
    private int maxConcurrentPerUser = 2;
    private int maxGlobalConcurrentGenerations = 1;
}
