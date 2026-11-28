package com.sena.scrum.ai.service;

import com.sena.scrum.model.entity.*;
import com.sena.scrum.model.enums.ImpedimentStatus;
import com.sena.scrum.model.enums.SprintStatus;
import com.sena.scrum.model.enums.TaskStatus;
import com.sena.scrum.repository.ImpedimentRepository;
import com.sena.scrum.repository.SprintRepository;
import com.sena.scrum.repository.TaskRepository;
import com.sena.scrum.repository.UserStoryRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic Scrum health & proactive recommendations engine.
 * Runs locally on authorized PostgreSQL data with ZERO LLM cost.
 */
@Service
@RequiredArgsConstructor
public class AiProactiveService {

    private final AiContextService contextService;
    private final SprintRepository sprintRepository;
    private final UserStoryRepository storyRepository;
    private final TaskRepository taskRepository;
    private final ImpedimentRepository impedimentRepository;

    @Transactional(readOnly = true)
    public List<ProactiveAlert> analyzeForUser(User user, Long projectId) {
        List<ProactiveAlert> alerts = new ArrayList<>();
        List<Project> projects = projectId != null && contextService.canAccessProject(user, projectId)
                ? contextService.getAuthorizedProjects(user).stream().filter(p -> p.getId().equals(projectId)).toList()
                : contextService.getAuthorizedProjects(user).stream().limit(6).toList();

        for (Project p : projects) {
            List<Sprint> sprints = sprintRepository.findByProjectId(p.getId());
            List<UserStory> stories = storyRepository.findByProjectId(p.getId());
            List<Task> tasks = taskRepository.findByProjectId(p.getId());

            long openImpediments = tasks.stream()
                    .mapToLong(t -> impedimentRepository.findByTaskIdAndStatus(t.getId(), ImpedimentStatus.OPEN).size())
                    .sum();
            if (openImpediments > 0) {
                alerts.add(ProactiveAlert.builder()
                        .id("imp-" + p.getId())
                        .severity("HIGH")
                        .category("IMPEDIMENT")
                        .projectId(p.getId())
                        .projectCode(p.getCode())
                        .title(openImpediments + " impedimento(s) abierto(s) en " + p.getCode())
                        .description("Existen tareas bloqueadas que impiden completar su paso a Hecho (DONE). Requiere atención del Scrum Master.")
                        .suggestedPrompt("Analiza los impedimentos abiertos del proyecto " + p.getCode() + " y sugiéreme un plan de resolución.")
                        .route("/projects/" + p.getId() + "/kanban")
                        .build());
            }

            long storiesWithoutCriteria = stories.stream()
                    .filter(s -> s.getAcceptanceCriteria() == null || s.getAcceptanceCriteria().isBlank())
                    .count();
            if (storiesWithoutCriteria > 0) {
                alerts.add(ProactiveAlert.builder()
                        .id("ac-" + p.getId())
                        .severity("MEDIUM")
                        .category("BACKLOG_QUALITY")
                        .projectId(p.getId())
                        .projectCode(p.getCode())
                        .title(storiesWithoutCriteria + " historia(s) sin criterios de aceptación en " + p.getCode())
                        .description("Historias incompletas dificultan la validación en QA y el cumplimiento INVEST.")
                        .suggestedPrompt("Identifica las historias sin criterios de aceptación en " + p.getCode() + " y propón criterios verificables.")
                        .route("/projects/" + p.getId() + "/backlog")
                        .build());
            }

            long oversizedStories = stories.stream()
                    .filter(s -> s.getStoryPoints() != null && s.getStoryPoints() >= 13)
                    .count();
            if (oversizedStories > 0) {
                alerts.add(ProactiveAlert.builder()
                        .id("big-" + p.getId())
                        .severity("MEDIUM")
                        .category("STORY_SIZE")
                        .projectId(p.getId())
                        .projectCode(p.getCode())
                        .title(oversizedStories + " historia(s) de gran tamaño (≥ 13 pts) en " + p.getCode())
                        .description("Conviene dividir historias épicas o muy grandes en incrementos más pequeños antes de llevarlas al Sprint.")
                        .suggestedPrompt("Sugiere cómo dividir las historias de ≥ 13 puntos en " + p.getCode() + ".")
                        .route("/projects/" + p.getId() + "/backlog")
                        .build());
            }

            long unassignedActiveTasks = tasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.DONE && t.getAssignedTo() == null)
                    .count();
            if (unassignedActiveTasks > 0) {
                alerts.add(ProactiveAlert.builder()
                        .id("unassigned-" + p.getId())
                        .severity("LOW")
                        .category("ASSIGNMENT")
                        .projectId(p.getId())
                        .projectCode(p.getCode())
                        .title(unassignedActiveTasks + " tarea(s) activa(s) sin responsable en " + p.getCode())
                        .description("Asignar responsables evita cuellos de botella en Por Hacer o En Progreso.")
                        .suggestedPrompt("Revisa las tareas sin asignar en " + p.getCode() + " y recomienda una distribución equilibrada.")
                        .route("/projects/" + p.getId() + "/kanban")
                        .build());
            }

            sprints.stream().filter(s -> s.getStatus() == SprintStatus.ACTIVE).findFirst().ifPresent(active -> {
                if (active.getEndDate() != null) {
                    long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), active.getEndDate());
                    if (daysLeft <= 2) {
                        alerts.add(ProactiveAlert.builder()
                                .id("sprint-due-" + active.getId())
                                .severity(daysLeft < 0 ? "HIGH" : "MEDIUM")
                                .category("SPRINT_DEADLINE")
                                .projectId(p.getId())
                                .projectCode(p.getCode())
                                .title("Sprint activo próximo a cierre en " + p.getCode())
                                .description(daysLeft < 0
                                        ? "El Sprint '" + active.getName() + "' superó su fecha de cierre (" + active.getEndDate() + ")."
                                        : "Faltan " + daysLeft + " día(s) para finalizar '" + active.getName() + "'.")
                                .suggestedPrompt("Evalúa el estado del Sprint activo de " + p.getCode() + " y prepara el resumen de cierre.")
                                .route("/projects/" + p.getId() + "/sprints")
                                .build());
                    }
                }
            });
        }

        return alerts.stream().limit(12).toList();
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ProactiveAlert {
        private String id;
        private String severity;
        private String category;
        private Long projectId;
        private String projectCode;
        private String title;
        private String description;
        private String suggestedPrompt;
        private String route;
    }
}
