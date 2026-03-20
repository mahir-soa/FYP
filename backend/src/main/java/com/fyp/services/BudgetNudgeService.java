package com.fyp.services;

import com.fyp.models.Nudge;
import com.fyp.models.UserPersona;
import com.fyp.repos.NudgeRepository;
import com.fyp.repos.UserPersonaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Budget-state-aware nudge engine.
 *
 * Sits DOWNSTREAM of Layers 1-5: reads their outputs from the status map
 * and generates persona-aware nudges. Does NOT modify any Layer 1-5 maths.
 *
 * Nudge types for v1:
 *   1. BUDGET_WARNING        - category hitting persona-adjusted threshold
 *   2. PACING_WARNING        - pacing drift (ahead/behind)
 *   3. REALLOCATION_ACTION   - reallocation.active == true
 *   4. POSITIVE_REINFORCEMENT - on track, no pressure
 *   5. WEEKEND_PACING        - weekend bias + timing
 */
@Service
public class BudgetNudgeService {

    private static final int MAX_NUDGES = 3;
    private static final double MIN_CONFIDENCE = 0.30;

    // Scoring weights
    private static final double W_SEVERITY      = 30.0;
    private static final double W_PERSONA_FIT   = 25.0;
    private static final double W_TIMING        = 20.0;
    private static final double W_ACTIONABILITY = 25.0;
    private static final double FATIGUE_PENALTY  = 15.0;

    // Cooldown windows per nudge type (hours)
    private static final Map<String, Long> COOLDOWN_HOURS = Map.of(
        "BUDGET_WARNING",         6L,
        "PACING_WARNING",         12L,
        "REALLOCATION_ACTION",    6L,
        "POSITIVE_REINFORCEMENT", 24L,
        "WEEKEND_PACING",         24L
    );

    // Domain trait staleness: ignore traits older than this
    private static final long TRAIT_MAX_AGE_DAYS = 7;

    private final UserPersonaRepository userPersonaRepository;
    private final NudgeRepository nudgeRepository;
    private final ObjectMapper objectMapper;

    public BudgetNudgeService(UserPersonaRepository userPersonaRepository,
                               NudgeRepository nudgeRepository) {
        this.userPersonaRepository = userPersonaRepository;
        this.nudgeRepository = nudgeRepository;
        this.objectMapper = new ObjectMapper();
    }

    // TEMPLATE REGISTRY

    private record NudgeTemplate(String title, String message, String actionType, String explanation) {}

    private static final String FALLBACK_PERSONA = "NEUTRAL";
    private static final Map<String, NudgeTemplate> TEMPLATES = new HashMap<>();

