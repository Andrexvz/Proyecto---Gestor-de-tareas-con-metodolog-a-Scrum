package com.sena.scrum.ai.service;

import com.sena.scrum.ai.provider.AiProviderException;
import com.sena.scrum.model.dto.EpicRequest;
import com.sena.scrum.model.dto.SprintRequest;
import com.sena.scrum.model.dto.TaskCommentRequest;
import com.sena.scrum.model.dto.TaskRequest;
import com.sena.scrum.model.dto.UserStoryRequest;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.entity.UserStory;
import com.sena.scrum.model.enums.StoryPriority;
import com.sena.scrum.repository.UserStoryRepository;
import com.sena.scrum.service.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controlled AI Tool Registry, Preview Generator & Scoped Confirmation Service.
 * Never allows autonomous privilege escalation, project deletion, credential changes, or arbitrary SQL.
 * Always re-validates RBAC permissions in backend at execution time.
 */
@Service
@RequiredArgsConstructor
public class AiActionConfirmationService {

    private final AiContextService contextService;
    private final UserStoryService storyService;
    private final TaskService taskService;
    private final EpicService epicService;
    private final SprintService sprintService;
    private final TaskCommentService commentService;
    private final AuditLogService auditLogService;
    private final UserStoryRepository storyRepository;

    private final Map<String, PendingAction> pendingActions = new ConcurrentHashMap<>();
    private final Set<String> executedIdempotencyKeys = ConcurrentHashMap.newKeySet();

    public List<Map<String, String>> getToolCatalog() {
        return List.of(
                Map.of("name", "create_story", "level", "PREPARE_AND_CONFIRM", "roles", "ADMIN, PRODUCT_OWNER", "description", "Crea una historia de usuario en el Product Backlog"),
                Map.of("name", "create_task", "level", "PREPARE_AND_CONFIRM", "roles", "ADMIN, PRODUCT_OWNER, SCRUM_MASTER, DEVELOPER", "description", "Crea una tarea técnica dentro de una historia"),
                Map.of("name", "create_epic", "level", "PREPARE_AND_CONFIRM", "roles", "ADMIN, PRODUCT_OWNER, SCRUM_MASTER", "description", "Crea una nueva Épica en el proyecto"),
                Map.of("name", "prepare_sprint", "level", "PREPARE_AND_CONFIRM", "roles", "ADMIN, PRODUCT_OWNER, SCRUM_MASTER", "description", "Prepara un Sprint en estado PLANNING"),
                Map.of("name", "update_story_priority", "level", "PREPARE_AND_CONFIRM", "roles", "ADMIN, PRODUCT_OWNER, SCRUM_MASTER", "description", "Actualiza la prioridad de una historia de usuario"),
                Map.of("name", "add_acceptance_criteria", "level", "PREPARE_AND_CONFIRM", "roles", "ADMIN, PRODUCT_OWNER, SCRUM_MASTER", "description", "Agrega o actualiza criterios de aceptación"),
                Map.of("name", "add_task_comment", "level", "PREPARE_AND_CONFIRM", "roles", "SCRUM_MASTER, DEVELOPER", "description", "Publica un comentario técnico en una tarea")
        );
    }

    public PendingAction prepareAction(User user, Long projectId, String toolName, Map<String, Object> payload, String summary) throws AiProviderException {
        validateToolAllowed(toolName);
        if (projectId == null || !contextService.canAccessProject(user, projectId)) {
            throw new AiProviderException("No tienes acceso autorizado al proyecto para preparar esta acción.", 403, "AI_FORBIDDEN_PROJECT");
        }
        String role = contextService.resolveEffectiveRoleLabel(user, projectId);
        if (!hasToolPermission(role, toolName)) {
            throw new AiProviderException("Tu rol (" + role + ") no tiene permisos para ejecutar '" + toolName + "'.", 403, "AI_FORBIDDEN_TOOL");
        }

        String confirmationId = "act_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        PendingAction action = PendingAction.builder()
                .confirmationId(confirmationId)
                .userId(user.getId())
                .projectId(projectId)
                .toolName(toolName)
                .payload(new LinkedHashMap<>(payload))
                .previewSummary(summary)
                .status("PENDING")
                .expiresAtEpochMs(Instant.now().plusSeconds(900).toEpochMilli())
                .build();
        pendingActions.put(confirmationId, action);
        return action;
    }

