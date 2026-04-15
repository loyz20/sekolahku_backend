-- Add NIP (Nomor Induk Pegawai) to users table (idempotent).
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'nip';

SET @add_col = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN nip VARCHAR(30) NULL UNIQUE AFTER name',
    'SELECT 1 AS noop'
);

PREPARE _stmt FROM @add_col;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