    static {
        // BUDGET_WARNING : exceeded
        TEMPLATES.put("BUDGET_WARNING:exceeded:ERRATIC_SPENDER", new NudgeTemplate(
            "{category} is over budget",
            "Your {category} spending has exceeded the limit by £{overflow}. Reduce spending in this category immediately to stabilise the month.",
            "reduce_spending",
            "Erratic pattern detected — early intervention at {pct}% for {category}"));
        TEMPLATES.put("BUDGET_WARNING:exceeded:BIG_SPENDER", new NudgeTemplate(
            "{category} budget exceeded",
            "Your {category} spending has exceeded the limit by £{overflow}. Trimming non-essentials now would protect the rest of your budget.",
            "review_spending",
            "Big spender — affordability check at {pct}% for {category}"));
        TEMPLATES.put("BUDGET_WARNING:exceeded:BALANCED_SPENDER", new NudgeTemplate(
            "{category} slightly over",
            "You're mostly on track, but {category} has gone over by £{overflow}. A small adjustment now would keep the month balanced.",
            "gentle_reduce",
            "Balanced pattern — later intervention at {pct}% for {category}"));
        TEMPLATES.put("BUDGET_WARNING:exceeded:NEUTRAL", new NudgeTemplate(
            "{category} over budget",
            "{category} has exceeded its budget by £{overflow}.",
            "reduce_spending",
            "Category {category} at {pct}% of limit"));

        // BUDGET_WARNING : warning
        TEMPLATES.put("BUDGET_WARNING:warning:ERRATIC_SPENDER", new NudgeTemplate(
            "{category} needs attention now",
            "Your spending is moving faster than your safe pace. {category} is at {pct}% with {daysRemaining} days remaining.",
            "reduce_spending",
            "Erratic pattern detected — early intervention at {pct}% for {category}"));
        TEMPLATES.put("BUDGET_WARNING:warning:BIG_SPENDER", new NudgeTemplate(
            "{category} spending rising",
            "Your overall spending in {category} is rising quickly relative to your monthly capacity — {pct}% used with {daysRemaining} days left.",
            "review_spending",
            "Big spender — affordability check at {pct}% for {category}"));
        TEMPLATES.put("BUDGET_WARNING:warning:BALANCED_SPENDER", new NudgeTemplate(
            "{category} running ahead",
            "You're mostly on track, but {category} is starting to run ahead of plan at {pct}%. A small adjustment now would keep things balanced.",
            "gentle_reduce",
            "Balanced pattern — later intervention at {pct}% for {category}"));
        TEMPLATES.put("BUDGET_WARNING:warning:NEUTRAL", new NudgeTemplate(
            "{category} approaching limit",
            "{category} is at {pct}% of its budget with {daysRemaining} days remaining this month.",
            "reduce_spending",
            "Category {category} at {pct}% of limit"));

        // PACING_WARNING
        TEMPLATES.put("PACING_WARNING:default:ERRATIC_SPENDER", new NudgeTemplate(
            "Spending ahead of schedule",
            "You're spending ahead of schedule. Limit daily spending to £{safePerDay} for the next {daysRemaining} days to get back on track.",
            "reduce_daily",
            "Pacing status is BEHIND — spending faster than expected"));
        TEMPLATES.put("PACING_WARNING:default:BIG_SPENDER", new NudgeTemplate(
            "Monthly capacity under pressure",
            "At this pace, your monthly capacity could be stretched. Try to keep daily spending under £{safePerDay}.",
            "reduce_daily",
            "Pacing status is BEHIND — spending faster than expected"));
        TEMPLATES.put("PACING_WARNING:default:BALANCED_SPENDER", new NudgeTemplate(
            "Slight pacing drift",
            "A small pacing adjustment would keep the month balanced. Aim for around £{safePerDay} per day.",
            "reduce_daily",
            "Pacing status is BEHIND — spending faster than expected"));
        TEMPLATES.put("PACING_WARNING:default:NEUTRAL", new NudgeTemplate(
            "Spending pace alert",
            "You're spending faster than planned. Safe daily spend: £{safePerDay} with {daysRemaining} days remaining.",
            "reduce_daily",
            "Pacing status is BEHIND — spending faster than expected"));

        // REALLOCATION_ACTION
        TEMPLATES.put("REALLOCATION_ACTION:default:ERRATIC_SPENDER", new NudgeTemplate(
            "Rebalance needed",
            "To recover this overspend, {actionParts}. This frees £{pressure} to cover the pressure.",
            "rebalance",
            "£{pressure} pressure detected — reallocation {resolutionStatus}"));
        TEMPLATES.put("REALLOCATION_ACTION:default:BIG_SPENDER", new NudgeTemplate(
            "Budget rebalance suggested",
            "To protect the rest of your budget, {actionParts}. This covers £{pressure} in overspending.",
            "rebalance",
            "£{pressure} pressure detected — reallocation {resolutionStatus}"));
        TEMPLATES.put("REALLOCATION_ACTION:default:BALANCED_SPENDER", new NudgeTemplate(
            "Gentle rebalance available",
            "A gentle rebalance could help — {actionParts}. This would cover £{pressure} in pressure.",
            "rebalance",
            "£{pressure} pressure detected — reallocation {resolutionStatus}"));
        TEMPLATES.put("REALLOCATION_ACTION:default:NEUTRAL", new NudgeTemplate(
            "Reallocation suggested",
            "To cover £{pressure} in overspending, {actionParts}.",
            "rebalance",
            "£{pressure} pressure detected — reallocation {resolutionStatus}"));

        // POSITIVE_REINFORCEMENT
        TEMPLATES.put("POSITIVE_REINFORCEMENT:default:ERRATIC_SPENDER", new NudgeTemplate(
            "Good progress",
            "Good progress — {onTrackCount} categories are on track. Keep this momentum going to stabilise the month.",
            "continue",
            "{onTrackCount} of {totalCategories} categories on track, no pressure detected"));
        TEMPLATES.put("POSITIVE_REINFORCEMENT:default:BIG_SPENDER", new NudgeTemplate(
            "Spending under control",
            "You're managing spending well — {onTrackCount} categories are within budget.",
            "continue",
            "{onTrackCount} of {totalCategories} categories on track, no pressure detected"));
        TEMPLATES.put("POSITIVE_REINFORCEMENT:default:BALANCED_SPENDER", new NudgeTemplate(
            "You're on track",
            "You're on track across {onTrackCount} categories — your balanced approach is working well this month.",
            "continue",
            "{onTrackCount} of {totalCategories} categories on track, no pressure detected"));
        TEMPLATES.put("POSITIVE_REINFORCEMENT:default:NEUTRAL", new NudgeTemplate(
            "Budget on track",
            "{onTrackCount} categories are on track this month.",
            "continue",
            "{onTrackCount} of {totalCategories} categories on track, no pressure detected"));

        // WEEKEND_PACING
        TEMPLATES.put("WEEKEND_PACING:default:ERRATIC_SPENDER", new NudgeTemplate(
            "Weekend spending alert",
            "Your spending tends to spike on weekends. Set a hard cap of £{weekendCap} today to stay on track — you have £{remaining} left this month.",
            "set_weekend_cap",
            "Weekend bias trait detected + current day is {dayOfWeek}"));
        TEMPLATES.put("WEEKEND_PACING:default:BIG_SPENDER", new NudgeTemplate(
            "Weekend ahead",
            "Weekend spending can add up fast. You have £{remaining} remaining — consider budgeting £{weekendBudget} for the weekend.",
            "set_weekend_cap",
            "Weekend bias trait detected + current day is {dayOfWeek}"));
        TEMPLATES.put("WEEKEND_PACING:default:BALANCED_SPENDER", new NudgeTemplate(
            "Weekend tip",
            "A small weekend cap could keep things balanced. You have £{remaining} left with {daysRemaining} days to go.",
            "set_weekend_cap",
            "Weekend bias trait detected + current day is {dayOfWeek}"));
        TEMPLATES.put("WEEKEND_PACING:default:NEUTRAL", new NudgeTemplate(
            "Weekend spending reminder",
            "Your spending typically increases on weekends. You have £{remaining} remaining this month.",
            "set_weekend_cap",
            "Weekend bias trait detected + current day is {dayOfWeek}"));
    }

