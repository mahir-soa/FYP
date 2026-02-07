package com.fyp.controllers;

import com.fyp.models.Bill;
import com.fyp.models.Budget;
import com.fyp.models.Expense;
import com.fyp.models.Income;
import com.fyp.models.Plan;
import com.fyp.models.Subscription;
import com.fyp.repos.BillRepository;
import com.fyp.repos.BudgetRepository;
import com.fyp.repos.ExpenseRepository;
import com.fyp.repos.IncomeRepository;
import com.fyp.repos.PlanRepository;
import com.fyp.repos.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/budgets")
@CrossOrigin(origins = "http://localhost:5173")
public class BudgetController {

    private final BudgetRepository budgetRepository;
    private final IncomeRepository incomeRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ExpenseRepository expenseRepository;
    private final PlanRepository planRepository;
    private final BillRepository billRepository;

    // Reduction factor to encourage better spending habits (10% reduction)
    private static final double SPENDING_REDUCTION_FACTOR = 0.90;

    public BudgetController(BudgetRepository budgetRepository,
                           IncomeRepository incomeRepository,
                           SubscriptionRepository subscriptionRepository,
                           ExpenseRepository expenseRepository,
                           PlanRepository planRepository,
                           BillRepository billRepository) {
        this.budgetRepository = budgetRepository;
        this.incomeRepository = incomeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.expenseRepository = expenseRepository;
        this.planRepository = planRepository;
        this.billRepository = billRepository;
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
        LocalDate today = LocalDate.now();
        YearMonth currentYearMonth = YearMonth.from(today);

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

        // Calculate monthly bills
        double monthlyBills = billRepository.findByUserId(userId).stream()
                .mapToDouble(bill -> {
                    if ("MONTHLY".equals(bill.getFrequency())) return bill.getAmount();
                    if ("QUARTERLY".equals(bill.getFrequency())) return bill.getAmount() / 3;
                    if ("YEARLY".equals(bill.getFrequency())) return bill.getAmount() / 12;
                    return bill.getAmount();
                }).sum();

        // Calculate monthly goal allocations (amount needed per month to reach goals)
        double monthlyGoalAllocations = planRepository.findByUserId(userId).stream()
                .mapToDouble(plan -> {
                    if (plan.getTargetDate() == null || plan.getTargetDate().isEmpty()) return 0;
                    try {
                        LocalDate targetDate = LocalDate.parse(plan.getTargetDate());
                        if (targetDate.isBefore(today)) return 0; // Goal already passed

                        double remaining = plan.getTargetAmount() - plan.getCurrentAmount();
                        if (remaining <= 0) return 0; // Goal already met

                        long monthsRemaining = ChronoUnit.MONTHS.between(
                            currentYearMonth,
                            YearMonth.from(targetDate)
                        );
                        if (monthsRemaining <= 0) monthsRemaining = 1; // At least 1 month

                        return remaining / monthsRemaining;
                    } catch (Exception e) {
                        return 0;
                    }
                }).sum();

        // Calculate average spending by category (last 3 months) with reduction factor
        String threeMonthsAgo = LocalDate.now().minusMonths(3).format(DateTimeFormatter.ISO_LOCAL_DATE);
        List<Expense> recentExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(exp -> exp.getDate() != null && exp.getDate().compareTo(threeMonthsAgo) >= 0)
                .toList();

        Map<String, Double> categoryTotals = new HashMap<>();
        for (Expense exp : recentExpenses) {
            String cat = exp.getCategory() != null ? exp.getCategory() : "Other";
            categoryTotals.merge(cat, exp.getAmount(), Double::sum);
        }

        // Apply reduction factor to encourage better spending habits
        Map<String, Double> categoryLimits = new HashMap<>();
        categoryTotals.forEach((cat, total) -> {
            double monthlyAvg = total / 3;
            double reduced = monthlyAvg * SPENDING_REDUCTION_FACTOR;
            categoryLimits.put(cat, Math.round(reduced * 100.0) / 100.0);
        });

        // Total budget = income - subscriptions - bills - goal allocations
        double totalBudget = monthlyIncome - monthlySubscriptions - monthlyBills - monthlyGoalAllocations;
        double categoryTotal = categoryLimits.values().stream().mapToDouble(Double::doubleValue).sum();
        double safeToSpend = Math.max(0, totalBudget - categoryTotal);

        // Calculate days remaining in month for daily budget
        int daysInMonth = currentYearMonth.lengthOfMonth();
        int dayOfMonth = today.getDayOfMonth();
        int daysRemaining = daysInMonth - dayOfMonth + 1;

        suggestion.put("monthlyIncome", Math.round(monthlyIncome * 100.0) / 100.0);
        suggestion.put("monthlySubscriptions", Math.round(monthlySubscriptions * 100.0) / 100.0);
        suggestion.put("monthlyBills", Math.round(monthlyBills * 100.0) / 100.0);
        suggestion.put("monthlyGoalAllocations", Math.round(monthlyGoalAllocations * 100.0) / 100.0);
        suggestion.put("totalBudget", Math.round(totalBudget * 100.0) / 100.0);
        suggestion.put("categoryLimits", categoryLimits);
        suggestion.put("safeToSpend", Math.round(safeToSpend * 100.0) / 100.0);
        suggestion.put("daysInMonth", daysInMonth);
        suggestion.put("daysRemaining", daysRemaining);
        suggestion.put("reductionApplied", Math.round((1 - SPENDING_REDUCTION_FACTOR) * 100));

        return suggestion;
    }
}
