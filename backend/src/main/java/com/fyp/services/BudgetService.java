package com.fyp.services;

import com.fyp.models.Budget;
import com.fyp.models.Expense;
import com.fyp.repos.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BudgetService {

    private static final double SPENDING_REDUCTION_FACTOR = 0.90;
    private static final double DEFAULT_BUFFER_PERCENT = 0.05;
    private static final int SMART_BUDGET_THRESHOLD = 20;
    private static final List<String> DEFAULT_CATEGORIES = List.of("Food", "Travel", "Education", "Leisure", "Other");

    private static final Map<String, String> CATEGORY_TIERS = Map.of(
        "Food", "FLEXIBLE",
        "Travel", "FLEXIBLE",
        "Education", "FLEXIBLE",
        "Leisure", "DISCRETIONARY",
        "Other", "FLEXIBLE"
    );

    private final BudgetRepository budgetRepository;
    private final IncomeRepository incomeRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ExpenseRepository expenseRepository;
    private final PlanRepository planRepository;
    private final BillRepository billRepository;
    private final ChatService chatService;

    public BudgetService(BudgetRepository budgetRepository,
                         IncomeRepository incomeRepository,
                         SubscriptionRepository subscriptionRepository,
                         ExpenseRepository expenseRepository,
                         PlanRepository planRepository,
                         BillRepository billRepository,
                         ChatService chatService) {
        this.budgetRepository = budgetRepository;
        this.incomeRepository = incomeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.expenseRepository = expenseRepository;
        this.planRepository = planRepository;
        this.billRepository = billRepository;
        this.chatService = chatService;
    }

    // ── Suggestion ──────────────────────────────────────────────

    public Map<String, Object> buildSuggestion(Long userId) {
        Map<String, Object> suggestion = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        YearMonth currentYearMonth = YearMonth.from(today);

        double monthlyIncome = calculateMonthlyIncome(userId);
        double monthlySubscriptions = calculateMonthlySubscriptions(userId);
        double monthlyBills = calculateMonthlyBills(userId);
        double monthlyGoalAllocations = calculateMonthlyGoalAllocations(userId);

        double totalBudget = monthlyIncome - monthlySubscriptions - monthlyBills - monthlyGoalAllocations;
        double bufferAmount = round2(Math.max(0, totalBudget) * DEFAULT_BUFFER_PERCENT);
        double budgetAfterBuffer = Math.max(0, totalBudget - bufferAmount);

        int daysInMonth = currentYearMonth.lengthOfMonth();
        int dayOfMonth = today.getDayOfMonth();
        int daysRemaining = daysInMonth - dayOfMonth + 1;

        long expenseCount = expenseRepository.countByUserId(userId);
        boolean smartMode = false;

        Map<String, Double> categoryLimits = new LinkedHashMap<>();
        Map<String, Map<String, Object>> explanations = new LinkedHashMap<>();

        if (expenseCount >= SMART_BUDGET_THRESHOLD) {
            // ── Smart Mode: AI-generated budget ──
            Map<String, Double> categoryAverages = calculateCategoryAverages(userId);

            Map<String, Object> aiContext = new LinkedHashMap<>();
            aiContext.put("availableBudget", round2(budgetAfterBuffer));
            aiContext.put("monthlyIncome", round2(monthlyIncome));
            aiContext.put("monthlyBills", round2(monthlyBills));
            aiContext.put("monthlySubscriptions", round2(monthlySubscriptions));
            aiContext.put("monthlyGoalAllocations", round2(monthlyGoalAllocations));
            aiContext.put("categoryAverages", categoryAverages);
            aiContext.put("totalExpenses", expenseCount);
            aiContext.put("categories", DEFAULT_CATEGORIES);

            try {
                String aiResponse = chatService.generateSmartBudget(aiContext);
                Map<String, Object> parsed = parseSmartBudgetResponse(aiResponse, budgetAfterBuffer);
                if (parsed != null) {
                    categoryLimits = (Map<String, Double>) parsed.get("categoryLimits");
                    explanations = (Map<String, Map<String, Object>>) parsed.get("categoryExplanations");
                    smartMode = true;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // Fallback: if AI failed, use 3-month averages with reduction factor
            if (!smartMode) {
                for (Map.Entry<String, Double> avgEntry : categoryAverages.entrySet()) {
                    categoryLimits.put(avgEntry.getKey(), round2(avgEntry.getValue() * SPENDING_REDUCTION_FACTOR));
                }
                for (Map.Entry<String, Double> entry : categoryAverages.entrySet()) {
                    String cat = entry.getKey();
                    double avg = entry.getValue();
                    double suggested = round2(avg * SPENDING_REDUCTION_FACTOR);
                    Map<String, Object> ex = new LinkedHashMap<>();
                    ex.put("pastAvg", round2(avg));
                    ex.put("suggested", suggested);
                    ex.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));
                    ex.put("reason", String.format(
                        "%s was £%.2f/mo avg — suggested £%.2f (%d%% reduction to help you save)",
                        cat, avg, suggested, Math.round((1 - SPENDING_REDUCTION_FACTOR) * 100)));
                    explanations.put(cat, ex);
                }
            }
        } else {
            // ── Basic Mode: even split across default categories ──
            double evenSplit = round2(budgetAfterBuffer / DEFAULT_CATEGORIES.size());
            for (String cat : DEFAULT_CATEGORIES) {
                categoryLimits.put(cat, evenSplit);
                Map<String, Object> ex = new LinkedHashMap<>();
                ex.put("suggested", evenSplit);
                ex.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));
                ex.put("reason", String.format(
                    "£%.2f evenly allocated — add more expenses to unlock Smart Budget",
                    evenSplit));
                explanations.put(cat, ex);
            }
        }

        double categoryTotal = categoryLimits.values().stream().mapToDouble(Double::doubleValue).sum();
        double safeToSpend = Math.max(0, totalBudget - categoryTotal - bufferAmount);

        // Base fields
        suggestion.put("monthlyIncome", round2(monthlyIncome));
        suggestion.put("monthlySubscriptions", round2(monthlySubscriptions));
        suggestion.put("monthlyBills", round2(monthlyBills));
        suggestion.put("monthlyGoalAllocations", round2(monthlyGoalAllocations));
        suggestion.put("totalBudget", round2(totalBudget));
        suggestion.put("categoryLimits", categoryLimits);
        suggestion.put("safeToSpend", round2(safeToSpend));
        suggestion.put("daysInMonth", daysInMonth);
        suggestion.put("daysRemaining", daysRemaining);
        suggestion.put("bufferAmount", bufferAmount);
        suggestion.put("categoryExplanations", explanations);
        suggestion.put("categoryTiers", CATEGORY_TIERS);

        // Smart mode fields
        suggestion.put("smartMode", smartMode);
        suggestion.put("expenseCount", expenseCount);
        suggestion.put("smartThreshold", SMART_BUDGET_THRESHOLD);

        // ── Goal breakdown ──
        List<Map<String, Object>> goalBreakdown = new ArrayList<>();
        planRepository.findByUserId(userId).forEach(plan -> {
            if (plan.getTargetDate() == null || plan.getTargetDate().isEmpty()) return;
            try {
                LocalDate targetDate = LocalDate.parse(plan.getTargetDate());
                if (targetDate.isBefore(today)) return;
                double remaining = plan.getTargetAmount() - plan.getCurrentAmount();
                if (remaining <= 0) return;
                long monthsRemaining = ChronoUnit.MONTHS.between(currentYearMonth, YearMonth.from(targetDate));
                if (monthsRemaining <= 0) monthsRemaining = 1;
                double monthly = round2(remaining / monthsRemaining);
                goalBreakdown.add(Map.of(
                    "title", plan.getTitle(),
                    "monthlyContribution", monthly,
                    "type", plan.getType() != null ? plan.getType() : "SAVINGS"
                ));
            } catch (Exception ignored) {}
        });
        suggestion.put("goalBreakdown", goalBreakdown);

        return suggestion;
    }

    // ── Smart Budget AI Response Parser ──────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseSmartBudgetResponse(String aiResponse, double availableBudget) {
        if (aiResponse == null || aiResponse.isEmpty()) return null;
        try {
            String cleaned = aiResponse.replace("```json", "").replace("```", "").trim();
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> parsed = mapper.readValue(cleaned, Map.class);

            // Extract categoryLimits
            Map<String, Object> rawLimits = (Map<String, Object>) parsed.get("categoryLimits");
            if (rawLimits == null) return null;

            Map<String, Double> categoryLimits = new LinkedHashMap<>();
            for (String cat : DEFAULT_CATEGORIES) {
                Object val = rawLimits.get(cat);
                if (val instanceof Number) {
                    categoryLimits.put(cat, round2(((Number) val).doubleValue()));
                } else {
                    categoryLimits.put(cat, 0.0);
                }
            }

            // Normalize if limits exceed available budget
            double limitsSum = categoryLimits.values().stream().mapToDouble(Double::doubleValue).sum();
            if (limitsSum > availableBudget && limitsSum > 0) {
                double scale = availableBudget / limitsSum;
                categoryLimits.replaceAll((cat, val) -> round2(val * scale));
            }

            // Extract explanations
            Map<String, Map<String, Object>> explanations = new LinkedHashMap<>();
            Map<String, Object> rawExplanations = (Map<String, Object>) parsed.get("categoryExplanations");
            if (rawExplanations != null) {
                for (String cat : DEFAULT_CATEGORIES) {
                    Object exObj = rawExplanations.get(cat);
                    if (exObj instanceof Map) {
                        Map<String, Object> ex = new LinkedHashMap<>((Map<String, Object>) exObj);
                        ex.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));
                        explanations.put(cat, ex);
                    } else {
                        Map<String, Object> ex = new LinkedHashMap<>();
                        ex.put("suggested", categoryLimits.get(cat));
                        ex.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));
                        ex.put("reason", "AI-optimized allocation");
                        explanations.put(cat, ex);
                    }
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("categoryLimits", categoryLimits);
            result.put("categoryExplanations", explanations);
            return result;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    // ── Budget Status ───────────────────────────────────────────

    public Optional<Map<String, Object>> buildBudgetStatus(Long userId) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        Optional<Budget> budgetOpt = budgetRepository.findByUserIdAndMonth(userId, currentMonth);
        if (budgetOpt.isEmpty()) return Optional.empty();

        Budget budget = budgetOpt.get();
        Map<String, Double> categoryLimits = parseCategoryLimits(budget.getCategoryLimits());

        // Current month expenses
        List<Expense> monthExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(exp -> exp.getDate() != null && exp.getDate().startsWith(currentMonth))
                .collect(Collectors.toList());

        double totalSpent = monthExpenses.stream().mapToDouble(Expense::getAmount).sum();

        Map<String, Double> spentByCategory = new LinkedHashMap<>();
        for (Expense exp : monthExpenses) {
            String cat = exp.getCategory() != null ? exp.getCategory() : "Other";
            spentByCategory.merge(cat, exp.getAmount(), Double::sum);
        }

        LocalDate today = LocalDate.now();
        YearMonth ym = YearMonth.from(today);
        int dayOfMonth = today.getDayOfMonth();
        int daysInMonth = ym.lengthOfMonth();
        int daysRemaining = daysInMonth - dayOfMonth + 1;

        Map<String, Object> status = new LinkedHashMap<>();

        // General
        status.put("totalBudget", budget.getTotalBudget());
        status.put("totalSpent", round2(totalSpent));
        status.put("remaining", round2(budget.getTotalBudget() - totalSpent));
        status.put("daysRemaining", daysRemaining);
        status.put("daysElapsed", dayOfMonth);
        status.put("daysInMonth", daysInMonth);

        // ── Buffer state ──
        double bufferAmount = budget.getBufferAmount();
        Map<String, Object> bufferState = calculateBufferState(categoryLimits, spentByCategory, bufferAmount);
        status.put("buffer", bufferState);

        // ── Per-category status ──
        Set<String> allCats = new LinkedHashSet<>(categoryLimits.keySet());
        allCats.addAll(spentByCategory.keySet());

        Map<String, Map<String, Object>> categoryStatuses = new LinkedHashMap<>();
        List<String> unusedCategories = new ArrayList<>();
        List<String> activeCategories = new ArrayList<>();

        double bufferRemaining = (double) bufferState.get("remaining");

        for (String cat : allCats) {
            double spent = spentByCategory.getOrDefault(cat, 0.0);
            double limit = categoryLimits.getOrDefault(cat, 0.0);
            Map<String, Object> cs = new LinkedHashMap<>();
            cs.put("spent", round2(spent));
            cs.put("limit", round2(limit));
            cs.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));

            // Zero-spend handling
            if (limit > 0 && spent == 0) {
                unusedCategories.add(cat);
                cs.put("status", "unused");
                categoryStatuses.put(cat, cs);
                continue;
            }
            activeCategories.add(cat);

            // Status + impact
            if (spent > limit && limit > 0) {
                double overflow = round2(spent - limit);
                cs.put("overflowAmount", overflow);
                if (bufferRemaining >= overflow) {
                    cs.put("status", "buffer-absorbing");
                    cs.put("message", String.format("Exceeded by £%.2f — absorbed by buffer", overflow));
                } else if ((boolean) bufferState.get("depleted")) {
                    cs.put("status", "exceeded");
                    cs.put("message", String.format("Exceeded by £%.2f — buffer depleted", overflow));
                } else {
                    cs.put("status", "exceeded");
                    cs.put("message", String.format("Exceeded by £%.2f", overflow));
                }
                // Next action
                double adjustedRemaining = Math.max(0, budget.getTotalBudget() - totalSpent);
                double dailyTarget = daysRemaining > 0 ? adjustedRemaining / daysRemaining : 0;
                cs.put("nextAction", String.format("To stay on track: spend <= £%.2f/day", round2(dailyTarget)));
            } else if (limit > 0 && spent >= limit * 0.8) {
                cs.put("status", "warning");
                double left = round2(limit - spent);
                cs.put("message", String.format("£%.2f left in this category", left));
            } else {
                cs.put("status", "on-track");
            }

            // Projected overspend
            if (dayOfMonth > 0 && limit > 0 && spent > 0) {
                double dailyRate = spent / dayOfMonth;
                double projectedTotal = round2(dailyRate * daysInMonth);
                cs.put("projectedTotal", projectedTotal);
                cs.put("projectedExceeds", projectedTotal > limit);
                if (projectedTotal > limit) {
                    cs.put("projectedOverBy", round2(projectedTotal - limit));
                    cs.put("projectedMessage", String.format(
                        "At current pace, projected to exceed by £%.2f by month end", projectedTotal - limit));
                }
            }

            categoryStatuses.put(cat, cs);
        }

        status.put("categories", categoryStatuses);
        status.put("activeCategories", activeCategories);
        status.put("unusedBudgetedCategories", unusedCategories);

        // ── Pacing ──
        status.put("pacing", calculatePacing(budget.getTotalBudget(), totalSpent, dayOfMonth, daysInMonth));

        // ── Goal protection ──
        status.put("goalOverrideAction", budget.getGoalOverrideAction() != null ? budget.getGoalOverrideAction() : "KEEP");
        status.put("monthlyGoalAllocations", round2(calculateMonthlyGoalAllocations(userId)));

        return Optional.of(status);
    }

    // ── Buffer ──────────────────────────────────────────────────

    public Map<String, Object> calculateBufferState(
            Map<String, Double> categoryLimits,
            Map<String, Double> spentByCategory,
            double bufferAmount) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("original", round2(bufferAmount));

        double totalOverflow = 0;
        Map<String, Double> overflows = new LinkedHashMap<>();
        for (Map.Entry<String, Double> entry : categoryLimits.entrySet()) {
            String cat = entry.getKey();
            double limit = entry.getValue();
            double spent = spentByCategory.getOrDefault(cat, 0.0);
            if (spent > limit) {
                double overflow = round2(spent - limit);
                overflows.put(cat, overflow);
                totalOverflow += overflow;
            }
        }

        double remaining = Math.max(0, bufferAmount - totalOverflow);
        state.put("remaining", round2(remaining));
        state.put("used", round2(Math.min(totalOverflow, bufferAmount)));
        state.put("depleted", totalOverflow > bufferAmount);
        state.put("overflows", overflows);

        return state;
    }

    // ── Pacing ──────────────────────────────────────────────────

    public Map<String, Object> calculatePacing(double totalBudget, double totalSpent, int dayOfMonth, int daysInMonth) {
        Map<String, Object> pacing = new LinkedHashMap<>();

        double dailyBudget = totalBudget / daysInMonth;
        double expectedSpentByNow = dailyBudget * dayOfMonth;
        double difference = expectedSpentByNow - totalSpent;

        int daysRemaining = daysInMonth - dayOfMonth + 1;
        double remaining = totalBudget - totalSpent;
        double safeToSpendPerDay = daysRemaining > 0 ? Math.max(0, remaining / daysRemaining) : 0;

        pacing.put("dailyBudget", round2(dailyBudget));
        pacing.put("expectedSpentByNow", round2(expectedSpentByNow));
        pacing.put("actualSpent", round2(totalSpent));
        pacing.put("safeToSpendPerDay", round2(safeToSpendPerDay));
        pacing.put("daysRemaining", daysRemaining);

        if (difference > 5) { // small threshold to avoid noise
            pacing.put("pacingStatus", "AHEAD");
            pacing.put("bonusAvailable", round2(difference));
            pacing.put("pacingMessage", String.format(
                "You're £%.2f ahead of pace — small bonus available today", difference));
        } else if (difference < -5) {
            pacing.put("pacingStatus", "BEHIND");
            pacing.put("behindBy", round2(Math.abs(difference)));
            pacing.put("pacingMessage", String.format(
                "You're £%.2f behind pace — aim for £%.2f/day to get back on track",
                Math.abs(difference), safeToSpendPerDay));
        } else {
            pacing.put("pacingStatus", "ON_TRACK");
            pacing.put("pacingMessage", "You're on pace — keep it up");
        }

        return pacing;
    }

    // ── Helper: income/bills/subs/goals calculators ─────────────

    public double calculateMonthlyIncome(Long userId) {
        return incomeRepository.findByUserId(userId).stream()
                .mapToDouble(inc -> {
                    if ("MONTHLY".equals(inc.getFrequency())) return inc.getAmount();
                    if ("YEARLY".equals(inc.getFrequency())) return inc.getAmount() / 12;
                    if ("WEEKLY".equals(inc.getFrequency())) return inc.getAmount() * 4.33;
                    return 0;
                }).sum();
    }

    public double calculateMonthlySubscriptions(Long userId) {
        return subscriptionRepository.findByUserId(userId).stream()
                .filter(sub -> "ACTIVE".equals(sub.getStatus()))
                .mapToDouble(sub -> {
                    if ("MONTHLY".equals(sub.getBillingCycle())) return sub.getCost();
                    if ("YEARLY".equals(sub.getBillingCycle())) return sub.getCost() / 12;
                    if ("WEEKLY".equals(sub.getBillingCycle())) return sub.getCost() * 4.33;
                    return 0;
                }).sum();
    }

    public double calculateMonthlyBills(Long userId) {
        return billRepository.findByUserId(userId).stream()
                .mapToDouble(bill -> {
                    if ("MONTHLY".equals(bill.getFrequency())) return bill.getAmount();
                    if ("QUARTERLY".equals(bill.getFrequency())) return bill.getAmount() / 3;
                    if ("YEARLY".equals(bill.getFrequency())) return bill.getAmount() / 12;
                    return bill.getAmount();
                }).sum();
    }

    public double calculateMonthlyGoalAllocations(Long userId) {
        LocalDate today = LocalDate.now();
        YearMonth currentYearMonth = YearMonth.from(today);
        return planRepository.findByUserId(userId).stream()
                .mapToDouble(plan -> {
                    if (plan.getTargetDate() == null || plan.getTargetDate().isEmpty()) return 0;
                    try {
                        LocalDate targetDate = LocalDate.parse(plan.getTargetDate());
                        if (targetDate.isBefore(today)) return 0;
                        double remaining = plan.getTargetAmount() - plan.getCurrentAmount();
                        if (remaining <= 0) return 0;
                        long monthsRemaining = ChronoUnit.MONTHS.between(currentYearMonth, YearMonth.from(targetDate));
                        if (monthsRemaining <= 0) monthsRemaining = 1;
                        return remaining / monthsRemaining;
                    } catch (Exception e) {
                        return 0;
                    }
                }).sum();
    }

    public Map<String, Double> calculateCategoryAverages(Long userId) {
        String threeMonthsAgo = LocalDate.now().minusMonths(3).format(DateTimeFormatter.ISO_LOCAL_DATE);
        List<Expense> recentExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(exp -> exp.getDate() != null && exp.getDate().compareTo(threeMonthsAgo) >= 0)
                .toList();

        Map<String, Double> categoryTotals = new LinkedHashMap<>();
        for (Expense exp : recentExpenses) {
            String cat = exp.getCategory() != null ? exp.getCategory() : "Other";
            categoryTotals.merge(cat, exp.getAmount(), Double::sum);
        }

        Map<String, Double> averages = new LinkedHashMap<>();
        categoryTotals.forEach((cat, total) -> averages.put(cat, round2(total / 3)));
        return averages;
    }

    // ── Helpers ─────────────────────────────────────────────────

    public Map<String, Double> parseCategoryLimits(String limitsJson) {
        Map<String, Double> limits = new LinkedHashMap<>();
        if (limitsJson == null || limitsJson.isEmpty()) return limits;
        try {
            String cleaned = limitsJson.replaceAll("[{}\"']", "");
            for (String pair : cleaned.split(",")) {
                String[] kv = pair.split(":");
                if (kv.length == 2) {
                    limits.put(kv[0].trim(), Double.parseDouble(kv[1].trim()));
                }
            }
        } catch (Exception ignored) {}
        return limits;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