    private NudgeTemplate resolveTemplate(String nudgeType, String variant, String personaType) {
        NudgeTemplate t = TEMPLATES.get(nudgeType + ":" + variant + ":" + personaType);
        if (t != null) return t;
        return TEMPLATES.get(nudgeType + ":" + variant + ":" + FALLBACK_PERSONA);
    }

    private String renderTemplate(String template, Map<String, String> vars) {
        String result = template;
        for (Map.Entry<String, String> v : vars.entrySet()) {
            result = result.replace("{" + v.getKey() + "}", v.getValue());
        }
        return result;
    }

    // PUBLIC API

    @SuppressWarnings("unchecked")
    public Map<String, Object> generatePersonaAwareNudges(Map<String, Object> status, Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();

        String personaType = resolvePersonaType(status);
        List<String> domainTraits = resolveDomainTraits(userId);

        // Load recent nudge history for fatigue checks
        LocalDateTime now = LocalDateTime.now();
        Set<String> recentNudgeKeys = loadRecentNudgeKeys(userId, now);

        List<Map<String, Object>> candidates = new ArrayList<>();

        candidates.addAll(generateBudgetWarnings(status, personaType));
        candidates.addAll(generatePacingWarnings(status, personaType));
        candidates.addAll(generateReallocationActions(status, personaType));
        candidates.addAll(generatePositiveReinforcement(status, personaType));
        candidates.addAll(generateWeekendPacing(status, personaType, domainTraits));

        // Score, applying fatigue from history
        for (Map<String, Object> candidate : candidates) {
            String cooldownKey = cooldownKey(candidate);
            boolean onCooldown = recentNudgeKeys.contains(cooldownKey);
            double score = scoreNudge(candidate, personaType, onCooldown);
            candidate.put("score", round2(score));
            candidate.put("onCooldown", onCooldown);
        }

        // Sort by score desc, filter confidence, take top N
        candidates.sort((a, b) -> Double.compare(
                ((Number) b.get("score")).doubleValue(),
                ((Number) a.get("score")).doubleValue()));

        List<Map<String, Object>> topNudges = candidates.stream()
                .filter(n -> ((Number) n.get("confidence")).doubleValue() >= MIN_CONFIDENCE)
                .filter(n -> !Boolean.TRUE.equals(n.get("onCooldown")))
                .limit(MAX_NUDGES)
                .collect(Collectors.toList());

        // Persist winners that aren't already in the table
        for (Map<String, Object> nudge : topNudges) {
            String ck = cooldownKey(nudge);
            if (!recentNudgeKeys.contains(ck)) {
                persistNudge(userId, nudge, now);
            }
        }

        // Strip internal fields before returning
        for (Map<String, Object> nudge : topNudges) {
            nudge.remove("onCooldown");
        }

        result.put("nudges", topNudges);
        result.put("count", topNudges.size());
        result.put("personaType", personaType);
        result.put("candidatesEvaluated", candidates.size());

        return result;
    }

