package com.sena.scrum.model.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EpicResponse {
    private Long id;
    private Long projectId;
    private String name;
    private String description;
    private String colorHex;
    private OffsetDateTime createdAt;
}
