package com.sena.scrum.model.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskCommentResponse {
    private Long id;
    private Long taskId;
    private Long authorId;
    private String authorName;
    private String authorEmail;
    private String content;
    private OffsetDateTime createdAt;
}
