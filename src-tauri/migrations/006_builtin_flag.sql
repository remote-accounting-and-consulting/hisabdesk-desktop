-- Add is_system flag to lookup tables
-- 1 = built-in (ships with HisabDesk, cannot be deleted)
-- 0 = custom (user-added, deletable)
--
-- Default 0 for safety. Existing rows are marked 1 below.

ALTER TABLE services ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registration_types ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE business_categories ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE document_types ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;

-- Mark every row that existed before this migration as built-in
UPDATE services SET is_system = 1;
UPDATE registration_types SET is_system = 1;
UPDATE business_categories SET is_system = 1;
UPDATE document_types SET is_system = 1;
