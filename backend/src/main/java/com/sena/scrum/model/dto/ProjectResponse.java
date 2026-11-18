package com.sena.scrum.model.dto;

import lombok.*;

import java.time.OffsetDateTime;

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
}
