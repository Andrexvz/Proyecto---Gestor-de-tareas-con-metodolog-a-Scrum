package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.ScrumRole;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMembershipResponse {
    private Long id;
    private Long projectId;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private ScrumRole scrumRole;
    private OffsetDateTime createdAt;
}
