package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.SprintStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintRequest {

    @NotNull(message = "El ID del proyecto es requerido")
    private Long projectId;

    @NotBlank(message = "El nombre del Sprint es requerido")
    private String name;

    private String goal;

    @NotNull(message = "La fecha de inicio es requerida")
    private LocalDate startDate;

    @NotNull(message = "La fecha de fin es requerida")
    private LocalDate endDate;

    @Builder.Default
    private SprintStatus status = SprintStatus.PLANNED;
}
