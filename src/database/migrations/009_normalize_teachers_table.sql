-- Enforce one-to-one optional relationship between teachers and users.
-- MySQL allows multiple NULL in UNIQUE indexes, so nullable remains supported.

ALTER TABLE teachers
ADD UNIQUE KEY uq_teachers_user_id (user_id);

-- Additional composite index for common list filters.
ALTER TABLE teachers
ADD INDEX idx_teachers_active_name (is_active, name);
