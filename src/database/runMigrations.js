require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const databaseName = process.env.DB_NAME || 'sekolahku';
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No migration files found.');
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.changeUser({ database: databaseName });

    // Ensure migration tracking table exists.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query('SELECT filename FROM _migrations');
    const appliedSet = new Set(appliedRows.map((r) => r.filename));

    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`Skipped (already applied): ${file}`);
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
      console.log(`Applied migration: ${file}`);
      appliedCount++;
    }

    console.log(
      appliedCount > 0
        ? `${appliedCount} migration(s) executed successfully.`
        : 'All migrations are already up to date.'
    );
  } finally {
    await connection.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
