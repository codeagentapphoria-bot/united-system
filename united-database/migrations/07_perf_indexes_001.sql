-- Performance Indexes Migration
-- Run this in Supabase SQL Editor
-- Last Updated: March 29, 2026

-- =============================================================================
-- TRANSACTION TABLE INDEXES
-- =============================================================================

-- Status filtering over date ranges (admin dashboard, reports)
CREATE INDEX IF NOT EXISTS idx_transactions_status_created_at 
ON transactions (status, created_at);

-- Service-specific status queries
CREATE INDEX IF NOT EXISTS idx_transactions_service_id_status 
ON transactions (service_id, status);

-- Service activity timeline
CREATE INDEX IF NOT EXISTS idx_transactions_service_id_created_at 
ON transactions (service_id, created_at);

-- Cross-status payment analysis
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status_status 
ON transactions (payment_status, status);

-- =============================================================================
-- RESIDENT TABLE INDEXES
-- =============================================================================

-- Email search operations
CREATE INDEX IF NOT EXISTS idx_residents_email 
ON residents (email);

-- Contact number search
CREATE INDEX IF NOT EXISTS idx_residents_contact_number 
ON residents (contact_number);

-- =============================================================================
-- TAX COMPUTATION TABLE INDEXES
-- =============================================================================

-- Standalone for eager loading
CREATE INDEX IF NOT EXISTS idx_tax_computations_transaction_id 
ON tax_computations (transaction_id);

-- =============================================================================
-- TRANSACTION NOTE TABLE INDEXES
-- =============================================================================

-- Unread count per transaction
CREATE INDEX IF NOT EXISTS idx_transaction_notes_transaction_id_is_read 
ON transaction_notes (transaction_id, is_read);

-- Unread by sender type (dashboard counts)
CREATE INDEX IF NOT EXISTS idx_transaction_notes_sender_type_is_read 
ON transaction_notes (sender_type, is_read);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Run to verify all indexes created:
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename;