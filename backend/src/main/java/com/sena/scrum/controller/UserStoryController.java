package com.sena.scrum.controller;

import com.sena.scrum.model.dto.AiStoryGenerateRequest;
import com.sena.scrum.model.dto.AiStoryGenerateResponse;
import com.sena.scrum.model.dto.UserStoryRequest;
import com.sena.scrum.model.dto.UserStoryResponse;
import com.sena.scrum.service.AiStoryService;
import com.sena.scrum.service.UserStoryService;
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
@RequestMapping("/api/v1/stories")
@RequiredArgsConstructor
@Tag(name = "4. Historias de Usuario & Backlog", description = "Endpoints para gestión del Product Backlog, Sprint Backlog y generación asistida por IA")
@SecurityRequirement(name = "Bearer Authentication")
public class UserStoryController {

    private final UserStoryService userStoryService;
    private final AiStoryService aiStoryService;

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Listar todas las historias de un proyecto", description = "Retorna todas las historias asociadas a un proyecto sin importar su Sprint.")
    public ResponseEntity<List<UserStoryResponse>> getStoriesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(userStoryService.getStoriesByProject(projectId));
    }

    @GetMapping("/project/{projectId}/product-backlog")
    @Operation(summary = "Consultar Product Backlog", description = "Obtiene las historias que aún no han sido comprometidas en ningún Sprint.")
    public ResponseEntity<List<UserStoryResponse>> getProductBacklog(@PathVariable Long projectId) {
        return ResponseEntity.ok(userStoryService.getProductBacklog(projectId));
    }

    @GetMapping("/sprint/{sprintId}")
    @Operation(summary = "Consultar Sprint Backlog", description = "Obtiene las historias comprometidas en un Sprint específico.")
    public ResponseEntity<List<UserStoryResponse>> getSprintBacklog(@PathVariable Long sprintId) {
        return ResponseEntity.ok(userStoryService.getSprintBacklog(sprintId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar Historia por ID", description = "Detalle completo de la historia con criterios de aceptación y avance.")
    public ResponseEntity<UserStoryResponse> getStoryById(@PathVariable Long id) {
        return ResponseEntity.ok(userStoryService.getStoryById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Crear Historia de Usuario", description = "Permitido para Product Owner y Administrador. Si sprintId es nulo, ingresa al Product Backlog.")
    public ResponseEntity<UserStoryResponse> createStory(@Valid @RequestBody UserStoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userStoryService.createStory(request));
    }

    @PostMapping("/ai-generate")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER', 'SCRUM_MASTER')")
    @Operation(summary = "Generar Historia y Criterios Gherkin con IA", description = "Transforma una necesidad de negocio en formato estándar Scrum (Como/Quiero/Para) con 3 escenarios de aceptación Gherkin (Dado/Cuando/Entonces), estimación Fibonacci y prioridad recomendada.")
    public ResponseEntity<AiStoryGenerateResponse> generateWithAi(@Valid @RequestBody AiStoryGenerateRequest request) {
        return ResponseEntity.ok(aiStoryService.generateStoryWithAi(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Actualizar Historia de Usuario", description = "Modifica título, descripción, criterios, puntos o prioridad.")
    public ResponseEntity<UserStoryResponse> updateStory(
            @PathVariable Long id,
            @Valid @RequestBody UserStoryRequest request
    ) {
        return ResponseEntity.ok(userStoryService.updateStory(id, request));
    }

    @PatchMapping("/{id}/assign-sprint")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER', 'SCRUM_MASTER')")
    @Operation(summary = "Asignar o desasignar historia a un Sprint", description = "Asigna una historia a un Sprint o envía sprintId=null para devolverla al Product Backlog.")
    public ResponseEntity<UserStoryResponse> assignStoryToSprint(
            @PathVariable Long id,
            @RequestParam(required = false) Long sprintId
    ) {
        return ResponseEntity.ok(userStoryService.assignStoryToSprint(id, sprintId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Eliminar Historia de Usuario", description = "Elimina la historia y sus tareas hijas asociadas.")
    public ResponseEntity<Void> deleteStory(@PathVariable Long id) {
        userStoryService.deleteStory(id);
        return ResponseEntity.noContent().build();
    }
}
