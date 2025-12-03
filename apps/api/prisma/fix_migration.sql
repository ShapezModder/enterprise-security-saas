-- Quick fix: Mark the failed migration as resolved
-- Run this manually on Render's database or create a new migration to fix it

-- Option 1: Mark as applied (if column already exists)
UPDATE "_prisma_migrations" 
SET finished_at = started_at, 
    applied_steps_count = 1
WHERE migration_name = '20251203_add_selected_stages';

-- Option 2: If above doesn't work, delete the failed entry
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20251203_add_selected_stages';
