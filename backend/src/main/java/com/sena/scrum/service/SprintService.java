package com.sena.scrum.service;

import com.sena.scrum.exception.BusinessRuleException;
import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.SprintCloseRequest;
import com.sena.scrum.model.dto.SprintCloseResponse;
import com.sena.scrum.model.dto.SprintRequest;
import com.sena.scrum.model.dto.SprintResponse;
import com.sena.scrum.model.entity.Project;
import com.sena.scrum.model.entity.Sprint;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.entity.UserStory;
import com.sena.scrum.model.enums.ScrumRole;
import com.sena.scrum.model.enums.SprintStatus;
import com.sena.scrum.repository.ProjectMembershipRepository;
import com.sena.scrum.repository.SprintRepository;
import com.sena.scrum.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectService projectService;
    private final UserStoryRepository userStoryRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<SprintResponse> getSprintsByProject(Long projectId) {
        projectService.findEntityById(projectId); // Valida existencia
        return sprintRepository.findByProjectId(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SprintResponse getSprintById(Long id) {
        Sprint sprint = findEntityById(id);
        return mapToResponse(sprint);
    }

    @Transactional
    public SprintResponse createSprint(SprintRequest request) {
        Project project = projectService.findEntityById(request.getProjectId());

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessRuleException("La fecha de fin del Sprint no puede ser anterior a la de inicio.");
        }

        if (request.getStatus() == SprintStatus.ACTIVE &&
                sprintRepository.existsByProjectIdAndStatus(project.getId(), SprintStatus.ACTIVE)) {
            throw new BusinessRuleException("El proyecto ya cuenta con un Sprint activo. Debe concluir el actual antes de iniciar uno nuevo.");
        }

        Sprint sprint = Sprint.builder()
                .project(project)
                .name(request.getName().trim())
                .goal(request.getGoal())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() != null ? request.getStatus() : SprintStatus.PLANNED)
                .build();

        return mapToResponse(sprintRepository.save(Objects.requireNonNull(sprint)));
    }

    @Transactional
    public SprintResponse updateSprint(Long id, SprintRequest request) {
        Sprint sprint = findEntityById(id);

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessRuleException("La fecha de fin del Sprint no puede ser anterior a la de inicio.");
        }

        if (request.getStatus() == SprintStatus.ACTIVE &&
                sprintRepository.existsByProjectIdAndStatusAndIdNot(sprint.getProject().getId(), SprintStatus.ACTIVE, id)) {
            throw new BusinessRuleException("Ya existe otro Sprint activo en este proyecto.");
        }

        sprint.setName(request.getName().trim());
        sprint.setGoal(request.getGoal());
        sprint.setStartDate(request.getStartDate());
        sprint.setEndDate(request.getEndDate());

        if (request.getStatus() != null && sprint.getStatus() != request.getStatus()) {
            applyStatusTransition(sprint, request.getStatus());
        }

        return mapToResponse(sprintRepository.save(Objects.requireNonNull(sprint)));
    }

    @Transactional
    public SprintResponse startSprint(Long id) {
        Sprint sprint = findEntityById(id);
        if (sprint.getStatus() == SprintStatus.ACTIVE) {
            return mapToResponse(sprint);
        }
        applyStatusTransition(sprint, SprintStatus.ACTIVE);
        return mapToResponse(sprintRepository.save(Objects.requireNonNull(sprint)));
    }

    @Transactional
    public SprintCloseResponse closeSprint(Long id, SprintCloseRequest request, User actor) {
        Sprint sprint = findEntityById(id);

        if (sprint.getStatus() == SprintStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El Sprint ya se encuentra cerrado");
        }

        // Valida permiso: Scrum Master exclusivo del proyecto (RF6 / HU #10)
        validateCanCloseSprint(actor, sprint.getProject().getId());

        List<UserStory> sprintStories = userStoryRepository.findBySprintId(sprint.getId());
        int plannedPoints = sprintStories.stream()
                .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0)
                .sum();

        List<UserStory> completedStories = sprintStories.stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsCompleted()))
                .toList();

        int deliveredPoints = completedStories.stream()
                .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0)
                .sum();

        List<UserStory> incompleteStories = sprintStories.stream()
                .filter(s -> !Boolean.TRUE.equals(s.getIsCompleted()))
                .toList();

        Sprint targetSprint = null;
        if ("NEXT_SPRINT".equalsIgnoreCase(request.getDestination()) && request.getTargetSprintId() != null) {
            targetSprint = findEntityById(Objects.requireNonNull(request.getTargetSprintId()));
            if (targetSprint.getStatus() == SprintStatus.COMPLETED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El Sprint de destino no puede estar cerrado");
            }
        }

        // Transferir historias incompletas
        for (UserStory story : incompleteStories) {
            story.setSprint(targetSprint); // Si es null, regresa a Backlog
            userStoryRepository.save(Objects.requireNonNull(story));
        }

        sprint.setStatus(SprintStatus.COMPLETED);
        sprint.setClosedAt(OffsetDateTime.now());
        sprint.setVelocity(deliveredPoints);
        sprint.setDeliveredPoints(deliveredPoints);
        sprint.setPlannedPoints(plannedPoints);
        sprintRepository.save(Objects.requireNonNull(sprint));

        String destinationName = targetSprint != null ? targetSprint.getName() : "Product Backlog";

        auditLogService.logEvent(
                actor,
                "SPRINT_CLOSED",
                "SPRINT",
                String.valueOf(sprint.getId()),
                "Cierre del Sprint \"" + sprint.getName() + "\". Velocidad real entregada: " +
                        deliveredPoints + " Story Points (" + completedStories.size() + " historias completadas). " +
                        incompleteStories.size() + " historias incompletas transferidas a: " + destinationName + "."
        );

        return SprintCloseResponse.builder()
                .sprintId(sprint.getId())
                .sprintName(sprint.getName())
                .completedStoriesCount(completedStories.size())
                .returnedStoriesCount(incompleteStories.size())
                .deliveredPoints(deliveredPoints)
                .plannedPoints(plannedPoints)
                .velocity(deliveredPoints)
                .targetDestination(destinationName)
                .build();
    }

    private void validateCanCloseSprint(User user, Long projectId) {
        if ("ADMIN".equals(user.getGlobalRole())) return;
        boolean isSm = membershipRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(m -> m.getScrumRole() == ScrumRole.SCRUM_MASTER)
                .orElse(false);
        if (!isSm) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo el Scrum Master asignado al proyecto puede cerrar Sprints (RF6 / HU #10)");
        }
    }

    @Transactional
    public SprintResponse updateSprintStatus(Long id, SprintStatus newStatus) {
        Sprint sprint = findEntityById(id);
        applyStatusTransition(sprint, newStatus);
        return mapToResponse(sprintRepository.save(Objects.requireNonNull(sprint)));
    }

    private void applyStatusTransition(Sprint sprint, SprintStatus newStatus) {
        if (sprint.getStatus() == newStatus) {
            return;
        }

        if (newStatus == SprintStatus.ACTIVE) {
            boolean hasActive = sprintRepository.existsByProjectIdAndStatusAndIdNot(
                    sprint.getProject().getId(), SprintStatus.ACTIVE, sprint.getId()
            );
            if (hasActive) {
                throw new BusinessRuleException("Regla Scrum: Solo puede existir un único Sprint activo por proyecto a la vez.");
            }
            sprint.setStatus(SprintStatus.ACTIVE);
            sprint.setClosedAt(null);
        } else if (newStatus == SprintStatus.COMPLETED) {
            sprint.setStatus(SprintStatus.COMPLETED);
            sprint.setClosedAt(OffsetDateTime.now());

            // Regla Canónica Scrum: Historias no completadas regresan automáticamente al Product Backlog
            List<UserStory> sprintStories = userStoryRepository.findBySprintId(sprint.getId());
            for (UserStory story : sprintStories) {
                if (!Boolean.TRUE.equals(story.getIsCompleted())) {
                    story.setSprint(null);
                    userStoryRepository.save(Objects.requireNonNull(story));
                }
            }
        } else {
            sprint.setStatus(newStatus);
            sprint.setClosedAt(null);
        }
    }

    @Transactional
    public void deleteSprint(Long id) {
        Sprint sprint = findEntityById(id);
        // Si tiene historias, las liberamos al Product Backlog antes de eliminar
        List<UserStory> stories = userStoryRepository.findBySprintId(id);
        for (UserStory story : stories) {
            story.setSprint(null);
            userStoryRepository.save(Objects.requireNonNull(story));
        }
        sprintRepository.delete(Objects.requireNonNull(sprint));
    }

    public Sprint findEntityById(Long id) {
        return sprintRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Sprint no encontrado con ID: " + id));
    }

    private SprintResponse mapToResponse(Sprint sprint) {
        List<UserStory> stories = sprint.getUserStories();
        int totalStories = stories != null ? stories.size() : 0;
        int completed = 0;
        int points = 0;
        if (stories != null) {
            for (UserStory us : stories) {
                points += (us.getStoryPoints() != null ? us.getStoryPoints() : 0);
                if (Boolean.TRUE.equals(us.getIsCompleted())) {
                    completed++;
                }
            }
        }

        return SprintResponse.builder()
                .id(sprint.getId())
                .projectId(sprint.getProject().getId())
                .projectName(sprint.getProject().getName())
                .name(sprint.getName())
                .goal(sprint.getGoal())
                .startDate(sprint.getStartDate())
                .endDate(sprint.getEndDate())
                .status(sprint.getStatus())
                .closedAt(sprint.getClosedAt())
                .createdAt(sprint.getCreatedAt())
                .totalStories(totalStories)
                .completedStories(completed)
                .totalPoints(points)
                .build();
    }
}
