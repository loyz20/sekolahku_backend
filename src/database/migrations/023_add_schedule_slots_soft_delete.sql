SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND column_name = 'deleted_at'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE schedule_slots ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at',
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
    AND column_name = 'deleted_by'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE schedule_slots ADD COLUMN deleted_by INT NULL AFTER deleted_at',
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
    AND constraint_name = 'fk_ss_deleted_by'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE schedule_slots ADD CONSTRAINT fk_ss_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'schedule_slots'
    AND index_name = 'idx_ss_deleted_at'
);

SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE schedule_slots ADD INDEX idx_ss_deleted_at (deleted_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;