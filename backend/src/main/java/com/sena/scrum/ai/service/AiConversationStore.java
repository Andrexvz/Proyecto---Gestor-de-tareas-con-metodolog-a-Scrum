package com.sena.scrum.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sena.scrum.ai.entity.AiConversationEntity;
import com.sena.scrum.ai.entity.AiMessageEntity;
import com.sena.scrum.ai.model.AiMode;
import com.sena.scrum.ai.repository.AiConversationRepository;
import com.sena.scrum.ai.repository.AiMessageRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Dual-backed AI conversation & preference store:
 * Uses PostgreSQL (ai_conversations, ai_messages) when JPA repositories are active,
 * with atomic JSON fallback for standalone unit tests.
 */
@Slf4j
@Service
public class AiConversationStore {

    private final ObjectMapper objectMapper;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final Path storePath;
    private StoreRoot root = new StoreRoot();

    @Autowired(required = false)
    private AiConversationRepository conversationRepo;

    @Autowired(required = false)
    private AiMessageRepository messageRepo;

    public AiConversationStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        Path dataDir = Path.of("data").toAbsolutePath();
        if (!Files.exists(dataDir)) {
            dataDir = Path.of("..", "data").toAbsolutePath().normalize();
        }
        this.storePath = dataDir.resolve("ai-conversations.json");
        loadFromDisk();
    }

    @Transactional
    public AiConversation createConversation(Long userId, Long projectId, String title, AiMode mode, boolean temporary) {
        String id = "conv_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String resolvedTitle = title != null && !title.isBlank() ? title.trim() : "Nueva conversación";
        AiMode resolvedMode = mode != null ? mode : AiMode.AUTO;
        String now = Instant.now().toString();

        if (!temporary && conversationRepo != null) {
            OffsetDateTime odt = OffsetDateTime.now();
            conversationRepo.save(AiConversationEntity.builder()
                    .id(id)
                    .userId(userId)
                    .projectId(projectId)
                    .title(resolvedTitle)
                    .mode(resolvedMode.name())
                    .temporaryChat(false)
                    .createdAt(odt)
                    .updatedAt(odt)
                    .build());
        }

        lock.writeLock().lock();
        try {
            AiConversation conv = AiConversation.builder()
                    .id(id)
                    .userId(userId)
                    .projectId(projectId)
                    .title(resolvedTitle)
                    .mode(resolvedMode)
                    .temporary(temporary)
                    .messages(new ArrayList<>())
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            if (!temporary && conversationRepo == null) {
                root.getConversations().add(0, conv);
                saveToDisk();
            }
            return conv;
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Transactional(readOnly = true)
    public List<AiConversation> listConversations(Long userId, Long projectId, String search) {
        String q = search != null ? search.trim().toLowerCase(Locale.ROOT) : "";
        if (conversationRepo != null && messageRepo != null) {
            return conversationRepo.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                    .filter(c -> projectId == null || Objects.equals(c.getProjectId(), projectId) || c.getProjectId() == null)
                    .map(this::toDtoWithMessages)
                    .filter(c -> q.isEmpty()
                            || c.getTitle().toLowerCase(Locale.ROOT).contains(q)
                            || c.getMessages().stream().anyMatch(m -> m.getContent().toLowerCase(Locale.ROOT).contains(q)))
                    .toList();
        }

        lock.readLock().lock();
        try {
            return root.getConversations().stream()
                    .filter(c -> Objects.equals(c.getUserId(), userId))
                    .filter(c -> projectId == null || Objects.equals(c.getProjectId(), projectId) || c.getProjectId() == null)
                    .filter(c -> q.isEmpty()
                            || c.getTitle().toLowerCase(Locale.ROOT).contains(q)
                            || c.getMessages().stream().anyMatch(m -> m.getContent().toLowerCase(Locale.ROOT).contains(q)))
                    .sorted(Comparator.comparing(AiConversation::getUpdatedAt).reversed())
                    .toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    @Transactional(readOnly = true)
    public Optional<AiConversation> getConversation(Long userId, String conversationId) {
        if (conversationRepo != null && messageRepo != null) {
            return conversationRepo.findByIdAndUserId(conversationId, userId).map(this::toDtoWithMessages);
        }
        lock.readLock().lock();
        try {
            return root.getConversations().stream()
                    .filter(c -> Objects.equals(c.getUserId(), userId) && Objects.equals(c.getId(), conversationId))
                    .findFirst();
        } finally {
            lock.readLock().unlock();
        }
    }

    @Transactional
    public void appendMessages(Long userId, String conversationId, AiMessage userMsg, AiMessage assistantMsg) {
        if (conversationRepo != null && messageRepo != null) {
            conversationRepo.findByIdAndUserId(conversationId, userId).ifPresent(conv -> {
                OffsetDateTime now = OffsetDateTime.now();
                messageRepo.save(toEntity(conversationId, userMsg, now));
                messageRepo.save(toEntity(conversationId, assistantMsg, now.plusNanos(1000)));
                if ("Nueva conversación".equals(conv.getTitle()) && userMsg.getContent() != null) {
                    String raw = userMsg.getContent().trim();
                    conv.setTitle(raw.length() > 54 ? raw.substring(0, 54) + "..." : raw);
                }
                conv.setUpdatedAt(now);
                conversationRepo.save(conv);
            });
            return;
        }
        lock.writeLock().lock();
        try {
            root.getConversations().stream()
                    .filter(c -> Objects.equals(c.getUserId(), userId) && Objects.equals(c.getId(), conversationId))
                    .findFirst()
                    .ifPresent(conv -> {
                        conv.getMessages().add(userMsg);
                        conv.getMessages().add(assistantMsg);
                        if ("Nueva conversación".equals(conv.getTitle()) && userMsg.getContent() != null) {
                            String raw = userMsg.getContent().trim();
                            conv.setTitle(raw.length() > 54 ? raw.substring(0, 54) + "..." : raw);
                        }
                        if (conv.getMessages().size() > 24 && (conv.getSummary() == null || conv.getSummary().isBlank())) {
                            conv.setSummary("Conversación extensa (" + conv.getMessages().size() + " mensajes). Contexto compactado automáticamente.");
                        }
                        conv.setUpdatedAt(Instant.now().toString());
                        saveToDisk();
                    });
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Transactional
    public boolean renameConversation(Long userId, String conversationId, String newTitle) {
        if (conversationRepo != null) {
            Optional<AiConversationEntity> found = conversationRepo.findByIdAndUserId(conversationId, userId);
            if (found.isEmpty()) return false;
            found.get().setTitle(newTitle.trim());
            found.get().setUpdatedAt(OffsetDateTime.now());
            conversationRepo.save(found.get());
            return true;
        }
        lock.writeLock().lock();
        try {
            Optional<AiConversation> found = root.getConversations().stream()
                    .filter(c -> Objects.equals(c.getUserId(), userId) && Objects.equals(c.getId(), conversationId))
                    .findFirst();
            if (found.isEmpty()) return false;
            found.get().setTitle(newTitle.trim());
            found.get().setUpdatedAt(Instant.now().toString());
            saveToDisk();
            return true;
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Transactional
    public boolean deleteConversation(Long userId, String conversationId) {
        if (conversationRepo != null) {
            Optional<AiConversationEntity> found = conversationRepo.findByIdAndUserId(conversationId, userId);
            if (found.isEmpty()) return false;
            conversationRepo.delete(found.get());
            return true;
        }
        lock.writeLock().lock();
        try {
            boolean removed = root.getConversations().removeIf(
                    c -> Objects.equals(c.getUserId(), userId) && Objects.equals(c.getId(), conversationId)
            );
            if (removed) saveToDisk();
            return removed;
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Transactional
    public boolean setMessageFeedback(Long userId, String conversationId, String messageId, String feedback) {
        if (conversationRepo != null && messageRepo != null) {
            if (conversationRepo.findByIdAndUserId(conversationId, userId).isEmpty()) return false;
            return messageRepo.findById(messageId).map(m -> {
                if (!Objects.equals(m.getConversationId(), conversationId)) return false;
                m.setFeedback(feedback);
                messageRepo.save(m);
                return true;
            }).orElse(false);
        }
        lock.writeLock().lock();
        try {
            Optional<AiConversation> found = root.getConversations().stream()
                    .filter(c -> Objects.equals(c.getUserId(), userId) && Objects.equals(c.getId(), conversationId))
                    .findFirst();
            if (found.isEmpty()) return false;
            for (AiMessage m : found.get().getMessages()) {
                if (Objects.equals(m.getId(), messageId)) {
                    m.setFeedback(feedback);
                    saveToDisk();
                    return true;
                }
            }
            return false;
        } finally {
            lock.writeLock().unlock();
        }
    }

    private AiConversation toDtoWithMessages(AiConversationEntity entity) {
        List<AiMessage> msgs = messageRepo.findByConversationIdOrderByCreatedAtAsc(entity.getId()).stream()
                .map(m -> AiMessage.builder()
                        .id(m.getId())
                        .role(m.getRole())
                        .content(m.getContent())
                        .modeUsed(m.getModeUsed())
                        .provider(m.getProvider())
                        .model(m.getModel())
                        .feedback(m.getFeedback())
                        .createdAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null)
                        .build())
                .toList();
        AiMode mode = AiMode.AUTO;
        try { mode = AiMode.valueOf(entity.getMode()); } catch (Exception ignored) {}
        return AiConversation.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .projectId(entity.getProjectId())
                .title(entity.getTitle())
                .mode(mode)
                .summary(entity.getSummary())
                .temporary(entity.isTemporaryChat())
                .messages(msgs)
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : "")
                .updatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : "")
                .build();
    }

    private AiMessageEntity toEntity(String convId, AiMessage msg, OffsetDateTime ts) {
        return AiMessageEntity.builder()
                .id(msg.getId())
                .conversationId(convId)
                .role(msg.getRole())
                .content(msg.getContent() != null ? msg.getContent() : "")
                .modeUsed(msg.getModeUsed())
                .provider(msg.getProvider())
                .model(msg.getModel())
                .feedback(msg.getFeedback())
                .createdAt(ts)
                .build();
    }

    public UserMemoryPreferences getMemory(Long userId) {
        lock.readLock().lock();
        try {
            return root.getMemories().getOrDefault(String.valueOf(userId), defaultMemory());
        } finally {
            lock.readLock().unlock();
        }
    }

    public UserMemoryPreferences updateMemory(Long userId, UserMemoryPreferences prefs) {
        lock.writeLock().lock();
        try {
            UserMemoryPreferences sanitized = UserMemoryPreferences.builder()
                    .memoryEnabled(prefs.isMemoryEnabled())
                    .proactiveEnabled(prefs.isProactiveEnabled())
                    .preferredLanguage(prefs.getPreferredLanguage() != null ? prefs.getPreferredLanguage() : "es-CO")
                    .responseStyle(prefs.getResponseStyle() != null ? prefs.getResponseStyle() : "equilibrado")
                    .customNotes(prefs.getCustomNotes() != null ? truncate(prefs.getCustomNotes(), 600) : "")
                    .build();
            root.getMemories().put(String.valueOf(userId), sanitized);
            saveToDisk();
            return sanitized;
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void clearMemory(Long userId) {
        lock.writeLock().lock();
        try {
            root.getMemories().remove(String.valueOf(userId));
            saveToDisk();
        } finally {
            lock.writeLock().unlock();
        }
    }

    private UserMemoryPreferences defaultMemory() {
        return UserMemoryPreferences.builder()
                .memoryEnabled(true)
                .proactiveEnabled(true)
                .preferredLanguage("es-CO")
                .responseStyle("equilibrado")
                .customNotes("")
                .build();
    }

    private String truncate(String s, int max) {
        String clean = s.trim();
        return clean.length() <= max ? clean : clean.substring(0, max);
    }

    private void loadFromDisk() {
        try {
            if (Files.exists(storePath)) {
                root = objectMapper.readValue(storePath.toFile(), StoreRoot.class);
                if (root.getConversations() == null) root.setConversations(new ArrayList<>());
                if (root.getMemories() == null) root.setMemories(new HashMap<>());
            }
        } catch (Exception e) {
            log.warn("[AiConversationStore] Initializing fresh store: {}", e.getMessage());
            root = new StoreRoot();
        }
    }

    private void saveToDisk() {
        try {
            Files.createDirectories(storePath.getParent());
            Path tmp = storePath.resolveSibling("ai-conversations.json.tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), root);
            Files.move(tmp, storePath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (Exception e) {
            log.warn("[AiConversationStore] Atomic write warning: {}", e.getMessage());
        }
    }

    @Data
    public static class StoreRoot {
        private List<AiConversation> conversations = new ArrayList<>();
        private Map<String, UserMemoryPreferences> memories = new HashMap<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiConversation {
        private String id;
        private Long userId;
        private Long projectId;
        private String title;
        private AiMode mode;
        private String summary;
        private boolean temporary;
        private List<AiMessage> messages;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiMessage {
        private String id;
        private String role;
        private String content;
        private String modeUsed;
        private String provider;
        private String model;
        private String feedback; // "up" | "down" | null
        private List<Map<String, Object>> proposedActions;
        private Map<String, Object> chartData;
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserMemoryPreferences {
        private boolean memoryEnabled;
        private boolean proactiveEnabled;
        private String preferredLanguage;
        private String responseStyle;
        private String customNotes;
    }
}