    // FATIGUE / COOLDOWN

    /**
     * Build a set of cooldown keys for nudges recently shown to this user.
     * Key format: "TYPE:triggerSource" e.g. "BUDGET_WARNING:category:Food"
     */
    private Set<String> loadRecentNudgeKeys(Long userId, LocalDateTime now) {
        Set<String> keys = new HashSet<>();
        LocalDateTime maxWindow = now.minusHours(24);
        List<Nudge> allRecent = nudgeRepository.findActiveNudges(userId, now);
        for (Nudge n : allRecent) {
            if (n.getCreatedAt() == null || n.getCreatedAt().isBefore(maxWindow)) continue;
            String type = n.getType();
            Long cooldownH = COOLDOWN_HOURS.getOrDefault(type, 6L);
            LocalDateTime cutoff = now.minusHours(cooldownH);
            if (n.getCreatedAt().isAfter(cutoff)) {
                String trigger = n.getTrigger() != null ? n.getTrigger() : "";
                keys.add(type + ":" + trigger);
            }
        }
        return keys;
    }

    private String cooldownKey(Map<String, Object> nudge) {
        return nudge.get("nudgeType") + ":" + nudge.get("triggerSource");
    }

    private void persistNudge(Long userId, Map<String, Object> nudge, LocalDateTime now) {
        String type = (String) nudge.get("nudgeType");
        long cooldownH = COOLDOWN_HOURS.getOrDefault(type, 6L);

        Nudge entity = new Nudge();
        entity.setUserId(userId);
        entity.setType(type);
        entity.setNudgeType("BudgetState");
        entity.setTrigger((String) nudge.get("triggerSource"));
        entity.setTiming("reactive");
        entity.setSeverity((String) nudge.get("severity"));
        entity.setConfidence(((Number) nudge.get("confidence")).doubleValue());
        entity.setTitle((String) nudge.get("title"));
        entity.setMessage((String) nudge.get("message"));
        entity.setPriority("strong".equals(nudge.get("severity")) ? "HIGH" : "MEDIUM");
        entity.setRelatedEntityType("BUDGET");
        entity.setExpiresAt(now.plusHours(cooldownH));
        entity.setCreatedAt(now);

        nudgeRepository.save(entity);
    }

