package com.sena.scrum.ai.service;

import com.sena.scrum.model.entity.*;
import com.sena.scrum.model.enums.ImpedimentStatus;
import com.sena.scrum.model.enums.SprintStatus;
import com.sena.scrum.model.enums.TaskStatus;
import com.sena.scrum.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiDeterministicAnalyzerService {

    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserStoryRepository storyRepository;
    private final TaskRepository taskRepository;
    private final EpicRepository epicRepository;
    private final ImpedimentRepository impedimentRepository;
    private final AiContextService contextService;

    @Data
    @Builder
    public static class ProjectSnapshot {
        private Long projectId;
        private String projectCode;
        private String projectName;
        private String effectiveRole;
        private String fingerprint;
        private long dbQueryMs;
        private int totalStories;
        private int backlogStories;
        private int totalPoints;
        private int totalTasks;
        private long todoTasks;
        private long inProgressTasks;
        private long testingTasks;
        private long doneTasks;
        private int closedSprints;
        private double avgVelocity;
        private String activeSprintSummary;
        private List<String> incompleteStories;
        private List<String> missingCriteriaStories;
        private List<String> oversizedStories;
        private List<String> blockedTasks;
        private List<String> unassignedTasks;
        private List<String> epicNames;
    }

    @Transactional(readOnly = true)
    public Optional<ProjectSnapshot> analyzeProject(User user, Long projectId) {
        if (user == null || projectId == null || !contextService.canAccessProject(user, projectId)) {
            return Optional.empty();
        }
        long t0 = System.nanoTime();
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return Optional.empty();
        }

        List<Sprint> sprints = sprintRepository.findByProjectId(projectId);
        List<UserStory> stories = storyRepository.findByProjectId(projectId);
        List<Task> tasks = taskRepository.findByProjectId(projectId);
        List<Epic> epics = epicRepository.findByProjectId(projectId);

        List<String> incomplete = new ArrayList<>();
        List<String> missingCriteria = new ArrayList<>();
        List<String> oversized = new ArrayList<>();
        int backlogCount = 0;
        int totalPoints = 0;
        StringBuilder fpRaw = new StringBuilder();
        fpRaw.append(projectId).append('|').append(stories.size()).append('|').append(tasks.size()).append('|').append(sprints.size());

        for (UserStory s : stories) {
            int pts = s.getStoryPoints() != null ? s.getStoryPoints() : 0;
            totalPoints += pts;
            if (s.getSprint() == null) backlogCount++;

            boolean noCriteria = s.getAcceptanceCriteria() == null || s.getAcceptanceCriteria().trim().length() < 15;
            boolean noDesc = s.getDescription() == null || s.getDescription().trim().length() < 10;
            boolean noPts = s.getStoryPoints() == null || s.getStoryPoints() <= 0;

            if (noCriteria) {
                missingCriteria.add(String.format("[%s] %s", safe(s.getCode()), truncate(safe(s.getTitle()), 80)));
            }
            if (noCriteria || noDesc || noPts) {
                List<String> gaps = new ArrayList<>();
                if (noDesc) gaps.add("sin descripción");
                if (noCriteria) gaps.add("sin criterios");
                if (noPts) gaps.add("sin puntos");
                incomplete.add(String.format("[%s] %s (%s)", safe(s.getCode()), truncate(safe(s.getTitle()), 70), String.join(", ", gaps)));
            }
            if (pts > 8) {
                oversized.add(String.format("[%s] %s (%d pts)", safe(s.getCode()), truncate(safe(s.getTitle()), 70), pts));
            }
            fpRaw.append(';').append(s.getId()).append(':').append(pts).append(':').append(noCriteria ? 0 : 1);
        }

        List<String> blocked = new ArrayList<>();
        List<String> unassigned = new ArrayList<>();
        long todo = 0, inProg = 0, testing = 0, done = 0;

        for (Task t : tasks) {
            if (t.getStatus() == TaskStatus.TODO) todo++;
            else if (t.getStatus() == TaskStatus.IN_PROGRESS) inProg++;
            else if (t.getStatus() == TaskStatus.TESTING) testing++;
            else if (t.getStatus() == TaskStatus.DONE) done++;

            if (t.getAssignedTo() == null && t.getStatus() != TaskStatus.DONE) {
                unassigned.add(String.format("[%s | %s] %s", safe(t.getCode()), t.getStatus(), truncate(safe(t.getDescription()), 70)));
            }
            List<Impediment> openImps = impedimentRepository.findByTaskIdAndStatus(t.getId(), ImpedimentStatus.OPEN);
            if (!openImps.isEmpty()) {
                String reason = truncate(safe(openImps.get(0).getDescription()), 80);
                blocked.add(String.format("[%s | %s] %s — Impedimento: %s",
                        safe(t.getCode()), t.getStatus(), truncate(safe(t.getDescription()), 60), reason));
            }
            fpRaw.append(',').append(t.getId()).append(':').append(t.getStatus()).append(':').append(openImps.size());
        }

        List<Sprint> closed = sprints.stream().filter(s -> s.getStatus() == SprintStatus.CLOSED).toList();
        double avgVel = closed.isEmpty() ? 0.0
                : closed.stream().mapToInt(s -> s.getVelocity() != null ? s.getVelocity() : 0).average().orElse(0.0);

        String activeSummary = sprints.stream()
                .filter(s -> s.getStatus() == SprintStatus.ACTIVE)
                .findFirst()
                .map(a -> String.format("[ID:%d] %s (%s -> %s) | Objetivo: %s",
                        a.getId(), safe(a.getName()), a.getStartDate(), a.getEndDate(), safe(a.getGoal())))
                .orElse("Sin sprint activo");

        long dbQueryMs = (System.nanoTime() - t0) / 1_000_000L;

        return Optional.of(ProjectSnapshot.builder()
                .projectId(projectId)
                .projectCode(safe(project.getCode()))
                .projectName(safe(project.getName()))
                .effectiveRole(contextService.resolveEffectiveRoleLabel(user, projectId))
                .fingerprint(sha256Short(fpRaw.toString()))
                .dbQueryMs(dbQueryMs)
                .totalStories(stories.size())
                .backlogStories(backlogCount)
                .totalPoints(totalPoints)
                .totalTasks(tasks.size())
                .todoTasks(todo)
                .inProgressTasks(inProg)
                .testingTasks(testing)
                .doneTasks(done)
                .closedSprints(closed.size())
                .avgVelocity(avgVel)
                .activeSprintSummary(activeSummary)
                .incompleteStories(incomplete)
                .missingCriteriaStories(missingCriteria)
                .oversizedStories(oversized)
                .blockedTasks(blocked)
                .unassignedTasks(unassigned)
                .epicNames(epics.stream().map(e -> safe(e.getName())).limit(8).collect(Collectors.toList()))
                .build());
    }

    /**
     * Resolves pure data/status/metric/rule queries deterministically in Spring Boot without invoking the LLM.
     */
    public Optional<String> tryResolveDirectQuery(ProjectSnapshot snap, String prompt, boolean explicitDeep) {
        if (snap == null || prompt == null || explicitDeep) {
            return Optional.empty();
        }
        String lower = prompt.toLowerCase(Locale.ROOT).trim();

        // If user explicitly asks for advice/improvement/rewrite/deep analysis, let LLM synthesize using compact digest
        boolean asksForSynthesis = lower.contains("sugiere") || lower.contains("recomienda") || lower.contains("mejora")
                || lower.contains("cómo") || lower.contains("como ") || lower.contains("planifica")
                || lower.contains("redacta") || lower.contains("divide") || lower.contains("explica");
        if (asksForSynthesis) {
            return Optional.empty();
        }

        if (lower.contains("bloquead") || lower.contains("impediment")) {
            StringBuilder sb = new StringBuilder();
            sb.append("### Tareas bloqueadas e impedimentos — ").append(snap.getProjectCode()).append("\n\n");
            if (snap.getBlockedTasks().isEmpty()) {
                sb.append("No hay tareas con impedimentos abiertos (`OPEN`) actualmente.\n");
            } else {
                sb.append("Se detectaron **").append(snap.getBlockedTasks().size()).append("** tareas bloqueadas:\n");
                snap.getBlockedTasks().stream().limit(12).forEach(b -> sb.append("- ").append(b).append("\n"));
            }
            sb.append("\n*Datos verificados en tiempo real desde PostgreSQL (regla determinista RBAC).*");
            return Optional.of(sb.toString());
        }

        if ((lower.contains("incompleta") || lower.contains("sin criterios") || lower.contains("criterios faltantes") || lower.contains("criterios de aceptación"))
                && !lower.contains("analiza")) {
            StringBuilder sb = new StringBuilder();
            sb.append("### Auditoría determinista de historias — ").append(snap.getProjectCode()).append("\n\n");
            sb.append("- **Total historias:** ").append(snap.getTotalStories())
                    .append(" (En Backlog: ").append(snap.getBacklogStories()).append(")\n");
            sb.append("- **Historias incompletas:** ").append(snap.getIncompleteStories().size()).append("\n");
            sb.append("- **Sin criterios de aceptación:** ").append(snap.getMissingCriteriaStories().size()).append("\n");
            sb.append("- **Historias > 8 pts:** ").append(snap.getOversizedStories().size()).append("\n\n");
            if (!snap.getIncompleteStories().isEmpty()) {
                sb.append("**Detalle (máx. 10):**\n");
                snap.getIncompleteStories().stream().limit(10).forEach(s -> sb.append("- ").append(s).append("\n"));
            }
            return Optional.of(sb.toString());
        }

        if (lower.contains("velocidad") || lower.contains("métrica") || lower.contains("metricas") || lower.contains("cuántas tareas") || lower.contains("cuantas tareas")) {
            String sb = """
                    ### Métricas reales de %s (%s)

                    - **Sprint activo:** %s
                    - **Sprints cerrados:** %d | **Velocidad media histórica:** %.1f pts
                    - **Historias:** %d (%d pts totales, %d en Backlog)
                    - **Tareas:** %d (TODO: %d | IN_PROGRESS: %d | TESTING: %d | DONE: %d)
                    - **Bloqueos:** %d tareas con impedimentos abiertos | **Sin asignar:** %d
                    """.formatted(
                    snap.getProjectCode(),
                    snap.getProjectName(),
                    snap.getActiveSprintSummary(),
                    snap.getClosedSprints(),
                    snap.getAvgVelocity(),
                    snap.getTotalStories(),
                    snap.getTotalPoints(),
                    snap.getBacklogStories(),
                    snap.getTotalTasks(),
                    snap.getTodoTasks(),
                    snap.getInProgressTasks(),
                    snap.getTestingTasks(),
                    snap.getDoneTasks(),
                    snap.getBlockedTasks().size(),
                    snap.getUnassignedTasks().size()
            );
            return Optional.of(sb);
        }

        return Optional.empty();
    }

    /**
     * Builds a compact, intent-filtered deterministic digest so the LLM only receives relevant facts.
     */
    public String buildIntentScopedDigest(ProjectSnapshot snap, String prompt, boolean fullDetail) {
        if (snap == null) return "";
        String lower = prompt != null ? prompt.toLowerCase(Locale.ROOT) : "";
        boolean needsStories = fullDetail || lower.contains("histori") || lower.contains("backlog")
                || lower.contains("criterio") || lower.contains("prior") || lower.contains("épica") || lower.contains("epica");
        boolean needsTasks = fullDetail || lower.contains("tarea") || lower.contains("kanban")
                || lower.contains("bloque") || lower.contains("impediment") || lower.contains("asign");

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("PROYECTO [%s] %s | Rol usuario: %s\n",
                snap.getProjectCode(), snap.getProjectName(), snap.getEffectiveRole()));
        sb.append(String.format("MÉTRICAS: Sprints cerrados=%d | Velocidad media=%.1f pts | %s\n",
                snap.getClosedSprints(), snap.getAvgVelocity(), snap.getActiveSprintSummary()));
        sb.append(String.format("RESUMEN: Historias=%d (%d pts, %d en Backlog) | Tareas=%d (TODO=%d, PROG=%d, TEST=%d, DONE=%d) | Bloqueadas=%d | Incompletas=%d | >8pts=%d\n",
                snap.getTotalStories(), snap.getTotalPoints(), snap.getBacklogStories(),
                snap.getTotalTasks(), snap.getTodoTasks(), snap.getInProgressTasks(), snap.getTestingTasks(), snap.getDoneTasks(),
                snap.getBlockedTasks().size(), snap.getIncompleteStories().size(), snap.getOversizedStories().size()));

        if (needsStories) {
            int limit = fullDetail ? 8 : 5;
            if (!snap.getIncompleteStories().isEmpty()) {
                sb.append("HISTORIAS INCOMPLETAS/SIN CRITERIOS:\n");
                snap.getIncompleteStories().stream().limit(limit).forEach(s -> sb.append("- ").append(s).append("\n"));
            }
            if (!snap.getOversizedStories().isEmpty()) {
                sb.append("HISTORIAS >8 PTS:\n");
                snap.getOversizedStories().stream().limit(limit).forEach(s -> sb.append("- ").append(s).append("\n"));
            }
        }
        if (needsTasks) {
            int limit = fullDetail ? 8 : 5;
            if (!snap.getBlockedTasks().isEmpty()) {
                sb.append("TAREAS BLOQUEADAS:\n");
                snap.getBlockedTasks().stream().limit(limit).forEach(t -> sb.append("- ").append(t).append("\n"));
            }
            if (!snap.getUnassignedTasks().isEmpty()) {
                sb.append("TAREAS SIN ASIGNAR:\n");
                snap.getUnassignedTasks().stream().limit(4).forEach(t -> sb.append("- ").append(t).append("\n"));
            }
        }
        return sb.toString().trim();
    }

    private String safe(String val) {
        return val == null ? "" : val.replace("\r", " ").replace("\n", " ").trim();
    }

    private String truncate(String val, int max) {
        return val.length() <= max ? val : val.substring(0, max) + "...";
    }

    private String sha256Short(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                hex.append(String.format("%02x", hash[i]));
            }
            return hex.toString();
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }
}
