CREATE TABLE IF NOT EXISTS violation_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    severity ENUM('minor', 'moderate', 'severe') NOT NULL DEFAULT 'minor',
    default_points INT NOT NULL DEFAULT 0,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_violation_types_name (name),
    INDEX idx_violation_types_severity_active (severity, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_violations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    violation_type_id INT NOT NULL,
    violation_date DATE NOT NULL,
    points INT NOT NULL DEFAULT 0,
    description VARCHAR(255) NOT NULL,
    notes VARCHAR(255) NULL,
    recorded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_violations_student FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT fk_student_violations_class FOREIGN KEY (class_id) REFERENCES classes(id),
    CONSTRAINT fk_student_violations_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    CONSTRAINT fk_student_violations_type FOREIGN KEY (violation_type_id) REFERENCES violation_types(id),
    CONSTRAINT fk_student_violations_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_student_violations_student (student_id),
    INDEX idx_student_violations_class_year (class_id, academic_year_id),
    INDEX idx_student_violations_type (violation_type_id),
    INDEX idx_student_violations_date (violation_date),
    INDEX idx_student_violations_year_date (academic_year_id, violation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
