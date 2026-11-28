package com.sena.scrum.ai.service;

import com.sena.scrum.ai.config.AiProperties;
import com.sena.scrum.ai.entity.AiUsageLogEntity;
import com.sena.scrum.ai.provider.AiProviderException;
import com.sena.scrum.ai.repository.AiUsageLogRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class AiUsageService {

    private final AiProperties properties;

    @Autowired(required = false)
    private AiUsageLogRepository usageLogRepository;

    private final Map<Long, Deque<Long>> requestTimestamps = new ConcurrentHashMap<>();
    private final Map<Long, AtomicInteger> activeRequests = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> dailyTokens = new ConcurrentHashMap<>();
    private final Map<Long, Integer> totalRequestsByUser = new ConcurrentHashMap<>();
    private final Map<Long, Boolean> globalPermitHolders = new ConcurrentHashMap<>();
    private volatile Semaphore globalSemaphore;

    private Semaphore getGlobalSemaphore() {
        if (globalSemaphore == null) {
            synchronized (this) {
                if (globalSemaphore == null) {
                    int limit = Math.max(1, properties.getMaxGlobalConcurrentGenerations());
                    globalSemaphore = new Semaphore(limit, true);
                }
            }
        }
        return globalSemaphore;
    }

    public void acquirePermit(Long userId) throws AiProviderException {
        if (userId == null) {
            throw new AiProviderException("Usuario no autenticado para consumo de IA.", 401, "AI_UNAUTHORIZED");
        }

        // 1. Concurrency guard
        AtomicInteger concurrent = activeRequests.computeIfAbsent(userId, k -> new AtomicInteger(0));
        int currentActive = concurrent.incrementAndGet();
        if (currentActive > properties.getMaxConcurrentPerUser()) {
            concurrent.decrementAndGet();
            throw new AiProviderException(
                    "Ya tienes " + properties.getMaxConcurrentPerUser() + " solicitudes de IA en curso. Espera un momento o cancela una.",
                    429,
                    "AI_CONCURRENCY_LIMIT"
            );
        }

        // 2. Per-minute rate limit
        long now = System.currentTimeMillis();
        Deque<Long> window = requestTimestamps.computeIfAbsent(userId, k -> new ConcurrentLinkedDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() > 60_000L) {
                window.pollFirst();
            }
            if (window.size() >= properties.getMaxRequestsPerMinutePerUser()) {
                concurrent.decrementAndGet();
                throw new AiProviderException(
                        "Límite de " + properties.getMaxRequestsPerMinutePerUser() + " solicitudes por minuto alcanzado. Intenta nuevamente en unos segundos.",
                        429,
                        "AI_USER_RATE_LIMIT"
                );
            }
            window.addLast(now);
        }

        // 3. Daily token budget check
        int usedToday = getUsedTokensToday(userId);
        if (usedToday >= properties.getDailyTokenBudgetPerUser()) {
            concurrent.decrementAndGet();
            throw new AiProviderException(
                    "Has alcanzado tu presupuesto diario de tokens (" + properties.getDailyTokenBudgetPerUser() + ").",
                    429,
                    "AI_DAILY_BUDGET_EXCEEDED"
            );
        }

        // 4. Global CPU-protection semaphore (prevents simultaneous local LLM saturation)
        try {
            boolean acquired = getGlobalSemaphore().tryAcquire(1500, TimeUnit.MILLISECONDS);
            if (!acquired) {
                concurrent.decrementAndGet();
                throw new AiProviderException(
                        "El motor de IA está atendiendo otra consulta en este momento. Intenta de nuevo en unos segundos.",
                        429,
                        "AI_ENGINE_BUSY"
                );
            }
            globalPermitHolders.put(Thread.currentThread().getId(), Boolean.TRUE);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            concurrent.decrementAndGet();
            throw new AiProviderException("Solicitud interrumpida mientras esperaba turno de IA.", 503, "AI_INTERRUPTED");
        }
    }

    public void releasePermit(Long userId) {
        if (globalPermitHolders.remove(Thread.currentThread().getId()) != null) {
            getGlobalSemaphore().release();
        }
        if (userId == null) return;
        AtomicInteger concurrent = activeRequests.get(userId);
        if (concurrent != null) {
            concurrent.updateAndGet(v -> Math.max(0, v - 1));
        }
    }

    public void recordUsage(Long userId, int totalTokens) {
        recordUsage(userId, "system", "default", 0, totalTokens, totalTokens);
    }

    public void recordUsage(Long userId, String provider, String model, int promptTokens, int completionTokens, int totalTokens) {
        if (userId == null) return;
        String key = dailyKey(userId);
        dailyTokens.computeIfAbsent(key, k -> new AtomicInteger(0)).addAndGet(Math.max(0, totalTokens));
        totalRequestsByUser.merge(userId, 1, Integer::sum);
        if (usageLogRepository != null) {
            try {
                usageLogRepository.save(AiUsageLogEntity.builder()
                        .userId(userId)
                        .provider(provider != null ? provider : "unknown")
                        .model(model != null ? model : "unknown")
                        .promptTokens(Math.max(0, promptTokens))
                        .completionTokens(Math.max(0, completionTokens))
                        .totalTokens(Math.max(0, totalTokens))
                        .createdAt(OffsetDateTime.now())
                        .build());
            } catch (Exception ignored) {}
        }
    }

    public int getUsedTokensToday(Long userId) {
        if (userId == null) return 0;
        AtomicInteger counter = dailyTokens.get(dailyKey(userId));
        return counter != null ? counter.get() : 0;
    }

    public UsageSnapshot getSnapshot(Long userId) {
        int used = getUsedTokensToday(userId);
        int budget = properties.getDailyTokenBudgetPerUser();
        return UsageSnapshot.builder()
                .usedTokensToday(used)
                .dailyTokenBudget(budget)
                .remainingTokensToday(Math.max(0, budget - used))
                .rpmLimit(properties.getMaxRequestsPerMinutePerUser())
                .requestsToday(totalRequestsByUser.getOrDefault(userId, 0))
                .build();
    }

    private String dailyKey(Long userId) {
        return userId + ":" + LocalDate.now();
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class UsageSnapshot {
        private int usedTokensToday;
        private int dailyTokenBudget;
        private int remainingTokensToday;
        private int rpmLimit;
        private int requestsToday;
    }
}
