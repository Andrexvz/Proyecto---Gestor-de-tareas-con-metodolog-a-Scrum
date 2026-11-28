package com.sena.scrum.ai.provider;

import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

public interface AiProviderAdapter {

    String getProviderName();

    boolean isConfigured();

    String resolveModel(boolean deepReasoning);

    AiProviderResponse generate(AiProviderRequest request) throws AiProviderException;

    record StreamMetrics(long modelLoadMs, long evalCount, double tokensPerSec) {}

    void streamGenerate(AiProviderRequest request, Consumer<String> onDelta, Runnable onComplete) throws AiProviderException;

    default void streamGenerate(
            AiProviderRequest request,
            Consumer<String> onDelta,
            Runnable onComplete,
            BooleanSupplier isCancelled
    ) throws AiProviderException {
        streamGenerate(request, onDelta, onComplete);
    }

    default void streamGenerate(
            AiProviderRequest request,
            Consumer<String> onDelta,
            Runnable onComplete,
            BooleanSupplier isCancelled,
            Consumer<StreamMetrics> onMetrics
    ) throws AiProviderException {
        streamGenerate(request, onDelta, onComplete, isCancelled);
    }
}
