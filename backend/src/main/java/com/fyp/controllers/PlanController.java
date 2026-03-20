package com.fyp.controllers;

import com.fyp.models.Plan;
import com.fyp.models.dto.PlanConfirmDTO;
import com.fyp.models.dto.PlanCreateDTO;
import com.fyp.models.dto.PlanDraftDTO;
import com.fyp.models.dto.PlanParseRequestDTO;
import com.fyp.models.dto.PlanUpdateDTO;
import com.fyp.services.ChatService;
import com.fyp.services.PlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class PlanController {

    private final PlanService planService;
    private final ChatService chatService;

    public PlanController(PlanService planService, ChatService chatService) {
        this.planService = planService;
        this.chatService = chatService;
    }

    @GetMapping
    public List<Plan> getPlans(@RequestParam Long userId) {
        return planService.getAllPlans(userId);
    }

    @GetMapping("/active")
    public List<Plan> getActivePlans(@RequestParam Long userId) {
        return planService.getActivePlans(userId);
    }

    // Legacy create endpoint — used by Onboarding.jsx
    @PostMapping
    public Plan createPlan(@RequestParam Long userId, @RequestBody PlanCreateDTO dto) {
        return planService.createPlan(userId, dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plan> updatePlan(@PathVariable Long id,
                                            @RequestParam Long userId,
                                            @RequestBody PlanUpdateDTO dto) {
        return planService.updatePlan(id, userId, dto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id, @RequestParam Long userId) {
        if (planService.deletePlan(id, userId)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<Plan> addProgress(@PathVariable Long id,
                                             @RequestParam Long userId,
                                             @RequestParam double amount) {
        return planService.addProgress(id, userId, amount)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<Plan> completePlan(@PathVariable Long id, @RequestParam Long userId) {
        return planService.completePlan(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // New: Parse user input into draft(s)
    @PostMapping("/parse")
    public ResponseEntity<?> parsePlan(@RequestBody PlanParseRequestDTO request) {
        String input = request.getInput();
        if (input == null || input.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Input is required"));
        }

        String trimmedInput = input.trim();

        // 1. Java keyword classification
        String javaFamily = planService.classifyFamilyFromKeywords(trimmedInput);

        // 2. AI parsing
        String aiResult = chatService.parsePlan(trimmedInput);
        if (aiResult == null) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse plan"));
        }

        // 3. Parse AI JSON into drafts
        List<PlanDraftDTO> drafts = planService.parseDraftsFromAiJson(aiResult);

        // 4. Reconcile family + apply parser guards for each draft
        for (PlanDraftDTO draft : drafts) {
            planService.reconcileFamily(draft, javaFamily);
            planService.applyParserGuards(draft);
        }

        // 5. Return draft array
        return ResponseEntity.ok(drafts);
    }

    // New: Confirm and save a draft
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPlan(@RequestParam Long userId, @RequestBody PlanConfirmDTO dto) {
        try {
            Plan saved = planService.createPlanFromConfirm(userId, dto);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
