package com.sena.scrum.model.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {
    private Long id;
    private Long userId;
    private String message;
    private Boolean readStatus;
    private OffsetDateTime createdAt;
}
