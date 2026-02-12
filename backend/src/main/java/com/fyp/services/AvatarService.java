package com.fyp.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fyp.models.AvatarCustomization;
import com.fyp.models.Budget;
import com.fyp.models.Expense;
import com.fyp.repos.AvatarCustomizationRepository;
import com.fyp.repos.BudgetRepository;
import com.fyp.repos.ExpenseRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AvatarService {

    private final AvatarCustomizationRepository avatarRepo;
    private final ExpenseRepository expenseRepo;
    private final BudgetRepository budgetRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Milestone definitions
    private static final List<Map<String, Object>> MILESTONES = List.of(
        Map.of("id", "expense_50", "type", "expense_count", "threshold", 50,
            "name", "Expense Tracker", "description", "Log 50 expenses",
            "rewards", List.of("glasses_variant02", "earrings_variant01")),
        Map.of("id", "expense_100", "type", "expense_count", "threshold", 100,
            "name", "Spending Diary", "description", "Log 100 expenses",
            "rewards", List.of("glasses_variant03", "earrings_variant03", "features_mustache01")),
        Map.of("id", "expense_200", "type", "expense_count", "threshold", 200,
            "name", "Finance Pro", "description", "Log 200 expenses",
            "rewards", List.of("glasses_variant04", "earrings_variant05", "frame_silver_ring")),
        Map.of("id", "expense_500", "type", "expense_count", "threshold", 500,
            "name", "Money Master", "description", "Log 500 expenses",
            "rewards", List.of("glasses_variant05", "earrings_variant06", "frame_gold_ring")),
        Map.of("id", "streak_1", "type", "budget_streak", "threshold", 1,
            "name", "Budget Beginner", "description", "Stay within budget for 1 month",
            "rewards", List.of("features_blush", "hair_long01", "hair_long02", "hair_long03", "hair_long04", "hair_long05")),
        Map.of("id", "streak_3", "type", "budget_streak", "threshold", 3,
            "name", "Budget Warrior", "description", "Stay within budget for 3 months",
            "rewards", List.of("features_freckles", "features_mustache02", "frame_emerald_glow")),
        Map.of("id", "streak_6", "type", "budget_streak", "threshold", 6,
            "name", "Budget Legend", "description", "Stay within budget for 6 months",
            "rewards", List.of("features_mustache03", "features_birthmark", "frame_streak_flame"))
    );

    // Free items that don't require milestones
    private static final Set<String> FREE_PREFIXES = Set.of(
        "hair_short", "hairColor_", "skinColor_", "eyes_variant",
        "eyebrows_variant", "mouth_variant", "backgroundColor_", "glasses_variant01"
    );

    public AvatarService(AvatarCustomizationRepository avatarRepo,
                         ExpenseRepository expenseRepo,
                         BudgetRepository budgetRepo) {
        this.avatarRepo = avatarRepo;
        this.expenseRepo = expenseRepo;
        this.budgetRepo = budgetRepo;
    }

    public AvatarCustomization getOrCreate(Long userId) {
        return avatarRepo.findByUserId(userId).orElseGet(() -> {
            AvatarCustomization ac = new AvatarCustomization(userId);
            return avatarRepo.save(ac);
        });
    }

    public AvatarCustomization updateEquipped(Long userId, String equippedOptionsJson, String equippedFrame) {
        AvatarCustomization ac = getOrCreate(userId);
        ac.setEquippedOptions(equippedOptionsJson != null ? equippedOptionsJson : "{}");
        ac.setEquippedFrame(equippedFrame);
        return avatarRepo.save(ac);
    }

    public Map<String, Object> calculateMilestones(Long userId) {
        AvatarCustomization ac = getOrCreate(userId);

        // Calculate progress
        List<Expense> expenses = expenseRepo.findByUserId(userId);
        int expenseCount = expenses.size();
        int budgetStreak = calculateBudgetStreak(userId, expenses);

        // Determine unlocked items
        Set<String> currentUnlocked = parseUnlockedItems(ac.getUnlockedItems());
        List<String> newlyUnlocked = new ArrayList<>();

        List<Map<String, Object>> milestoneResults = new ArrayList<>();

        for (Map<String, Object> milestone : MILESTONES) {
            String type = (String) milestone.get("type");
            int threshold = (int) milestone.get("threshold");
            @SuppressWarnings("unchecked")
            List<String> rewards = (List<String>) milestone.get("rewards");

            int current = type.equals("expense_count") ? expenseCount : budgetStreak;
            boolean achieved = current >= threshold;

            if (achieved) {
                for (String reward : rewards) {
                    if (currentUnlocked.add(reward)) {
                        newlyUnlocked.add(reward);
                    }
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", milestone.get("id"));
            result.put("name", milestone.get("name"));
            result.put("description", milestone.get("description"));
            result.put("type", type);
            result.put("threshold", threshold);
            result.put("current", current);
            result.put("achieved", achieved);
            result.put("rewards", rewards);
            milestoneResults.add(result);
        }

        // Save updated unlocked items and progress
        try {
            ac.setUnlockedItems(objectMapper.writeValueAsString(currentUnlocked));
            ac.setMilestoneProgress(objectMapper.writeValueAsString(
                Map.of("expense_count", expenseCount, "budget_streak", budgetStreak)));
        } catch (Exception e) {
            ac.setUnlockedItems("[]");
            ac.setMilestoneProgress("{}");
        }
        avatarRepo.save(ac);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("milestones", milestoneResults);
        response.put("newlyUnlocked", newlyUnlocked);
        response.put("progress", Map.of("expense_count", expenseCount, "budget_streak", budgetStreak));
        response.put("unlockedItems", currentUnlocked);
        return response;
    }

    private int calculateBudgetStreak(Long userId, List<Expense> expenses) {
        List<Budget> budgets = budgetRepo.findByUserId(userId);
        if (budgets.isEmpty()) return 0;

        budgets.sort((a, b) -> b.getMonth().compareTo(a.getMonth()));

        // Group expenses by month
        Map<String, Double> monthlySpending = new HashMap<>();
        for (Expense exp : expenses) {
            if (exp.getDate() != null && exp.getDate().length() >= 7) {
                String month = exp.getDate().substring(0, 7);
                monthlySpending.merge(month, exp.getAmount(), Double::sum);
            }
        }

        // Skip current incomplete month
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        int streak = 0;

        for (Budget b : budgets) {
            if (b.getMonth().equals(currentMonth)) continue;
            double spent = monthlySpending.getOrDefault(b.getMonth(), 0.0);
            if (spent <= b.getTotalBudget()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    private Set<String> parseUnlockedItems(String json) {
        try {
            if (json == null || json.isEmpty() || json.equals("[]")) {
                return new LinkedHashSet<>();
            }
            List<String> items = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return new LinkedHashSet<>(items);
        } catch (Exception e) {
            return new LinkedHashSet<>();
        }
    }

    private boolean isFreeItem(String itemKey) {
        for (String prefix : FREE_PREFIXES) {
            if (itemKey.startsWith(prefix) || itemKey.equals(prefix)) {
                return true;
            }
        }
        return false;
    }
}
