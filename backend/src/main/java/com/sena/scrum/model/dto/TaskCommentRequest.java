package com.sena.scrum.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskCommentRequest {

    @NotBlank(message = "El contenido del comentario no puede estar vacío")
    @Size(min = 1, max = 1000, message = "El comentario no puede exceder 1000 caracteres")
    private String content;
}
