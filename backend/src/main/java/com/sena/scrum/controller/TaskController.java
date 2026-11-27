package com.sena.scrum.controller;

import com.sena.scrum.model.dto.KanbanStatusUpdateRequest;
import com.sena.scrum.model.dto.TaskRequest;
import com.sena.scrum.model.dto.TaskResponse;
import com.sena.scrum.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "5. Tareas Técnicas & Tablero Kanban", description = "Endpoints para tareas operativas y movimiento entre columnas del tablero Kanban (TODO, IN_PROGRESS, TESTING, DONE)")
@SecurityRequirement(name = "Bearer Authentication")
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/api/v1/tasks/sprint/{sprintId}")
    @Operation(summary = "Listar tareas para el Tablero Kanban del Sprint", description = "Obtiene todas las tareas asociadas a las historias de un Sprint específico.")
    public ResponseEntity<List<TaskResponse>> getTasksBySprint(@PathVariable Long sprintId) {
        return ResponseEntity.ok(taskService.getTasksBySprint(sprintId));
    }

    @GetMapping("/api/v1/tasks/story/{storyId}")
    @Operation(summary = "Listar tareas de una Historia de Usuario", description = "Obtiene las subtareas técnicas pertenecientes a una historia.")
    public ResponseEntity<List<TaskResponse>> getTasksByStory(@PathVariable Long storyId) {
        return ResponseEntity.ok(taskService.getTasksByStory(storyId));
    }

    @GetMapping("/api/v1/tasks/{id}")
    @Operation(summary = "Consultar tarea por ID", description = "Retorna el detalle, asignatario, historia y estado de la tarea.")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @PostMapping({"/api/v1/tasks", "/api/v1/stories/{storyId}/tasks"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'DEVELOPER')")
    @Operation(summary = "Crear tarea técnica", description = "Permite registrar una nueva tarea vinculada a una historia de usuario.")
    public ResponseEntity<Map<String, Object>> createTask(
            @PathVariable(required = false) Long storyId,
            @Valid @RequestBody TaskRequest request
    ) {
        if (storyId != null) {
            request.setUserStoryId(storyId);
        }
        TaskResponse created = taskService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("task", created));
    }

    @PutMapping("/api/v1/tasks/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'DEVELOPER')")
    @Operation(summary = "Actualizar tarea técnica", description = "Modifica código, descripción, usuario asignado o estado de la tarea.")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request
    ) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }

    @PatchMapping("/api/v1/tasks/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'DEVELOPER')")
    @Operation(summary = "Modificar campos de tarea", description = "Actualiza parcialmente la tarea.")
    public ResponseEntity<Map<String, Object>> patchTask(
            @PathVariable Long id,
            @RequestBody TaskRequest request
    ) {
        TaskResponse updated = taskService.updateTask(id, request);
        return ResponseEntity.ok(Map.of("task", updated));
    }

    @PatchMapping("/api/v1/tasks/{id}/kanban-status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'DEVELOPER')")
    @Operation(summary = "Actualizar estado en el Tablero Kanban", description = "Mueve una tarea entre las columnas (TODO, IN_PROGRESS, TESTING, DONE) con sincronización automática del estado de la historia.")
    public ResponseEntity<Map<String, Object>> updateKanbanStatus(
            @PathVariable Long id,
            @Valid @RequestBody KanbanStatusUpdateRequest request
    ) {
        TaskResponse updated = taskService.updateKanbanStatus(id, request.getStatus());
        return ResponseEntity.ok(Map.of("task", updated, "status", updated.getStatus().name()));
    }

    @DeleteMapping("/api/v1/tasks/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'DEVELOPER')")
    @Operation(summary = "Eliminar tarea", description = "Elimina una tarea técnica y recalcula el progreso de la historia de usuario.")
    public ResponseEntity<Map<String, Object>> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
