-- Migration: Unify Plans and BudgetContexts into a single Plans table
-- Run this AFTER the Spring Boot app has started once with ddl-auto=update
-- (Hibernate will have added the new columns automatically)

-- Step 1: Backfill existing Plan rows with new fields
-- All existing plans are OUTCOME plans (savings goals)
UPDATE plans SET family = 'OUTCOME' WHERE family IS NULL;

-- Map old 'type' column values (SAVINGS/DEBT/PURCHASE/EMERGENCY) into 'category'
UPDATE plans SET category = type WHERE category IS NULL AND family = 'OUTCOME';

-- Set scheduling type based on existing data
-- Plans with a target_date get UNTIL_TARGET, plans without get MONTHLY
UPDATE plans SET type = 'UNTIL_TARGET' WHERE family = 'OUTCOME' AND end_date IS NULL AND category IS NOT NULL;

-- Copy target_date string into end_date (LocalDate) for existing plans
-- Note: target_date was stored as a string 'YYYY-MM-DD'; parse it into end_date
-- This needs to be done application-side since SQL date parsing varies by DB
-- The PlanMigrationRunner handles this in Java

-- Set timestamps for existing rows
UPDATE plans SET created_at = NOW() WHERE created_at IS NULL;
UPDATE plans SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE plans SET start_date = DATE(created_at) WHERE start_date IS NULL;
UPDATE plans SET is_active = true WHERE is_active IS NULL;
UPDATE plans SET is_flexible = true WHERE is_flexible IS NULL;

-- Step 2: Migrate BudgetContext rows into Plans as PRIORITY plans
-- Each active BudgetContext becomes a PRIORITY plan
-- category_adjustments needs to be converted from percentage JSON to semantic intensity JSON
-- This conversion is handled by PlanMigrationRunner in Java since it requires logic

-- Step 3: After verifying migration, the budget_contexts table can be dropped
-- DROP TABLE IF EXISTS budget_contexts;
-- (uncomment only after confirming all data migrated correctly)
