package com.sena.scrum.controller;

import com.sena.scrum.model.dto.RegisterRequest;
import com.sena.scrum.model.dto.TaskResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.repository.UserRepository;
import com.sena.scrum.service.AuthService;
import com.sena.scrum.service.TaskService;
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
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Tag(name = "12. Gestión de Usuarios y Asignaciones", description = "Endpoints para consulta de usuarios y tareas asignadas al usuario activo")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final TaskService taskService;

    @GetMapping("/api/v1/users")
    @Operation(summary = "Listar todos los usuarios del sistema", description = "Retorna el directorio de usuarios registrados para asignaciones de equipo y tareas.")
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        List<Map<String, Object>> list = userRepository.findAll().stream().map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "email", u.getEmail(),
                "fullName", u.getFullName(),
                "role", u.getRole() != null ? u.getRole().name() : "ROLE_USER",
                "globalRole", u.getGlobalRole() != null ? u.getGlobalRole() : "USER",
                "title", u.getTitle() != null ? u.getTitle() : ""
        )).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("users", list));
    }

    @PostMapping("/api/v1/users")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Registrar nuevo usuario desde panel administrativo", description = "Permite al Administrador registrar nuevos colaboradores.")
    public ResponseEntity<Map<String, Object>> createUserAdmin(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("user", authService.register(request)));
    }

    @GetMapping("/api/v1/users/me/tasks")
    @Operation(summary = "Consultar tareas asignadas al usuario (Mi Trabajo)", description = "Obtiene las tareas asignadas al usuario actual o el scope general del equipo.")
    public ResponseEntity<Map<String, Object>> getMyTasks(
            @RequestParam(defaultValue = "me") String scope,
            Authentication authentication
    ) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        List<TaskResponse> tasks = taskService.getMyTasks(currentUser, scope);
        return ResponseEntity.ok(Map.of("tasks", tasks));
    }
}
