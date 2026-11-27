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
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "4. Historias de Usuario & Backlog", description = "Endpoints para gestión del Product Backlog, Sprint Backlog y generación asistida por IA")
@SecurityRequirement(name = "Bearer Authentication")
public class UserStoryController {

    private final UserStoryService userStoryService;
    private final AiStoryService aiStoryService;

    @GetMapping("/api/v1/stories/project/{projectId}")
    @Operation(summary = "Listar todas las historias de un proyecto", description = "Retorna todas las historias asociadas a un proyecto sin importar su Sprint.")
    public ResponseEntity<List<UserStoryResponse>> getStoriesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(userStoryService.getStoriesByProject(projectId));
    }

    @GetMapping("/api/v1/stories/project/{projectId}/product-backlog")
    @Operation(summary = "Consultar Product Backlog", description = "Obtiene las historias que aún no han sido comprometidas en ningún Sprint.")
    public ResponseEntity<List<UserStoryResponse>> getProductBacklog(@PathVariable Long projectId) {
        return ResponseEntity.ok(userStoryService.getProductBacklog(projectId));
    }

    @GetMapping("/api/v1/stories/sprint/{sprintId}")
    @Operation(summary = "Consultar Sprint Backlog", description = "Obtiene las historias comprometidas en un Sprint específico.")
    public ResponseEntity<List<UserStoryResponse>> getSprintBacklog(@PathVariable Long sprintId) {
        return ResponseEntity.ok(userStoryService.getSprintBacklog(sprintId));
    }

    @GetMapping("/api/v1/stories/{id}")
    @Operation(summary = "Consultar Historia por ID", description = "Detalle completo de la historia con criterios de aceptación y avance.")
    public ResponseEntity<UserStoryResponse> getStoryById(@PathVariable Long id) {
        return ResponseEntity.ok(userStoryService.getStoryById(id));
    }

    @PostMapping({"/api/v1/stories", "/api/v1/projects/{projectId}/stories"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Crear Historia de Usuario", description = "Permitido para Product Owner y Administrador. Si sprintId es nulo, ingresa al Product Backlog.")
    public ResponseEntity<Map<String, Object>> createStory(
            @PathVariable(required = false) Long projectId,
            @Valid @RequestBody UserStoryRequest request
    ) {
        if (projectId != null) {
            request.setProjectId(projectId);
        }
        UserStoryResponse story = userStoryService.createStory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("story", story));
    }

    @PostMapping({"/api/v1/stories/ai-generate", "/api/v1/ai/generate-story"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER', 'SCRUM_MASTER')")
    @Operation(summary = "Generar Historia y Criterios Gherkin con IA", description = "Transforma una necesidad de negocio en formato estándar Scrum con 3 escenarios Gherkin.")
    public ResponseEntity<Map<String, Object>> generateWithAi(@Valid @RequestBody AiStoryGenerateRequest request) {
        AiStoryGenerateResponse response = aiStoryService.generateStoryWithAi(request);
        return ResponseEntity.ok(Map.of(
                "draft", Map.of(
                        "role", request.getUserRole() != null ? request.getUserRole() : "usuario del sistema",
                        "action", response.getTitle() != null ? response.getTitle() : request.getPrompt(),
                        "benefit", "agilizar la entrega de valor",
                        "acceptanceCriteria", response.getGherkinCriteria() != null ? response.getGherkinCriteria() : List.of()
                ),
                "response", response
        ));
    }

    @RequestMapping(value = "/api/v1/stories/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER', 'SCRUM_MASTER')")
    @Operation(summary = "Actualizar Historia de Usuario", description = "Modifica título, descripción, criterios, puntos o prioridad.")
    public ResponseEntity<Map<String, Object>> updateStory(
            @PathVariable Long id,
            @RequestBody UserStoryRequest request
    ) {
        UserStoryResponse story = userStoryService.updateStory(id, request);
        return ResponseEntity.ok(Map.of("story", story));
    }

    @PatchMapping({"/api/v1/stories/{id}/assign-sprint", "/api/v1/stories/{id}/sprint"})
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER', 'SCRUM_MASTER')")
    @Operation(summary = "Asignar o desasignar historia a un Sprint", description = "Asigna una historia a un Sprint o envía sprintId=null para devolverla al Product Backlog.")
    public ResponseEntity<Map<String, Object>> assignStoryToSprint(
            @PathVariable Long id,
            @RequestParam(required = false) Long sprintId,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        Long targetSprintId = sprintId;
        if (body != null && body.containsKey("sprintId")) {
            Object sVal = body.get("sprintId");
            targetSprintId = sVal != null ? Long.valueOf(String.valueOf(sVal)) : null;
        }
        UserStoryResponse story = userStoryService.assignStoryToSprint(id, targetSprintId);
        return ResponseEntity.ok(Map.of("story", story));
    }

    @DeleteMapping("/api/v1/stories/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'PRODUCT_OWNER')")
    @Operation(summary = "Eliminar Historia de Usuario", description = "Elimina la historia y sus tareas hijas asociadas.")
    public ResponseEntity<Map<String, Object>> deleteStory(@PathVariable Long id) {
        userStoryService.deleteStory(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