    public Map<String, Object> confirmAndExecute(User user, String confirmationId) throws AiProviderException {
        PendingAction action = pendingActions.get(confirmationId);
        if (action == null) {
            throw new AiProviderException("La acción solicitada no existe o ya expiró.", 404, "ACTION_NOT_FOUND");
        }
        if (!Objects.equals(action.getUserId(), user.getId())) {
            throw new AiProviderException("No puedes confirmar acciones preparadas por otro usuario.", 403, "ACTION_OWNER_MISMATCH");
        }
        if (Instant.now().toEpochMilli() > action.getExpiresAtEpochMs()) {
            pendingActions.remove(confirmationId);
            throw new AiProviderException("La confirmación expiró por seguridad. Solicita nuevamente a la IA.", 410, "ACTION_EXPIRED");
        }
        if (!executedIdempotencyKeys.add(confirmationId)) {
            throw new AiProviderException("Esta operación ya fue ejecutada (protección de idempotencia).", 409, "ACTION_ALREADY_EXECUTED");
        }

        // Re-validate RBAC at exact execution time
        String role = contextService.resolveEffectiveRoleLabel(user, action.getProjectId());
        if (!contextService.canAccessProject(user, action.getProjectId()) || !hasToolPermission(role, action.getToolName())) {
            throw new AiProviderException("Permisos insuficientes al momento de ejecutar la operación.", 403, "AI_FORBIDDEN_EXECUTION");
        }

        Object result = executeControlledTool(action.getProjectId(), action.getToolName(), action.getPayload(), user);
        action.setStatus("EXECUTED");
        pendingActions.remove(confirmationId);

        auditLogService.logEvent(
                user,
                "AI_ACTION_EXECUTED",
                "AI_TOOL",
                confirmationId,
                "Ejecución confirmada de herramienta '" + action.getToolName() + "' en proyecto ID " + action.getProjectId()
        );

        return Map.of(
                "ok", true,
                "confirmationId", confirmationId,
                "toolName", action.getToolName(),
                "result", result
        );
    }

    public boolean cancelAction(User user, String confirmationId) {
        PendingAction action = pendingActions.get(confirmationId);
        if (action != null && Objects.equals(action.getUserId(), user.getId())) {
            pendingActions.remove(confirmationId);
            return true;
        }
        return false;
    }

