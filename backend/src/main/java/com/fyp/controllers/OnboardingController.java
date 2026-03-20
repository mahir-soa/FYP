package com.fyp.controllers;

import com.fyp.models.UserPreferences;
import com.fyp.repos.UserPreferencesRepository;
import com.fyp.repos.IncomeRepository;
import com.fyp.repos.PlanRepository;
import com.fyp.repos.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class OnboardingController {

    private final UserPreferencesRepository preferencesRepository;
    private final IncomeRepository incomeRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;

    public OnboardingController(
            UserPreferencesRepository preferencesRepository,
            IncomeRepository incomeRepository,
            PlanRepository planRepository,
            SubscriptionRepository subscriptionRepository) {
        this.preferencesRepository = preferencesRepository;
        this.incomeRepository = incomeRepository;
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    @GetMapping("/status")
    public Map<String, Object> getOnboardingStatus(@RequestParam Long userId) {
        Map<String, Object> status = new HashMap<>();

        var prefs = preferencesRepository.findByUserId(userId);
        status.put("onboardingCompleted", prefs.map(UserPreferences::isOnboardingCompleted).orElse(false));
        status.put("hasIncome", !incomeRepository.findByUserId(userId).isEmpty());
        status.put("hasGoals", !planRepository.findByUserId(userId).isEmpty());
        status.put("hasSubscriptions", !subscriptionRepository.findByUserId(userId).isEmpty());

        return status;
    }

    @PostMapping("/complete")
    public ResponseEntity<UserPreferences> completeOnboarding(
            @RequestParam Long userId,
            @RequestBody Map<String, Object> request) {

        UserPreferences prefs = preferencesRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPreferences newPrefs = new UserPreferences();
                    newPrefs.setUserId(userId);
                    return newPrefs;
                });

        // Budget preferences
        if (request.containsKey("budgetStyle")) {
            prefs.setBudgetStyle((String) request.get("budgetStyle"));
        }
        if (request.containsKey("priorityCategories")) {
            Object priorityCats = request.get("priorityCategories");
            if (priorityCats instanceof List) {
                prefs.setPriorityCategories(priorityCats.toString());
            } else {
                prefs.setPriorityCategories((String) priorityCats);
            }
        }
        if (request.containsKey("cutCategories")) {
            Object cutCats = request.get("cutCategories");
            if (cutCats instanceof List) {
                prefs.setCutCategories(cutCats.toString());
            } else {
                prefs.setCutCategories((String) cutCats);
            }
        }

        // Pay info
        if (request.containsKey("primaryPayFrequency")) {
            prefs.setPrimaryPayFrequency((String) request.get("primaryPayFrequency"));
        }
        if (request.containsKey("payDay")) {
            Object payDay = request.get("payDay");
            if (payDay != null) {
                prefs.setPayDay(((Number) payDay).intValue());
            }
        }

        // Nudge settings
        if (request.containsKey("nudgeFrequency")) {
            prefs.setNudgeFrequency((String) request.get("nudgeFrequency"));
        }
        if (request.containsKey("nudgeBudgetWarnings")) {
            prefs.setNudgeBudgetWarnings((Boolean) request.get("nudgeBudgetWarnings"));
        }
        if (request.containsKey("nudgeUpcomingPayments")) {
            prefs.setNudgeUpcomingPayments((Boolean) request.get("nudgeUpcomingPayments"));
        }
        if (request.containsKey("nudgeUnusedSubscriptions")) {
            prefs.setNudgeUnusedSubscriptions((Boolean) request.get("nudgeUnusedSubscriptions"));
        }
        if (request.containsKey("nudgeGoalProgress")) {
            prefs.setNudgeGoalProgress((Boolean) request.get("nudgeGoalProgress"));
        }

        // Mark onboarding as complete
        prefs.setOnboardingCompleted(true);
        prefs.setOnboardingCompletedAt(LocalDateTime.now());

        return ResponseEntity.ok(preferencesRepository.save(prefs));
    }

    @GetMapping("/preferences")
    public ResponseEntity<UserPreferences> getPreferences(@RequestParam Long userId) {
        return preferencesRepository.findByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/preferences")
    public ResponseEntity<UserPreferences> updatePreferences(
            @RequestParam Long userId,
            @RequestBody Map<String, Object> request) {

        return preferencesRepository.findByUserId(userId)
                .map(prefs -> {
                    if (request.containsKey("budgetStyle")) {
                        prefs.setBudgetStyle((String) request.get("budgetStyle"));
                    }
                    if (request.containsKey("priorityCategories")) {
                        Object priorityCats = request.get("priorityCategories");
                        if (priorityCats instanceof List) {
                            prefs.setPriorityCategories(priorityCats.toString());
                        } else {
                            prefs.setPriorityCategories((String) priorityCats);
                        }
                    }
                    if (request.containsKey("cutCategories")) {
                        Object cutCats = request.get("cutCategories");
                        if (cutCats instanceof List) {
                            prefs.setCutCategories(cutCats.toString());
                        } else {
                            prefs.setCutCategories((String) cutCats);
                        }
                    }
                    if (request.containsKey("primaryPayFrequency")) {
                        prefs.setPrimaryPayFrequency((String) request.get("primaryPayFrequency"));
                    }
                    if (request.containsKey("payDay")) {
                        Object payDay = request.get("payDay");
                        if (payDay != null) {
                            prefs.setPayDay(((Number) payDay).intValue());
                        }
                    }
                    if (request.containsKey("nudgeFrequency")) {
                        prefs.setNudgeFrequency((String) request.get("nudgeFrequency"));
                    }
                    if (request.containsKey("nudgeBudgetWarnings")) {
                        prefs.setNudgeBudgetWarnings((Boolean) request.get("nudgeBudgetWarnings"));
                    }
                    if (request.containsKey("nudgeUpcomingPayments")) {
                        prefs.setNudgeUpcomingPayments((Boolean) request.get("nudgeUpcomingPayments"));
                    }
                    if (request.containsKey("nudgeUnusedSubscriptions")) {
                        prefs.setNudgeUnusedSubscriptions((Boolean) request.get("nudgeUnusedSubscriptions"));
                    }
                    if (request.containsKey("nudgeGoalProgress")) {
                        prefs.setNudgeGoalProgress((Boolean) request.get("nudgeGoalProgress"));
                    }
                    return ResponseEntity.ok(preferencesRepository.save(prefs));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
