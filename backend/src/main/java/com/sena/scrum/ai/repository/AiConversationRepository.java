package com.sena.scrum.ai.repository;

import com.sena.scrum.ai.entity.AiConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversationEntity, String> {
    List<AiConversationEntity> findByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<AiConversationEntity> findByIdAndUserId(String id, Long userId);
}
