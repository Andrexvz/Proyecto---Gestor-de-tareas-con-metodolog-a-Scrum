package com.sena.scrum.controller;

import com.sena.scrum.model.dto.ProjectMembershipRequest;
import com.sena.scrum.model.dto.ProjectMembershipResponse;
import com.sena.scrum.service.ProjectMembershipService;
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
@Tag(name = "10. Membresías y Roles por Proyecto", description = "Endpoints para asignar y revocar roles Scrum (Product Owner, Scrum Master, Developer) a miembros de proyectos")
@SecurityRequirement(name = "Bearer Authentication")
public class ProjectMembershipController {

    private final ProjectMembershipService membershipService;

    @GetMapping({"/api/v1/projects/{projectId}/memberships", "/api/v1/projects/{projectId}/members"})
    @Operation(summary = "Listar miembros del proyecto", description = "Retorna todos los integrantes del proyecto con su rol Scrum asignado.")
    public ResponseEntity<Map<String, Object>> getMemberships(@PathVariable Long projectId) {
        List<ProjectMembershipResponse> members = membershipService.getMembershipsByProject(projectId);
        return ResponseEntity.ok(Map.of("members", members));
    }

    @PostMapping({"/api/v1/projects/{projectId}/memberships", "/api/v1/projects/{projectId}/members"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER', 'PRODUCT_OWNER')")
    @Operation(summary = "Asignar rol Scrum a miembro", description = "Asocia o actualiza el rol de un usuario en el proyecto.")
    public ResponseEntity<Map<String, Object>> upsertMembership(
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectMembershipRequest request
    ) {
        ProjectMembershipResponse membership = membershipService.upsertMembership(projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("membership", membership));
    }

    @DeleteMapping({"/api/v1/projects/{projectId}/memberships/{userId}", "/api/v1/projects/{projectId}/members/{userId}"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SCRUM_MASTER')")
    @Operation(summary = "Desvincular miembro de proyecto", description = "Elimina la membresía de un usuario en el proyecto.")
    public ResponseEntity<Void> deleteMembership(
            @PathVariable Long projectId,
            @PathVariable Long userId
    ) {
        membershipService.deleteMembership(projectId, userId);
        return ResponseEntity.noContent().build();
    }
}
