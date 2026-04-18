SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'class_subjects'
    AND index_name = 'uq_cs_active'
);
SET @sql := IF(@idx_exists > 0, 'ALTER TABLE class_subjects DROP INDEX uq_cs_active', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'class_subjects'
    AND column_name = 'active_unique'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE class_subjects ADD COLUMN active_unique TINYINT(1) AS (CASE WHEN ended_at IS NULL THEN 1 ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE class_subjects
  ADD UNIQUE KEY uq_cs_active (class_id, subject_id, academic_year_id, active_unique);

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'teaching_assignments'
    AND index_name = 'uq_ta_active_class_subject'
);
SET @sql := IF(
  @idx_exists > 0,
  'ALTER TABLE teaching_assignments DROP INDEX uq_ta_active_class_subject',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'teaching_assignments'
    AND index_name = 'uq_ta_active_teacher_subject'
);
SET @sql := IF(
  @idx_exists > 0,
  'ALTER TABLE teaching_assignments DROP INDEX uq_ta_active_teacher_subject',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'teaching_assignments'
    AND column_name = 'active_unique'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE teaching_assignments ADD COLUMN active_unique TINYINT(1) AS (CASE WHEN ended_at IS NULL THEN 1 ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE teaching_assignments
  ADD UNIQUE KEY uq_ta_active_class_subject (class_subject_id, active_unique),
  ADD UNIQUE KEY uq_ta_active_teacher_subject (teacher_id, class_subject_id, active_unique);
