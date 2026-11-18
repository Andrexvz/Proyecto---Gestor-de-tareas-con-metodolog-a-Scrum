package com.sena.scrum.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectRequest {

    @NotBlank(message = "El código de proyecto es requerido")
    @Size(min = 2, max = 20, message = "El código debe tener entre 2 y 20 caracteres")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "El código solo debe contener letras mayúsculas, números, guiones y guiones bajos")
    private String code;

    @NotBlank(message = "El nombre del proyecto es requerido")
    @Size(min = 3, max = 150, message = "El nombre debe tener entre 3 y 150 caracteres")
    private String name;

    private String description;
}
