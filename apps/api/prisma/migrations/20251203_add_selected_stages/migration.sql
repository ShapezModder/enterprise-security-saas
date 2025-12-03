-- AlterTable (idempotent - won't fail if column exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Job' AND column_name = 'selectedStages'
    ) THEN
        ALTER TABLE "Job" ADD COLUMN "selectedStages" JSONB;
    END IF;
END $$;
