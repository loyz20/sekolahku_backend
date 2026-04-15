-- Normalize subjects code for case-insensitive uniqueness and improve active-list lookups.
ALTER TABLE subjects
ADD COLUMN code_normalized VARCHAR(20)
    AS (UPPER(TRIM(code))) STORED,
ADD UNIQUE KEY uq_subjects_code_normalized (code_normalized),
ADD INDEX idx_subjects_active_name (is_active, name);
