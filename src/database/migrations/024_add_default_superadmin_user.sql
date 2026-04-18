-- Ensure superadmin duty exists (safe if already seeded by previous migrations).
INSERT INTO duties (code, name, description)
VALUES ('superadmin', 'Super Admin', 'Full access to all features, account is immutable')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- Default superadmin account.
SET @default_superadmin_name = 'Super Admin';
SET @default_superadmin_email = 'superadmin@sman3tasikmalaya.sch.id';
SET @default_superadmin_nip = 'SA-0001';
SET @default_superadmin_password_hash = '$2b$12$gMHrE2HdbvrMUA3qm2IrRuVH6wpkr7ohV7KOyO8wuFKLG.FKjTf7S'; -- Superadmin123!

-- Create user only when not existing.
INSERT INTO users (name, nip, email, password, role, is_active, is_protected)
SELECT
    @default_superadmin_name,
    @default_superadmin_nip,
    @default_superadmin_email,
    @default_superadmin_password_hash,
    'admin',
    1,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = @default_superadmin_email
);

-- Normalize key flags in case the user already existed.
UPDATE users
SET
    role = 'admin',
    is_active = 1,
    is_protected = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE email = @default_superadmin_email;

-- Ensure active superadmin duty mapping exists.
INSERT INTO user_duties (user_id, duty_id, assigned_by, notes)
SELECT u.id, d.id, NULL, 'Auto-created by migration 024 default superadmin'
FROM users u
INNER JOIN duties d ON d.code = 'superadmin'
LEFT JOIN user_duties ud
    ON ud.user_id = u.id
   AND ud.duty_id = d.id
   AND ud.ended_at IS NULL
WHERE u.email = @default_superadmin_email
  AND ud.id IS NULL;
