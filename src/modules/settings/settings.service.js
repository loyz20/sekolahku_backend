const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

/**
 * Coerce string DB value to its declared type.
 */
const coerce = (value, type) => {
  if (value === null || value === undefined) return null;
  if (type === 'integer') return parseInt(value, 10);
  if (type === 'boolean') return value === '1' || value === 'true';
  return value;
};

const formatRow = (r) => ({
  key: r.key,
  value: coerce(r.value, r.type),
  label: r.label,
  description: r.description || null,
  type: r.type,
  group: r.group_name,
  is_public: !!r.is_public,
});

/**
 * Return all settings, optionally filtered by group.
 */
const getAllSettings = async (group = '') => {
  const sql = group
    ? 'SELECT `key`, value, label, description, type, group_name, is_public FROM settings WHERE group_name = ? ORDER BY group_name, `key`'
    : 'SELECT `key`, value, label, description, type, group_name, is_public FROM settings ORDER BY group_name, `key`';

  const params = group ? [group] : [];
  const rows = await db.query(sql, params);

  return rows.map(formatRow);
};

/**
 * Return only is_public = 1 settings, optionally filtered by group.
 */
const getPublicSettings = async (group = '') => {
  const sql = group
    ? 'SELECT `key`, value, label, type, group_name FROM settings WHERE is_public = 1 AND group_name = ? ORDER BY group_name, `key`'
    : 'SELECT `key`, value, label, type, group_name FROM settings WHERE is_public = 1 ORDER BY group_name, `key`';

  const params = group ? [group] : [];
  const rows = await db.query(sql, params);

  return rows.map((r) => ({
    key: r.key,
    value: coerce(r.value, r.type),
    label: r.label,
    group: r.group_name,
  }));
};

/**
 * Bulk-update settings by key.
 * @param {Array<{key: string, value: string|null}>} updates
 */
const updateSettings = async (updates) => {
  if (!updates || !updates.length) {
    throw ApiError.badRequest('No settings provided to update');
  }

  // Verify all keys exist.
  const keys = updates.map((u) => u.key);
  const placeholders = keys.map(() => '?').join(', ');
  const existing = await db.query(
    `SELECT \`key\` FROM settings WHERE \`key\` IN (${placeholders})`,
    keys
  );

  const existingKeys = new Set(existing.map((r) => r.key));
  const unknown = keys.filter((k) => !existingKeys.has(k));

  if (unknown.length) {
    throw ApiError.badRequest(`Unknown setting key(s): ${unknown.join(', ')}`);
  }

  // Execute updates in a transaction.
  await db.transaction(async (connection) => {
    for (const { key, value } of updates) {
      await connection.execute(
        'UPDATE settings SET value = ? WHERE `key` = ?',
        [value !== undefined ? String(value ?? '') : null, key]
      );
    }
  });

  // Return updated keys.
  const updatedKeys = keys;
  const keyPlaceholders = updatedKeys.map(() => '?').join(', ');
  const rows = await db.query(
    `SELECT \`key\`, value, label, description, type, group_name, is_public FROM settings WHERE \`key\` IN (${keyPlaceholders}) ORDER BY group_name, \`key\``,
    updatedKeys
  );

  return rows.map(formatRow);
};

module.exports = { getAllSettings, getPublicSettings, updateSettings };
