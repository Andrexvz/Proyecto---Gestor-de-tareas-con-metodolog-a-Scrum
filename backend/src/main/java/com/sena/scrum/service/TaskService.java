package com.sena.scrum.service;

import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.TaskRequest;
import com.sena.scrum.model.dto.TaskResponse;
import com.sena.scrum.model.entity.Sprint;
import com.sena.scrum.model.entity.Task;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.entity.UserStory;
import com.sena.scrum.model.enums.ImpedimentStatus;
import com.sena.scrum.model.enums.TaskStatus;
import com.sena.scrum.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserStoryService userStoryService;
    private final UserStoryRepository userStoryRepository;
    private final UserRepository userRepository;
    private final ImpedimentRepository impedimentRepository;
    private final TaskCommentRepository commentRepository;
    private final ProjectMembershipRepository membershipRepository;

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksBySprint(Long sprintId) {
        return taskRepository.findBySprintId(sprintId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByStory(Long storyId) {
        userStoryService.findEntityById(storyId);
        return taskRepository.findByUserStoryId(storyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long id) {
        Task task = findEntityById(id);
        return mapToResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getMyTasks(User user, String scope) {
        if ("all".equalsIgnoreCase(scope)) {
            if ("ADMIN".equals(user.getGlobalRole())) {
                return taskRepository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
            }
            Set<Long> userProjectIds = membershipRepository.findByUserId(user.getId()).stream()
                    .map(m -> m.getProject().getId())
                    .collect(Collectors.toSet());
            return taskRepository.findAll().stream()
                    .filter(t -> userProjectIds.contains(t.getUserStory().getProject().getId()))
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        // Default: scope === 'me'
        return taskRepository.findByAssignedToId(user.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse createTask(TaskRequest request) {
        UserStory story = userStoryService.findEntityById(request.getUserStoryId());
        User assignedTo = null;
        if (request.getAssignedToId() != null) {
            assignedTo = userRepository.findById(Objects.requireNonNull(request.getAssignedToId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario asignado no encontrado con ID: " + request.getAssignedToId()));
        }

        String code = request.getCode();
        if (code == null || code.isBlank()) {
            long count = taskRepository.countByUserStoryId(story.getId()) + 1;
            code = String.format("TASK-%02d", count);
        }

        Task task = Task.builder()
                .userStory(story)
                .assignedTo(assignedTo)
                .code(code.toUpperCase().trim())
                .description(request.getDescription().trim())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO)
                .build();

        Task saved = taskRepository.save(Objects.requireNonNull(task));
        syncStoryCompletion(story.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest request) {
        Task task = findEntityById(id);

        if (request.getStatus() == TaskStatus.DONE && task.getStatus() != TaskStatus.DONE) {
            validateNoOpenImpediments(task.getId());
        }

        if (request.getUserStoryId() != null && !request.getUserStoryId().equals(task.getUserStory().getId())) {
            UserStory newStory = userStoryService.findEntityById(request.getUserStoryId());
            task.setUserStory(newStory);
        }

        if (request.getAssignedToId() != null) {
            User assignedTo = userRepository.findById(Objects.requireNonNull(request.getAssignedToId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario asignado no encontrado con ID: " + request.getAssignedToId()));
            task.setAssignedTo(assignedTo);
        } else {
            task.setAssignedTo(null);
        }

        if (request.getCode() != null && !request.getCode().isBlank()) {
            task.setCode(request.getCode().toUpperCase().trim());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription().trim());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }

        Task updated = taskRepository.save(Objects.requireNonNull(task));
        syncStoryCompletion(task.getUserStory().getId());
        return mapToResponse(updated);
    }

    @Transactional
    public TaskResponse updateKanbanStatus(Long id, TaskStatus status) {
        Task task = findEntityById(id);

        if (status == TaskStatus.DONE && task.getStatus() != TaskStatus.DONE) {
            validateNoOpenImpediments(task.getId());
        }

        task.setStatus(status);
        Task updated = taskRepository.save(Objects.requireNonNull(task));

        // Sincronización automática de progreso con la Historia de Usuario
        syncStoryCompletion(task.getUserStory().getId());

        return mapToResponse(updated);
    }

    private void validateNoOpenImpediments(Long taskId) {
        boolean hasOpenImpediments = !impedimentRepository.findByTaskIdAndStatus(taskId, ImpedimentStatus.OPEN).isEmpty();
        if (hasOpenImpediments) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede mover a Hecho una tarea con impedimentos abiertos (RF5 / HU #9)");
        }
    }

    @Transactional
    public void deleteTask(Long id) {
        Task task = findEntityById(id);
        Long storyId = task.getUserStory().getId();
        taskRepository.delete(Objects.requireNonNull(task));
        syncStoryCompletion(storyId);
    }

    public Task findEntityById(Long id) {
        return taskRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Tarea no encontrada con ID: " + id));
    }

    private void syncStoryCompletion(Long storyId) {
        UserStory story = userStoryRepository.findById(Objects.requireNonNull(storyId)).orElse(null);
        if (story == null) return;

        List<Task> tasks = taskRepository.findByUserStoryId(storyId);
        if (tasks.isEmpty()) {
            return;
        }

        boolean allDone = tasks.stream().allMatch(t -> t.getStatus() == TaskStatus.DONE);
        if (!story.getIsCompleted().equals(allDone)) {
            story.setIsCompleted(allDone);
            userStoryRepository.save(Objects.requireNonNull(story));
        }
    }

    private TaskResponse mapToResponse(Task task) {
        UserStory story = task.getUserStory();
        Sprint sprint = story != null ? story.getSprint() : null;
        com.sena.scrum.model.entity.Project project = story != null ? story.getProject() : null;
        User assignee = task.getAssignedTo();

        boolean hasActiveImpediment = !impedimentRepository.findByTaskIdAndStatus(task.getId(), ImpedimentStatus.OPEN).isEmpty();
        int commentsCount = commentRepository.findByTaskIdOrderByCreatedAtAsc(task.getId()).size();

        java.util.Map<String, Object> assigneeMap = assignee != null ? java.util.Map.of(
                "id", assignee.getId(),
                "fullName", assignee.getFullName(),
                "email", assignee.getEmail()
        ) : null;

        java.util.Map<String, Object> storyMap = story != null ? java.util.Map.of(
                "id", story.getId(),
                "code", story.getCode() != null ? story.getCode() : "",
                "title", story.getTitle() != null ? story.getTitle() : "",
                "priority", story.getPriority() != null ? story.getPriority().name() : "MEDIUM",
                "storyPoints", story.getStoryPoints() != null ? story.getStoryPoints() : 0,
                "isCompleted", Boolean.TRUE.equals(story.getIsCompleted())
        ) : null;

        java.util.Map<String, Object> projectMap = project != null ? java.util.Map.of(
                "id", project.getId(),
                "code", project.getCode() != null ? project.getCode() : "",
                "name", project.getName() != null ? project.getName() : "",
                "myRole", "DEVELOPER"
        ) : null;

        java.util.Map<String, Object> sprintMap = sprint != null ? java.util.Map.of(
                "id", sprint.getId(),
                "name", sprint.getName() != null ? sprint.getName() : "",
                "status", sprint.getStatus() != null ? sprint.getStatus().name() : "PLANNED",
                "startDate", sprint.getStartDate() != null ? sprint.getStartDate().toString() : "",
                "endDate", sprint.getEndDate() != null ? sprint.getEndDate().toString() : ""
        ) : null;

        return TaskResponse.builder()
                .id(task.getId())
                .userStoryId(story != null ? story.getId() : null)
                .userStoryCode(story != null ? story.getCode() : null)
                .userStoryTitle(story != null ? story.getTitle() : null)
                .sprintId(sprint != null ? sprint.getId() : null)
                .sprintName(sprint != null ? sprint.getName() : null)
                .assignedToId(assignee != null ? assignee.getId() : null)
                .assignedToName(assignee != null ? assignee.getFullName() : null)
                .assignedToEmail(assignee != null ? assignee.getEmail() : null)
                .code(task.getCode())
                .description(task.getDescription())
                .status(task.getStatus())
                .hasActiveImpediment(hasActiveImpediment)
                .commentsCount(commentsCount)
                .createdAt(task.getCreatedAt())
                .assignee(assigneeMap)
                .story(storyMap)
                .project(projectMap)
                .sprint(sprintMap)
                .build();
    }
}
