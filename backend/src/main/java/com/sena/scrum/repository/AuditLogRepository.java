package com.sena.scrum.repository;

import com.sena.scrum.model.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByActionOrderByTimestampDesc(String action, Pageable pageable);
    List<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
