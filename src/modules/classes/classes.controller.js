const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const classesService = require('./classes.service');
const ApiError = require('../../utils/ApiError');
const xlsx = require('xlsx');

const getClasses = catchAsync(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page,  10) || 1,   1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';
  const level  = req.query.level  || '';
  const assignedOnly = req.query.assigned_only === true || req.query.assigned_only === 'true';

  const result = await classesService.getClasses({
    page,
    limit,
    search,
    level,
    assignedOnly,
    actor: req.user,
  });

  sendResponse(res, {
    message: 'Classes fetched successfully',
    data: result.classes,
    meta: result.meta,
  });
});

const getClassById = catchAsync(async (req, res) => {
  const cls = await classesService.getClassById(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Class fetched successfully', data: cls });
});

const createClass = catchAsync(async (req, res) => {
  const { code, name, level } = req.body;

  const cls = await classesService.createClass({ code, name, level });

  sendResponse(res, { statusCode: 201, message: 'Class created successfully', data: cls });
});

const importClasses = catchAsync(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('File is required');
  }

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  let headerRowIndex = -1;
  let headerRow = null;

  for (let i = 0; i < Math.min(allRows.length, 25); i++) {
    const row = allRows[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    const rowStr = row.map((c) => String(c || '').toLowerCase()).join('|');
    if (rowStr.includes('kode') && (rowStr.includes('nama') || rowStr.includes('name'))) {
      headerRowIndex = i;
      headerRow = row;
      break;
    }
  }

  if (headerRowIndex === -1 || !headerRow) {
    throw ApiError.badRequest('Header row not found. Expected columns including Kode and Nama.');
  }

  const colMap = {};
  headerRow.forEach((col, idx) => {
    const val = String(col || '').toLowerCase().trim();
    if (val === 'kode' || val === 'code' || val === 'kode kelas') colMap.code = idx;
    else if (val === 'nama' || val === 'name' || val === 'nama kelas') colMap.name = idx;
    else if (val === 'tingkat' || val === 'level') colMap.level = idx;
  });

  const result = { created: 0, errors: [] };

  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!Array.isArray(row) || row.every((c) => !c)) {
      continue;
    }

    const code = row[colMap.code] ? String(row[colMap.code]).trim() : '';
    const name = row[colMap.name] ? String(row[colMap.name]).trim() : '';
    const level = row[colMap.level] ? String(row[colMap.level]).trim() : null;

    if (!code || !name) {
      result.errors.push({ row: i + 1, error: 'Missing required Kode or Nama' });
      continue;
    }

    try {
      await classesService.createClass({ code, name, level });
      result.created += 1;
    } catch (err) {
      result.errors.push({
        row: i + 1,
        error: err && err.message ? err.message : 'Unknown error',
      });
    }
  }

  sendResponse(res, {
    statusCode: 201,
    message: 'Import finished',
    data: result,
  });
});

const getImportTemplate = catchAsync(async (req, res) => {
  const worksheet = xlsx.utils.aoa_to_sheet([
    ['TEMPLATE IMPORT KELAS - SEKOLAHKU'],
    ['Baca instruksi di bawah sebelum mengisi data'],
    [],
    ['INSTRUKSI:'],
    ['1. Isi data kelas mulai dari baris setelah header kolom'],
    ['2. Kolom Kode dan Nama WAJIB diisi'],
    ['3. Kode kelas gunakan format singkat seperti X.E-1, XI.A-2, XII.B-3'],
    ['4. Kolom Tingkat OPSIONAL (contoh: X, XI, XII)'],
    ['5. Jangan menghapus atau mengubah nama header kolom'],
    [],
    ['Kode', 'Nama', 'Tingkat'],
    ['X.E-1', 'Kelas X E 1', 'X'],
    ['XI.A-2', 'Kelas XI A 2', 'XI'],
  ]);

  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 12 },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Template Kelas');

  const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Kelas.xlsx"');
  res.end(buffer);
});

const updateClass = catchAsync(async (req, res) => {
  const { code, name, level } = req.body;

  const cls = await classesService.updateClass(parseInt(req.params.id, 10), { code, name, level });

  sendResponse(res, { message: 'Class updated successfully', data: cls });
});

const deleteClass = catchAsync(async (req, res) => {
  await classesService.deleteClass(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Class deleted successfully' });
});

module.exports = {
  getClasses,
  getClassById,
  createClass,
  importClasses,
  getImportTemplate,
  updateClass,
  deleteClass,
};
