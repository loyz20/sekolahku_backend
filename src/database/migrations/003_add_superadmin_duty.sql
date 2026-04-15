-- Add protection flag to users table (idempotent: skip if column already exists).
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'is_protected';

SET @add_column_sql = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN is_protected TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active',
    'SELECT 1 AS noop'
);

PREPARE _stmt FROM @add_column_sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- Superadmin duty.
INSERT INTO duties (code, name, description)
VALUES ('superadmin', 'Super Admin', 'Full access to all features, account is immutable')
ON DUPLICATE KEY UPDATE
    name        = VALUES(name),
    description = VALUES(description),
    updated_at  = CURRENT_TIMESTAMP;
