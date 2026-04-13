-- Change reviewed_by from INT to TEXT on government_program_applications.
-- The column was originally typed as INT following the RegistrationRequest pattern
-- (which stores a BIMS integer user ID), but GovernmentProgramApplication.reviewedBy
-- stores an eservice_users.id which is a UUID string.
ALTER TABLE "government_program_applications"
  ALTER COLUMN "reviewed_by" TYPE TEXT USING "reviewed_by"::TEXT;
