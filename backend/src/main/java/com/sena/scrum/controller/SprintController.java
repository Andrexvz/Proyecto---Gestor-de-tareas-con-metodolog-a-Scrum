package com.sena.scrum.controller;

import com.sena.scrum.model.dto.*;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import com.sena.scrum.service.SprintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "3. Ciclos de Sprint", description = "Endpoints para planificación, activación y cierre de Sprints")
@SecurityRequirement(name = "Bearer Authentication")
public class SprintController {

    private final SprintService sprintService;
    private final AuthService authService;

    @GetMapping({"/api/v1/sprints/project/{projectId}", "/api/v1/projects/{projectId}/sprints"})
    @Operation(summary = "Listar Sprints por proyecto", description = "Retorna todos los Sprints planificados, activos y concluidos de un proyecto.")
    public ResponseEntity<List<SprintResponse>> getSprintsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(sprintService.getSprintsByProject(projectId));
    }

    @GetMapping("/api/v1/sprints/{id}")
    @Operation(summary = "Consultar Sprint por ID", description = "Obtiene los detalles del Sprint, objetivo, fechas y métricas de avance.")
    public ResponseEntity<SprintResponse> getSprintById(@PathVariable Long id) {
        return ResponseEntity.ok(sprintService.getSprintById(id));
    }

    @PostMapping({"/api/v1/sprints", "/api/v1/projects/{projectId}/sprints"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Crear nuevo Sprint", description = "Crea un Sprint en estado PLANNED o ACTIVE (validando la regla de único sprint activo).")
    public ResponseEntity<Map<String, Object>> createSprint(
            @PathVariable(required = false) Long projectId,
            @Valid @RequestBody SprintRequest request
    ) {
        if (projectId != null) {
            request.setProjectId(projectId);
        }
        SprintResponse created = sprintService.createSprint(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("sprint", created));
    }

    @PostMapping("/api/v1/sprints/{id}/start")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Iniciar Sprint", description = "Activa el sprint seleccionado.")
    public ResponseEntity<Map<String, Object>> startSprint(@PathVariable Long id) {
        SprintResponse started = sprintService.startSprint(id);
        return ResponseEntity.ok(Map.of("sprint", started));
    }

    @PostMapping("/api/v1/sprints/{id}/close")
    @Operation(summary = "Cerrar Sprint (Scrum Master)", description = "Cierra el Sprint y transfiere historias no completadas.")
    public ResponseEntity<Map<String, Object>> closeSprint(
            @PathVariable Long id,
            @RequestBody(required = false) SprintCloseRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User currentUser = authService.getCurrentUser(authentication.getName());
        SprintCloseRequest closeReq = request != null ? request : new SprintCloseRequest();
        SprintCloseResponse summary = sprintService.closeSprint(id, closeReq, currentUser);
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @PutMapping("/api/v1/sprints/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Actualizar Sprint", description = "Modifica nombre, objetivo y fechas del Sprint.")
    public ResponseEntity<SprintResponse> updateSprint(
            @PathVariable Long id,
            @Valid @RequestBody SprintRequest request
    ) {
        return ResponseEntity.ok(sprintService.updateSprint(id, request));
    }

    @PatchMapping("/api/v1/sprints/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Actualizar estado del Sprint", description = "Transiciona el estado (PLANNED -> ACTIVE -> COMPLETED). Valida único Sprint activo y retorna historias pendientes al Backlog al completar.")
    public ResponseEntity<SprintResponse> updateSprintStatus(
            @PathVariable Long id,
            @Valid @RequestBody SprintStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(sprintService.updateSprintStatus(id, request.getStatus()));
    }

    @DeleteMapping("/api/v1/sprints/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Eliminar Sprint", description = "Elimina un Sprint liberando sus historias asociadas al Product Backlog.")
    public ResponseEntity<Map<String, Object>> deleteSprint(@PathVariable Long id) {
        sprintService.deleteSprint(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
