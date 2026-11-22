package com.sena.scrum.service;

import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.UserStoryRequest;
import com.sena.scrum.model.dto.UserStoryResponse;
import com.sena.scrum.model.entity.Project;
import com.sena.scrum.model.entity.Sprint;
import com.sena.scrum.model.entity.Task;
import com.sena.scrum.model.entity.UserStory;
import com.sena.scrum.model.enums.StoryPriority;
import com.sena.scrum.model.enums.TaskStatus;
import com.sena.scrum.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserStoryService {

    private final UserStoryRepository userStoryRepository;
    private final ProjectService projectService;
    private final SprintService sprintService;
    private final com.sena.scrum.repository.EpicRepository epicRepository;

    @Transactional(readOnly = true)
    public List<UserStoryResponse> getStoriesByProject(Long projectId) {
        projectService.findEntityById(projectId);
        return userStoryRepository.findByProjectId(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserStoryResponse> getProductBacklog(Long projectId) {
        projectService.findEntityById(projectId);
        return userStoryRepository.findByProjectIdAndSprintIsNull(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserStoryResponse> getSprintBacklog(Long sprintId) {
        sprintService.findEntityById(sprintId);
        return userStoryRepository.findBySprintId(sprintId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserStoryResponse getStoryById(Long id) {
        UserStory story = findEntityById(id);
        return mapToResponse(story);
    }

    @Transactional
    public UserStoryResponse createStory(UserStoryRequest request) {
        Project project = projectService.findEntityById(request.getProjectId());
        Sprint sprint = null;
        if (request.getSprintId() != null) {
            sprint = sprintService.findEntityById(request.getSprintId());
        }
        com.sena.scrum.model.entity.Epic epic = null;
        if (request.getEpicId() != null) {
            epic = epicRepository.findById(Objects.requireNonNull(request.getEpicId())).orElse(null);
        }

        String code = request.getCode();
        if (code == null || code.isBlank()) {
            long count = userStoryRepository.countByProjectId(project.getId()) + 1;
            code = String.format("%s-%d", project.getCode(), 100 + count);
        }

        UserStory story = UserStory.builder()
                .project(project)
                .sprint(sprint)
                .epic(epic)
                .code(code.toUpperCase().trim())
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .acceptanceCriteria(request.getAcceptanceCriteria())
                .priority(request.getPriority() != null ? request.getPriority() : StoryPriority.MEDIUM)
                .storyPoints(request.getStoryPoints() != null ? request.getStoryPoints() : 1)
                .isCompleted(request.getIsCompleted() != null ? request.getIsCompleted() : false)
                .build();

        return mapToResponse(userStoryRepository.save(Objects.requireNonNull(story)));
    }

    @Transactional
    public UserStoryResponse updateStory(Long id, UserStoryRequest request) {
        UserStory story = findEntityById(id);

        if (request.getSprintId() != null) {
            Sprint sprint = sprintService.findEntityById(request.getSprintId());
            story.setSprint(sprint);
        } else {
            story.setSprint(null);
        }

        if (request.getEpicId() != null) {
            com.sena.scrum.model.entity.Epic epic = epicRepository.findById(Objects.requireNonNull(request.getEpicId())).orElse(null);
            story.setEpic(epic);
        }

        if (request.getCode() != null && !request.getCode().isBlank()) {
            story.setCode(request.getCode().toUpperCase().trim());
        }
        story.setTitle(request.getTitle().trim());
        story.setDescription(request.getDescription().trim());
        story.setAcceptanceCriteria(request.getAcceptanceCriteria());
        if (request.getPriority() != null) {
            story.setPriority(request.getPriority());
        }
        if (request.getStoryPoints() != null) {
            story.setStoryPoints(request.getStoryPoints());
        }
        if (request.getIsCompleted() != null) {
            story.setIsCompleted(request.getIsCompleted());
        }

        return mapToResponse(userStoryRepository.save(Objects.requireNonNull(story)));
    }

    @Transactional
    public UserStoryResponse assignStoryToSprint(Long storyId, Long sprintId) {
        UserStory story = findEntityById(storyId);
        if (sprintId != null) {
            Sprint sprint = sprintService.findEntityById(sprintId);
            story.setSprint(sprint);
        } else {
            story.setSprint(null); // Regresa al Product Backlog
        }
        return mapToResponse(userStoryRepository.save(Objects.requireNonNull(story)));
    }

    @Transactional
    public void deleteStory(Long id) {
        UserStory story = findEntityById(id);
        userStoryRepository.delete(Objects.requireNonNull(story));
    }

    public UserStory findEntityById(Long id) {
        return userStoryRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Historia de usuario no encontrada con ID: " + id));
    }

    private UserStoryResponse mapToResponse(UserStory story) {
        List<Task> tasks = story.getTasks();
        int totalTasks = tasks != null ? tasks.size() : 0;
        int completedTasks = 0;
        if (tasks != null) {
            for (Task t : tasks) {
                if (t.getStatus() == TaskStatus.DONE) {
                    completedTasks++;
                }
            }
        }

        com.sena.scrum.model.entity.Epic epic = story.getEpic();

        return UserStoryResponse.builder()
                .id(story.getId())
                .projectId(story.getProject().getId())
                .projectCode(story.getProject().getCode())
                .projectName(story.getProject().getName())
                .sprintId(story.getSprint() != null ? story.getSprint().getId() : null)
                .sprintName(story.getSprint() != null ? story.getSprint().getName() : null)
                .epicId(epic != null ? epic.getId() : null)
                .epicName(epic != null ? epic.getName() : null)
                .epicColorHex(epic != null ? epic.getColorHex() : null)
                .code(story.getCode())
                .title(story.getTitle())
                .description(story.getDescription())
                .acceptanceCriteria(story.getAcceptanceCriteria())
                .priority(story.getPriority())
                .storyPoints(story.getStoryPoints())
                .isCompleted(story.getIsCompleted())
                .createdAt(story.getCreatedAt())
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .build();
    }
}
