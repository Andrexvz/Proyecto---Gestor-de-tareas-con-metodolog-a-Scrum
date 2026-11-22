package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.ImpedimentStatus;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImpedimentResponse {
    private Long id;
    private Long taskId;
    private String description;
    private ImpedimentStatus status;
    private Long createdById;
    private String creatorName;
    private OffsetDateTime createdAt;
    private Long resolvedById;
    private String resolverName;
    private OffsetDateTime resolvedAt;
    private String resolutionComment;
}