    // CANDIDATE GENERATORS

    // A. BUDGET_WARNING

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> generateBudgetWarnings(Map<String, Object> status, String personaType) {
        List<Map<String, Object>> nudges = new ArrayList<>();

        Map<String, Map<String, Object>> categories =
                (Map<String, Map<String, Object>>) status.get("categories");
        if (categories == null) return nudges;

        int daysRemaining = getInt(status, "daysRemaining", 0);

        for (Map.Entry<String, Map<String, Object>> entry : categories.entrySet()) {
            String cat = entry.getKey();
            Map<String, Object> cs = entry.getValue();
            String catStatus = (String) cs.get("status");

            if (!"warning".equals(catStatus) && !"exceeded".equals(catStatus)
                    && !"buffer-absorbing".equals(catStatus)) {
                continue;
            }

            double spent = getDouble(cs, "spent", 0);
            double limit = getDouble(cs, "limit", 0);
            if (limit <= 0) continue;

            double pct = round2((spent / limit) * 100);
            double overflow = getDouble(cs, "overflowAmount", 0);
            boolean isExceeded = "exceeded".equals(catStatus) || "buffer-absorbing".equals(catStatus);

            String severity;
            double confidence;
            if ("exceeded".equals(catStatus)) {
                severity = "strong";
                confidence = Math.min(1.0, 0.7 + (overflow / limit) * 0.3);
            } else if ("buffer-absorbing".equals(catStatus)) {
                severity = "medium";
                confidence = Math.min(1.0, 0.6 + (overflow / limit) * 0.2);
            } else {
                severity = "medium";
                confidence = Math.min(1.0, (pct - 70) / 30.0);
            }

            String variant = isExceeded ? "exceeded" : "warning";
            NudgeTemplate t = resolveTemplate("BUDGET_WARNING", variant, personaType);

            Map<String, String> vars = Map.of(
                "category", cat,
                "overflow", fmt(overflow),
                "pct", String.valueOf(Math.round(pct)),
                "daysRemaining", String.valueOf(daysRemaining)
            );

            nudges.add(buildNudge("BUDGET_WARNING",
                    renderTemplate(t.title(), vars),
                    renderTemplate(t.message(), vars),
                    severity, personaType,
                    "category:" + cat, cat, t.actionType(), null,
                    round2(confidence),
                    renderTemplate(t.explanation(), vars)));
        }

        return nudges;
    }

    // B. PACING_WARNING

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> generatePacingWarnings(Map<String, Object> status, String personaType) {
        List<Map<String, Object>> nudges = new ArrayList<>();

        Map<String, Object> pacing = (Map<String, Object>) status.get("pacing");
        if (pacing == null) return nudges;

        String pacingStatus = (String) pacing.get("pacingStatus");
        if (!"BEHIND".equals(pacingStatus)) return nudges;

        double safePerDay = getDouble(pacing, "safeToSpendPerDay", 0);
        int daysRemaining = getInt(status, "daysRemaining", 0);

        NudgeTemplate t = resolveTemplate("PACING_WARNING", "default", personaType);

        // Persona-specific confidence and severity
        double confidence;
        String severity;
        switch (personaType) {
            case "ERRATIC_SPENDER"  -> { confidence = 0.85; severity = "strong"; }
            case "BIG_SPENDER"      -> { confidence = 0.80; severity = "medium"; }
            case "BALANCED_SPENDER" -> { confidence = 0.65; severity = "medium"; }
            default                 -> { confidence = 0.70; severity = "medium"; }
        }

        Map<String, String> vars = Map.of(
            "safePerDay", fmt(safePerDay),
            "daysRemaining", String.valueOf(daysRemaining)
        );

        nudges.add(buildNudge("PACING_WARNING",
                renderTemplate(t.title(), vars),
                renderTemplate(t.message(), vars),
                severity, personaType,
                "pacing:behind", null, t.actionType(),
                Map.of("safePerDay", safePerDay),
                round2(confidence),
                renderTemplate(t.explanation(), vars)));

        return nudges;
    }

