package com.sena.scrum.service;

import com.sena.scrum.exception.BusinessRuleException;
import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.*;
import com.sena.scrum.model.entity.*;
import com.sena.scrum.model.enums.ImpedimentStatus;
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
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserStoryRepository userStoryRepository;
    private final TaskRepository taskRepository;
    private final EpicRepository epicRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final ImpedimentRepository impedimentRepository;
    private final TaskCommentRepository commentRepository;

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects(User user) {
        List<Project> list;
        if (user == null || "ADMIN".equals(user.getGlobalRole())) {
            list = projectRepository.findAll();
        } else {
            Set<Long> userProjectIds = membershipRepository.findByUserId(user.getId()).stream()
                    .map(m -> m.getProject().getId())
                    .collect(Collectors.toSet());
            list = projectRepository.findAll().stream()
                    .filter(p -> userProjectIds.contains(p.getId()))
                    .collect(Collectors.toList());
        }
        return list.stream().map(p -> mapToResponse(p, user)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id) {
        Project project = findEntityById(id);
        return mapToResponse(project);
    }

    @Transactional(readOnly = true)
    public ProjectWorkspaceResponse getProjectWorkspace(Long id, User user) {
        Project project = findEntityById(id);
        ProjectResponse projectResponse = mapToResponse(project, user);

        List<Sprint> sprints = sprintRepository.findByProjectId(id);
        List<SprintResponse> sprintResponses = sprints.stream().map(this::mapSprintToResponse).collect(Collectors.toList());

        List<UserStory> stories = userStoryRepository.findByProjectId(id);
        List<UserStoryResponse> storyResponses = stories.stream().map(this::mapStoryToResponse).collect(Collectors.toList());

        List<Long> storyIds = stories.stream().map(UserStory::getId).toList();
        List<Task> tasks = storyIds.isEmpty() ? Collections.emptyList() : taskRepository.findAll().stream()
                .filter(t -> t.getUserStory() != null && storyIds.contains(t.getUserStory().getId()))
                .collect(Collectors.toList());
        List<TaskResponse> taskResponses = tasks.stream().map(this::mapTaskToResponse).collect(Collectors.toList());

        List<Epic> epics = epicRepository.findByProjectId(id);
        List<EpicResponse> epicResponses = epics.stream().map(this::mapEpicToResponse).collect(Collectors.toList());

        List<SprintMetricResponse> metrics = sprints.stream().map(sp -> {
            List<UserStory> spStories = stories.stream()
                    .filter(st -> st.getSprint() != null && st.getSprint().getId().equals(sp.getId()))
                    .toList();
            List<UserStory> completed = spStories.stream()
                    .filter(st -> Boolean.TRUE.equals(st.getIsCompleted()))
                    .toList();
            int planned = spStories.stream().mapToInt(st -> st.getStoryPoints() != null ? st.getStoryPoints() : 0).sum();
            int compPoints = completed.stream().mapToInt(st -> st.getStoryPoints() != null ? st.getStoryPoints() : 0).sum();
            return SprintMetricResponse.builder()
                    .sprintId(sp.getId())
                    .sprintName(sp.getName())
                    .status(sp.getStatus())
                    .startDate(sp.getStartDate())
                    .endDate(sp.getEndDate())
                    .plannedPoints(planned)
                    .completedPoints(compPoints)
                    .totalStories(spStories.size())
                    .completedStories(completed.size())
                    .build();
        }).collect(Collectors.toList());

        return ProjectWorkspaceResponse.builder()
                .project(projectResponse)
                .sprints(sprintResponses)
                .stories(storyResponses)
                .tasks(taskResponses)
                .metrics(metrics)
                .epics(epicResponses)
                .build();
    }

    @Transactional
    public ProjectResponse createProject(ProjectRequest request) {
        String code = request.getCode().toUpperCase().trim();
        if (projectRepository.existsByCode(code)) {
            throw new BusinessRuleException("Ya existe un proyecto con el código: " + code);
        }

        Project project = Project.builder()
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription())
                .build();

        return mapToResponse(projectRepository.save(Objects.requireNonNull(project)));
    }

    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request) {
        Project project = findEntityById(id);

        String newCode = request.getCode().toUpperCase().trim();
        if (!project.getCode().equalsIgnoreCase(newCode) && projectRepository.existsByCode(newCode)) {
            throw new BusinessRuleException("Ya existe otro proyecto con el código: " + newCode);
        }

        project.setCode(newCode);
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());

        return mapToResponse(projectRepository.save(Objects.requireNonNull(project)));
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = findEntityById(id);
        projectRepository.delete(Objects.requireNonNull(project));
    }

    public Project findEntityById(Long id) {
        return projectRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con ID: " + id));
    }

    public ProjectResponse mapToResponse(Project project) {
        return mapToResponse(project, null);
    }

    public ProjectResponse mapToResponse(Project project, User user) {
        String myRole = "ADMIN";
        if (user != null && !"ADMIN".equals(user.getGlobalRole())) {
            myRole = membershipRepository.findByProjectIdAndUserId(project.getId(), user.getId())
                    .map(m -> m.getScrumRole().name())
                    .orElse("DEVELOPER");
        }
        Sprint active = sprintRepository.findByProjectIdAndStatus(project.getId(), SprintStatus.ACTIVE).stream().findFirst().orElse(null);
        List<UserStory> pStories = userStoryRepository.findByProjectId(project.getId());
        int totalStories = pStories.size();
        int completedStories = (int) pStories.stream().filter(s -> Boolean.TRUE.equals(s.getIsCompleted())).count();
        int totalPoints = pStories.stream().mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
        int completedPoints = pStories.stream().filter(s -> Boolean.TRUE.equals(s.getIsCompleted())).mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();

        List<ProjectMembershipResponse> members = membershipRepository.findByProjectId(project.getId()).stream()
                .map(pm -> ProjectMembershipResponse.builder()
                        .id(pm.getId())
                        .projectId(project.getId())
                        .userId(pm.getUser().getId())
                        .userFullName(pm.getUser().getFullName())
                        .userEmail(pm.getUser().getEmail())
                        .scrumRole(pm.getScrumRole())
                        .createdAt(pm.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .code(project.getCode())
                .name(project.getName())
                .description(project.getDescription())
                .createdAt(project.getCreatedAt())
                .totalSprints(sprintRepository.findByProjectId(project.getId()).size())
                .totalStories(totalStories)
                .myRole(myRole)
                .activeSprint(active != null ? mapSprintToResponse(active) : null)
                .completedStories(completedStories)
                .totalPoints(totalPoints)
                .completedPoints(completedPoints)
                .members(members)
                .build();
    }

    private SprintResponse mapSprintToResponse(Sprint sprint) {
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
                .totalStories(sprint.getUserStories() != null ? sprint.getUserStories().size() : 0)
                .build();
    }

    private UserStoryResponse mapStoryToResponse(UserStory s) {
        int totalTasks = s.getTasks() != null ? s.getTasks().size() : 0;
        int completedTasks = s.getTasks() != null ? (int) s.getTasks().stream().filter(t -> t.getStatus() == TaskStatus.DONE).count() : 0;
        return UserStoryResponse.builder()
                .id(s.getId())
                .projectId(s.getProject().getId())
                .projectCode(s.getProject().getCode())
                .projectName(s.getProject().getName())
                .sprintId(s.getSprint() != null ? s.getSprint().getId() : null)
                .sprintName(s.getSprint() != null ? s.getSprint().getName() : null)
                .epicId(s.getEpic() != null ? s.getEpic().getId() : null)
                .epicName(s.getEpic() != null ? s.getEpic().getName() : null)
                .epicColorHex(s.getEpic() != null ? s.getEpic().getColorHex() : null)
                .code(s.getCode())
                .title(s.getTitle())
                .description(s.getDescription())
                .acceptanceCriteria(UserStoryService.parseCriteria(s.getAcceptanceCriteria()))
                .priority(s.getPriority())
                .storyPoints(s.getStoryPoints())
                .isCompleted(Boolean.TRUE.equals(s.getIsCompleted()))
                .createdAt(s.getCreatedAt())
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .build();
    }

    private EpicResponse mapEpicToResponse(Epic e) {
        return EpicResponse.builder()
                .id(e.getId())
                .projectId(e.getProject().getId())
                .name(e.getName())
                .description(e.getDescription())
                .colorHex(e.getColorHex())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private TaskResponse mapTaskToResponse(Task task) {
        UserStory story = task.getUserStory();
        Sprint sprint = story != null ? story.getSprint() : null;
        Project project = story != null ? story.getProject() : null;
        User assignee = task.getAssignedTo();

        boolean hasActive = !impedimentRepository.findByTaskIdAndStatus(task.getId(), ImpedimentStatus.OPEN).isEmpty();
        int commentsCount = commentRepository.findByTaskIdOrderByCreatedAtAsc(task.getId()).size();

        Map<String, Object> assigneeMap = assignee != null ? Map.of(
                "id", assignee.getId(),
                "fullName", assignee.getFullName(),
                "email", assignee.getEmail()
        ) : null;

        Map<String, Object> storyMap = story != null ? Map.of(
                "id", story.getId(),
                "code", story.getCode() != null ? story.getCode() : "",
                "title", story.getTitle() != null ? story.getTitle() : "",
                "priority", story.getPriority() != null ? story.getPriority().name() : "MEDIUM",
                "storyPoints", story.getStoryPoints() != null ? story.getStoryPoints() : 0,
                "isCompleted", Boolean.TRUE.equals(story.getIsCompleted())
        ) : null;

        Map<String, Object> projectMap = project != null ? Map.of(
                "id", project.getId(),
                "code", project.getCode() != null ? project.getCode() : "",
                "name", project.getName() != null ? project.getName() : "",
                "myRole", "DEVELOPER"
        ) : null;

        Map<String, Object> sprintMap = sprint != null ? Map.of(
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
                .hasActiveImpediment(hasActive)
                .commentsCount(commentsCount)
                .createdAt(task.getCreatedAt())
                .assignee(assigneeMap)
                .story(storyMap)
                .project(projectMap)
                .sprint(sprintMap)
                .build();
    }
}
