CREATE TABLE IF NOT EXISTS settings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    `key`       VARCHAR(100) NOT NULL UNIQUE,
    value       TEXT NULL,
    label       VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL,
    type        ENUM('string', 'integer', 'boolean') NOT NULL DEFAULT 'string',
    group_name  VARCHAR(50) NOT NULL DEFAULT 'general',
    is_public   TINYINT(1) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_settings_group (group_name),
    INDEX idx_settings_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default settings (idempotent).
INSERT INTO settings (`key`, value, label, description, type, group_name, is_public)
VALUES
    -- School profile
    ('school_name',             'Nama Sekolah',  'Nama Sekolah',          'Nama resmi sekolah',                   'string',  'school_profile', 1),
    ('school_npsn',             NULL,            'NPSN',                  'Nomor Pokok Sekolah Nasional',         'string',  'school_profile', 1),
    ('school_level',            'SMA',           'Jenjang',               'SD / SMP / SMA / SMK / MA / MTs / MI', 'string',  'school_profile', 1),
    ('school_accreditation',    NULL,            'Akreditasi',            'Nilai akreditasi sekolah (A/B/C)',     'string',  'school_profile', 1),
    ('school_address',          NULL,            'Alamat',                'Alamat lengkap sekolah',               'string',  'school_profile', 1),
    ('school_city',             NULL,            'Kota/Kabupaten',        NULL,                                   'string',  'school_profile', 1),
    ('school_province',         NULL,            'Provinsi',              NULL,                                   'string',  'school_profile', 1),
    ('school_postal_code',      NULL,            'Kode Pos',              NULL,                                   'string',  'school_profile', 0),
    ('school_phone',            NULL,            'Nomor Telepon',         NULL,                                   'string',  'school_profile', 1),
    ('school_email',            NULL,            'Email Sekolah',         NULL,                                   'string',  'school_profile', 1),
    ('school_website',          NULL,            'Website',               NULL,                                   'string',  'school_profile', 1),
    ('school_logo_url',         NULL,            'URL Logo',              'URL absolut gambar logo sekolah',      'string',  'school_profile', 1),
    ('school_founded_year',     NULL,            'Tahun Berdiri',         NULL,                                   'integer', 'school_profile', 1),
    -- App config
    ('timezone',                'Asia/Jakarta',  'Zona Waktu',            NULL,                                   'string',  'app_config', 0),
    ('locale',                  'id',            'Bahasa',                'Kode bahasa (id / en)',                'string',  'app_config', 0),
    ('date_format',             'DD/MM/YYYY',    'Format Tanggal',        NULL,                                   'string',  'app_config', 0),
    ('academic_year_start_month','7',            'Bulan Awal Tahun Ajaran','1 = Januari, 7 = Juli, dst.',         'integer', 'app_config', 0)
ON DUPLICATE KEY UPDATE
    label       = VALUES(label),
    description = VALUES(description),
    type        = VALUES(type),
    group_name  = VALUES(group_name),
    is_public   = VALUES(is_public),
    updated_at  = CURRENT_TIMESTAMP;
