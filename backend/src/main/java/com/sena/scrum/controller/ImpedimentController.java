package com.sena.scrum.controller;

import com.sena.scrum.model.dto.ImpedimentRequest;
import com.sena.scrum.model.dto.ImpedimentResolveRequest;
import com.sena.scrum.model.dto.ImpedimentResponse;
import com.sena.scrum.model.dto.TaskResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import com.sena.scrum.service.ImpedimentService;
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
@Tag(name = "7. Gestión de Impedimentos (RF5, RF6, HU #9)", description = "Endpoints para registro y resolución de bloqueos técnicos en tareas Kanban")
@SecurityRequirement(name = "Bearer Authentication")
public class ImpedimentController {

    private final ImpedimentService impedimentService;
    private final TaskService taskService;
    private final AuthService authService;

    @GetMapping("/api/v1/tasks/{taskId}/impediments")
    @Operation(summary = "Listar impedimentos de una tarea", description = "Retorna el historial de bloqueos abiertos y resueltos asociados a una tarea.")
    public ResponseEntity<Map<String, Object>> getImpedimentsByTask(@PathVariable Long taskId) {
        List<ImpedimentResponse> list = impedimentService.getImpedimentsByTask(taskId);
        return ResponseEntity.ok(Map.of("impediments", list));
    }

    @PostMapping("/api/v1/tasks/{taskId}/impediments")
    @Operation(summary = "Reportar nuevo impedimento (Developer y Scrum Master)", description = "Bloquea una tarea Kanban con una descripción de al menos 5 caracteres.")
    public ResponseEntity<Map<String, Object>> createImpediment(
            @PathVariable Long taskId,
            @Valid @RequestBody ImpedimentRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User currentUser = authService.getCurrentUser(authentication.getName());
        ImpedimentResponse impediment = impedimentService.createImpediment(taskId, request, currentUser);
        TaskResponse task = taskService.getTaskById(taskId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("impediment", impediment, "task", task));
    }

    @PatchMapping("/api/v1/impediments/{impedimentId}/resolve")
    @Operation(summary = "Resolver impedimento (Exclusivo Scrum Master)", description = "Desbloquea la tarea registrando las notas de resolución.")
    public ResponseEntity<Map<String, Object>> resolveImpediment(
            @PathVariable Long impedimentId,
            @Valid @RequestBody ImpedimentResolveRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User currentUser = authService.getCurrentUser(authentication.getName());
        ImpedimentResponse impediment = impedimentService.resolveImpediment(impedimentId, request, currentUser);
        TaskResponse task = taskService.getTaskById(impediment.getTaskId());
        return ResponseEntity.ok(Map.of("impediment", impediment, "task", task));
    }
}
