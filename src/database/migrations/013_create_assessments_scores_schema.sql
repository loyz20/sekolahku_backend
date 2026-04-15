CREATE TABLE IF NOT EXISTS assessments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    nama_penilaian ENUM('UH', 'UTS', 'UAS', 'SUMATIF') NOT NULL,
    bobot       DECIMAL(5,2) NOT NULL,
    description VARCHAR(255) NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assessments_name (nama_penilaian),
    INDEX idx_assessments_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scores (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id     INT NOT NULL,
    subject_id     INT NOT NULL,
    assessment_id  BIGINT NOT NULL,
    nilai          DECIMAL(5,2) NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_scores_student FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT fk_scores_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT fk_scores_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    UNIQUE KEY uq_scores_student_subject_assessment (student_id, subject_id, assessment_id),
    INDEX idx_scores_student (student_id),
    INDEX idx_scores_subject (subject_id),
    INDEX idx_scores_assessment (assessment_id),
    INDEX idx_scores_lookup (student_id, subject_id, assessment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;