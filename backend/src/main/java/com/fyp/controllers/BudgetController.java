package com.fyp.controllers;

import com.fyp.models.Budget;
import com.fyp.models.Expense;
import com.fyp.repos.BudgetRepository;
import com.fyp.repos.ExpenseRepository;
import com.fyp.services.BudgetService;
import com.fyp.services.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/budgets")
@CrossOrigin(origins = "http://localhost:5173")
public class BudgetController {

    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final BudgetService budgetService;
    private final ChatService chatService;

    public BudgetController(BudgetRepository budgetRepository,
                           ExpenseRepository expenseRepository,
                           BudgetService budgetService,
                           ChatService chatService) {
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.budgetService = budgetService;
        this.chatService = chatService;
    }

    @GetMapping
    public List<Budget> getBudgets(@RequestParam Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    @GetMapping("/current")
    public ResponseEntity<Budget> getCurrentBudget(@RequestParam Long userId) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return budgetRepository.findByUserIdAndMonth(userId, currentMonth)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Budget createBudget(@RequestParam Long userId, @RequestBody Budget budget) {
        budget.setUserId(userId);
        if (budget.getBufferAmount() <= 0 && budget.getTotalBudget() > 0) {
            double buffer = Math.round(budget.getTotalBudget() * 0.05 * 100.0) / 100.0;
            budget.setBufferAmount(buffer);
            budget.setBufferRemaining(buffer);
        }
        return budgetRepository.save(budget);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Budget> updateBudget(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Budget budget) {
        return budgetRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setMonth(budget.getMonth());
                    existing.setTotalBudget(budget.getTotalBudget());
                    existing.setCategoryLimits(budget.getCategoryLimits());
                    existing.setSafeToSpend(budget.getSafeToSpend());
                    if (budget.getBufferAmount() > 0) {
                        existing.setBufferAmount(budget.getBufferAmount());
                        existing.setBufferRemaining(budget.getBufferRemaining());
                    }
                    if (budget.getCategoryMeta() != null) {
                        existing.setCategoryMeta(budget.getCategoryMeta());
                    }
                    return ResponseEntity.ok(budgetRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/suggest")
    public Map<String, Object> suggestBudget(@RequestParam Long userId) {
        return budgetService.buildSuggestion(userId);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getBudgetStatus(@RequestParam Long userId) {
        return budgetService.buildBudgetStatus(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/goal-override")
    public ResponseEntity<Budget> setGoalOverride(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestParam String action) {
        if (!"KEEP".equals(action) && !"REDUCE".equals(action)) {
            return ResponseEntity.badRequest().build();
        }
        return budgetRepository.findById(id)
                .filter(b -> b.getUserId() != null && b.getUserId().equals(userId))
                .map(budget -> {
                    budget.setGoalOverrideAction(action);
                    return ResponseEntity.ok(budgetRepository.save(budget));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/insights")
    public ResponseEntity<Map<String, String>> getBudgetInsights(@RequestParam Long userId) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        Optional<Budget> budgetOpt = budgetRepository.findByUserIdAndMonth(userId, currentMonth);
        if (budgetOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No budget set for this month"));
        }

        Budget budget = budgetOpt.get();
        double totalBudget = budget.getTotalBudget();
        Map<String, Double> categoryLimits = budgetService.parseCategoryLimits(budget.getCategoryLimits());

        List<Expense> monthExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(exp -> exp.getDate() != null && exp.getDate().startsWith(currentMonth))
                .collect(Collectors.toList());

        double totalSpent = monthExpenses.stream().mapToDouble(Expense::getAmount).sum();

        Map<String, Double> spentByCategory = new HashMap<>();
        for (Expense exp : monthExpenses) {
            String cat = exp.getCategory() != null ? exp.getCategory() : "Other";
            spentByCategory.merge(cat, exp.getAmount(), Double::sum);
        }

        LocalDate today = LocalDate.now();
        YearMonth ym = YearMonth.from(today);
        int daysRemaining = ym.lengthOfMonth() - today.getDayOfMonth() + 1;
        double remaining = totalBudget - totalSpent;
        double safePerDay = daysRemaining > 0 ? Math.max(0, remaining / daysRemaining) : 0;

        Map<String, Object> context = new HashMap<>();
        context.put("totalBudget", String.format("£%.2f", totalBudget));
        context.put("totalSpent", String.format("£%.2f", totalSpent));
        context.put("remaining", String.format("£%.2f", remaining));
        context.put("daysRemaining", daysRemaining);
        context.put("safeToSpendPerDay", String.format("£%.2f", safePerDay));
        context.put("transactions", monthExpenses.size());
        context.put("bufferRemaining", String.format("£%.2f", budget.getBufferRemaining()));

        StringBuilder catBreakdown = new StringBuilder();
        Set<String> allCats = new HashSet<>(categoryLimits.keySet());
        allCats.addAll(spentByCategory.keySet());
        for (String cat : allCats) {
            double spent = spentByCategory.getOrDefault(cat, 0.0);
            double limit = categoryLimits.getOrDefault(cat, 0.0);
            double pct = limit > 0 ? (spent / limit) * 100 : 0;
            catBreakdown.append(String.format("- %s: £%.2f spent of £%.2f limit (%.0f%%)\n", cat, spent, limit, pct));
        }
        context.put("categoryBreakdown", catBreakdown.toString());

        String result = chatService.generateBudgetInsights(context);
        if (result == null) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to generate insights"));
        }

        return ResponseEntity.ok(Map.of("insights", result));
    }
}
