package com.sena.scrum.ai.controller;

import com.sena.scrum.ai.model.AiMode;
import com.sena.scrum.ai.provider.AiProviderException;
import com.sena.scrum.ai.service.*;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "9. Agile Velocity AI", description = "Copiloto inteligente multi-proveedor, streaming SSE, herramientas controladas, documentos y análisis Scrum")
@SecurityRequirement(name = "Bearer Authentication")
public class AiController {

    private final AuthService authService;
    private final AiCopilotService copilotService;
    private final AiConversationStore conversationStore;
    private final AiProactiveService proactiveService;
    private final AiDocumentService documentService;
    private final AiActionConfirmationService confirmationService;

    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();

    private User requireUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new InsufficientAuthenticationException("Usuario no autenticado");
        }
        return authService.getCurrentUser(auth.getName());
    }

    @GetMapping("/status")
    @Operation(summary = "Estado del proveedor AI, consumo y memoria del usuario")
    public ResponseEntity<Map<String, Object>> getStatus(Authentication auth) {
        return ResponseEntity.ok(copilotService.getStatus(requireUser(auth)));
    }

    @PostMapping("/chat")
    @Operation(summary = "Chat síncrono con Agile Velocity AI")
    public ResponseEntity<?> chat(@RequestBody ChatRequest req, Authentication auth) {
        User user = requireUser(auth);
        if (req.getPrompt() == null || req.getPrompt().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede estar vacío."));
        }
        try {
            AiConversationStore.AiMessage msg = copilotService.chat(
                    user, req.getConversationId(), req.getProjectId(), req.getCurrentScreen(),
                    req.getMode(), req.getPrompt(), req.getAttachmentContext(), req.isTemporary()
            );
            return ResponseEntity.ok(Map.of("message", msg));
        } catch (AiProviderException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getMessage(), "code", ex.getCode()));
        }
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Chat en streaming SSE con Agile Velocity AI")
    public SseEmitter streamChat(@RequestBody ChatRequest req, Authentication auth) {
        User user = requireUser(auth);
        SseEmitter emitter = new SseEmitter(180_000L);
        AtomicBoolean emitterClosed = new AtomicBoolean(false);
        AtomicBoolean cancelled = new AtomicBoolean(false);

        emitter.onCompletion(() -> {
            emitterClosed.set(true);
            cancelled.set(true);
        });
        emitter.onTimeout(() -> {
            cancelled.set(true);
            if (emitterClosed.compareAndSet(false, true)) {
                try {
                    emitter.send(SseEmitter.event().data(Map.of(
                            "type", "error",
                            "code", "AI_TIMEOUT",
                            "message", "La respuesta excedió el tiempo máximo de espera."
                    )));
                } catch (Exception ignored) {}
                emitter.complete();
            }
        });
        emitter.onError(ex -> {
            emitterClosed.set(true);
            cancelled.set(true);
        });

        if (req.getPrompt() == null || req.getPrompt().isBlank()) {
            try {
                emitter.send(SseEmitter.event().data(Map.of("type", "error", "message", "El mensaje no puede estar vacío.")));
                emitterClosed.set(true);
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        streamExecutor.execute(() -> {
            try {
                copilotService.streamChat(
                        user, req.getConversationId(), req.getProjectId(), req.getCurrentScreen(),
                        req.getMode(), req.getPrompt(), req.getAttachmentContext(), req.isTemporary(),
                        event -> {
                            if (emitterClosed.get()) return;
                            try {
                                emitter.send(SseEmitter.event().data(event));
                            } catch (Exception e) {
                                emitterClosed.set(true);
                                cancelled.set(true);
                            }
                        },
                        cancelled::get
                );
            } catch (Exception e) {
                if (!emitterClosed.get()) {
                    try {
                        emitter.send(SseEmitter.event().data(Map.of(
                                "type", "error",
                                "code", "AI_STREAM_ERROR",
                                "message", "No se pudo completar la respuesta de IA."
                        )));
                    } catch (Exception ignored) {}
                }
            } finally {
                cancelled.set(true);
                if (emitterClosed.compareAndSet(false, true)) {
                    try {
                        emitter.complete();
                    } catch (Exception ignored) {}
                }
            }
        });
        return emitter;
    }

    @GetMapping("/conversations")
    @Operation(summary = "Listar historial de conversaciones del usuario")
    public ResponseEntity<Map<String, Object>> listConversations(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String q,
            Authentication auth
    ) {
        User user = requireUser(auth);
        return ResponseEntity.ok(Map.of("conversations", conversationStore.listConversations(user.getId(), projectId, q)));
    }

    @PostMapping("/conversations")
    @Operation(summary = "Crear nueva conversación")
    public ResponseEntity<Map<String, Object>> createConversation(@RequestBody(required = false) CreateConvRequest req, Authentication auth) {
        User user = requireUser(auth);
        var conv = conversationStore.createConversation(
                user.getId(),
                req != null ? req.getProjectId() : null,
                req != null ? req.getTitle() : null,
                req != null && req.getMode() != null ? req.getMode() : AiMode.AUTO,
                req != null && req.isTemporary()
        );
        return ResponseEntity.ok(Map.of("conversation", conv));
    }

    @PatchMapping("/conversations/{id}")
    @Operation(summary = "Renombrar conversación")
    public ResponseEntity<Map<String, Object>> renameConversation(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        User user = requireUser(auth);
        String title = body.getOrDefault("title", "").trim();
        if (title.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "El título es obligatorio."));
        boolean ok = conversationStore.renameConversation(user.getId(), id, title);
        return ok ? ResponseEntity.ok(Map.of("ok", true)) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/conversations/{id}")
    @Operation(summary = "Eliminar conversación propia")
    public ResponseEntity<Map<String, Object>> deleteConversation(@PathVariable String id, Authentication auth) {
        User user = requireUser(auth);
        boolean ok = conversationStore.deleteConversation(user.getId(), id);
        return ok ? ResponseEntity.ok(Map.of("ok", true)) : ResponseEntity.notFound().build();
    }

    @PostMapping("/conversations/{id}/feedback")
    @Operation(summary = "Registrar feedback positivo o negativo sobre una respuesta")
    public ResponseEntity<Map<String, Object>> feedback(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        User user = requireUser(auth);
        boolean ok = conversationStore.setMessageFeedback(user.getId(), id, body.get("messageId"), body.get("feedback"));
        return ok ? ResponseEntity.ok(Map.of("ok", true)) : ResponseEntity.notFound().build();
    }

    @GetMapping("/memory")
    public ResponseEntity<Map<String, Object>> getMemory(Authentication auth) {
        return ResponseEntity.ok(Map.of("memory", conversationStore.getMemory(requireUser(auth).getId())));
    }

    @PutMapping("/memory")
    public ResponseEntity<Map<String, Object>> updateMemory(@RequestBody AiConversationStore.UserMemoryPreferences prefs, Authentication auth) {
        return ResponseEntity.ok(Map.of("memory", conversationStore.updateMemory(requireUser(auth).getId(), prefs)));
    }

    @DeleteMapping("/memory")
    public ResponseEntity<Map<String, Object>> clearMemory(Authentication auth) {
        conversationStore.clearMemory(requireUser(auth).getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/proactive")
    @Operation(summary = "Recomendaciones proactivas deterministas (sin costo LLM)")
    public ResponseEntity<Map<String, Object>> getProactive(@RequestParam(required = false) Long projectId, Authentication auth) {
        User user = requireUser(auth);
        var prefs = conversationStore.getMemory(user.getId());
        if (!prefs.isProactiveEnabled()) {
            return ResponseEntity.ok(Map.of("enabled", false, "alerts", java.util.List.of()));
        }
        return ResponseEntity.ok(Map.of("enabled", true, "alerts", proactiveService.analyzeForUser(user, projectId)));
    }

    @PostMapping(value = "/documents/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Extraer y sanitizar texto de documentos adjuntos (PDF, DOCX, TXT, MD, CSV, XLSX)")
    public ResponseEntity<?> parseDocument(@RequestParam("file") MultipartFile file, Authentication auth) {
        requireUser(auth);
        try {
            return ResponseEntity.ok(Map.of("document", documentService.parseFile(file)));
        } catch (AiProviderException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getMessage(), "code", ex.getCode()));
        }
    }

    @PostMapping("/actions/confirm")
    @Operation(summary = "Confirmar y ejecutar una acción preparada por el agente (con revalidación RBAC)")
    public ResponseEntity<?> confirmAction(@RequestBody Map<String, String> body, Authentication auth) {
        User user = requireUser(auth);
        try {
            return ResponseEntity.ok(confirmationService.confirmAndExecute(user, body.get("confirmationId")));
        } catch (AiProviderException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getMessage(), "code", ex.getCode()));
        }
    }

    @PostMapping("/actions/cancel")
    public ResponseEntity<Map<String, Object>> cancelAction(@RequestBody Map<String, String> body, Authentication auth) {
        boolean ok = confirmationService.cancelAction(requireUser(auth), body.get("confirmationId"));
        return ResponseEntity.ok(Map.of("ok", ok));
    }

    @PostMapping("/assist/tasks")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER')")
    public ResponseEntity<?> assistTasks(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = requireUser(auth);
        try {
            Long projectId = body.get("projectId") != null ? Long.valueOf(String.valueOf(body.get("projectId"))) : null;
            Long storyId = body.get("storyId") != null ? Long.valueOf(String.valueOf(body.get("storyId"))) : null;
            String text = body.get("contextText") != null ? String.valueOf(body.get("contextText")) : "";
            return ResponseEntity.ok(copilotService.assistTasks(user, projectId, storyId, text));
        } catch (AiProviderException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getMessage(), "code", ex.getCode()));
        }
    }

    @PostMapping("/assist/{moduleType}")
    public ResponseEntity<?> assistModule(
            @PathVariable String moduleType,
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        User user = requireUser(auth);
        try {
            Long projectId = body.get("projectId") != null ? Long.valueOf(String.valueOf(body.get("projectId"))) : null;
            String customGoal = body.get("goal") != null ? String.valueOf(body.get("goal")) : "";
            return ResponseEntity.ok(copilotService.assistProjectModule(user, projectId, moduleType, customGoal));
        } catch (AiProviderException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getMessage(), "code", ex.getCode()));
        }
    }

    @Data
    public static class ChatRequest {
        private String conversationId;
        private Long projectId;
        private String currentScreen;
        private AiMode mode = AiMode.AUTO;
        private String prompt;
        private String attachmentContext;
        private boolean temporary;
    }

    @Data
    public static class CreateConvRequest {
        private Long projectId;
        private String title;
        private AiMode mode;
        private boolean temporary;
    }
}
