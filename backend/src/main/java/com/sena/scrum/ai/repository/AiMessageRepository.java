package com.sena.scrum.ai.repository;

import com.sena.scrum.ai.entity.AiMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiMessageRepository extends JpaRepository<AiMessageEntity, String> {
    List<AiMessageEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);
}
