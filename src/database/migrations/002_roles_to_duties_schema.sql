-- Master duties for flexible multi-assignment model.
CREATE TABLE IF NOT EXISTS duties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generic duty assignment history for each teacher account.
CREATE TABLE IF NOT EXISTS user_duties (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    duty_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_by INT NULL,
    ended_at TIMESTAMP NULL,
    is_active TINYINT(1) AS (CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) STORED,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_duties_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_duties_duty FOREIGN KEY (duty_id) REFERENCES duties(id),
    CONSTRAINT fk_user_duties_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
    CONSTRAINT fk_user_duties_ended_by FOREIGN KEY (ended_by) REFERENCES users(id),
    UNIQUE KEY uq_user_duties_active (user_id, duty_id, is_active),
    INDEX idx_user_duties_user (user_id),
    INDEX idx_user_duties_duty (duty_id),
    INDEX idx_user_duties_active (user_id, duty_id, ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_years (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_academic_years_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    level VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Specialized assignment for wali kelas with class + academic year context.
CREATE TABLE IF NOT EXISTS homeroom_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_duty_id BIGINT NOT NULL,
    class_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_by INT NULL,
    ended_at TIMESTAMP NULL,
    is_active TINYINT(1) AS (CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) STORED,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_homeroom_user_duty FOREIGN KEY (user_duty_id) REFERENCES user_duties(id),
    CONSTRAINT fk_homeroom_class FOREIGN KEY (class_id) REFERENCES classes(id),
    CONSTRAINT fk_homeroom_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    CONSTRAINT fk_homeroom_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
    CONSTRAINT fk_homeroom_ended_by FOREIGN KEY (ended_by) REFERENCES users(id),
    UNIQUE KEY uq_homeroom_active_class_year (class_id, academic_year_id, is_active),
    INDEX idx_homeroom_active (class_id, academic_year_id, ended_at),
    INDEX idx_homeroom_user_duty (user_duty_id, ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO duties (code, name, description)
VALUES
    ('guru', 'Guru', 'Default duty for all users'),
    ('admin', 'Admin', 'Administrative duty'),
    ('wali_kelas', 'Wali Kelas', 'Homeroom teacher duty'),
    ('kepala_sekolah', 'Kepala Sekolah', 'Principal duty')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- Backfill users to duty model (every user at least guru).
INSERT INTO user_duties (user_id, duty_id, assigned_at, notes)
SELECT u.id, d.id, CURRENT_TIMESTAMP, 'Backfill default guru duty'
FROM users u
INNER JOIN duties d ON d.code = 'guru'
LEFT JOIN user_duties ud ON ud.user_id = u.id AND ud.duty_id = d.id AND ud.ended_at IS NULL
WHERE ud.id IS NULL;

-- Backfill legacy admin role to admin duty.
INSERT INTO user_duties (user_id, duty_id, assigned_at, notes)
SELECT u.id, d.id, CURRENT_TIMESTAMP, 'Backfill from legacy users.role=admin'
FROM users u
INNER JOIN duties d ON d.code = 'admin'
LEFT JOIN user_duties ud ON ud.user_id = u.id AND ud.duty_id = d.id AND ud.ended_at IS NULL
WHERE u.role = 'admin' AND ud.id IS NULL;
