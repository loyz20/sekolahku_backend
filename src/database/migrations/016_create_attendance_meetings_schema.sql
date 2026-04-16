CREATE TABLE IF NOT EXISTS subject_meetings (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    teaching_assignment_id BIGINT NOT NULL,
    academic_year_id      INT NOT NULL,
    meeting_no            INT NOT NULL,
    meeting_date          DATE NOT NULL,
    topic                 VARCHAR(255) NULL,
    notes                 VARCHAR(500) NULL,
    created_by            INT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sm_teaching_assignment FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id),
    CONSTRAINT fk_sm_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    CONSTRAINT fk_sm_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY uq_sm_assignment_meeting_no (teaching_assignment_id, meeting_no),
    UNIQUE KEY uq_sm_assignment_meeting_date (teaching_assignment_id, meeting_date),
    INDEX idx_sm_assignment_date (teaching_assignment_id, meeting_date),
    INDEX idx_sm_academic_year (academic_year_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    subject_meeting_id BIGINT NOT NULL,
    student_id         INT NOT NULL,
    status             ENUM('HADIR', 'SAKIT', 'IZIN', 'ALPA') NOT NULL,
    notes              VARCHAR(255) NULL,
    marked_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ar_subject_meeting FOREIGN KEY (subject_meeting_id) REFERENCES subject_meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_student FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE KEY uq_ar_meeting_student (subject_meeting_id, student_id),
    INDEX idx_ar_student (student_id),
    INDEX idx_ar_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
