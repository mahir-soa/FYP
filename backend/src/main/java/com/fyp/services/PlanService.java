package com.fyp.services;

import com.fyp.constants.SpendingCategories;
import com.fyp.models.Plan;
import com.fyp.models.dto.PlanConfirmDTO;
import com.fyp.models.dto.PlanCreateDTO;
import com.fyp.models.dto.PlanDraftDTO;
import com.fyp.models.dto.PlanUpdateDTO;
import com.fyp.repos.PlanRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class PlanService {

    private static final Map<String, Double> INTENSITY_MAP = Map.of(
        "LOW", 0.10,
        "MEDIUM", 0.25,
        "HIGH", 0.40
    );

    // Legacy intensity map for resolvePriorityAdjustments legacy path
    private static final Map<String, Double> LEGACY_INTENSITY_MAP = Map.of(
        "slight", 0.10,
        "moderate", 0.20,
        "strong", 0.35,
        "extreme", 0.50
    );

    private static final Set<String> VALID_FAMILIES = Set.of("OUTCOME_PLAN", "PRIORITY_PLAN");
    private static final Set<String> VALID_CADENCES = Set.of("ONE_TIME", "MONTHLY_RECURRING");
    private static final Set<String> VALID_TERMINATIONS = Set.of("ON_DATE", "AFTER_PERIOD", "UNTIL_TARGET", "OPEN_ENDED");
    private static final Set<String> VALID_DIRECTIONS = Set.of("INCREASE", "REDUCE", "PROTECT");
    private static final Set<String> VALID_INTENSITIES = Set.of("LOW", "MEDIUM", "HIGH");
    private static final Set<String> VALID_OUTCOME_CATEGORIES = Set.of("SAVINGS", "DEBT", "PURCHASE", "EMERGENCY");

    // Legacy family/type values for backward compatibility
    private static final Set<String> LEGACY_FAMILIES = Set.of("OUTCOME", "PRIORITY");
    private static final Set<String> VALID_TYPES = Set.of("ONE_OFF", "CONTINUOUS", "FIXED_PERIOD", "UNTIL_TARGET");

    // Keyword patterns for Java-side family classification
    private static final Pattern OUTCOME_KEYWORDS = Pattern.compile(
        "\\b(sav(?:e|ing|ings)|pay\\s*off|payoff|emergency\\s*fund|debt|loan|credit\\s*card|buy|purchase|reserve|contribute|build\\s*fund|set\\s*aside)\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PRIORITY_KEYWORDS = Pattern.compile(
        "\\b(spend\\s*more|spend\\s*less|cut\\s*back|reduce\\s*spending|increase|decrease|tight\\s*budget|frugal|bulking|eating\\s*more|exam\\s*period|studying|protect|prioriti[sz]e)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private final PlanRepository planRepository;
    private final ObjectMapper objectMapper;

    public PlanService(PlanRepository planRepository) {
        this.planRepository = planRepository;
        this.objectMapper = new ObjectMapper();
    }

    // ---- Basic CRUD ----

    public List<Plan> getAllPlans(Long userId) {
        return planRepository.findByUserId(userId);
    }

    public List<Plan> getActivePlans(Long userId) {
        return planRepository.findByUserIdAndIsActiveTrue(userId);
    }

    public List<Plan> getActiveOutcomePlans(Long userId) {
        return planRepository.findByUserIdAndFamilyAndIsActiveTrue(userId, "OUTCOME_PLAN");
    }

    public List<Plan> getActivePriorityPlans(Long userId) {
        return planRepository.findByUserIdAndFamilyAndIsActiveTrue(userId, "PRIORITY_PLAN");
    }

    // ---- Legacy createPlan for Onboarding compatibility ----

    public Plan createPlan(Long userId, PlanCreateDTO dto) {
        Plan plan = new Plan();
        plan.setUserId(userId);
        plan.setTitle(dto.getTitle());
        plan.setDescription(dto.getDescription());

        // Map old family values to new ones
        String family = dto.getFamily();
        if (family == null || !VALID_FAMILIES.contains(family)) {
            if (LEGACY_FAMILIES.contains(family)) {
                family = "OUTCOME".equals(family) ? "OUTCOME_PLAN" : "PRIORITY_PLAN";
            } else {
                family = "OUTCOME_PLAN";
            }
        }
        plan.setFamily(family);

        // Map old type to cadence + termination
        String type = dto.getType();
        if (type != null && VALID_TYPES.contains(type)) {
            plan.setType(type);
            switch (type) {
                case "ONE_OFF":
                    plan.setCadence("ONE_TIME");
                    plan.setTermination("OPEN_ENDED");
                    break;
                case "CONTINUOUS":
                    plan.setCadence("MONTHLY_RECURRING");
                    plan.setTermination("OPEN_ENDED");
                    break;
                case "FIXED_PERIOD":
                    plan.setCadence("MONTHLY_RECURRING");
                    plan.setTermination("ON_DATE");
                    break;
                case "UNTIL_TARGET":
                    plan.setCadence(dto.getMonthlyContribution() != null && dto.getMonthlyContribution() > 0
                        ? "MONTHLY_RECURRING" : "ONE_TIME");
                    plan.setTermination("UNTIL_TARGET");
                    break;
            }
        } else {
            // Onboarding sends type as SAVINGS/DEBT/PURCHASE/EMERGENCY — map these
            if (type != null && VALID_OUTCOME_CATEGORIES.contains(type)) {
                plan.setCategory(type);
                plan.setType("UNTIL_TARGET");
                plan.setCadence(dto.getMonthlyContribution() != null && dto.getMonthlyContribution() > 0
                    ? "MONTHLY_RECURRING" : "ONE_TIME");
                plan.setTermination("UNTIL_TARGET");
            } else {
                plan.setType("UNTIL_TARGET");
                plan.setCadence("ONE_TIME");
                plan.setTermination("UNTIL_TARGET");
            }
        }

        if ("OUTCOME_PLAN".equals(family)) {
            if (plan.getCategory() == null) {
                String category = dto.getCategory() != null && VALID_OUTCOME_CATEGORIES.contains(dto.getCategory())
                    ? dto.getCategory() : "SAVINGS";
                plan.setCategory(category);
            }
            plan.setTargetAmount(dto.getTargetAmount());
            plan.setCurrentAmount(dto.getCurrentAmount());
            plan.setMonthlyContribution(dto.getMonthlyContribution());
        } else {
            plan.setPriorityAdjustments(dto.getPriorityAdjustments());
        }

        plan.setStartDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now());
        plan.setEndDate(dto.getEndDate());
        plan.setTargetDate(dto.getTargetDate());
        plan.setIsFlexible(dto.getIsFlexible());
        plan.setIsActive(true);

        LocalDateTime now = LocalDateTime.now();
        plan.setCreatedAt(now);
        plan.setUpdatedAt(now);

        return planRepository.save(plan);
    }

    // ---- New createPlanFromConfirm (hard-gate validation) ----

    public Plan createPlanFromConfirm(Long userId, PlanConfirmDTO dto) {
        // Hard gate: reject UNKNOWN family
        if (dto.getFamily() == null || "UNKNOWN".equals(dto.getFamily()) || !VALID_FAMILIES.contains(dto.getFamily())) {
            throw new IllegalArgumentException("Family must be OUTCOME_PLAN or PRIORITY_PLAN, got: " + dto.getFamily());
        }

        // Hard gate: reject null cadence
        if (dto.getCadence() == null || !VALID_CADENCES.contains(dto.getCadence())) {
            throw new IllegalArgumentException("Cadence is required and must be ONE_TIME or MONTHLY_RECURRING, got: " + dto.getCadence());
        }

        // Hard gate: reject null termination
        if (dto.getTermination() == null || !VALID_TERMINATIONS.contains(dto.getTermination())) {
            throw new IllegalArgumentException("Termination is required and must be ON_DATE, AFTER_PERIOD, UNTIL_TARGET, or OPEN_ENDED, got: " + dto.getTermination());
        }

        // Hard gate: title required
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }

        Plan plan = new Plan();
        plan.setUserId(userId);
        plan.setTitle(dto.getTitle().trim());
        plan.setDescription(dto.getDescription());
        plan.setFamily(dto.getFamily());
        plan.setCadence(dto.getCadence());
        plan.setTermination(dto.getTermination());

        if ("OUTCOME_PLAN".equals(dto.getFamily())) {
            // OUTCOME: must have targetAmount > 0
            if (dto.getTargetAmount() == null || dto.getTargetAmount() <= 0) {
                throw new IllegalArgumentException("OUTCOME_PLAN requires targetAmount > 0");
            }
            String oc = dto.getOutcomeCategory() != null && VALID_OUTCOME_CATEGORIES.contains(dto.getOutcomeCategory())
                ? dto.getOutcomeCategory() : "SAVINGS";
            plan.setCategory(oc);
            plan.setTargetAmount(dto.getTargetAmount());
            plan.setCurrentAmount(dto.getCurrentAmount() != null ? dto.getCurrentAmount() : 0);
            plan.setMonthlyContribution(dto.getMonthlyContribution());
        } else {
            // PRIORITY: must have at least one priorityCategory + direction
            if (dto.getPriorityCategories() == null || dto.getPriorityCategories().isEmpty()) {
                throw new IllegalArgumentException("PRIORITY_PLAN requires at least one priorityCategory");
            }
            // Validate categories against shared constant
            for (String cat : dto.getPriorityCategories()) {
                if (!SpendingCategories.CATEGORIES.contains(cat)) {
                    throw new IllegalArgumentException("Invalid priority category: " + cat + ". Must be one of: " + SpendingCategories.CATEGORIES);
                }
            }
            if (dto.getDirection() == null || !VALID_DIRECTIONS.contains(dto.getDirection())) {
                throw new IllegalArgumentException("PRIORITY_PLAN requires a valid direction (INCREASE, REDUCE, PROTECT)");
            }
            try {
                plan.setPriorityCategories(objectMapper.writeValueAsString(dto.getPriorityCategories()));
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to serialize priority categories");
            }
            plan.setDirection(dto.getDirection());
            String intensity = dto.getIntensity() != null && VALID_INTENSITIES.contains(dto.getIntensity())
                ? dto.getIntensity() : "MEDIUM";
            plan.setIntensity(intensity);
            plan.setReasonNote(dto.getReasonNote());
            plan.setPriorityAmount(dto.getPriorityAmount());
        }

        plan.setStartDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now());
        plan.setEndDate(dto.getEndDate());
        plan.setTargetDate(dto.getTargetDate());
        plan.setDurationMonths(dto.getDurationMonths());
        plan.setIsFlexible(dto.getIsFlexible() != null ? dto.getIsFlexible() : true);
        plan.setIsActive(true);

        // Compute endDate from durationMonths + startDate when termination is AFTER_PERIOD
        if ("AFTER_PERIOD".equals(dto.getTermination()) && dto.getDurationMonths() != null && dto.getDurationMonths() > 0) {
            LocalDate start = plan.getStartDate();
            plan.setEndDate(start.plusMonths(dto.getDurationMonths()));
        }

        LocalDateTime now = LocalDateTime.now();
        plan.setCreatedAt(now);
        plan.setUpdatedAt(now);

        return planRepository.save(plan);
    }

    // ---- Update ----

    public Optional<Plan> updatePlan(Long id, Long userId, PlanUpdateDTO dto) {
        return planRepository.findById(id)
            .filter(p -> p.getUserId() != null && p.getUserId().equals(userId))
            .map(existing -> {
                if (dto.getTitle() != null) existing.setTitle(dto.getTitle());
                if (dto.getDescription() != null) existing.setDescription(dto.getDescription());
                if (dto.getFamily() != null && VALID_FAMILIES.contains(dto.getFamily()))
                    existing.setFamily(dto.getFamily());
                if (dto.getType() != null && VALID_TYPES.contains(dto.getType()))
                    existing.setType(dto.getType());
                if (dto.getCategory() != null) existing.setCategory(dto.getCategory());
                if (dto.getTargetAmount() != null) existing.setTargetAmount(dto.getTargetAmount());
                if (dto.getCurrentAmount() != null) existing.setCurrentAmount(dto.getCurrentAmount());
                if (dto.getMonthlyContribution() != null) existing.setMonthlyContribution(dto.getMonthlyContribution());
                if (dto.getPriorityAdjustments() != null) existing.setPriorityAdjustments(dto.getPriorityAdjustments());
                if (dto.getStartDate() != null) existing.setStartDate(dto.getStartDate());
                if (dto.getEndDate() != null) existing.setEndDate(dto.getEndDate());
                if (dto.getTargetDate() != null) existing.setTargetDate(dto.getTargetDate());
                if (dto.getIsFlexible() != null) existing.setIsFlexible(dto.getIsFlexible());
                if (dto.getIsActive() != null) existing.setIsActive(dto.getIsActive());

                // New fields
                if (dto.getCadence() != null && VALID_CADENCES.contains(dto.getCadence()))
                    existing.setCadence(dto.getCadence());
                if (dto.getTermination() != null && VALID_TERMINATIONS.contains(dto.getTermination()))
                    existing.setTermination(dto.getTermination());
                if (dto.getDirection() != null && VALID_DIRECTIONS.contains(dto.getDirection()))
                    existing.setDirection(dto.getDirection());
                if (dto.getIntensity() != null && VALID_INTENSITIES.contains(dto.getIntensity()))
                    existing.setIntensity(dto.getIntensity());
                if (dto.getReasonNote() != null) existing.setReasonNote(dto.getReasonNote());
                if (dto.getPriorityAmount() != null) existing.setPriorityAmount(dto.getPriorityAmount());
                if (dto.getDurationMonths() != null) existing.setDurationMonths(dto.getDurationMonths());
                if (dto.getPriorityCategories() != null) {
                    try {
                        existing.setPriorityCategories(objectMapper.writeValueAsString(dto.getPriorityCategories()));
                    } catch (Exception ignored) {}
                }

                existing.setUpdatedAt(LocalDateTime.now());
                return planRepository.save(existing);
            });
    }

    // ---- Delete / Progress / Complete ----

    public boolean deletePlan(Long id, Long userId) {
        return planRepository.findById(id)
            .filter(p -> p.getUserId() != null && p.getUserId().equals(userId))
            .map(p -> {
                planRepository.delete(p);
                return true;
            })
            .orElse(false);
    }

    public Optional<Plan> addProgress(Long id, Long userId, double amount) {
        return planRepository.findById(id)
            .filter(p -> p.getUserId() != null && p.getUserId().equals(userId))
            .map(p -> {
                p.setCurrentAmount(p.getCurrentAmount() + amount);
                if (p.getTargetAmount() > 0 && p.getCurrentAmount() >= p.getTargetAmount()) {
                    p.setCompletedAt(LocalDateTime.now());
                    p.setIsActive(false);
                }
                p.setUpdatedAt(LocalDateTime.now());
                return planRepository.save(p);
            });
    }

    public Optional<Plan> completePlan(Long id, Long userId) {
        return planRepository.findById(id)
            .filter(p -> p.getUserId() != null && p.getUserId().equals(userId))
            .map(p -> {
                p.setIsActive(false);
                p.setCompletedAt(LocalDateTime.now());
                p.setUpdatedAt(LocalDateTime.now());
                return planRepository.save(p);
            });
    }

    // ---- Auto-expire (uses new termination field) ----

    public void autoExpirePlans(Long userId) {
        LocalDate today = LocalDate.now();
        List<Plan> active = planRepository.findByUserIdAndIsActiveTrue(userId);
        for (Plan p : active) {
            boolean shouldDeactivate = false;

            // UNTIL_TARGET: complete when target met
            if ("UNTIL_TARGET".equals(p.getTermination()) && "OUTCOME_PLAN".equals(p.getFamily())
                    && p.getTargetAmount() > 0 && p.getCurrentAmount() >= p.getTargetAmount()) {
                shouldDeactivate = true;
            }

            // ON_DATE / AFTER_PERIOD: deactivate when endDate passes
            if (("ON_DATE".equals(p.getTermination()) || "AFTER_PERIOD".equals(p.getTermination()))
                    && p.getEndDate() != null && p.getEndDate().isBefore(today)) {
                shouldDeactivate = true;
            }

            // Legacy fallback: check old type-based logic if termination not set
            if (p.getTermination() == null) {
                if ("UNTIL_TARGET".equals(p.getType()) && "OUTCOME_PLAN".equals(p.getFamily())
                        && p.getTargetAmount() > 0 && p.getCurrentAmount() >= p.getTargetAmount()) {
                    shouldDeactivate = true;
                }
                if (p.getEndDate() != null && p.getEndDate().isBefore(today)) {
                    shouldDeactivate = true;
                }
            }

            // OPEN_ENDED: never auto-expires

            if (shouldDeactivate) {
                p.setIsActive(false);
                if (p.getCompletedAt() == null) {
                    p.setCompletedAt(LocalDateTime.now());
                }
                p.setUpdatedAt(LocalDateTime.now());
                planRepository.save(p);
            }
        }
    }

    // ---- Family Classification (Java keywords) ----

    public String classifyFamilyFromKeywords(String input) {
        if (input == null || input.isBlank()) return "UNKNOWN";

        boolean hasOutcome = OUTCOME_KEYWORDS.matcher(input).find();
        boolean hasPriority = PRIORITY_KEYWORDS.matcher(input).find();

        if (hasOutcome && !hasPriority) return "OUTCOME_PLAN";
        if (hasPriority && !hasOutcome) return "PRIORITY_PLAN";
        if (hasOutcome && hasPriority) return "UNKNOWN"; // ambiguous — needs clarification
        return "UNKNOWN";
    }

    // ---- Parse AI JSON output into List<PlanDraftDTO> ----

    @SuppressWarnings("unchecked")
    public List<PlanDraftDTO> parseDraftsFromAiJson(String json) {
        List<PlanDraftDTO> drafts = new ArrayList<>();
        if (json == null || json.isBlank()) {
            drafts.add(makeClarificationDraft("AI returned empty response"));
            return drafts;
        }

        try {
            String cleaned = json.replace("```json", "").replace("```", "").trim();

            // Try parsing as array first
            if (cleaned.startsWith("[")) {
                List<Map<String, Object>> items = objectMapper.readValue(cleaned, new TypeReference<>() {});
                for (Map<String, Object> item : items) {
                    drafts.add(mapToDraft(item));
                }
            } else {
                Map<String, Object> item = objectMapper.readValue(cleaned, new TypeReference<>() {});
                drafts.add(mapToDraft(item));
            }
        } catch (Exception e) {
            drafts.add(makeClarificationDraft("Failed to parse AI response: " + e.getMessage()));
        }

        return drafts;
    }

    @SuppressWarnings("unchecked")
    private PlanDraftDTO mapToDraft(Map<String, Object> m) {
        PlanDraftDTO d = new PlanDraftDTO();
        d.setFamily(getString(m, "family"));
        d.setTitle(getString(m, "title"));
        d.setCadence(getString(m, "cadence"));
        d.setTermination(getString(m, "termination"));
        d.setReasonNote(getString(m, "reasonNote"));
        d.setParserNotes(getString(m, "parserNotes"));

        // Confidence as numeric
        Object conf = m.get("confidence");
        if (conf instanceof Number) {
            d.setConfidence(((Number) conf).doubleValue());
        } else if (conf instanceof String) {
            d.setConfidence(parseConfidenceString((String) conf));
        }

        // Dates
        d.setStartDate(parseDate(getString(m, "startDate")));
        d.setEndDate(parseDate(getString(m, "endDate")));
        d.setTargetDate(parseDate(getString(m, "targetDate")));

        // Duration
        Object dm = m.get("durationMonths");
        if (dm instanceof Number) d.setDurationMonths(((Number) dm).intValue());

        // Outcome fields
        d.setOutcomeCategory(getString(m, "outcomeCategory"));
        Object ta = m.get("targetAmount");
        if (ta instanceof Number) d.setTargetAmount(((Number) ta).doubleValue());
        Object mc = m.get("monthlyContribution");
        if (mc instanceof Number) d.setMonthlyContribution(((Number) mc).doubleValue());

        // Priority fields
        Object pc = m.get("priorityCategories");
        if (pc instanceof List) d.setPriorityCategories((List<String>) pc);
        d.setDirection(getString(m, "direction"));
        d.setIntensity(getString(m, "intensity"));
        Object pa = m.get("priorityAmount");
        if (pa instanceof Number) d.setPriorityAmount(((Number) pa).doubleValue());

        // Clarification
        Object cn = m.get("clarificationNeeded");
        d.setClarificationNeeded(cn instanceof Boolean ? (Boolean) cn : false);

        Object mf = m.get("missingFields");
        if (mf instanceof List) d.setMissingFields((List<String>) mf);
        else d.setMissingFields(new ArrayList<>());

        Object cq = m.get("clarificationQuestions");
        if (cq instanceof List) d.setClarificationQuestions((List<String>) cq);
        else d.setClarificationQuestions(new ArrayList<>());

        return d;
    }

    private PlanDraftDTO makeClarificationDraft(String note) {
        PlanDraftDTO d = new PlanDraftDTO();
        d.setFamily("UNKNOWN");
        d.setConfidence(0.0);
        d.setClarificationNeeded(true);
        d.setClarificationQuestions(List.of("Could you describe your plan more specifically?"));
        d.setMissingFields(List.of("family", "cadence", "termination"));
        d.setParserNotes(note);
        return d;
    }

    // ---- Reconcile Java + AI family classification ----

    public void reconcileFamily(PlanDraftDTO draft, String javaFamily) {
        String aiFamily = draft.getFamily();

        if (aiFamily == null) aiFamily = "UNKNOWN";
        if (javaFamily == null) javaFamily = "UNKNOWN";

        if (aiFamily.equals(javaFamily) && !"UNKNOWN".equals(aiFamily)) {
            // Agreement: keep as-is
            return;
        }

        if ("UNKNOWN".equals(aiFamily) && !"UNKNOWN".equals(javaFamily)) {
            // AI unsure, Java certain: use Java
            draft.setFamily(javaFamily);
            if (draft.getConfidence() != null) {
                draft.setConfidence(Math.min(draft.getConfidence(), 0.6));
            }
            draft.setParserNotes(appendNote(draft.getParserNotes(),
                "AI returned UNKNOWN, Java classified as " + javaFamily));
            return;
        }

        if (!"UNKNOWN".equals(aiFamily) && "UNKNOWN".equals(javaFamily)) {
            // AI certain, Java unsure: keep AI
            return;
        }

        if (!aiFamily.equals(javaFamily) && !"UNKNOWN".equals(aiFamily) && !"UNKNOWN".equals(javaFamily)) {
            // Disagreement: lower confidence, keep AI but note disagreement
            if (draft.getConfidence() != null) {
                draft.setConfidence(Math.min(draft.getConfidence(), 0.4));
            }
            draft.setParserNotes(appendNote(draft.getParserNotes(),
                "Java classified as " + javaFamily + " but AI classified as " + aiFamily + " — using AI classification, review recommended"));
            return;
        }

        // Both UNKNOWN
        draft.setFamily("UNKNOWN");
        draft.setClarificationNeeded(true);
        if (draft.getClarificationQuestions() == null) {
            draft.setClarificationQuestions(new ArrayList<>());
        }
        draft.getClarificationQuestions().add("Is this a savings goal or a spending priority?");
        if (draft.getMissingFields() == null) {
            draft.setMissingFields(new ArrayList<>());
        }
        if (!draft.getMissingFields().contains("family")) {
            draft.getMissingFields().add("family");
        }
    }

    // ---- Parser guard: ONE_TIME + OPEN_ENDED is under-specified ----

    public void applyParserGuards(PlanDraftDTO draft) {
        // Guard: ONE_TIME + OPEN_ENDED triggers clarification
        if ("ONE_TIME".equals(draft.getCadence()) && "OPEN_ENDED".equals(draft.getTermination())) {
            draft.setClarificationNeeded(true);
            if (draft.getClarificationQuestions() == null) {
                draft.setClarificationQuestions(new ArrayList<>());
            }
            draft.getClarificationQuestions().add(
                "This seems like a one-time action with no end condition. Do you mean until a specific target is reached, or by a certain date?");
            draft.setParserNotes(appendNote(draft.getParserNotes(),
                "ONE_TIME + OPEN_ENDED is under-specified for new inputs — clarification required"));
        }

        // Guard: family set but cadence or termination missing
        if (draft.getFamily() != null && !"UNKNOWN".equals(draft.getFamily())) {
            if (draft.getCadence() == null) {
                draft.setClarificationNeeded(true);
                if (draft.getMissingFields() == null) draft.setMissingFields(new ArrayList<>());
                if (!draft.getMissingFields().contains("cadence")) draft.getMissingFields().add("cadence");
            }
            if (draft.getTermination() == null) {
                draft.setClarificationNeeded(true);
                if (draft.getMissingFields() == null) draft.setMissingFields(new ArrayList<>());
                if (!draft.getMissingFields().contains("termination")) draft.getMissingFields().add("termination");
            }
        }
    }

    // ---- Resolve priority adjustments for the budget engine ----

    public Map<String, Double> resolvePriorityAdjustments(Plan plan) {
        Map<String, Double> adjustments = new LinkedHashMap<>();

        // New path: plan-level direction/intensity/priorityCategories
        // Skip percentage-based adjustments if priorityAmount is set (fixed amount takes over)
        if (plan.getDirection() != null) {
            if (plan.getPriorityAmount() != null && plan.getPriorityAmount() > 0) {
                // Fixed amount is handled by resolveFixedAmountAdjustments — no percentage shift
                return adjustments;
            }

            List<String> categories = plan.getPriorityCategoriesList();
            double magnitude = INTENSITY_MAP.getOrDefault(plan.getIntensity(), 0.10);

            double value;
            switch (plan.getDirection()) {
                case "INCREASE": value = magnitude; break;
                case "REDUCE": value = -magnitude; break;
                case "PROTECT": value = 0.0; break;
                default: value = 0.0;
            }

            for (String cat : categories) {
                if (SpendingCategories.CATEGORIES.contains(cat)) {
                    adjustments.merge(cat, value, Double::sum);
                }
            }
            return adjustments;
        }

        // Legacy path: priorityAdjustments JSON
        if (plan.getPriorityAdjustments() == null || plan.getPriorityAdjustments().isEmpty()) {
            return adjustments;
        }

        try {
            List<Map<String, String>> entries = objectMapper.readValue(
                plan.getPriorityAdjustments(),
                new TypeReference<List<Map<String, String>>>() {}
            );

            for (Map<String, String> entry : entries) {
                String category = entry.get("category");
                String direction = entry.get("direction");
                String intensity = entry.get("intensity");

                if (category == null || direction == null || intensity == null) continue;
                if (!SpendingCategories.CATEGORIES.contains(category)) continue;

                double mag = LEGACY_INTENSITY_MAP.getOrDefault(intensity.toLowerCase(), 0.10);
                double val = "decrease".equals(direction) ? -mag : mag;
                adjustments.merge(category, val, Double::sum);
            }
        } catch (Exception ignored) {}

        return adjustments;
    }

    // ---- Resolve fixed-amount adjustments for the budget engine ----

    public Map<String, Double> resolveFixedAmountAdjustments(Plan plan) {
        Map<String, Double> fixedAdjustments = new LinkedHashMap<>();

        if (plan.getPriorityAmount() == null || plan.getPriorityAmount() <= 0) {
            return fixedAdjustments;
        }
        if (plan.getDirection() == null) {
            return fixedAdjustments;
        }

        List<String> categories = plan.getPriorityCategoriesList();
        double amountPerCategory = plan.getPriorityAmount() / Math.max(1, categories.size());

        for (String cat : categories) {
            if (!SpendingCategories.CATEGORIES.contains(cat)) continue;
            double value;
            switch (plan.getDirection()) {
                case "INCREASE": value = amountPerCategory; break;
                case "REDUCE": value = -amountPerCategory; break;
                case "PROTECT": value = 0.0; break;
                default: value = 0.0;
            }
            if (value != 0.0) {
                fixedAdjustments.merge(cat, value, Double::sum);
            }
        }

        return fixedAdjustments;
    }

    // ---- Helpers ----

    private String getString(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v instanceof String ? (String) v : null;
    }

    private Double parseConfidenceString(String s) {
        switch (s.toLowerCase()) {
            case "high": return 0.9;
            case "medium": return 0.6;
            case "low": return 0.3;
            default:
                try { return Double.parseDouble(s); }
                catch (Exception e) { return 0.5; }
        }
    }

    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); }
        catch (Exception e) { return null; }
    }

    private String appendNote(String existing, String addition) {
        if (existing == null || existing.isBlank()) return addition;
        return existing + "; " + addition;
    }
}
