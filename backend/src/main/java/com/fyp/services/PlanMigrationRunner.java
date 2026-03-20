package com.fyp.services;

import com.fyp.models.Plan;
import com.fyp.repos.PlanRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Component
@Order(1)
public class PlanMigrationRunner implements CommandLineRunner {

    private final PlanRepository planRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public PlanMigrationRunner(PlanRepository planRepository, EntityManager entityManager) {
        this.planRepository = planRepository;
        this.entityManager = entityManager;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @Transactional
    public void run(String... args) {
        renameMonthlyToContinuous();
        migrateExistingPlans();
        migrateBudgetContexts();
        migrateToNewSchema();
    }

    private void renameMonthlyToContinuous() {
        try {
            entityManager.createNativeQuery(
                "UPDATE plans SET is_active = true WHERE is_active IS NULL"
            ).executeUpdate();
            entityManager.createNativeQuery(
                "UPDATE plans SET is_flexible = true WHERE is_flexible IS NULL"
            ).executeUpdate();

            int updated = entityManager.createNativeQuery(
                "UPDATE plans SET type = 'CONTINUOUS' WHERE type = 'MONTHLY'"
            ).executeUpdate();
            if (updated > 0) {
                System.out.println("[Migration] Renamed " + updated + " MONTHLY plans to CONTINUOUS");
            }
        } catch (Exception e) {
            System.out.println("[Migration] MONTHLY->CONTINUOUS rename skipped: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void migrateExistingPlans() {
        try {
            Query checkCol = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'plans' AND column_name = 'target_date'"
            );
            Number hasCol = (Number) checkCol.getSingleResult();
            if (hasCol.intValue() > 0) {
                entityManager.createNativeQuery(
                    "UPDATE plans SET end_date = CAST(target_date AS DATE) " +
                    "WHERE target_date IS NOT NULL AND target_date != '' AND end_date IS NULL"
                ).executeUpdate();
            }
        } catch (Exception e) {
            System.out.println("[Migration] target_date column migration skipped: " + e.getMessage());
        }

        List<Plan> plans = planRepository.findAll();
        boolean anyMigrated = false;

        for (Plan plan : plans) {
            if (plan.getFamily() != null) continue;

            plan.setFamily("OUTCOME");

            String oldType = plan.getType();
            if (oldType != null && Set.of("SAVINGS", "DEBT", "PURCHASE", "EMERGENCY").contains(oldType)) {
                plan.setCategory(oldType);
            } else {
                plan.setCategory("SAVINGS");
            }

            plan.setType("UNTIL_TARGET");

            if (plan.getStartDate() == null) {
                plan.setStartDate(LocalDate.now());
            }

            LocalDateTime now = LocalDateTime.now();
            if (plan.getCreatedAt() == null) plan.setCreatedAt(now);
            if (plan.getUpdatedAt() == null) plan.setUpdatedAt(now);

            if (plan.getTargetAmount() > 0 && plan.getCurrentAmount() >= plan.getTargetAmount()) {
                plan.setIsActive(false);
                plan.setCompletedAt(now);
            }

            planRepository.save(plan);
            anyMigrated = true;
        }

        if (anyMigrated) {
            System.out.println("[Migration] Migrated existing plans to unified schema");
        }
    }

    @SuppressWarnings("unchecked")
    private void migrateBudgetContexts() {
        try {
            Query checkQuery = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'budget_contexts'"
            );
            Number count = (Number) checkQuery.getSingleResult();
            if (count.intValue() == 0) return;

            Query selectQuery = entityManager.createNativeQuery(
                "SELECT id, user_id, start_date, end_date, display_name, category_adjustments, " +
                "is_active, description FROM budget_contexts WHERE is_template = false"
            );
            List<Object[]> rows = selectQuery.getResultList();

            if (rows.isEmpty()) return;

            int migrated = 0;
            for (Object[] row : rows) {
                Long userId = ((Number) row[1]).longValue();
                LocalDate startDate = row[2] != null ? LocalDate.parse(row[2].toString()) : LocalDate.now();
                LocalDate endDate = row[3] != null ? LocalDate.parse(row[3].toString()) : null;
                String displayName = (String) row[4];
                String categoryAdjustments = (String) row[5];
                boolean isActive = row[6] != null && ((Boolean) row[6] || "1".equals(row[6].toString()));
                String description = (String) row[7];

                String priorityAdjustments = convertToIntensityFormat(categoryAdjustments);
                if (priorityAdjustments == null) continue;

                String type;
                if (endDate == null) {
                    type = "CONTINUOUS";
                } else {
                    type = "FIXED_PERIOD";
                }

                Plan plan = new Plan();
                plan.setUserId(userId);
                plan.setTitle(displayName != null ? displayName : "Imported Context");
                plan.setDescription(description);
                plan.setFamily("PRIORITY");
                plan.setType(type);
                plan.setPriorityAdjustments(priorityAdjustments);
                plan.setStartDate(startDate);
                plan.setEndDate(endDate);
                plan.setIsActive(isActive);
                plan.setIsFlexible(true);

                LocalDateTime now = LocalDateTime.now();
                plan.setCreatedAt(now);
                plan.setUpdatedAt(now);

                planRepository.save(plan);
                migrated++;
            }

            if (migrated > 0) {
                System.out.println("[Migration] Migrated " + migrated + " budget contexts to PRIORITY plans");
            }
        } catch (Exception e) {
            System.out.println("[Migration] Skipped budget_contexts migration: " + e.getMessage());
        }
    }

    /**
     * Step 4: Migrate to new schema (cadence/termination, family rename, priority field extraction).
     * Conservative only — no plan splitting, no cloning, no invented plans.
     */
    @SuppressWarnings("unchecked")
    private void migrateToNewSchema() {
        try {
            // 1. Rename family values: OUTCOME -> OUTCOME_PLAN, PRIORITY -> PRIORITY_PLAN
            int outcomeRenamed = entityManager.createNativeQuery(
                "UPDATE plans SET family = 'OUTCOME_PLAN' WHERE family = 'OUTCOME'"
            ).executeUpdate();
            int priorityRenamed = entityManager.createNativeQuery(
                "UPDATE plans SET family = 'PRIORITY_PLAN' WHERE family = 'PRIORITY'"
            ).executeUpdate();
            if (outcomeRenamed > 0 || priorityRenamed > 0) {
                System.out.println("[Migration] Renamed families: " + outcomeRenamed + " OUTCOME->OUTCOME_PLAN, " + priorityRenamed + " PRIORITY->PRIORITY_PLAN");
            }

            // 2. Migrate type -> cadence + termination (only where cadence IS NULL)
            List<Plan> plans = planRepository.findAll();
            int cadenceMigrated = 0;
            int priorityFieldsMigrated = 0;

            for (Plan plan : plans) {
                boolean changed = false;

                // Only migrate cadence/termination if not already set
                if (plan.getCadence() == null && plan.getType() != null) {
                    switch (plan.getType()) {
                        case "ONE_OFF":
                            plan.setCadence("ONE_TIME");
                            plan.setTermination("OPEN_ENDED");
                            changed = true;
                            break;
                        case "CONTINUOUS":
                            plan.setCadence("MONTHLY_RECURRING");
                            plan.setTermination("OPEN_ENDED");
                            changed = true;
                            break;
                        case "FIXED_PERIOD":
                            plan.setCadence("MONTHLY_RECURRING");
                            plan.setTermination("ON_DATE");
                            changed = true;
                            break;
                        case "UNTIL_TARGET":
                            plan.setCadence(plan.getMonthlyContribution() != null && plan.getMonthlyContribution() > 0
                                ? "MONTHLY_RECURRING" : "ONE_TIME");
                            plan.setTermination("UNTIL_TARGET");
                            changed = true;
                            break;
                    }
                    if (changed) cadenceMigrated++;
                }

                // 3. Migrate simple same-direction PRIORITY plans
                if ("PRIORITY_PLAN".equals(plan.getFamily())
                        && plan.getDirection() == null
                        && plan.getPriorityAdjustments() != null
                        && !plan.getPriorityAdjustments().isEmpty()) {

                    try {
                        List<Map<String, String>> entries = objectMapper.readValue(
                            plan.getPriorityAdjustments(),
                            new TypeReference<List<Map<String, String>>>() {}
                        );

                        if (!entries.isEmpty()) {
                            // Check if all entries have the same direction
                            String firstDirection = entries.get(0).get("direction");
                            boolean allSameDirection = entries.stream()
                                .allMatch(e -> firstDirection != null && firstDirection.equals(e.get("direction")));

                            if (allSameDirection && firstDirection != null) {
                                // Extract categories
                                List<String> categories = new ArrayList<>();
                                for (Map<String, String> entry : entries) {
                                    String cat = entry.get("category");
                                    if (cat != null) categories.add(cat);
                                }

                                // Map direction
                                String newDirection = "increase".equals(firstDirection) ? "INCREASE" : "REDUCE";
                                plan.setDirection(newDirection);

                                // Map intensity from first entry (representative)
                                String oldIntensity = entries.get(0).get("intensity");
                                String newIntensity = mapLegacyIntensity(oldIntensity);
                                plan.setIntensity(newIntensity);

                                // Set priority categories as JSON
                                plan.setPriorityCategories(objectMapper.writeValueAsString(categories));

                                // Extract reason if present
                                String reason = entries.get(0).get("reason");
                                if (reason != null && !reason.isEmpty()) {
                                    plan.setReasonNote(reason);
                                }

                                changed = true;
                                priorityFieldsMigrated++;
                            }
                            // Mixed directions: leave as-is, keep priorityAdjustments for legacy fallback
                        }
                    } catch (Exception e) {
                        // Malformed JSON — skip this plan
                    }
                }

                if (changed) {
                    plan.setUpdatedAt(LocalDateTime.now());
                    planRepository.save(plan);
                }
            }

            if (cadenceMigrated > 0) {
                System.out.println("[Migration] Migrated cadence/termination for " + cadenceMigrated + " plans");
            }
            if (priorityFieldsMigrated > 0) {
                System.out.println("[Migration] Extracted priority fields for " + priorityFieldsMigrated + " plans");
            }
        } catch (Exception e) {
            System.out.println("[Migration] New schema migration error: " + e.getMessage());
        }
    }

    private String mapLegacyIntensity(String old) {
        if (old == null) return "MEDIUM";
        switch (old.toLowerCase()) {
            case "slight": return "LOW";
            case "moderate": return "MEDIUM";
            case "strong": return "HIGH";
            case "extreme": return "HIGH";
            default: return "MEDIUM";
        }
    }

    @SuppressWarnings("unchecked")
    private String convertToIntensityFormat(String percentageJson) {
        if (percentageJson == null || percentageJson.isEmpty()) return null;

        try {
            Map<String, Object> percentages = objectMapper.readValue(percentageJson, Map.class);
            List<Map<String, String>> entries = new ArrayList<>();

            for (Map.Entry<String, Object> entry : percentages.entrySet()) {
                if (!(entry.getValue() instanceof Number)) continue;
                double value = ((Number) entry.getValue()).doubleValue();
                if (Math.abs(value) < 0.01) continue;

                String direction = value > 0 ? "increase" : "decrease";
                double absValue = Math.abs(value);

                String intensity;
                if (absValue <= 0.12) intensity = "slight";
                else if (absValue <= 0.25) intensity = "moderate";
                else if (absValue <= 0.40) intensity = "strong";
                else intensity = "extreme";

                Map<String, String> adj = new LinkedHashMap<>();
                adj.put("category", entry.getKey());
                adj.put("direction", direction);
                adj.put("intensity", intensity);
                adj.put("reason", "migrated from budget context");
                entries.add(adj);
            }

            if (entries.isEmpty()) return null;
            return objectMapper.writeValueAsString(entries);
        } catch (Exception e) {
            return null;
        }
    }
}
