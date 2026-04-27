-- Add redirect_path column to roles table
ALTER TABLE "roles" ADD COLUMN "redirect_path" VARCHAR(255);
