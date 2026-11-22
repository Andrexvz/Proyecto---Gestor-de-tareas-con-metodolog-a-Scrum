package com.sena.scrum.controller;

import com.sena.scrum.model.dto.EpicRequest;
import com.sena.scrum.model.dto.EpicResponse;
import com.sena.scrum.service.EpicService;
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
@Tag(name = "6. Gestión de Épicas (RF3 / HU #4)", description = "Endpoints para crear, consultar, editar y desvincular Épicas de proyectos")
@SecurityRequirement(name = "Bearer Authentication")
public class EpicController {

    private final EpicService epicService;

    @GetMapping("/api/v1/projects/{projectId}/epics")
    @Operation(summary = "Listar Épicas por proyecto", description = "Retorna todas las Épicas agrupadas en un proyecto específico.")
    public ResponseEntity<Map<String, Object>> getEpicsByProject(@PathVariable Long projectId) {
        List<EpicResponse> epics = epicService.getEpicsByProject(projectId);
        return ResponseEntity.ok(Map.of("epics", epics));
    }

    @GetMapping("/api/v1/epics/{id}")
    @Operation(summary = "Consultar Épica por ID", description = "Obtiene los detalles de una Épica.")
    public ResponseEntity<Map<String, Object>> getEpicById(@PathVariable Long id) {
        EpicResponse epic = epicService.getEpicById(id);
        return ResponseEntity.ok(Map.of("epic", epic));
    }

    @PostMapping("/api/v1/projects/{projectId}/epics")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Crear nueva Épica", description = "Registra una Épica con nombre, descripción y color hexadecimal (#RRGGBB).")
    public ResponseEntity<Map<String, Object>> createEpic(
            @PathVariable Long projectId,
            @Valid @RequestBody EpicRequest request
    ) {
        EpicResponse created = epicService.createEpic(projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("epic", created));
    }

    @RequestMapping(value = "/api/v1/epics/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Actualizar Épica", description = "Modifica los atributos visuales o descriptivos de una Épica.")
    public ResponseEntity<Map<String, Object>> updateEpic(
            @PathVariable Long id,
            @Valid @RequestBody EpicRequest request
    ) {
        EpicResponse updated = epicService.updateEpic(id, request);
        return ResponseEntity.ok(Map.of("epic", updated));
    }

    @DeleteMapping("/api/v1/epics/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Eliminar Épica", description = "Elimina la Épica desvinculando de forma segura sus historias asociadas sin borrarlas del Backlog.")
    public ResponseEntity<Void> deleteEpic(@PathVariable Long id) {
        epicService.deleteEpic(id);
        return ResponseEntity.noContent().build();
    }
}
