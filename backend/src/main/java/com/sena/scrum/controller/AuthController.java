package com.sena.scrum.controller;

import com.sena.scrum.model.dto.*;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "1. Autenticación y Autorización", description = "Endpoints públicos para inicio de sesión, registro y emisión de tokens JWT")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Autentica credenciales y genera un token JWT con vigencia de 24 horas y los roles del usuario.")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse auth = authService.login(request);
        Map<String, Object> userMap = Map.of(
                "id", auth.getId(),
                "email", auth.getEmail(),
                "fullName", auth.getFullName(),
                "role", auth.getRole(),
                "title", auth.getTitle() != null ? auth.getTitle() : ""
        );
        return ResponseEntity.ok(Map.of(
                "token", auth.getToken(),
                "user", userMap
        ));
    }

    @GetMapping("/me")
    @Operation(summary = "Perfil de usuario autenticado", description = "Retorna la información del usuario autenticado vía JWT.")
    public ResponseEntity<Map<String, Object>> getMe(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        }
        User user = authService.getCurrentUser(authentication.getName());
        Map<String, Object> userMap = Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "role", user.getRole(),
                "globalRole", user.getGlobalRole() != null ? user.getGlobalRole() : "USER",
                "title", user.getTitle() != null ? user.getTitle() : ""
        );
        return ResponseEntity.ok(Map.of("user", userMap));
    }

    @PostMapping("/register")
    @Operation(summary = "Registrar nuevo usuario", description = "Registra un usuario en la plataforma con contraseña encriptada (BCrypt) y rol Scrum.")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Solicitar recuperación de contraseña (RF-16)", description = "Genera token criptográfico de 128-bit con validez de 15 minutos.")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Restablecer contraseña (RF-16)", description = "Actualiza la contraseña y revoca el token para uso único.")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }
}