    private Object executeControlledTool(Long projectId, String toolName, Map<String, Object> p, User user) throws AiProviderException {
        try {
            return switch (toolName) {
                case "create_story" -> {
                    UserStoryRequest req = new UserStoryRequest();
                    req.setProjectId(projectId);
                    req.setTitle(String.valueOf(p.getOrDefault("title", "Nueva historia IA")));
                    req.setDescription(String.valueOf(p.getOrDefault("description", "")));
                    req.setPriority(StoryPriority.valueOf(String.valueOf(p.getOrDefault("priority", "MEDIUM")).toUpperCase()));
                    req.setStoryPoints(Integer.parseInt(String.valueOf(p.getOrDefault("storyPoints", 3))));
                    Object ac = p.get("acceptanceCriteria");
                    if (ac instanceof List<?> list) {
                        req.setAcceptanceCriteria(String.join("\n", list.stream().map(String::valueOf).toList()));
                    } else if (ac != null) {
                        req.setAcceptanceCriteria(String.valueOf(ac));
                    }
                    yield storyService.createStory(req);
                }
                case "create_task" -> {
                    TaskRequest req = new TaskRequest();
                    req.setUserStoryId(Long.valueOf(String.valueOf(p.get("storyId"))));
                    req.setDescription(String.valueOf(p.getOrDefault("description", "Tarea técnica")));
                    if (p.get("assignedToId") != null) {
                        req.setAssignedToId(Long.valueOf(String.valueOf(p.get("assignedToId"))));
                    }
                    yield taskService.createTask(req);
                }
                case "create_epic" -> {
                    EpicRequest req = new EpicRequest();
                    req.setName(String.valueOf(p.getOrDefault("name", "Nueva Épica")));
                    req.setDescription(String.valueOf(p.getOrDefault("description", "")));
                    req.setColorHex(String.valueOf(p.getOrDefault("colorHex", "#8B5CF6")));
                    yield epicService.createEpic(projectId, req);
                }
                case "prepare_sprint" -> {
                    SprintRequest req = new SprintRequest();
                    req.setProjectId(projectId);
                    req.setName(String.valueOf(p.getOrDefault("name", "Sprint Propuesto IA")));
                    req.setGoal(String.valueOf(p.getOrDefault("goal", "Objetivo del Sprint")));
                    req.setStartDate(LocalDate.parse(String.valueOf(p.getOrDefault("startDate", LocalDate.now().toString()))));
                    req.setEndDate(LocalDate.parse(String.valueOf(p.getOrDefault("endDate", LocalDate.now().plusDays(14).toString()))));
                    yield sprintService.createSprint(req);
                }
                case "update_story_priority" -> {
                    Long storyId = Long.valueOf(String.valueOf(p.get("storyId")));
                    UserStory story = storyRepository.findById(storyId).orElseThrow();
                    if (!Objects.equals(story.getProject().getId(), projectId)) {
                        throw new AiProviderException("Historia no pertenece al proyecto.", 403, "CROSS_PROJECT_BLOCKED");
                    }
                    UserStoryRequest req = new UserStoryRequest();
                    req.setPriority(StoryPriority.valueOf(String.valueOf(p.get("priority")).toUpperCase()));
                    yield storyService.updateStory(storyId, req);
                }
                case "add_acceptance_criteria" -> {
                    Long storyId = Long.valueOf(String.valueOf(p.get("storyId")));
                    UserStory story = storyRepository.findById(storyId).orElseThrow();
                    if (!Objects.equals(story.getProject().getId(), projectId)) {
                        throw new AiProviderException("Historia no pertenece al proyecto.", 403, "CROSS_PROJECT_BLOCKED");
                    }
                    UserStoryRequest req = new UserStoryRequest();
                    Object ac = p.get("acceptanceCriteria");
                    if (ac instanceof List<?> list) {
                        req.setAcceptanceCriteria(String.join("\n", list.stream().map(String::valueOf).toList()));
                    } else {
                        req.setAcceptanceCriteria(String.valueOf(ac));
                    }
                    yield storyService.updateStory(storyId, req);
                }
                case "add_task_comment" -> {
                    Long taskId = Long.valueOf(String.valueOf(p.get("taskId")));
                    String content = String.valueOf(p.getOrDefault("content", ""));
                    TaskCommentRequest cReq = new TaskCommentRequest();
                    cReq.setContent(content);
                    yield commentService.createComment(taskId, cReq, user);
                }
                default -> throw new AiProviderException("Herramienta no autorizada.", 403, "TOOL_NOT_ALLOWED");
            };
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new AiProviderException("No se pudo ejecutar la acción confirmada: " + e.getMessage(), 400, "ACTION_EXECUTION_ERROR", e);
        }
    }

    private void validateToolAllowed(String toolName) throws AiProviderException {
        Set<String> allowed = Set.of(
                "create_story", "create_task", "create_epic", "prepare_sprint",
                "update_story_priority", "add_acceptance_criteria", "add_task_comment"
        );
        if (toolName == null || !allowed.contains(toolName)) {
            throw new AiProviderException("Herramienta desconocida o bloqueada por seguridad.", 403, "TOOL_NOT_ALLOWED");
        }
    }

    private boolean hasToolPermission(String role, String toolName) {
        return switch (toolName) {
            case "create_story" -> "ADMIN".equals(role) || "PRODUCT_OWNER".equals(role);
            case "create_epic", "prepare_sprint", "update_story_priority", "add_acceptance_criteria" ->
                    "ADMIN".equals(role) || "PRODUCT_OWNER".equals(role) || "SCRUM_MASTER".equals(role);
            case "create_task" -> true; // All authorized project members
            case "add_task_comment" -> "SCRUM_MASTER".equals(role) || "DEVELOPER".equals(role);
            default -> false;
        };
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class PendingAction {
        private String confirmationId;
        private Long userId;
        private Long projectId;
        private String toolName;
        private Map<String, Object> payload;
        private String previewSummary;
        private String status;
        private long expiresAtEpochMs;
    }
}
