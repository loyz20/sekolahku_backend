ALTER TABLE assessments
  MODIFY COLUMN nama_penilaian VARCHAR(100) NOT NULL;

ALTER TABLE assessments
  ADD COLUMN teacher_id INT NULL AFTER id,
  ADD CONSTRAINT fk_assessments_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  ADD INDEX idx_assessments_teacher (teacher_id),
  ADD UNIQUE KEY uq_assessments_teacher_name (teacher_id, nama_penilaian);
