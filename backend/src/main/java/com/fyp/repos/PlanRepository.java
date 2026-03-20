package com.fyp.repos;

import com.fyp.models.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    List<Plan> findByUserId(Long userId);
    List<Plan> findByUserIdAndIsActiveTrue(Long userId);
    List<Plan> findByUserIdAndFamily(Long userId, String family);
    List<Plan> findByUserIdAndFamilyAndIsActiveTrue(Long userId, String family);
}
