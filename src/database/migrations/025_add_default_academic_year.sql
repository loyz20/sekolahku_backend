-- Ensure a default active academic year exists when the database has no active academic year.

SET @academic_year_start_month = COALESCE(
    (
        SELECT NULLIF(CAST(value AS UNSIGNED), 0)
        FROM settings
        WHERE `key` = 'academic_year_start_month'
        LIMIT 1
    ),
    7
);

SET @current_year = YEAR(CURDATE());
SET @current_month = MONTH(CURDATE());
SET @academic_start_year = IF(@current_month >= @academic_year_start_month, @current_year, @current_year - 1);
SET @academic_end_year = @academic_start_year + 1;
SET @academic_code = CONCAT(@academic_start_year, '/', @academic_end_year);
SET @academic_name = CONCAT('Tahun Ajaran ', @academic_code);
SET @academic_start_date = STR_TO_DATE(
    CONCAT(@academic_start_year, '-', LPAD(@academic_year_start_month, 2, '0'), '-01'),
    '%Y-%m-%d'
);
SET @academic_end_date = DATE_SUB(
    STR_TO_DATE(CONCAT(@academic_end_year, '-', LPAD(@academic_year_start_month, 2, '0'), '-01'), '%Y-%m-%d'),
    INTERVAL 1 DAY
);
SET @academic_semester = IF(TIMESTAMPDIFF(MONTH, @academic_start_date, CURDATE()) < 6, 1, 2);
SET @active_academic_year_count = (
    SELECT COUNT(*)
    FROM academic_years
    WHERE is_active = 1
);

INSERT INTO academic_years (code, name, start_date, end_date, semester, is_active)
SELECT
    @academic_code,
    @academic_name,
    @academic_start_date,
    @academic_end_date,
    @academic_semester,
    1
FROM DUAL
WHERE @active_academic_year_count = 0
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    start_date = VALUES(start_date),
    end_date = VALUES(end_date),
    semester = VALUES(semester),
    is_active = 1,
    updated_at = CURRENT_TIMESTAMP;