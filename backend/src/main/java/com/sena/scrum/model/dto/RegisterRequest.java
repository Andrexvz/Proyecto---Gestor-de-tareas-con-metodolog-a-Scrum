package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "El correo electrónico es requerido")
    @Email(message = "Formato de correo electrónico inválido")
    private String email;

    @NotBlank(message = "El nombre completo es requerido")
    @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
    private String fullName;

    @NotBlank(message = "La contraseña es requerida")
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    private String password;

    @NotNull(message = "El rol es requerido")
    private Role role;

    private String title;
}
