ALTER TABLE scores
  ADD COLUMN academic_year_id INT NULL AFTER assessment_id;

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

UPDATE scores
SET academic_year_id = COALESCE(@active_ay_id, @fallback_ay_id)
WHERE academic_year_id IS NULL;

ALTER TABLE scores
  MODIFY COLUMN academic_year_id INT NOT NULL,
  ADD CONSTRAINT fk_scores_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  ADD INDEX idx_scores_academic_year (academic_year_id);

ALTER TABLE scores
  DROP INDEX uq_scores_student_subject_assessment,
  DROP INDEX idx_scores_lookup,
  ADD UNIQUE KEY uq_scores_student_subject_assessment_year (student_id, subject_id, assessment_id, academic_year_id),
  ADD INDEX idx_scores_lookup (student_id, subject_id, assessment_id, academic_year_id);
