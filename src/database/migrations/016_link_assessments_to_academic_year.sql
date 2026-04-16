ALTER TABLE assessments
  ADD COLUMN academic_year_id INT NULL AFTER teacher_id;

SET @active_ay_id := (
  SELECT id
  FROM academic_years
  WHERE is_active = 1
  ORDER BY id DESC
  LIMIT 1
);

SET @fallback_ay_id := (
  SELECT id
  FROM academic_years
  ORDER BY id ASC
  LIMIT 1
);

UPDATE assessments
SET academic_year_id = COALESCE(@active_ay_id, @fallback_ay_id)
WHERE academic_year_id IS NULL;

ALTER TABLE assessments
  MODIFY COLUMN academic_year_id INT NOT NULL,
  ADD CONSTRAINT fk_assessments_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  ADD INDEX idx_assessments_academic_year (academic_year_id),
  ADD INDEX idx_assessments_teacher_year_active (teacher_id, academic_year_id, is_active),
  DROP INDEX uq_assessments_teacher_name,
  ADD UNIQUE KEY uq_assessments_teacher_name_year (teacher_id, nama_penilaian, academic_year_id);
