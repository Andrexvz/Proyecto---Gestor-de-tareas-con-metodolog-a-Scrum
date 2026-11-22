package com.sena.scrum.controller;

import com.sena.scrum.model.dto.TaskCommentRequest;
import com.sena.scrum.model.dto.TaskCommentResponse;
import com.sena.scrum.model.dto.TaskResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import com.sena.scrum.service.TaskCommentService;
import com.sena.scrum.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "8. Comentarios de Seguimiento (HU #12, RF6)", description = "Endpoints para consultar y publicar notas técnicas en tareas Kanban")
@SecurityRequirement(name = "Bearer Authentication")
public class TaskCommentController {

    private final TaskCommentService commentService;
    private final TaskService taskService;
    private final AuthService authService;

    @GetMapping("/api/v1/tasks/{taskId}/comments")
    @Operation(summary = "Listar comentarios de una tarea", description = "Retorna todos los comentarios registrados en orden cronológico ascendente.")
    public ResponseEntity<Map<String, Object>> getCommentsByTask(
            @PathVariable Long taskId,
            Authentication authentication
    ) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        List<TaskCommentResponse> comments = commentService.getCommentsByTask(taskId, currentUser);
        return ResponseEntity.ok(Map.of("comments", comments));
    }

    @PostMapping("/api/v1/tasks/{taskId}/comments")
    @Operation(summary = "Publicar comentario (Developer y Scrum Master)", description = "Registra una nota de seguimiento técnico de hasta 1000 caracteres.")
    public ResponseEntity<Map<String, Object>> createComment(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskCommentRequest request,
            Authentication authentication
    ) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        TaskCommentResponse comment = commentService.createComment(taskId, request, currentUser);
        TaskResponse task = taskService.getTaskById(taskId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("comment", comment, "task", task));
    }
}
