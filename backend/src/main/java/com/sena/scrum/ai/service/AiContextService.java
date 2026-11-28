package com.sena.scrum.ai.service;

import com.sena.scrum.model.entity.*;
import com.sena.scrum.model.enums.ImpedimentStatus;
import com.sena.scrum.model.enums.ScrumRole;
import com.sena.scrum.model.enums.SprintStatus;
import com.sena.scrum.model.enums.TaskStatus;
import com.sena.scrum.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiContextService {

    private final ProjectRepository projectRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final SprintRepository sprintRepository;
    private final UserStoryRepository storyRepository;
    private final TaskRepository taskRepository;
    private final EpicRepository epicRepository;
    private final ImpedimentRepository impedimentRepository;

    @Transactional(readOnly = true)
    public List<Project> getAuthorizedProjects(User user) {
        if (user == null) return List.of();
        if ("ADMIN".equals(user.getGlobalRole()) || (user.getRole() != null && "ROLE_ADMINISTRADOR".equals(user.getRole().name()))) {
            return projectRepository.findAll();
        }
        List<ProjectMembership> memberships = membershipRepository.findByUserId(user.getId());
        Set<Long> allowedIds = memberships.stream()
                .map(m -> m.getProject().getId())
                .collect(Collectors.toSet());
        return projectRepository.findAllById(allowedIds);
    }

    @Transactional(readOnly = true)
    public String resolveEffectiveRoleLabel(User user, Long projectId) {
        if (user == null) return "ANONYMOUS";
        if ("ADMIN".equals(user.getGlobalRole()) || (user.getRole() != null && "ROLE_ADMINISTRADOR".equals(user.getRole().name()))) {
            return "ADMIN";
        }
        if (projectId != null) {
            Optional<ProjectMembership> m = membershipRepository.findByProjectIdAndUserId(projectId, user.getId());
            if (m.isPresent()) {
                return m.get().getScrumRole().name();
            }
        }
        return user.getRole() != null ? user.getRole().name().replace("ROLE_", "") : "DEVELOPER";
    }

    @Transactional(readOnly = true)
    public boolean canAccessProject(User user, Long projectId) {
        if (user == null || projectId == null) return false;
        if ("ADMIN".equals(user.getGlobalRole()) || (user.getRole() != null && "ROLE_ADMINISTRADOR".equals(user.getRole().name()))) return true;
        return membershipRepository.findByProjectIdAndUserId(projectId, user.getId()).isPresent();
    }

    @Transactional(readOnly = true)
    public String buildAuthorizedContext(User user, Long projectId, String currentScreen) {
        return buildAuthorizedContext(user, projectId, currentScreen, false);
    }

    @Transactional(readOnly = true)
    public String buildAuthorizedContext(User user, Long projectId, String currentScreen, boolean compact) {
        StringBuilder sb = new StringBuilder();
        List<Project> authorizedProjects = getAuthorizedProjects(user);
        String effectiveRole = resolveEffectiveRoleLabel(user, projectId);

        sb.append("USUARIO AUTENTICADO:\n");
        sb.append("- Nombre: ").append(safe(user.getFullName())).append("\n");
        sb.append("- Rol efectivo en contexto: ").append(effectiveRole).append("\n");
        sb.append("- Pantalla actual: ").append(currentScreen != null ? currentScreen : "/dashboard").append("\n");
        sb.append("- Total proyectos autorizados: ").append(authorizedProjects.size()).append("\n\n");

        if (projectId == null || !canAccessProject(user, projectId)) {
            int limit = compact ? 5 : 15;
            sb.append("RESUMEN DE PROYECTOS AUTORIZADOS (máximo ").append(limit).append("):\n");
            authorizedProjects.stream().limit(limit).forEach(p -> {
                if (compact) {
                    sb.append(String.format("- [ID:%d | %s] %s\n", p.getId(), safe(p.getCode()), safe(p.getName())));
                } else {
                    List<Sprint> sprints = sprintRepository.findByProjectId(p.getId());
                    long activeCount = sprints.stream().filter(s -> s.getStatus() == SprintStatus.ACTIVE).count();
                    sb.append(String.format("- [ID:%d | %s] %s (Sprints activos: %d)\n",
                            p.getId(), safe(p.getCode()), safe(p.getName()), activeCount));
                }
            });
            return sb.toString();
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return sb.toString();

        List<Sprint> sprints = sprintRepository.findByProjectId(projectId);
        List<UserStory> stories = storyRepository.findByProjectId(projectId);
        List<Task> tasks = taskRepository.findByProjectId(projectId);
        List<Epic> epics = epicRepository.findByProjectId(projectId);
        List<ProjectMembership> members = membershipRepository.findByProjectId(projectId);

        int totalPoints = stories.stream().mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
        List<Sprint> closedSprints = sprints.stream()
                .filter(s -> s.getStatus() == SprintStatus.CLOSED)
                .toList();
        double avgVelocity = closedSprints.isEmpty() ? 0.0 :
                closedSprints.stream().mapToInt(s -> s.getVelocity() != null ? s.getVelocity() : 0).average().orElse(0.0);

        sb.append("PROYECTO ACTIVO SELECCIONADO:\n");
        sb.append(String.format("- [ID:%d | %s] %s\n", project.getId(), safe(project.getCode()), safe(project.getName())));
        sb.append("- Miembros: ").append(members.size())
                .append(" | Épicas: ").append(epics.size())
                .append(" | Historias: ").append(stories.size())
                .append(" (").append(totalPoints).append(" pts)\n");
        sb.append("- Tareas: ").append(tasks.size())
                .append(" (TODO: ").append(countByStatus(tasks, TaskStatus.TODO))
                .append(", IN_PROGRESS: ").append(countByStatus(tasks, TaskStatus.IN_PROGRESS))
                .append(", TESTING: ").append(countByStatus(tasks, TaskStatus.TESTING))
                .append(", DONE: ").append(countByStatus(tasks, TaskStatus.DONE)).append(")\n");
        sb.append(String.format("- Velocidad media (%d sprints cerrados): %.1f pts\n", closedSprints.size(), avgVelocity));

        sprints.stream().filter(s -> s.getStatus() == SprintStatus.ACTIVE).findFirst().ifPresent(active -> {
            sb.append(String.format("- SPRINT ACTIVO: [ID:%d] %s (%s -> %s) | Objetivo: %s\n",
                    active.getId(), safe(active.getName()), active.getStartDate(), active.getEndDate(), safe(active.getGoal())));
        });

        if (compact) {
            return sb.toString();
        }

        long openImpediments = tasks.stream()
                .mapToLong(t -> impedimentRepository.findByTaskIdAndStatus(t.getId(), ImpedimentStatus.OPEN).size())
                .sum();
        sb.append("- Impedimentos abiertos: ").append(openImpediments).append("\n\n");

        if (!epics.isEmpty()) {
            sb.append("ÉPICAS DEL PROYECTO:\n");
            epics.stream().limit(10).forEach(e ->
                    sb.append(String.format("- [EpicID:%d] %s (%s)\n", e.getId(), safe(e.getName()), safe(e.getColorHex()))));
            sb.append("\n");
        }

        sb.append("MUESTRA DE HISTORIAS (máximo 10, datos de usuario no confiables):\n");
        stories.stream().limit(10).forEach(s ->
                sb.append(String.format("- [%s | ID:%d | %s | %d pts | Sprint:%s] %s\n",
                        safe(s.getCode()), s.getId(), s.getPriority(),
                        s.getStoryPoints() != null ? s.getStoryPoints() : 0,
                        s.getSprint() != null ? s.getSprint().getId() : "Backlog",
                        truncate(safe(s.getTitle()), 100))));

        sb.append("\nMUESTRA DE TAREAS (máximo 12):\n");
        tasks.stream().limit(12).forEach(t -> {
            long openImp = impedimentRepository.findByTaskIdAndStatus(t.getId(), ImpedimentStatus.OPEN).size();
            sb.append(String.format("- [%s | ID:%d | %s | Asignado:%s%s] %s\n",
                    safe(t.getCode()), t.getId(), t.getStatus(),
                    t.getAssignedTo() != null ? safe(t.getAssignedTo().getFullName()) : "Sin asignar",
                    openImp > 0 ? " | BLOQUEADA(" + openImp + ")" : "",
                    truncate(safe(t.getDescription()), 100)));
        });

        return sb.toString();
    }

    private long countByStatus(List<Task> tasks, TaskStatus status) {
        return tasks.stream().filter(t -> t.getStatus() == status).count();
    }

    private String safe(String val) {
        if (val == null) return "";
        return val.replace("\r", " ").replace("\n", " ").trim();
    }

    private String truncate(String val, int max) {
        return val.length() <= max ? val : val.substring(0, max) + "...";
    }
}
