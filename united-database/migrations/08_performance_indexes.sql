-- ============================================
-- Portal Profile Performance Optimization
-- Migration for Supabase PostgreSQL
-- Run this migration in the Supabase SQL Editor
-- ============================================

-- ============================================
-- SECTION 1: Indexes for transactions table
-- ============================================

-- Index for pending updates per resident
CREATE INDEX IF NOT EXISTS idx_transactions_resident_pending
ON transactions (resident_id, update_request_status) 
WHERE update_request_status = 'PENDING_PORTAL';

-- Index for transaction list queries (most common query)
CREATE INDEX IF NOT EXISTS idx_transactions_resident_created
ON transactions (resident_id, created_at DESC);

-- Index for recent updates (for notifications)
CREATE INDEX IF NOT EXISTS idx_transactions_resident_updated
ON transactions (resident_id, updated_at DESC);

-- ============================================
-- SECTION 2: Indexes for transaction_notes table
-- ============================================

-- Index for unread admin messages
CREATE INDEX IF NOT EXISTS idx_transaction_notes_unread_admin
ON transaction_notes (is_read, sender_type) 
WHERE is_read = false AND sender_type = 'ADMIN';

-- ============================================
-- SECTION 3: Indexes for household tables
-- ============================================

CREATE INDEX IF NOT EXISTS idx_households_head
ON households (house_head);

CREATE INDEX IF NOT EXISTS idx_families_household
ON families (household_id);

CREATE INDEX IF NOT EXISTS idx_family_members_family
ON family_members (family_id);

-- ============================================
-- SECTION 4: Indexes for classification tables
-- ============================================

CREATE INDEX IF NOT EXISTS idx_resident_classifications_resident
ON resident_classifications (resident_id);

CREATE INDEX IF NOT EXISTS idx_classification_types_active
ON classification_types (is_active) 
WHERE is_active = true;

-- ============================================
-- SECTION 5: Analyze tables
-- Run these AFTER creating indexes
-- ============================================

ANALYZE transactions;
ANALYZE transaction_notes;
ANALYZE households;
ANALYZE families;
ANALYZE family_members;
ANALYZE resident_classifications;
ANALYZE classification_types;

-- ============================================
-- Verification query - check created indexes
-- ============================================

-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;