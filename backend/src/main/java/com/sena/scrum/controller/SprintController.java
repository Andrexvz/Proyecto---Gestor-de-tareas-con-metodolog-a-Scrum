package com.sena.scrum.controller;

import com.sena.scrum.model.dto.SprintRequest;
import com.sena.scrum.model.dto.SprintResponse;
import com.sena.scrum.model.dto.SprintStatusUpdateRequest;
import com.sena.scrum.service.SprintService;
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

@RestController
@RequestMapping("/api/v1/sprints")
@RequiredArgsConstructor
@Tag(name = "3. Ciclos de Sprint", description = "Endpoints para planificación, activación y cierre de Sprints")
@SecurityRequirement(name = "Bearer Authentication")
public class SprintController {

    private final SprintService sprintService;

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Listar Sprints por proyecto", description = "Retorna todos los Sprints planificados, activos y concluidos de un proyecto.")
    public ResponseEntity<List<SprintResponse>> getSprintsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(sprintService.getSprintsByProject(projectId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar Sprint por ID", description = "Obtiene los detalles del Sprint, objetivo, fechas y métricas de avance.")
    public ResponseEntity<SprintResponse> getSprintById(@PathVariable Long id) {
        return ResponseEntity.ok(sprintService.getSprintById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Crear nuevo Sprint", description = "Crea un Sprint en estado PLANNED o ACTIVE (validando la regla de único sprint activo).")
    public ResponseEntity<SprintResponse> createSprint(@Valid @RequestBody SprintRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sprintService.createSprint(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Actualizar Sprint", description = "Modifica nombre, objetivo y fechas del Sprint.")
    public ResponseEntity<SprintResponse> updateSprint(
            @PathVariable Long id,
            @Valid @RequestBody SprintRequest request
    ) {
        return ResponseEntity.ok(sprintService.updateSprint(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Actualizar estado del Sprint", description = "Transiciona el estado (PLANNED -> ACTIVE -> COMPLETED). Valida único Sprint activo y retorna historias pendientes al Backlog al completar.")
    public ResponseEntity<SprintResponse> updateSprintStatus(
            @PathVariable Long id,
            @Valid @RequestBody SprintStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(sprintService.updateSprintStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Eliminar Sprint", description = "Elimina un Sprint liberando sus historias asociadas al Product Backlog.")
    public ResponseEntity<Void> deleteSprint(@PathVariable Long id) {
        sprintService.deleteSprint(id);
        return ResponseEntity.noContent().build();
    }
}
