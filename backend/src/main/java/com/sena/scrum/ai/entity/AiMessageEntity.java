package com.sena.scrum.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiMessageEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "conversation_id", nullable = false, length = 64)
    private String conversationId;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "mode_used", length = 30)
    private String modeUsed;

    @Column(length = 30)
    private String provider;

    @Column(length = 80)
    private String model;

    @Column(length = 10)
    private String feedback;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
