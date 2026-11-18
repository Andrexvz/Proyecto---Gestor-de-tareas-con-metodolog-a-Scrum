package com.sena.scrum.repository;

import com.sena.scrum.model.entity.Sprint;
import com.sena.scrum.model.enums.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProjectId(Long projectId);
    Optional<Sprint> findByProjectIdAndStatus(Long projectId, SprintStatus status);
    boolean existsByProjectIdAndStatus(Long projectId, SprintStatus status);
    boolean existsByProjectIdAndStatusAndIdNot(Long projectId, SprintStatus status, Long id);
}
