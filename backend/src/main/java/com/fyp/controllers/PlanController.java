package com.fyp.controllers;

import com.fyp.models.Plan;
import com.fyp.repos.PlanRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = "http://localhost:5173")
public class PlanController {

    private final PlanRepository planRepository;

    public PlanController(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @GetMapping
    public List<Plan> getPlans(@RequestParam Long userId) {
        return planRepository.findByUserId(userId);
    }

    @PostMapping
    public Plan createPlan(@RequestParam Long userId, @RequestBody Plan plan) {
        plan.setUserId(userId);
        return planRepository.save(plan);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plan> updatePlan(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Plan plan) {
        return planRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setTitle(plan.getTitle());
                    existing.setTargetAmount(plan.getTargetAmount());
                    existing.setCurrentAmount(plan.getCurrentAmount());
                    existing.setTargetDate(plan.getTargetDate());
                    existing.setType(plan.getType());
                    return ResponseEntity.ok(planRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id, @RequestParam Long userId) {
        return planRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    planRepository.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<Plan> updateProgress(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestParam double amount) {
        return planRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setCurrentAmount(existing.getCurrentAmount() + amount);
                    return ResponseEntity.ok(planRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
