package com.sena.scrum.ai.service;

import com.sena.scrum.ai.model.AiMode;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class AiResponseCacheService {

    private static final int MAX_ENTRIES = 200;
    private static final long TTL_MS = 120_000L;

    public record CachedResponse(String content, String model, String provider, long createdAtMs) {}

    private final Map<String, CachedResponse> cache = Collections.synchronizedMap(
            new LinkedHashMap<>(MAX_ENTRIES + 1, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CachedResponse> eldest) {
                    return size() > MAX_ENTRIES;
                }
            }
    );

    public String buildKey(
            Long userId,
            String effectiveRole,
            Long projectId,
            AiMode requestedMode,
            AiMode effectiveMode,
            String dataFingerprint,
            String prompt
    ) {
        String normPrompt = prompt == null ? "" : prompt.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        return String.join("|",
                String.valueOf(userId),
                effectiveRole != null ? effectiveRole : "NONE",
                String.valueOf(projectId),
                requestedMode != null ? requestedMode.name() : "AUTO",
                effectiveMode != null ? effectiveMode.name() : "FAST",
                dataFingerprint != null ? dataFingerprint : "global",
                normPrompt
        );
    }

    public boolean isCacheable(AiMode requestedMode, AiMode effectiveMode, boolean hasAttachment) {
        if (hasAttachment) return false;
        return effectiveMode != AiMode.AGENT && effectiveMode != AiMode.DOCUMENTS
                && requestedMode != AiMode.AGENT && requestedMode != AiMode.DOCUMENTS;
    }

    public Optional<CachedResponse> get(String key) {
        CachedResponse entry = cache.get(key);
        if (entry == null) return Optional.empty();
        if (System.currentTimeMillis() - entry.createdAtMs() > TTL_MS) {
            cache.remove(key);
            return Optional.empty();
        }
        return Optional.of(entry);
    }

    public void put(String key, String content, String model, String provider) {
        if (key == null || content == null || content.isBlank()) return;
        cache.put(key, new CachedResponse(content, model, provider, System.currentTimeMillis()));
    }

    public void clearAll() {
        cache.clear();
    }
}