    // C. REALLOCATION_ACTION

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> generateReallocationActions(Map<String, Object> status, String personaType) {
        List<Map<String, Object>> nudges = new ArrayList<>();

        Map<String, Object> reallocation = (Map<String, Object>) status.get("reallocation");
        if (reallocation == null || !Boolean.TRUE.equals(reallocation.get("active"))) return nudges;

        double pressure = getDouble(reallocation, "pressure", 0);
        boolean fullyResolved = Boolean.TRUE.equals(reallocation.get("fullyResolved"));
        List<Map<String, Object>> suggestions =
                (List<Map<String, Object>>) reallocation.get("suggestions");
        if (suggestions == null || suggestions.isEmpty()) return nudges;

        StringBuilder actionParts = new StringBuilder();
        for (Map<String, Object> s : suggestions) {
            if (!actionParts.isEmpty()) actionParts.append(" and ");
            actionParts.append(String.format("reduce %s by £%s",
                    s.get("category"), fmt(((Number) s.get("reduction")).doubleValue())));
        }

        NudgeTemplate t = resolveTemplate("REALLOCATION_ACTION", "default", personaType);
        double confidence = fullyResolved ? 0.90 : 0.75;
        String severity = fullyResolved ? "medium" : "strong";
        String resolutionStatus = fullyResolved ? "fully resolves it" : "partially covers it";

        Map<String, String> vars = Map.of(
            "actionParts", actionParts.toString(),
            "pressure", fmt(pressure),
            "resolutionStatus", resolutionStatus
        );

        Map<String, Object> actionData = new LinkedHashMap<>();
        actionData.put("pressure", pressure);
        actionData.put("fullyResolved", fullyResolved);
        actionData.put("suggestions", suggestions);

        nudges.add(buildNudge("REALLOCATION_ACTION",
                renderTemplate(t.title(), vars),
                renderTemplate(t.message(), vars),
                severity, personaType,
                "reallocation:active", null, t.actionType(), actionData,
                round2(confidence),
                renderTemplate(t.explanation(), vars)));

        return nudges;
    }

    // D. POSITIVE_REINFORCEMENT

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> generatePositiveReinforcement(Map<String, Object> status, String personaType) {
        List<Map<String, Object>> nudges = new ArrayList<>();

        Map<String, Object> reallocation = (Map<String, Object>) status.get("reallocation");
        if (reallocation != null && Boolean.TRUE.equals(reallocation.get("active"))) return nudges;

        Map<String, Map<String, Object>> categories =
                (Map<String, Map<String, Object>>) status.get("categories");
        if (categories == null || categories.isEmpty()) return nudges;

        boolean anyExceeded = categories.values().stream()
                .anyMatch(cs -> "exceeded".equals(cs.get("status")) || "buffer-absorbing".equals(cs.get("status")));
        if (anyExceeded) return nudges;

        long onTrackCount = categories.values().stream()
                .filter(cs -> "on-track".equals(cs.get("status")) || "unused".equals(cs.get("status")))
                .count();
        if (onTrackCount < 3) return nudges;

        NudgeTemplate t = resolveTemplate("POSITIVE_REINFORCEMENT", "default", personaType);

        double confidence = switch (personaType) {
            case "BALANCED_SPENDER" -> 0.85;
            case "BIG_SPENDER"      -> 0.65;
            case "ERRATIC_SPENDER"  -> 0.60;
            default                 -> 0.55;
        };

        Map<String, String> vars = Map.of(
            "onTrackCount", String.valueOf(onTrackCount),
            "totalCategories", String.valueOf(categories.size())
        );

        nudges.add(buildNudge("POSITIVE_REINFORCEMENT",
                renderTemplate(t.title(), vars),
                renderTemplate(t.message(), vars),
                "light", personaType,
                "status:on-track", null, t.actionType(), null,
                round2(confidence),
                renderTemplate(t.explanation(), vars)));

        return nudges;
    }

