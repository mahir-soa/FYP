package com.fyp.controllers;

import com.fyp.models.Budget;
import com.fyp.models.Expense;
import com.fyp.models.Income;
import com.fyp.models.Subscription;
import com.fyp.repos.BudgetRepository;
import com.fyp.repos.ExpenseRepository;
import com.fyp.repos.IncomeRepository;
import com.fyp.repos.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/budgets")
@CrossOrigin(origins = "http://localhost:5173")
public class BudgetController {

    private final BudgetRepository budgetRepository;
    private final IncomeRepository incomeRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ExpenseRepository expenseRepository;

    public BudgetController(BudgetRepository budgetRepository,
                           IncomeRepository incomeRepository,
                           SubscriptionRepository subscriptionRepository,
                           ExpenseRepository expenseRepository) {
        this.budgetRepository = budgetRepository;
        this.incomeRepository = incomeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.expenseRepository = expenseRepository;
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
                    return ResponseEntity.ok(budgetRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/suggest")
    public Map<String, Object> suggestBudget(@RequestParam Long userId) {
        Map<String, Object> suggestion = new HashMap<>();

        // Calculate monthly income
        double monthlyIncome = incomeRepository.findByUserId(userId).stream()
                .mapToDouble(inc -> {
                    if ("MONTHLY".equals(inc.getFrequency())) return inc.getAmount();
                    if ("YEARLY".equals(inc.getFrequency())) return inc.getAmount() / 12;
                    if ("WEEKLY".equals(inc.getFrequency())) return inc.getAmount() * 4.33;
                    return 0;
                }).sum();

        // Calculate monthly subscriptions
        double monthlySubscriptions = subscriptionRepository.findByUserId(userId).stream()
                .filter(sub -> "ACTIVE".equals(sub.getStatus()))
                .mapToDouble(sub -> {
                    if ("MONTHLY".equals(sub.getBillingCycle())) return sub.getCost();
                    if ("YEARLY".equals(sub.getBillingCycle())) return sub.getCost() / 12;
                    if ("WEEKLY".equals(sub.getBillingCycle())) return sub.getCost() * 4.33;
                    return 0;
                }).sum();

        // Calculate average spending by category (last 3 months)
        String threeMonthsAgo = LocalDate.now().minusMonths(3).format(DateTimeFormatter.ISO_LOCAL_DATE);
        List<Expense> recentExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(exp -> exp.getDate() != null && exp.getDate().compareTo(threeMonthsAgo) >= 0)
                .toList();

        Map<String, Double> categoryTotals = new HashMap<>();
        for (Expense exp : recentExpenses) {
            String cat = exp.getCategory() != null ? exp.getCategory() : "Other";
            categoryTotals.merge(cat, exp.getAmount(), Double::sum);
        }

        Map<String, Double> categoryLimits = new HashMap<>();
        categoryTotals.forEach((cat, total) -> categoryLimits.put(cat, Math.round(total / 3 * 100.0) / 100.0));

        double totalBudget = monthlyIncome - monthlySubscriptions;
        double categoryTotal = categoryLimits.values().stream().mapToDouble(Double::doubleValue).sum();
        double safeToSpend = Math.max(0, totalBudget - categoryTotal);

        suggestion.put("monthlyIncome", Math.round(monthlyIncome * 100.0) / 100.0);
        suggestion.put("monthlySubscriptions", Math.round(monthlySubscriptions * 100.0) / 100.0);
        suggestion.put("totalBudget", Math.round(totalBudget * 100.0) / 100.0);
        suggestion.put("categoryLimits", categoryLimits);
        suggestion.put("safeToSpend", Math.round(safeToSpend * 100.0) / 100.0);

        return suggestion;
    }
}
