const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const teachersService = require('./teachers.service');
const xlsx = require('xlsx');

const getTeachers = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';
  const specialization = req.query.specialization || '';

  const result = await teachersService.getTeachers({
    page,
    limit,
    search,
    specialization,
  });

  sendResponse(res, {
    message: 'Teachers fetched successfully',
    data: result.teachers,
    meta: result.meta,
  });
});

const getTeacherById = catchAsync(async (req, res) => {
  const teacher = await teachersService.getTeacherById(parseInt(req.params.id, 10));

  if (!teacher) throw ApiError.notFound('Teacher not found');

  sendResponse(res, {
    message: 'Teacher fetched successfully',
    data: teacher,
  });
});

const createTeacher = catchAsync(async (req, res) => {
  const {
    nip,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    phone,
    email,
    specialization,
    qualification,
    user_id,
  } = req.body;

  const teacher = await teachersService.createTeacher({
    nip,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    phone,
    email,
    specialization,
    qualification,
    user_id,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Teacher created successfully',
    data: teacher,
  });
});

const importTeachers = catchAsync(async (req, res) => {
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
    if (rowStr.includes('nip') && (rowStr.includes('nama') || rowStr.includes('name'))) {
      headerRowIndex = i;
      headerRow = row;
      break;
    }
  }

  if (headerRowIndex === -1 || !headerRow) {
    throw ApiError.badRequest('Header row not found. Expected columns including NIP and Nama.');
  }

  const colMap = {};
  headerRow.forEach((col, idx) => {
    const val = String(col || '').toLowerCase().trim();
    if (val === 'nip') colMap.nip = idx;
    else if (val === 'nama' || val === 'name') colMap.name = idx;
    else if (val.includes('tempat') && val.includes('lahir')) colMap.place_of_birth = idx;
    else if (val.includes('tanggal') && val.includes('lahir')) colMap.date_of_birth = idx;
    else if (val === 'gender' || val === 'jenis kelamin' || val === 'jeniskelamin') colMap.gender = idx;
    else if (val === 'alamat' || val === 'address') colMap.address = idx;
    else if (val.includes('hp') || val.includes('phone') || val === 'telepon') colMap.phone = idx;
    else if (val === 'email') colMap.email = idx;
    else if (val.includes('spesialisasi') || val.includes('keahlian') || val.includes('specialization')) colMap.specialization = idx;
    else if (val.includes('kualifikasi') || val.includes('qualification')) colMap.qualification = idx;
  });

  const result = { created: 0, errors: [] };

  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!Array.isArray(row) || row.every((c) => !c)) {
      continue;
    }

    const nip = row[colMap.nip] ? String(row[colMap.nip]).trim() : '';
    const name = row[colMap.name] ? String(row[colMap.name]).trim() : '';
    const place_of_birth = row[colMap.place_of_birth] ? String(row[colMap.place_of_birth]).trim() : null;
    const date_of_birth = row[colMap.date_of_birth] ? String(row[colMap.date_of_birth]).trim() : null;
    const gender = row[colMap.gender] ? String(row[colMap.gender]).trim().toUpperCase() : null;
    const address = row[colMap.address] ? String(row[colMap.address]).trim() : null;
    const phone = row[colMap.phone] ? String(row[colMap.phone]).trim() : null;
    const email = row[colMap.email] ? String(row[colMap.email]).trim() : null;
    const specialization = row[colMap.specialization] ? String(row[colMap.specialization]).trim() : null;
    const qualification = row[colMap.qualification] ? String(row[colMap.qualification]).trim() : null;

    if (!nip || !name) {
      result.errors.push({ row: i + 1, error: 'Missing required NIP or Nama' });
      continue;
    }

    try {
      await teachersService.createTeacher({
        nip,
        name,
        place_of_birth,
        date_of_birth,
        gender: gender === 'M' || gender === 'F' ? gender : null,
        address,
        phone,
        email,
        specialization,
        qualification,
        user_id: null,
      });
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
    ['TEMPLATE IMPORT GURU - SEKOLAHKU'],
    ['Baca instruksi di bawah sebelum mengisi data'],
    [],
    ['INSTRUKSI:'],
    ['1. Isi data guru mulai dari baris setelah header kolom'],
    ['2. Kolom NIP dan Nama WAJIB diisi, kolom lainnya OPSIONAL'],
    ['3. Format tanggal: YYYY-MM-DD (contoh: 1985-08-17)'],
    ['4. Gender: M (Laki-laki) atau F (Perempuan)'],
    ['5. Jangan menghapus atau mengubah nama header kolom'],
    [],
    ['NIP', 'Nama', 'Tempat Lahir', 'Tanggal Lahir', 'Gender', 'Alamat', 'No HP', 'Email', 'Spesialisasi', 'Kualifikasi'],
    ['198501012010011001', 'Budi Santoso', 'Jakarta', '1985-01-01', 'M', 'Jl. Melati No. 1', '081234567890', 'budi@example.com', 'Matematika', 'S1 Pendidikan Matematika'],
    ['199002022015022002', 'Siti Aminah', 'Bandung', '1990-02-02', 'F', 'Jl. Kenanga No. 2', '081345678901', 'siti@example.com', 'Bahasa Indonesia', 'S1 Pendidikan Bahasa'],
  ]);

  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 24 },
    { wch: 18 },
    { wch: 15 },
    { wch: 10 },
    { wch: 26 },
    { wch: 16 },
    { wch: 26 },
    { wch: 22 },
    { wch: 26 },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Template Guru');

  const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Guru.xlsx"');
  res.end(buffer);
});

const updateTeacher = catchAsync(async (req, res) => {
  const teacherId = parseInt(req.params.id, 10);

  const { nip, name, place_of_birth, date_of_birth, gender, address, phone, email, specialization, qualification, user_id } = req.body;

  const teacher = await teachersService.updateTeacher(teacherId, {
    nip,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    phone,
    email,
    specialization,
    qualification,
    user_id,
  });

  sendResponse(res, {
    message: 'Teacher updated successfully',
    data: teacher,
  });
});

const toggleTeacherStatus = catchAsync(async (req, res) => {
  const teacherId = parseInt(req.params.id, 10);

  const result = await teachersService.toggleTeacherStatus(teacherId);

  sendResponse(res, {
    message: 'Teacher status toggled successfully',
    data: result,
  });
});

const deleteTeacher = catchAsync(async (req, res) => {
  const teacherId = parseInt(req.params.id, 10);

  await teachersService.deleteTeacher(teacherId);

  sendResponse(res, {
    message: 'Teacher deleted successfully',
  });
});

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  importTeachers,
  getImportTemplate,
  updateTeacher,
  toggleTeacherStatus,
  deleteTeacher,
};
