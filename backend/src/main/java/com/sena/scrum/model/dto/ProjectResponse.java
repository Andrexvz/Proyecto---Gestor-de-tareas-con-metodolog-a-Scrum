package com.sena.scrum.model.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private OffsetDateTime createdAt;
    private int totalSprints;
    private int totalStories;
    private String myRole;
    private SprintResponse activeSprint;
    private int completedStories;
    private int totalPoints;
    private int completedPoints;
    private List<ProjectMembershipResponse> members;
}
