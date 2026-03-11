package com.fyp.controllers;

import com.fyp.models.Plan;
import com.fyp.repos.PlanRepository;
import com.fyp.services.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = "http://localhost:5173")
public class PlanController {

    private final PlanRepository planRepository;
    private final ChatService chatService;

    public PlanController(PlanRepository planRepository, ChatService chatService) {
        this.planRepository = planRepository;
        this.chatService = chatService;
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

    @PostMapping("/ai")
    public ResponseEntity<Map<String, String>> parseGoalWithAI(@RequestBody Map<String, String> request) {
        String input = request.get("input");
        if (input == null || input.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Input is required"));
        }

        String result = chatService.parseGoal(input.trim());
        if (result == null) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse goal"));
        }

        return ResponseEntity.ok(Map.of("parsed", result));
    }
}
