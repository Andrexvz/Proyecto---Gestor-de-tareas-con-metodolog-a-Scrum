package com.sena.scrum.ai.repository;

import com.sena.scrum.ai.entity.AiUsageLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLogEntity, Long> {
}
