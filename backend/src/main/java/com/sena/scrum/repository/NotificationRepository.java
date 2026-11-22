package com.sena.scrum.repository;

import com.sena.scrum.model.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AppNotification> findByUserIdAndReadStatusFalseOrderByCreatedAtDesc(Long userId);
}
