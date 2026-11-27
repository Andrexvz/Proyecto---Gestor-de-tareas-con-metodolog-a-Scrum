package com.sena.scrum.controller;

import com.sena.scrum.model.dto.AuditLogResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuditLogService;
import com.sena.scrum.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "9. Bitácora de Auditoría Inmutable (RNF-06)", description = "Endpoints para consulta de auditoría histórica protegida para Administradores y Scrum Masters")
@SecurityRequirement(name = "Bearer Authentication")
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final AuthService authService;

    @GetMapping("/api/v1/audit-logs")
    @Operation(summary = "Consultar bitácora de auditoría", description = "Obtiene los eventos críticos inmutables del sistema con filtros opcionales.")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "100") int limit,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User currentUser = authService.getCurrentUser(authentication.getName());
        List<AuditLogResponse> logs = auditLogService.getAuditLogs(action, limit, currentUser);
        return ResponseEntity.ok(Map.of("auditLogs", logs));
    }
}
