package com.sena.scrum.service;

import com.sena.scrum.exception.BusinessRuleException;
import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.SprintRequest;
import com.sena.scrum.model.dto.SprintResponse;
import com.sena.scrum.model.entity.Project;
import com.sena.scrum.model.entity.Sprint;
import com.sena.scrum.model.entity.UserStory;
import com.sena.scrum.model.enums.SprintStatus;
import com.sena.scrum.repository.SprintRepository;
import com.sena.scrum.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectService projectService;
    private final UserStoryRepository userStoryRepository;

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

        return mapToResponse(sprintRepository.save(sprint));
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

        return mapToResponse(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintResponse updateSprintStatus(Long id, SprintStatus newStatus) {
        Sprint sprint = findEntityById(id);
        applyStatusTransition(sprint, newStatus);
        return mapToResponse(sprintRepository.save(sprint));
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
                    userStoryRepository.save(story);
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
            userStoryRepository.save(story);
        }
        sprintRepository.delete(sprint);
    }

    public Sprint findEntityById(Long id) {
        return sprintRepository.findById(id)
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
