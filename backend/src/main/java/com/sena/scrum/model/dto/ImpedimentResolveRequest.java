package com.sena.scrum.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImpedimentResolveRequest {

    @NotBlank(message = "El comentario de resolución es obligatorio")
    @Size(min = 3, max = 500, message = "El comentario de resolución debe tener entre 3 y 500 caracteres")
    private String resolutionComment;
}
