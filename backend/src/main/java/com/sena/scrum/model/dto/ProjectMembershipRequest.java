package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.ScrumRole;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMembershipRequest {

    @NotNull(message = "El ID del usuario es obligatorio")
    private Long userId;

    @NotNull(message = "El rol Scrum es obligatorio (PRODUCT_OWNER, SCRUM_MASTER, DEVELOPER)")
    private ScrumRole scrumRole;
}
