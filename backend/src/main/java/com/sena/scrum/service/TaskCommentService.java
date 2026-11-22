package com.sena.scrum.service;

import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.TaskCommentRequest;
import com.sena.scrum.model.dto.TaskCommentResponse;
import com.sena.scrum.model.entity.Task;
import com.sena.scrum.model.entity.TaskComment;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.enums.ScrumRole;
import com.sena.scrum.repository.ProjectMembershipRepository;
import com.sena.scrum.repository.TaskCommentRepository;
import com.sena.scrum.repository.TaskRepository;
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
public class TaskCommentService {

    private final TaskCommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<TaskCommentResponse> getCommentsByTask(Long taskId, User currentUser) {
        Task task = taskRepository.findById(Objects.requireNonNull(taskId))
                .orElseThrow(() -> new ResourceNotFoundException("Tarea no encontrada con id: " + taskId));

        Long projectId = task.getUserStory().getProject().getId();
        validateCanRead(currentUser, projectId);

        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskCommentResponse createComment(Long taskId, TaskCommentRequest request, User currentUser) {
        Task task = taskRepository.findById(Objects.requireNonNull(taskId))
                .orElseThrow(() -> new ResourceNotFoundException("Tarea no encontrada con id: " + taskId));

        Long projectId = task.getUserStory().getProject().getId();
        validateCanPost(currentUser, projectId);

        TaskComment comment = TaskComment.builder()
                .task(task)
                .author(currentUser)
                .authorName(currentUser.getFullName())
                .authorEmail(currentUser.getEmail())
                .content(request.getContent().trim())
                .createdAt(OffsetDateTime.now())
                .build();

        TaskComment saved = commentRepository.save(Objects.requireNonNull(comment));

        auditLogService.logEvent(
                currentUser,
                "TASK_COMMENT_CREATED",
                "TASK",
                String.valueOf(task.getId()),
                "Comentario registrado en tarea " + task.getCode() + " por " + currentUser.getFullName()
        );

        return toResponse(saved);
    }

    private void validateCanRead(User user, Long projectId) {
        if ("ADMIN".equals(user.getGlobalRole())) return;
        boolean isMember = membershipRepository.findByProjectIdAndUserId(projectId, user.getId()).isPresent();
        if (!isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes acceso a este proyecto");
        }
    }

    private void validateCanPost(User user, Long projectId) {
        if ("ADMIN".equals(user.getGlobalRole())) return;
        boolean isDevOrSm = membershipRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(m -> m.getScrumRole() == ScrumRole.DEVELOPER || m.getScrumRole() == ScrumRole.SCRUM_MASTER)
                .orElse(false);
        if (!isDevOrSm) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo los roles Developer y Scrum Master del proyecto pueden publicar comentarios (HU #12)");
        }
    }

    public TaskCommentResponse toResponse(TaskComment comment) {
        return TaskCommentResponse.builder()
                .id(comment.getId())
                .taskId(comment.getTask() != null ? comment.getTask().getId() : null)
                .authorId(comment.getAuthor() != null ? comment.getAuthor().getId() : null)
                .authorName(comment.getAuthorName())
                .authorEmail(comment.getAuthorEmail())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
