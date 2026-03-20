package com.fyp.services;

import com.fyp.constants.SpendingCategories;
import com.fyp.models.Budget;
import com.fyp.models.Expense;
import com.fyp.models.FinancialProfile;
import com.fyp.models.Plan;
import com.fyp.models.dto.PersonaBudgetProfile;
import com.fyp.repos.BudgetRepository;
import com.fyp.repos.ExpenseRepository;
import com.fyp.repos.FinancialProfileRepository;
import com.fyp.repos.PlanRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdaptiveBudgetEngine {

    private static final double DEFAULT_BUFFER_PERCENT = 0.05;
    private static final double GOAL_BUDGET_CAP = 0.40;
    private static final double GOAL_MAX_REDUCTION = 0.50;
    private static final double MIN_CATEGORY_WEIGHT = 0.05;
    private static final double MAX_CONTEXT_ADJUSTMENT = 0.50;
    private static final double MAX_REALLOCATION_PERCENT = 0.50;
    private static final List<String> DEFAULT_CATEGORIES = SpendingCategories.CATEGORIES;
    private static final Map<String, String> CATEGORY_TIERS = Map.of(
        "Food", "FLEXIBLE",
        "Travel", "FLEXIBLE",
        "Education", "FLEXIBLE",
        "Leisure", "DISCRETIONARY",
        "Other", "FLEXIBLE"
    );
    private static final Map<String, Integer> TYPE_PRIORITY = Map.of(
        "EMERGENCY", 1,
        "DEBT", 2,
        "SAVINGS", 3,
        "PURCHASE", 4
    );

    private final BudgetService budgetService;
    private final FinancialProfileRepository financialProfileRepository;
    private final PlanService planService;
    private final PersonaBudgetModifierService personaBudgetModifierService;
    private final BudgetNudgeService budgetNudgeService;
    private final PlanRepository planRepository;
    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final ObjectMapper objectMapper;

    public AdaptiveBudgetEngine(BudgetService budgetService,
                                 FinancialProfileRepository financialProfileRepository,
                                 PlanService planService,
                                 PersonaBudgetModifierService personaBudgetModifierService,
                                 BudgetNudgeService budgetNudgeService,
                                 PlanRepository planRepository,
                                 ExpenseRepository expenseRepository,
                                 BudgetRepository budgetRepository) {
        this.budgetService = budgetService;
        this.financialProfileRepository = financialProfileRepository;
        this.planService = planService;
        this.personaBudgetModifierService = personaBudgetModifierService;
        this.budgetNudgeService = budgetNudgeService;
        this.planRepository = planRepository;
        this.expenseRepository = expenseRepository;
        this.budgetRepository = budgetRepository;
        this.objectMapper = new ObjectMapper();
    }

    // Main Orchestrator

    public Map<String, Object> buildAdaptiveSuggestion(Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> explanationTrace = new ArrayList<>();
        LocalDate today = LocalDate.now();
        YearMonth currentYearMonth = YearMonth.from(today);

        // Layer 1: Financial Capacity
        Map<String, Object> layer1 = computeLayer1Capacity(userId);
        double trueSpendable = (double) layer1.get("trueSpendable");
        explanationTrace.addAll(castSteps(layer1.get("steps")));

        // Layer 2: Goal Contributions
        String goalOverrideAction = getGoalOverrideAction(userId);
        Map<String, Object> layer2 = computeLayer2Goals(userId, trueSpendable, goalOverrideAction);
        double budgetAfterGoals = (double) layer2.get("budgetAfterGoals");
        explanationTrace.addAll(castSteps(layer2.get("steps")));

        // Layer 3: Context Modifiers
        Map<String, Object> layer3 = computeLayer3Context(userId);
        @SuppressWarnings("unchecked")
        Map<String, Double> mergedAdjustments = (Map<String, Double>) layer3.get("mergedAdjustments");
        @SuppressWarnings("unchecked")
        Map<String, Double> mergedFixedAmounts = (Map<String, Double>) layer3.get("mergedFixedAmounts");
        explanationTrace.addAll(castSteps(layer3.get("steps")));

        // Layer 4: Adaptive Allocation
        Map<String, Object> layer4 = computeLayer4Allocation(userId, budgetAfterGoals, mergedAdjustments, mergedFixedAmounts);
        explanationTrace.addAll(castSteps(layer4.get("steps")));

        // Layer 5: Persona Modifiers (decorator: does NOT change Layer 1-4 math)
        PersonaBudgetProfile layer5 = personaBudgetModifierService.applyPersonaModifiers(userId);
        explanationTrace.addAll(layer5.getSteps());

        @SuppressWarnings("unchecked")
        Map<String, Double> categoryLimits = (Map<String, Double>) layer4.get("categoryLimits");
        @SuppressWarnings("unchecked")
        Map<String, String> categoryExplanations = (Map<String, String>) layer4.get("categoryExplanations");
        double bufferAmount = (double) layer4.get("bufferAmount");
        double allocatable = (double) layer4.get("allocatable");

        // Compute derived fields
        int daysInMonth = currentYearMonth.lengthOfMonth();
        int dayOfMonth = today.getDayOfMonth();
        int daysRemaining = daysInMonth - dayOfMonth + 1;

        double categoryTotal = categoryLimits.values().stream().mapToDouble(Double::doubleValue).sum();
        double safeToSpend = round2(Math.max(0, allocatable - categoryTotal));

        double monthlyIncome = (double) layer1.get("monthlyIncome");
        double monthlyBills = (double) layer1.get("monthlyBills");
        double monthlySubscriptions = (double) layer1.get("monthlySubscriptions");
        double totalGoalContributions = (double) layer2.get("totalGoalContributions");

        // Build backward-compatible top-level keys
        result.put("monthlyIncome", round2(monthlyIncome));
        result.put("monthlySubscriptions", round2(monthlySubscriptions));
        result.put("monthlyBills", round2(monthlyBills));
        result.put("monthlyGoalAllocations", round2(totalGoalContributions));
        result.put("totalBudget", round2(budgetAfterGoals));
        result.put("totalCapacity", round2(trueSpendable));
        result.put("categoryLimits", categoryLimits);
        result.put("safeToSpend", safeToSpend);
        result.put("daysInMonth", daysInMonth);
        result.put("daysRemaining", daysRemaining);
        result.put("bufferAmount", bufferAmount);
        result.put("categoryTiers", CATEGORY_TIERS);

        // Build category explanations map (backward compatible format)
        Map<String, Map<String, Object>> categoryExplanationsMap = new LinkedHashMap<>();
        for (String cat : DEFAULT_CATEGORIES) {
            Map<String, Object> ex = new LinkedHashMap<>();
            ex.put("suggested", categoryLimits.getOrDefault(cat, 0.0));
            ex.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));
            ex.put("reason", categoryExplanations.getOrDefault(cat, "Adaptive allocation"));
            categoryExplanationsMap.put(cat, ex);
        }
        result.put("categoryExplanations", categoryExplanationsMap);

        // Goal breakdown
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> goalBreakdown = (List<Map<String, Object>>) layer2.get("goalBreakdown");
        result.put("goalBreakdown", goalBreakdown);

        // Context modifier impact (matching goalBreakdown pattern)
        @SuppressWarnings("unchecked")
        Map<String, Double> contextImpact = (Map<String, Double>) layer4.get("contextImpact");
        double totalContextShift = (double) layer4.get("totalContextShift");
        result.put("contextImpact", contextImpact);
        result.put("totalContextShift", totalContextShift);
        result.put("contextBreakdown", layer3.get("activeContexts"));

        // New engine-specific keys
        result.put("engineMode", "ADAPTIVE");
        result.put("budgetMode", "PERSONA_AWARE");
        result.put("layer1_capacity", layer1);
        result.put("layer2_goals", layer2);
        result.put("layer3_context", layer3);
        result.put("layer4_allocation", layer4);
        result.put("layer5_persona", layer5.toMap());
        result.put("explanationTrace", explanationTrace);

        // Top-level convenience fields for persona monitoring
        result.put("warningThreshold", layer5.getWarningThreshold());
        result.put("pacingThreshold", layer5.getPacingThreshold());
        result.put("reallocationStyle", layer5.getReallocationStyle());
        result.put("personaGuidance", layer5.getGuidanceMessage());

        return result;
    }

    // Layer 1: Financial Capacity

    public Map<String, Object> computeLayer1Capacity(Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> steps = new ArrayList<>();

        double monthlyIncome = budgetService.calculateMonthlyIncome(userId);
        steps.add(step("CAPACITY", "monthlyIncome", "income", 0, monthlyIncome, monthlyIncome,
                String.format("Monthly income: +£%.2f", monthlyIncome)));

        // Usable cash from balance
        double usableCash = 0;
        double safetyReserve = 0;
        double debtMinimums = 0;
        Optional<FinancialProfile> profileOpt = financialProfileRepository.findByUserId(userId);
        if (profileOpt.isPresent()) {
            FinancialProfile fp = profileOpt.get();
            usableCash = round2(fp.getUsableCash());
            safetyReserve = fp.getSafetyReserve();
            debtMinimums = fp.getDebtMinimumMonthly();
            steps.add(step("CAPACITY", "usableCash", "cash", fp.getCurrentBalance(), usableCash, usableCash,
                    String.format("Usable cash: £%.2f balance × %.0f%% usable = +£%.2f",
                            fp.getCurrentBalance(), fp.getUsableBalancePercent() * 100, usableCash)));
        } else {
            steps.add(step("CAPACITY", "usableCash", "cash", 0, 0, 0,
                    "No financial profile set — usable cash = £0.00"));
        }

        double monthlyBills = budgetService.calculateMonthlyBills(userId);
        steps.add(step("CAPACITY", "monthlyBills", "deduction", monthlyIncome + usableCash, -monthlyBills,
                monthlyIncome + usableCash - monthlyBills,
                String.format("Bills: -£%.2f", monthlyBills)));

        double monthlySubscriptions = budgetService.calculateMonthlySubscriptions(userId);
        double afterBillsSubs = monthlyIncome + usableCash - monthlyBills - monthlySubscriptions;
        steps.add(step("CAPACITY", "monthlySubscriptions", "deduction", monthlyIncome + usableCash - monthlyBills,
                -monthlySubscriptions, afterBillsSubs,
                String.format("Subscriptions: -£%.2f", monthlySubscriptions)));

        if (debtMinimums > 0) {
            steps.add(step("CAPACITY", "debtMinimums", "deduction", afterBillsSubs, -debtMinimums,
                    afterBillsSubs - debtMinimums,
                    String.format("Debt minimums: -£%.2f", debtMinimums)));
        }

        double trueSpendable = round2(Math.max(0, monthlyIncome + usableCash - monthlyBills - monthlySubscriptions - debtMinimums));
        boolean budgetDeficit = (monthlyIncome + usableCash - monthlyBills - monthlySubscriptions - debtMinimums) <= 0;

        String capacityReason = String.format("£%.2f income + £%.2f usable cash - £%.2f bills - £%.2f subs - £%.2f debt mins = £%.2f spendable",
                monthlyIncome, usableCash, monthlyBills, monthlySubscriptions, debtMinimums, trueSpendable);

        steps.add(step("CAPACITY", "trueSpendable", "income", 0, 0, trueSpendable, capacityReason));

        result.put("monthlyIncome", round2(monthlyIncome));
        result.put("usableCash", usableCash);
        result.put("monthlyBills", round2(monthlyBills));
        result.put("monthlySubscriptions", round2(monthlySubscriptions));
        result.put("debtMinimums", round2(debtMinimums));
        result.put("safetyReserve", round2(safetyReserve));
        result.put("trueSpendable", trueSpendable);
        result.put("budgetDeficit", budgetDeficit);
        result.put("steps", steps);

        if (budgetDeficit) {
            result.put("deficitMessage", String.format(
                    "Your obligations (£%.2f) exceed available funds (£%.2f). Consider reducing fixed costs.",
                    monthlyBills + monthlySubscriptions + debtMinimums, monthlyIncome + usableCash));
        }

        return result;
    }

    // Layer 2: Goal Contributions (OUTCOME plans only)

    public Map<String, Object> computeLayer2Goals(Long userId, double spendable, String goalOverrideAction) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> steps = new ArrayList<>();
        List<Map<String, Object>> goalBreakdown = new ArrayList<>();

        LocalDate today = LocalDate.now();
        YearMonth currentYearMonth = YearMonth.from(today);

        List<Plan> outcomePlans = planService.getActiveOutcomePlans(userId);

        // Build goal list with contributions
        List<Map<String, Object>> goalEntries = new ArrayList<>();
        for (Plan plan : outcomePlans) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("title", plan.getTitle());
            String goalCategory = plan.getCategory() != null ? plan.getCategory() : "SAVINGS";
            entry.put("type", goalCategory);
            entry.put("isFlexible", plan.getIsFlexible());

            // If user specified a fixed monthly contribution, use it directly
            if (plan.getMonthlyContribution() != null && plan.getMonthlyContribution() > 0) {
                double remaining = plan.getTargetAmount() - plan.getCurrentAmount();
                if (remaining <= 0) {
                    entry.put("contribution", 0.0);
                    entry.put("status", "met");
                    goalEntries.add(entry);
                    continue;
                }
                double contribution = Math.min(plan.getMonthlyContribution(), remaining);
                entry.put("contribution", round2(contribution));
                entry.put("remaining", round2(remaining));
                entry.put("status", "active");
                goalEntries.add(entry);
                continue;
            }

            // MONTHLY_RECURRING + OPEN_ENDED plans with no target amount: skip (no calculable contribution)
            if ("MONTHLY_RECURRING".equals(plan.getCadence()) && "OPEN_ENDED".equals(plan.getTermination())
                    && plan.getTargetAmount() <= 0) {
                entry.put("contribution", 0.0);
                entry.put("status", "no_target");
                goalEntries.add(entry);
                continue;
            }

            // Compute contribution from target amount and deadline
            // UNTIL_TARGET plans use targetDate as the aspirational deadline; others use endDate
            LocalDate endDate = plan.getTargetDate() != null ? plan.getTargetDate() : plan.getEndDate();
            if (endDate == null) {
                // UNTIL_TARGET with no end date: spread over 12 months as a default pace
                double remaining = plan.getTargetAmount() - plan.getCurrentAmount();
                if (remaining <= 0) {
                    entry.put("contribution", 0.0);
                    entry.put("status", "met");
                } else {
                    double contribution = round2(remaining / 12.0);
                    entry.put("contribution", contribution);
                    entry.put("remaining", round2(remaining));
                    entry.put("status", "active");
                }
                goalEntries.add(entry);
                continue;
            }

            if (endDate.isBefore(today)) {
                entry.put("contribution", 0.0);
                entry.put("status", "expired");
                goalEntries.add(entry);
                continue;
            }

            double remaining = plan.getTargetAmount() - plan.getCurrentAmount();
            if (remaining <= 0) {
                entry.put("contribution", 0.0);
                entry.put("status", "met");
                goalEntries.add(entry);
                continue;
            }

            long monthsRemaining = ChronoUnit.MONTHS.between(currentYearMonth, YearMonth.from(endDate));
            if (monthsRemaining <= 0) monthsRemaining = 1;

            double contribution = round2(remaining / monthsRemaining);
            entry.put("contribution", contribution);
            entry.put("monthsRemaining", monthsRemaining);
            entry.put("remaining", round2(remaining));
            entry.put("status", "active");
            goalEntries.add(entry);
        }

        // Sort by priority
        goalEntries.sort((a, b) -> {
            int pa = TYPE_PRIORITY.getOrDefault(a.get("type"), 4);
            int pb = TYPE_PRIORITY.getOrDefault(b.get("type"), 4);
            return Integer.compare(pa, pb);
        });

        double totalGoalContributions = goalEntries.stream()
                .mapToDouble(e -> (double) e.get("contribution"))
                .sum();

        // Reduce flexible goals if over 40% cap and override action is REDUCE
        boolean budgetTight = false;
        if (spendable > 0 && totalGoalContributions > spendable * GOAL_BUDGET_CAP
                && "REDUCE".equals(goalOverrideAction)) {
            double targetTotal = spendable * GOAL_BUDGET_CAP;
            double excess = totalGoalContributions - targetTotal;

            // Reduce from lowest priority upward, only flexible goals
            for (int i = goalEntries.size() - 1; i >= 0 && excess > 0; i--) {
                Map<String, Object> entry = goalEntries.get(i);
                boolean flexible = (boolean) entry.get("isFlexible");
                if (!flexible) continue;

                double contribution = (double) entry.get("contribution");
                double maxReduction = contribution * GOAL_MAX_REDUCTION;
                double reduction = Math.min(maxReduction, excess);

                double original = contribution;
                contribution = round2(contribution - reduction);
                entry.put("contribution", contribution);
                entry.put("reducedFrom", original);
                excess -= reduction;
            }

            totalGoalContributions = goalEntries.stream()
                    .mapToDouble(e -> (double) e.get("contribution"))
                    .sum();
        }

        // Build steps and breakdown
        for (Map<String, Object> entry : goalEntries) {
            double contribution = (double) entry.get("contribution");
            String title = (String) entry.get("title");
            String status = (String) entry.get("status");
            boolean flexible = (boolean) entry.get("isFlexible");

            if (contribution > 0) {
                String reason;
                if (entry.containsKey("reducedFrom")) {
                    reason = String.format("%s: £%.2f/mo (reduced from £%.2f, %s)",
                            title, contribution, entry.get("reducedFrom"), flexible ? "flexible" : "protected");
                } else {
                    reason = String.format("%s: £%.2f/mo (%s)",
                            title, contribution, flexible ? "flexible" : "protected");
                }
                steps.add(step("GOALS", title, "contribution", spendable, -contribution,
                        spendable - contribution, reason));

                goalBreakdown.add(Map.of(
                        "title", title,
                        "monthlyContribution", contribution,
                        "type", entry.get("type"),
                        "isFlexible", flexible
                ));
            } else if ("expired".equals(status)) {
                steps.add(step("GOALS", title, "contribution", 0, 0, 0,
                        String.format("%s: skipped (target date passed)", title)));
            }
        }

        double budgetAfterGoals = round2(Math.max(0, spendable - totalGoalContributions));
        budgetTight = budgetAfterGoals <= 0 && totalGoalContributions > 0;

        String goalsReason = goalBreakdown.isEmpty()
                ? "No active goals — full budget available for spending"
                : String.format("Total goal contributions: £%.2f → £%.2f after goals",
                        totalGoalContributions, budgetAfterGoals);
        steps.add(step("GOALS", "budgetAfterGoals", "contribution", spendable, -totalGoalContributions,
                budgetAfterGoals, goalsReason));

        result.put("totalGoalContributions", round2(totalGoalContributions));
        result.put("budgetAfterGoals", budgetAfterGoals);
        result.put("goalBreakdown", goalBreakdown);
        result.put("budgetTight", budgetTight);
        result.put("steps", steps);

        if (budgetTight) {
            result.put("tightMessage", "Goal contributions exceed available budget. Consider pausing lower-priority goals.");
        }

        return result;
    }

    // Layer 3: Context Modifiers (PRIORITY plans)

    public Map<String, Object> computeLayer3Context(Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> steps = new ArrayList<>();
        LocalDate today = LocalDate.now();

        List<Plan> priorityPlans = planService.getActivePriorityPlans(userId).stream()
                .filter(p -> {
                    String cadence = p.getCadence();
                    String termination = p.getTermination();

                    // ONE_TIME + OPEN_ENDED with no dates: treat as active this month (legacy migrated)
                    if ("ONE_TIME".equals(cadence) && "OPEN_ENDED".equals(termination)
                            && p.getStartDate() == null && p.getEndDate() == null) {
                        return true;
                    }
                    // OPEN_ENDED with no end date: always active
                    if ("OPEN_ENDED".equals(termination) && p.getEndDate() == null) {
                        return true;
                    }

                    // Legacy fallback for plans without cadence/termination
                    if (cadence == null && termination == null) {
                        if ("ONE_OFF".equals(p.getType()) && p.getStartDate() == null && p.getEndDate() == null) {
                            return true;
                        }
                        if ("CONTINUOUS".equals(p.getType()) && p.getEndDate() == null) {
                            return true;
                        }
                    }

                    // Date-bounded: check if today falls within range
                    LocalDate start = p.getStartDate() != null ? p.getStartDate() : LocalDate.MIN;
                    LocalDate end = p.getEndDate() != null ? p.getEndDate() : LocalDate.MAX;
                    return !today.isBefore(start) && !today.isAfter(end);
                })
                .collect(Collectors.toList());

        Map<String, Double> mergedAdjustments = new LinkedHashMap<>();
        Map<String, Double> mergedFixedAmounts = new LinkedHashMap<>();
        List<Map<String, Object>> activeContextInfo = new ArrayList<>();

        for (Plan p : priorityPlans) {
            Map<String, Double> adjustments = planService.resolvePriorityAdjustments(p);
            Map<String, Double> fixedAmounts = planService.resolveFixedAmountAdjustments(p);
            Map<String, Object> contextInfo = new LinkedHashMap<>();
            contextInfo.put("id", p.getId());
            contextInfo.put("title", p.getTitle());
            contextInfo.put("type", p.getType());
            contextInfo.put("startDate", p.getStartDate() != null ? p.getStartDate().toString() : null);
            contextInfo.put("endDate", p.getEndDate() != null ? p.getEndDate().toString() : null);
            contextInfo.put("adjustments", adjustments);
            contextInfo.put("fixedAmounts", fixedAmounts);
            activeContextInfo.add(contextInfo);

            for (Map.Entry<String, Double> adj : adjustments.entrySet()) {
                mergedAdjustments.merge(adj.getKey(), adj.getValue(), Double::sum);
            }
            for (Map.Entry<String, Double> fa : fixedAmounts.entrySet()) {
                mergedFixedAmounts.merge(fa.getKey(), fa.getValue(), Double::sum);
            }

            StringBuilder adjStr = new StringBuilder();
            adjustments.forEach((cat, val) -> {
                if (!adjStr.isEmpty()) adjStr.append(", ");
                adjStr.append(String.format("%s %+.0f%%", cat, val * 100));
            });
            fixedAmounts.forEach((cat, val) -> {
                if (!adjStr.isEmpty()) adjStr.append(", ");
                adjStr.append(String.format("%s %s£%.2f", cat, val >= 0 ? "+" : "-", Math.abs(val)));
            });

            String dateRange = "";
            if (p.getStartDate() != null && p.getEndDate() != null) {
                dateRange = String.format(" (%s–%s)", p.getStartDate(), p.getEndDate());
            }

            steps.add(step("CONTEXT", p.getTitle(), "adjustment", 0, 0, 0,
                    String.format("%s%s: %s", p.getTitle(), dateRange, adjStr)));
        }

        // Clamp to +/-50%
        mergedAdjustments.replaceAll((cat, val) ->
                Math.max(-MAX_CONTEXT_ADJUSTMENT, Math.min(MAX_CONTEXT_ADJUSTMENT, val)));

        if (priorityPlans.isEmpty()) {
            steps.add(step("CONTEXT", "none", "adjustment", 0, 0, 0,
                    "No active spending priorities — pure historical allocation"));
        }

        result.put("activeContexts", activeContextInfo);
        result.put("mergedAdjustments", mergedAdjustments);
        result.put("mergedFixedAmounts", mergedFixedAmounts);
        result.put("steps", steps);

        return result;
    }

    // Layer 4: Adaptive Allocation

    public Map<String, Object> computeLayer4Allocation(Long userId, double budgetAfterGoals,
                                                        Map<String, Double> mergedAdjustments,
                                                        Map<String, Double> mergedFixedAmounts) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> steps = new ArrayList<>();

        // Step 1: Reserve 5% buffer
        double bufferAmount = round2(budgetAfterGoals * DEFAULT_BUFFER_PERCENT);
        double allocatable = round2(budgetAfterGoals - bufferAmount);
        steps.add(step("ALLOCATION", "buffer", "buffer", budgetAfterGoals, -bufferAmount, allocatable,
                String.format("5%% buffer: £%.2f reserved → £%.2f allocatable", bufferAmount, allocatable)));

        // Step 2: Base weights from spending history
        String allocationMode;
        Map<String, Double> baseWeights = new LinkedHashMap<>();

        // Count months of data
        List<Expense> allExpenses = expenseRepository.findByUserId(userId);
        Set<String> monthsWithData = allExpenses.stream()
                .filter(e -> e.getDate() != null && e.getDate().length() >= 7)
                .map(e -> e.getDate().substring(0, 7))
                .collect(Collectors.toSet());

        int dataMonths = monthsWithData.size();

        if (dataMonths >= 3) {
            allocationMode = "HISTORICAL";
            baseWeights = computeHistoricalWeights(userId, 3);
        } else if (dataMonths >= 1) {
            allocationMode = "LIMITED_HISTORY";
            baseWeights = computeHistoricalWeights(userId, dataMonths);
        } else {
            allocationMode = "COLD_START";
            double evenWeight = 1.0 / DEFAULT_CATEGORIES.size();
            for (String cat : DEFAULT_CATEGORIES) {
                baseWeights.put(cat, evenWeight);
            }
        }

        // Ensure all categories exist
        for (String cat : DEFAULT_CATEGORIES) {
            baseWeights.putIfAbsent(cat, 0.0);
        }

        // Apply smoothing floor: no category below 5%
        applyMinimumWeightFloor(baseWeights);

        // Step 3: Apply context modifiers
        Map<String, Double> adjustedWeights = new LinkedHashMap<>();
        for (String cat : DEFAULT_CATEGORIES) {
            double base = baseWeights.getOrDefault(cat, 0.0);
            double adjustment = mergedAdjustments.getOrDefault(cat, 0.0);
            adjustedWeights.put(cat, base * (1 + adjustment));
        }

        // Step 4: Normalize
        double weightSum = adjustedWeights.values().stream().mapToDouble(Double::doubleValue).sum();
        if (weightSum > 0) {
            adjustedWeights.replaceAll((cat, w) -> w / weightSum);
        } else {
            double even = 1.0 / DEFAULT_CATEGORIES.size();
            for (String cat : DEFAULT_CATEGORIES) {
                adjustedWeights.put(cat, even);
            }
        }

        // Compute base category limits (without context modifiers) for impact tracking
        double baseWeightSum = baseWeights.values().stream().mapToDouble(Double::doubleValue).sum();
        Map<String, Double> baseCategoryLimits = new LinkedHashMap<>();
        if (baseWeightSum > 0) {
            for (String cat : DEFAULT_CATEGORIES) {
                double bw = baseWeights.getOrDefault(cat, 0.0);
                baseCategoryLimits.put(cat, round2(allocatable * (bw / baseWeightSum)));
            }
        } else {
            double even = round2(allocatable / DEFAULT_CATEGORIES.size());
            for (String cat : DEFAULT_CATEGORIES) {
                baseCategoryLimits.put(cat, even);
            }
        }

        // Step 5: Final category limits
        Map<String, Double> categoryLimits = new LinkedHashMap<>();
        Map<String, String> categoryExplanations = new LinkedHashMap<>();

        for (String cat : DEFAULT_CATEGORIES) {
            double weight = adjustedWeights.getOrDefault(cat, 0.0);
            double catLimit = round2(allocatable * weight);
            categoryLimits.put(cat, catLimit);

            double baseW = baseWeights.getOrDefault(cat, 0.0);
            double contextAdj = mergedAdjustments.getOrDefault(cat, 0.0);

            String reason;
            if ("COLD_START".equals(allocationMode)) {
                if (contextAdj != 0) {
                    reason = String.format("Even split (20%%) → %+.0f%% context → £%.2f allocated",
                            contextAdj * 100, catLimit);
                } else {
                    reason = String.format("Even split — no spending history yet → £%.2f allocated", catLimit);
                }
            } else {
                double avgSpend = round2(allocatable * baseW);
                if (contextAdj != 0) {
                    reason = String.format("£%.2f/mo avg (%.1f%%) → %+.0f%% context → £%.2f allocated",
                            avgSpend, baseW * 100, contextAdj * 100, catLimit);
                } else {
                    reason = String.format("£%.2f/mo avg (%.1f%%) → £%.2f allocated", avgSpend, baseW * 100, catLimit);
                }
            }
            categoryExplanations.put(cat, reason);

            steps.add(step("ALLOCATION", cat, "allocation", allocatable * baseW, contextAdj,
                    catLimit, reason));
        }

        // Step 5b: Apply fixed-amount adjustments from priorityAmount
        if (mergedFixedAmounts != null && !mergedFixedAmounts.isEmpty()) {
            double totalFixedShift = 0;
            for (Map.Entry<String, Double> fa : mergedFixedAmounts.entrySet()) {
                String cat = fa.getKey();
                double shift = fa.getValue();
                if (!categoryLimits.containsKey(cat)) continue;

                double currentLimit = categoryLimits.get(cat);
                double newLimit = round2(Math.max(0, currentLimit + shift));
                double actualShift = round2(newLimit - currentLimit);
                categoryLimits.put(cat, newLimit);
                totalFixedShift += actualShift;

                String shiftDir = actualShift >= 0 ? "+" : "";
                String reason = String.format("%s: %s£%.2f fixed priority amount → £%.2f",
                        cat, shiftDir, actualShift, newLimit);
                categoryExplanations.put(cat,
                        categoryExplanations.getOrDefault(cat, "") + " | " + reason);
                steps.add(step("ALLOCATION", cat, "fixed_priority", currentLimit, actualShift,
                        newLimit, reason));
            }

            // Redistribute the net shift across other categories to stay within allocatable
            if (Math.abs(totalFixedShift) > 0.01) {
                List<String> otherCats = DEFAULT_CATEGORIES.stream()
                        .filter(c -> !mergedFixedAmounts.containsKey(c))
                        .collect(Collectors.toList());
                double otherTotal = otherCats.stream()
                        .mapToDouble(c -> categoryLimits.getOrDefault(c, 0.0))
                        .sum();

                if (otherTotal > 0) {
                    for (String oc : otherCats) {
                        double ocLimit = categoryLimits.getOrDefault(oc, 0.0);
                        double proportion = ocLimit / otherTotal;
                        double redistribution = round2(-totalFixedShift * proportion);
                        double newOcLimit = round2(Math.max(0, ocLimit + redistribution));
                        categoryLimits.put(oc, newOcLimit);
                    }
                }
            }
        }

        // Compute context impact: difference between final and base category limits
        Map<String, Double> contextImpact = new LinkedHashMap<>();
        double totalContextShift = 0;
        for (String cat : DEFAULT_CATEGORIES) {
            double impact = round2(categoryLimits.getOrDefault(cat, 0.0) - baseCategoryLimits.getOrDefault(cat, 0.0));
            contextImpact.put(cat, impact);
            if (impact > 0) totalContextShift += impact;
        }
        totalContextShift = round2(totalContextShift);

        // Step 6: safeToSpend
        double categoryTotal = categoryLimits.values().stream().mapToDouble(Double::doubleValue).sum();
        double safeToSpend = round2(Math.max(0, allocatable - categoryTotal));

        result.put("bufferAmount", bufferAmount);
        result.put("allocatable", allocatable);
        result.put("categoryLimits", categoryLimits);
        result.put("categoryExplanations", categoryExplanations);
        result.put("allocationMode", allocationMode);
        result.put("safeToSpend", safeToSpend);
        result.put("contextImpact", contextImpact);
        result.put("totalContextShift", totalContextShift);
        result.put("steps", steps);

        return result;
    }

    // Enhanced Status

    public Optional<Map<String, Object>> buildAdaptiveStatus(Long userId) {
        // Resolve Layer 5 first so persona thresholds drive warning/pacing logic
        PersonaBudgetProfile layer5 = personaBudgetModifierService.applyPersonaModifiers(userId);

        Optional<Map<String, Object>> baseStatus = budgetService.buildBudgetStatus(
                userId, layer5.getWarningThreshold(), layer5.getPacingThreshold());
        if (baseStatus.isEmpty()) return baseStatus;

        Map<String, Object> status = baseStatus.get();

        // Add active contexts info
        Map<String, Object> layer3 = computeLayer3Context(userId);
        status.put("activeContexts", layer3.get("activeContexts"));
        status.put("mergedAdjustments", layer3.get("mergedAdjustments"));
        status.put("engineMode", "ADAPTIVE");

        // Add Layer 5 persona monitoring settings
        status.put("layer5_persona", layer5.toMap());
        status.put("warningThreshold", layer5.getWarningThreshold());
        status.put("pacingThreshold", layer5.getPacingThreshold());
        status.put("reallocationStyle", layer5.getReallocationStyle());
        status.put("personaGuidance", layer5.getGuidanceMessage());

        // Reallocation suggestions driven by persona style
        Map<String, Object> reallocation = computeReallocationSuggestions(status, layer5.getReallocationStyle());
        status.put("reallocation", reallocation);

        // Persona-aware nudges: downstream consumer of all Layer 1-5 outputs
        Map<String, Object> nudges = budgetNudgeService.generatePersonaAwareNudges(status, userId);
        status.put("nudges", nudges);

        return Optional.of(status);
    }

    // Reallocation Suggestions

    private List<String> getDonorOrder(String style) {
        if ("DISCRETIONARY_FIRST".equals(style)) {
            return List.of("Leisure", "Other", "Travel", "Education", "Food");
        } else if ("NON_ESSENTIALS_FIRST".equals(style)) {
            return List.of("Leisure", "Travel", "Other", "Education", "Food");
        }
        return List.of(); // proportional styles: no fixed order
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> computeReallocationSuggestions(Map<String, Object> status, String reallocationStyle) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> steps = new ArrayList<>();
        List<Map<String, Object>> suggestions = new ArrayList<>();

        if (reallocationStyle == null) reallocationStyle = "STANDARD";

        Map<String, Map<String, Object>> categories = (Map<String, Map<String, Object>>) status.get("categories");
        if (categories == null || categories.isEmpty()) {
            result.put("active", false);
            result.put("pressure", 0.0);
            result.put("steps", steps);
            return result;
        }

        // 1. Find pressure sources (exceeded / buffer-absorbing)
        List<String> pressureSources = new ArrayList<>();
        double totalPressure = 0;
        for (Map.Entry<String, Map<String, Object>> entry : categories.entrySet()) {
            String catStatus = (String) entry.getValue().get("status");
            if ("exceeded".equals(catStatus) || "buffer-absorbing".equals(catStatus)) {
                double overflow = entry.getValue().get("overflowAmount") != null
                        ? ((Number) entry.getValue().get("overflowAmount")).doubleValue() : 0;
                if (overflow > 0) {
                    pressureSources.add(entry.getKey());
                    totalPressure += overflow;
                }
            }
        }

        totalPressure = round2(totalPressure);

        if (totalPressure == 0) {
            result.put("active", false);
            result.put("pressure", 0.0);
            result.put("steps", steps);
            return result;
        }

        steps.add(step("REALLOCATION", "pressure", "detection", 0, totalPressure, totalPressure,
                String.format("Budget pressure detected: £%.2f overflow from %s", totalPressure, String.join(", ", pressureSources))));

        // 2. Build donor list: non-exceeded categories with remaining > 0
        Map<String, Double> donorRemaining = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, Object>> entry : categories.entrySet()) {
            if (pressureSources.contains(entry.getKey())) continue;
            String catStatus = (String) entry.getValue().get("status");
            if ("exceeded".equals(catStatus) || "buffer-absorbing".equals(catStatus)) continue;

            double limit = ((Number) entry.getValue().get("limit")).doubleValue();
            double spent = ((Number) entry.getValue().get("spent")).doubleValue();
            double remaining = limit - spent;
            if (remaining > 0) {
                donorRemaining.put(entry.getKey(), remaining);
            }
        }

        if (donorRemaining.isEmpty()) {
            result.put("active", true);
            result.put("pressure", totalPressure);
            result.put("pressureSources", pressureSources);
            result.put("totalFreed", 0.0);
            result.put("fullyResolved", false);
            result.put("unresolved", totalPressure);
            result.put("style", reallocationStyle);
            result.put("suggestions", suggestions);
            steps.add(step("REALLOCATION", "donors", "detection", 0, 0, 0,
                    "No donor categories available — all categories are exceeded or empty"));
            result.put("steps", steps);
            result.put("summary", String.format("£%.2f pressure but no categories can donate", totalPressure));
            return result;
        }

        double totalDonorRemaining = donorRemaining.values().stream().mapToDouble(Double::doubleValue).sum();

        // 3. Compute reductions based on style
        Map<String, Double> reductions = new LinkedHashMap<>();
        List<String> donorOrder = getDonorOrder(reallocationStyle);
        boolean isOrdered = !donorOrder.isEmpty();

        if (isOrdered) {
            // Sequential: iterate in priority order, take up to 50% of each donor's remaining
            double remainingPressure = totalPressure;
            for (String cat : donorOrder) {
                if (remainingPressure <= 0) break;
                if (!donorRemaining.containsKey(cat)) continue;
                double available = donorRemaining.get(cat) * MAX_REALLOCATION_PERCENT;
                double take = Math.min(available, remainingPressure);
                if (take >= 5.0) {
                    reductions.put(cat, round2(take));
                    remainingPressure -= take;
                }
            }
        } else {
            // Proportional: each donor contributes (its remaining / total) * pressure, capped at 50%
            for (Map.Entry<String, Double> donor : donorRemaining.entrySet()) {
                double proportion = donor.getValue() / totalDonorRemaining;
                double share = proportion * totalPressure;
                double capped = Math.min(share, donor.getValue() * MAX_REALLOCATION_PERCENT);
                if (capped >= 5.0) {
                    reductions.put(donor.getKey(), round2(capped));
                }
            }
        }

        // 4. Build suggestion objects
        double totalFreed = 0;
        for (Map.Entry<String, Double> red : reductions.entrySet()) {
            String cat = red.getKey();
            double reduction = red.getValue();
            double limit = ((Number) categories.get(cat).get("limit")).doubleValue();
            double suggestedLimit = round2(limit - reduction);
            double reductionPercent = round2((reduction / limit) * 100);

            Map<String, Object> suggestion = new LinkedHashMap<>();
            suggestion.put("category", cat);
            suggestion.put("currentLimit", round2(limit));
            suggestion.put("suggestedLimit", suggestedLimit);
            suggestion.put("reduction", reduction);
            suggestion.put("reductionPercent", reductionPercent);
            suggestion.put("tier", CATEGORY_TIERS.getOrDefault(cat, "FLEXIBLE"));
            suggestions.add(suggestion);

            totalFreed += reduction;

            steps.add(step("REALLOCATION", cat, "reduction", limit, -reduction, suggestedLimit,
                    String.format("Reduce %s by £%.2f (%.0f%%) → £%.2f", cat, reduction, reductionPercent, suggestedLimit)));
        }

        totalFreed = round2(totalFreed);
        boolean fullyResolved = totalFreed >= totalPressure - 0.01;
        double unresolved = round2(Math.max(0, totalPressure - totalFreed));

        String styleName = reallocationStyle.replace("_", " ").toLowerCase();
        String summary;
        if (fullyResolved) {
            summary = String.format("£%.2f pressure fully covered by reducing %d categories (%s)", totalPressure, suggestions.size(), styleName);
        } else {
            summary = String.format("£%.2f of £%.2f pressure covered — £%.2f unresolved (%s)", totalFreed, totalPressure, unresolved, styleName);
        }

        steps.add(step("REALLOCATION", "summary", "result", totalPressure, -totalFreed, unresolved, summary));

        result.put("active", true);
        result.put("pressure", totalPressure);
        result.put("pressureSources", pressureSources);
        result.put("totalFreed", totalFreed);
        result.put("fullyResolved", fullyResolved);
        result.put("unresolved", unresolved);
        result.put("style", reallocationStyle);
        result.put("suggestions", suggestions);
        result.put("steps", steps);
        result.put("summary", summary);

        return result;
    }

    // Helpers

    private Map<String, Double> computeHistoricalWeights(Long userId, int months) {
        String cutoff = LocalDate.now().minusMonths(months).format(DateTimeFormatter.ISO_LOCAL_DATE);
        List<Expense> recentExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(exp -> exp.getDate() != null && exp.getDate().compareTo(cutoff) >= 0)
                .toList();

        Map<String, Double> categoryTotals = new LinkedHashMap<>();
        double totalSpend = 0;
        for (Expense exp : recentExpenses) {
            String cat = exp.getCategory() != null ? exp.getCategory() : "Other";
            if (!DEFAULT_CATEGORIES.contains(cat)) cat = "Other";
            double amount = exp.getAmount();
            categoryTotals.merge(cat, amount, Double::sum);
            totalSpend += amount;
        }

        Map<String, Double> weights = new LinkedHashMap<>();
        if (totalSpend > 0) {
            for (String cat : DEFAULT_CATEGORIES) {
                weights.put(cat, categoryTotals.getOrDefault(cat, 0.0) / totalSpend);
            }
        }
        return weights;
    }

    private void applyMinimumWeightFloor(Map<String, Double> weights) {
        double totalBelow = 0;
        int countBelow = 0;
        for (Map.Entry<String, Double> entry : weights.entrySet()) {
            if (entry.getValue() < MIN_CATEGORY_WEIGHT) {
                totalBelow += MIN_CATEGORY_WEIGHT - entry.getValue();
                countBelow++;
            }
        }

        if (countBelow == 0) return;

        // Redistribute from categories above the floor
        double totalAbove = 0;
        for (Map.Entry<String, Double> entry : weights.entrySet()) {
            if (entry.getValue() >= MIN_CATEGORY_WEIGHT) {
                totalAbove += entry.getValue();
            }
        }

        if (totalAbove <= 0) return;

        for (Map.Entry<String, Double> entry : weights.entrySet()) {
            if (entry.getValue() < MIN_CATEGORY_WEIGHT) {
                entry.setValue(MIN_CATEGORY_WEIGHT);
            } else {
                double reduction = totalBelow * (entry.getValue() / totalAbove);
                entry.setValue(entry.getValue() - reduction);
            }
        }
    }

    private String getGoalOverrideAction(Long userId) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return budgetRepository.findByUserIdAndMonth(userId, currentMonth)
                .map(Budget::getGoalOverrideAction)
                .orElse("KEEP");
    }

    private Map<String, Object> step(String layer, String field, String action,
                                      double input, double adjustment, double stepResult, String reason) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("layer", layer);
        s.put("field", field);
        s.put("action", action);
        s.put("input", round2(input));
        s.put("adjustment", round2(adjustment));
        s.put("result", round2(stepResult));
        s.put("reason", reason);
        return s;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castSteps(Object stepsObj) {
        if (stepsObj instanceof List) {
            return (List<Map<String, Object>>) stepsObj;
        }
        return new ArrayList<>();
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
