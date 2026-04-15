-- Migration 007: Add semester column to academic_years table
-- Adds support for tracking semesters within academic years

ALTER TABLE academic_years 
ADD COLUMN semester INT DEFAULT 1 COMMENT 'Semester number (1 or 2)' AFTER is_active;

-- Create an index for easier filtering by semester
ALTER TABLE academic_years 
ADD INDEX idx_academic_years_semester (semester);

-- Update existing records to set semester 1 (they'll be treated as semester 1)
-- This is already set by the DEFAULT 1 in the ADD COLUMN above, so no explicit update needed

-- If you want to set specific semesters for existing academic years, uncomment and modify:
-- UPDATE academic_years SET semester = 1 WHERE id IN (SELECT id FROM academic_years LIMIT 1);
-- UPDATE academic_years SET semester = 2 WHERE id NOT IN (SELECT id FROM academic_years LIMIT 1);