    // E. WEEKEND_PACING

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> generateWeekendPacing(Map<String, Object> status, String personaType,
                                                             List<String> domainTraits) {
        List<Map<String, Object>> nudges = new ArrayList<>();

        DayOfWeek today = LocalDate.now().getDayOfWeek();
        if (today != DayOfWeek.FRIDAY && today != DayOfWeek.SATURDAY) return nudges;
        if (!domainTraits.contains("WEEKEND_BIAS")) return nudges;

        double remaining = getDouble(status, "remaining", 0);
        int daysRemaining = getInt(status, "daysRemaining", 0);
        double safeDaily = daysRemaining > 0 ? round2(remaining / daysRemaining) : 0;

        NudgeTemplate t = resolveTemplate("WEEKEND_PACING", "default", personaType);

        double confidence = switch (personaType) {
            case "ERRATIC_SPENDER"  -> 0.85;
            case "BIG_SPENDER"      -> 0.75;
            case "BALANCED_SPENDER" -> 0.60;
            default                 -> 0.65;
        };

        Map<String, String> vars = Map.of(
            "weekendCap", fmt(safeDaily * 1.5),
            "weekendBudget", fmt(safeDaily * 2),
            "remaining", fmt(remaining),
            "safeDaily", fmt(safeDaily),
            "daysRemaining", String.valueOf(daysRemaining),
            "dayOfWeek", today.toString()
        );

        nudges.add(buildNudge("WEEKEND_PACING",
                renderTemplate(t.title(), vars),
                renderTemplate(t.message(), vars),
                "light", personaType,
                "timing:weekend", null, t.actionType(),
                Map.of("safeDaily", safeDaily, "remaining", remaining),
                round2(confidence),
                renderTemplate(t.explanation(), vars)));

        return nudges;
    }

    // SCORING

    private double scoreNudge(Map<String, Object> nudge, String personaType, boolean onCooldown) {
        double severityScore = switch ((String) nudge.getOrDefault("severity", "light")) {
            case "strong" -> 1.0;
            case "medium" -> 0.6;
            default -> 0.3;
        };

        double personaFit = computePersonaFit((String) nudge.get("nudgeType"), personaType);
        double timingFit = computeTimingFit((String) nudge.get("nudgeType"));
        double actionability = nudge.get("actionData") != null ? 0.8 : 0.4;
        double fatigue = onCooldown ? FATIGUE_PENALTY : 0;
        double confidence = ((Number) nudge.getOrDefault("confidence", 0.5)).doubleValue();

        return (severityScore * W_SEVERITY
                + personaFit * W_PERSONA_FIT
                + timingFit * W_TIMING
                + actionability * W_ACTIONABILITY
                - fatigue) * confidence;
    }

    private double computePersonaFit(String nudgeType, String personaType) {
        return switch (personaType) {
            case "ERRATIC_SPENDER" -> switch (nudgeType) {
                case "BUDGET_WARNING", "REALLOCATION_ACTION" -> 1.0;
                case "PACING_WARNING" -> 0.9;
                case "WEEKEND_PACING" -> 0.7;
                case "POSITIVE_REINFORCEMENT" -> 0.3;
                default -> 0.5;
            };
            case "BIG_SPENDER" -> switch (nudgeType) {
                case "PACING_WARNING", "BUDGET_WARNING" -> 1.0;
                case "REALLOCATION_ACTION" -> 0.8;
                case "WEEKEND_PACING" -> 0.6;
                case "POSITIVE_REINFORCEMENT" -> 0.3;
                default -> 0.5;
            };
            case "BALANCED_SPENDER" -> switch (nudgeType) {
                case "POSITIVE_REINFORCEMENT" -> 1.0;
                case "BUDGET_WARNING" -> 0.6;
                case "PACING_WARNING" -> 0.5;
                case "REALLOCATION_ACTION" -> 0.7;
                case "WEEKEND_PACING" -> 0.5;
                default -> 0.5;
            };
            default -> 0.5;
        };
    }

