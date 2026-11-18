package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.SprintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintStatusUpdateRequest {

    @NotNull(message = "El nuevo estado del Sprint es requerido")
    private SprintStatus status;
}
