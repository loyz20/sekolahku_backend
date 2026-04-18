SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND column_name = 'class_id'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE schedule_slots ADD COLUMN class_id INT NULL AFTER class_subject_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND column_name = 'academic_year_id'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE schedule_slots ADD COLUMN academic_year_id INT NULL AFTER class_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND column_name = 'slot_type'
);

SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE schedule_slots ADD COLUMN slot_type VARCHAR(20) NOT NULL DEFAULT 'lesson' AFTER teaching_assignment_id",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND column_name = 'title'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE schedule_slots ADD COLUMN title VARCHAR(100) NULL AFTER slot_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE schedule_slots ss
INNER JOIN class_subjects cs ON cs.id = ss.class_subject_id
SET ss.class_id = cs.class_id,
    ss.academic_year_id = cs.academic_year_id
WHERE ss.class_id IS NULL OR ss.academic_year_id IS NULL;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND constraint_name = 'fk_ss_class'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE schedule_slots ADD CONSTRAINT fk_ss_class FOREIGN KEY (class_id) REFERENCES classes(id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND constraint_name = 'fk_ss_academic_year'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE schedule_slots ADD CONSTRAINT fk_ss_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE schedule_slots
  MODIFY class_subject_id BIGINT NULL,
  MODIFY class_id INT NOT NULL,
  MODIFY academic_year_id INT NOT NULL,
  ADD INDEX idx_ss_class_year_day_time (class_id, academic_year_id, day_of_week, start_time, end_time),
  ADD INDEX idx_ss_slot_type (slot_type);