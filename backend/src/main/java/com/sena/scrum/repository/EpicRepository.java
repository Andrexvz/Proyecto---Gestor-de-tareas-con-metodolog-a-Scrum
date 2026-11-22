package com.sena.scrum.repository;

import com.sena.scrum.model.entity.Epic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EpicRepository extends JpaRepository<Epic, Long> {
    List<Epic> findByProjectId(Long projectId);
    Optional<Epic> findByProjectIdAndName(Long projectId, String name);
}
