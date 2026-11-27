package com.sena.scrum.controller;

import com.sena.scrum.model.dto.NotificationResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import com.sena.scrum.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "11. Notificaciones de Usuario (RF-15)", description = "Endpoints para consultar y gestionar notificaciones de actividades")
@SecurityRequirement(name = "Bearer Authentication")
public class NotificationController {

    private final NotificationService notificationService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Listar notificaciones del usuario", description = "Obtiene las notificaciones ordenadas por fecha reciente.")
    public ResponseEntity<Map<String, Object>> getNotifications(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User currentUser = authService.getCurrentUser(authentication.getName());
        List<NotificationResponse> list = notificationService.getNotificationsByUser(currentUser.getId());
        return ResponseEntity.ok(Map.of("notifications", list));
    }

    @PostMapping("/read")
    @Operation(summary = "Marcar notificación como leída", description = "Marca una o todas las notificaciones como leídas.")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User currentUser = authService.getCurrentUser(authentication.getName());
        Long notificationId = null;
        if (body != null && body.containsKey("notificationId") && body.get("notificationId") != null) {
            notificationId = Long.valueOf(String.valueOf(body.get("notificationId")));
        }
        notificationService.markAsRead(currentUser.getId(), notificationId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
