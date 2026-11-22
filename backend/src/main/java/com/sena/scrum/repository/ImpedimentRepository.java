package com.sena.scrum.repository;

import com.sena.scrum.model.entity.Impediment;
import com.sena.scrum.model.enums.ImpedimentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImpedimentRepository extends JpaRepository<Impediment, Long> {
    List<Impediment> findByTaskId(Long taskId);
    List<Impediment> findByTaskIdAndStatus(Long taskId, ImpedimentStatus status);
}
