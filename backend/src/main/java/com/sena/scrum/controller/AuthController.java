package com.sena.scrum.controller;

import com.sena.scrum.model.dto.AuthResponse;
import com.sena.scrum.model.dto.LoginRequest;
import com.sena.scrum.model.dto.RegisterRequest;
import com.sena.scrum.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "1. Autenticación y Autorización", description = "Endpoints públicos para inicio de sesión, registro y emisión de tokens JWT")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Autentica credenciales y genera un token JWT con vigencia de 24 horas y los roles del usuario.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Registrar nuevo usuario", description = "Registra un usuario en la plataforma con contraseña encriptada (BCrypt) y rol Scrum.")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }
}
