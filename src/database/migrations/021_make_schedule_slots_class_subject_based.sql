SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND column_name = 'class_subject_id'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE schedule_slots ADD COLUMN class_subject_id BIGINT NULL AFTER id',
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
    AND constraint_name = 'fk_ss_class_subject'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE schedule_slots ADD CONSTRAINT fk_ss_class_subject FOREIGN KEY (class_subject_id) REFERENCES class_subjects(id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE schedule_slots ss
INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id
SET ss.class_subject_id = ta.class_subject_id
WHERE ss.class_subject_id IS NULL;

ALTER TABLE schedule_slots
  MODIFY teaching_assignment_id BIGINT NULL,
  MODIFY class_subject_id BIGINT NOT NULL,
  ADD INDEX idx_ss_class_subject (class_subject_id);