    private double computeTimingFit(String nudgeType) {
        int dayOfMonth = LocalDate.now().getDayOfMonth();
        DayOfWeek dow = LocalDate.now().getDayOfWeek();

        return switch (nudgeType) {
            case "WEEKEND_PACING" ->
                    (dow == DayOfWeek.FRIDAY || dow == DayOfWeek.SATURDAY) ? 1.0 : 0.0;
            case "PACING_WARNING" ->
                    dayOfMonth > 15 ? 0.9 : 0.5;
            case "BUDGET_WARNING" -> 0.8;
            case "REALLOCATION_ACTION" -> 0.8;
            case "POSITIVE_REINFORCEMENT" ->
                    dayOfMonth > 20 ? 0.9 : 0.6;
            default -> 0.5;
        };
    }

    // DOMAIN TRAITS (with staleness guard)

    @SuppressWarnings("unchecked")
    private List<String> resolveDomainTraits(Long userId) {
        try {
            Optional<UserPersona> personaOpt = userPersonaRepository.findByUserId(userId);
            if (personaOpt.isEmpty()) return List.of();

            UserPersona persona = personaOpt.get();

            // Staleness guard: ignore traits if analysis is too old
            if (persona.getCalculatedAt() == null) return List.of();
            long daysOld = ChronoUnit.DAYS.between(persona.getCalculatedAt(), LocalDateTime.now());
            if (daysOld > TRAIT_MAX_AGE_DAYS) return List.of();

            String snapshot = persona.getFeatureSnapshot();
            if (snapshot == null || snapshot.isEmpty()) return List.of();

            Map<String, Object> features = objectMapper.readValue(snapshot, Map.class);
            Map<String, Object> clustering = (Map<String, Object>) features.get("_clustering");
            if (clustering == null) return List.of();

            List<String> traits = new ArrayList<>();

            double weekendRatio = getDouble(clustering, "weekend_ratio", 0);
            if (weekendRatio > 0.37) traits.add("WEEKEND_BIAS");

            double lateNight = getDouble(clustering, "late_night_ratio", 0);
            if (lateNight > 0.34) traits.add("LATE_NIGHT_TENDENCY");

            double spendCv = getDouble(clustering, "spend_cv", 0);
            double monthlyCv = getDouble(clustering, "monthly_spend_cv", 0);
            if (spendCv > 3.2 || monthlyCv > 0.55) traits.add("HIGH_VOLATILITY");

            return traits;
        } catch (Exception e) {
            return List.of();
        }
    }

    // HELPERS

    @SuppressWarnings("unchecked")
    private String resolvePersonaType(Map<String, Object> status) {
        Map<String, Object> layer5 = (Map<String, Object>) status.get("layer5_persona");
        if (layer5 != null) {
            String pt = (String) layer5.get("personaType");
            if (pt != null && !pt.isEmpty()) return pt;
        }
        return "NEUTRAL";
    }

    private Map<String, Object> buildNudge(String nudgeType, String title, String message,
                                            String severity, String personaType,
                                            String triggerSource, String relatedCategory,
                                            String actionType, Object actionData,
                                            double confidence, String explanationReason) {
        Map<String, Object> nudge = new LinkedHashMap<>();
        nudge.put("nudgeType", nudgeType);
        nudge.put("title", title);
        nudge.put("message", message);
        nudge.put("severity", severity);
        nudge.put("personaType", personaType);
        nudge.put("triggerSource", triggerSource);
        nudge.put("relatedCategory", relatedCategory);
        nudge.put("actionType", actionType);
        nudge.put("actionData", actionData);
        nudge.put("confidence", confidence);
        nudge.put("explanationReason", explanationReason);
        return nudge;
    }

    private String fmt(double val) {
        return String.format("%.2f", val);
    }

    private double getDouble(Map<String, Object> map, String key, double defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        return defaultVal;
    }

    private int getInt(Map<String, Object> map, String key, int defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        return defaultVal;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
