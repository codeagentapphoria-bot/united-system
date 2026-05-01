-- Migration: Update social-amelioration page system from 'e-government' to 'city-population'
-- Run this SQL against your Supabase database (via SQL Editor in Supabase Dashboard)

UPDATE pages
SET system = 'city-population'
WHERE path = '/admin/e-government/social-amelioration';

-- Verify the update
SELECT id, system, path, name FROM pages WHERE path = '/admin/e-government/social-amelioration';
