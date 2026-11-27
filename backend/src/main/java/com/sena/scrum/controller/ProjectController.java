package com.sena.scrum.controller;

import com.sena.scrum.model.dto.ProjectRequest;
import com.sena.scrum.model.dto.ProjectResponse;
import com.sena.scrum.model.dto.ProjectWorkspaceResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import com.sena.scrum.service.ProjectService;
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
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@Tag(name = "2. Gestión de Proyectos", description = "Endpoints para administración de proyectos Scrum")
@SecurityRequirement(name = "Bearer Authentication")
public class ProjectController {

    private final ProjectService projectService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Listar todos los proyectos", description = "Obtiene la lista de proyectos con métricas consolidadas.")
    public ResponseEntity<Map<String, Object>> getAllProjects(Authentication authentication) {
        User currentUser = authentication != null ? authService.getCurrentUser(authentication.getName()) : null;
        List<ProjectResponse> projects = projectService.getAllProjects(currentUser);
        return ResponseEntity.ok(Map.of("projects", projects));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar proyecto por ID", description = "Retorna el detalle completo de un proyecto específico.")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @GetMapping("/{id}/workspace")
    @Operation(summary = "Consultar espacio de trabajo del proyecto", description = "Obtiene el proyecto enriquecido, sprints, historias, tareas, épicas y métricas.")
    public ResponseEntity<ProjectWorkspaceResponse> getProjectWorkspace(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User currentUser = authentication != null ? authService.getCurrentUser(authentication.getName()) : null;
        return ResponseEntity.ok(projectService.getProjectWorkspace(id, currentUser));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Crear nuevo proyecto", description = "Permitido para Administrador y Product Owner.")
    public ResponseEntity<Map<String, Object>> createProject(@Valid @RequestBody ProjectRequest request) {
        ProjectResponse project = projectService.createProject(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("project", project));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Actualizar proyecto existente", description = "Modifica código, nombre y descripción del proyecto.")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectRequest request
    ) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Eliminar proyecto", description = "Acción privilegiada reservada exclusivamente al rol Administrador.")
    public ResponseEntity<Map<String, Object>> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
