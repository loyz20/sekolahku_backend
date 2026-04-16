const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const studentsService = require('./students.service');
const ApiError = require('../../utils/ApiError');
const xlsx = require('xlsx');

const getStudents = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';
  const classId = req.query.class_id || '';
  const academicYearId = req.query.academic_year_id || '';

  const result = await studentsService.getStudents({
    page,
    limit,
    search,
    classId,
    academicYearId,
  });

  sendResponse(res, {
    message: 'Students fetched successfully',
    data: result.students,
    meta: result.meta,
  });
});

const getStudentById = catchAsync(async (req, res) => {
  const student = await studentsService.getStudentById(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Student fetched successfully', data: student });
});

const createStudent = catchAsync(async (req, res) => {
  const {
    nis,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    parent_phone,
    email,
    user_id,
  } = req.body;

  const student = await studentsService.createStudent({
    nis,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    parent_phone,
    email,
    user_id,
  });

  sendResponse(res, { statusCode: 201, message: 'Student created successfully', data: student });
});

const updateStudent = catchAsync(async (req, res) => {
  const {
    nis,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    parent_phone,
    email,
  } = req.body;

  const student = await studentsService.updateStudent(parseInt(req.params.id, 10), {
    nis,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    parent_phone,
    email,
  });

  sendResponse(res, { message: 'Student updated successfully', data: student });
});

const toggleStudentStatus = catchAsync(async (req, res) => {
  const student = await studentsService.toggleStudentStatus(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Student status toggled successfully', data: student });
});

const deleteStudent = catchAsync(async (req, res) => {
  await studentsService.deleteStudent(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Student deleted successfully' });
});

const enrollStudent = catchAsync(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const { class_id, academic_year_id } = req.body;

  const enrollment = await studentsService.enrollStudent(studentId, class_id, academic_year_id);

  sendResponse(res, { statusCode: 201, message: 'Student enrolled successfully', data: enrollment });
});

const disenrollStudent = catchAsync(async (req, res) => {
  const enrollmentId = parseInt(req.params.enrollmentId, 10);

  await studentsService.disenrollStudent(enrollmentId);

  sendResponse(res, { message: 'Student disenrolled successfully' });
});

const importStudents = catchAsync(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('File is required');
  }

  const classId = req.body.class_id ? parseInt(req.body.class_id, 10) : null;
  const academicYearId = req.body.academic_year_id
    ? parseInt(req.body.academic_year_id, 10)
    : req.context?.academicYearId || null;

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read as raw array of arrays (header: 1 means first row is array index 0, every row is an array)
  const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  // Find header row by searching for cells that contain "NIS"
  // The header row should have cells like: ["NIS", "Nama", "Tempat Lahir", ...]
  let headerRowIndex = -1;
  let headerRow = null;

  for (let i = 0; i < Math.min(allRows.length, 25); i++) {
    const row = allRows[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    const firstCell = String(row[0] || '').toUpperCase().trim();
    const secondCell = String(row[1] || '').toUpperCase().trim();

    // Check if this row is the header (first cell is NIS-like, second cell is NAME-like)
    if (firstCell === 'NIS' && (secondCell === 'NAMA' || secondCell === 'NAME')) {
      headerRowIndex = i;
      headerRow = row;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw ApiError.badRequest('Header row not found. Expected row with NIS and Nama columns.');
  }

  // Build column index map by matching header values
  const colMap = {};
  if (headerRow && Array.isArray(headerRow)) {
    headerRow.forEach((cell, idx) => {
      const val = String(cell || '').toUpperCase().trim();
      if (val === 'NIS') colMap.nis = idx;
      else if (val === 'NAMA' || val === 'NAME') colMap.nama = idx;
      else if (val.includes('TEMPAT') && val.includes('LAHIR')) colMap.place_of_birth = idx;
      else if (val.includes('TANGGAL') && val.includes('LAHIR')) colMap.date_of_birth = idx;
      else if (val === 'GENDER' || val === 'JENISKELAMIN') colMap.gender = idx;
      else if (val === 'ALAMAT') colMap.address = idx;
      else if (val.includes('HP') || val.includes('PHONE')) colMap.parent_phone = idx;
      else if (val === 'EMAIL') colMap.email = idx;
    });
  }

  const result = { created: 0, enrolled: 0, errors: [] };

  // Process data rows (starting after header)
  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];

    // Skip if not an array or all cells empty
    if (!Array.isArray(row) || row.every(c => !c)) {
      continue;
    }

    // Extract values safely
    const nis = row[colMap.nis] ? String(row[colMap.nis]).trim() : '';
    const name = row[colMap.nama] ? String(row[colMap.nama]).trim() : '';
    const place_of_birth = row[colMap.place_of_birth] ? String(row[colMap.place_of_birth]).trim() : null;
    const date_of_birth = row[colMap.date_of_birth] ? String(row[colMap.date_of_birth]).trim() : null;
    const gender = row[colMap.gender] ? String(row[colMap.gender]).trim() : null;
    const address = row[colMap.address] ? String(row[colMap.address]).trim() : null;
    const parent_phone = row[colMap.parent_phone] ? String(row[colMap.parent_phone]).trim() : null;
    const email = row[colMap.email] ? String(row[colMap.email]).trim() : null;

    if (!nis || !name) {
      result.errors.push({ row: i + 1, error: 'Missing required NIS or Nama' });
      continue;
    }

    try {
      const student = await studentsService.createStudent({
        nis: String(nis).trim(),
        name: String(name).trim(),
        place_of_birth: place_of_birth ? String(place_of_birth).trim() : null,
        date_of_birth: date_of_birth ? String(date_of_birth).trim() : null,
        gender: gender ? String(gender).trim() : null,
        address: address ? String(address).trim() : null,
        parent_phone: parent_phone ? String(parent_phone).trim() : null,
        email: email ? String(email).trim() : null,
      });
      result.created += 1;

      // Enroll if class_id and academic_year_id provided
      if (classId && academicYearId) {
        try {
          await studentsService.enrollStudent(student.id, classId, academicYearId);
          result.enrolled += 1;
        } catch (enrollErr) {
          // Enrollment error not critical - student is created, just log as warning
          const msg = enrollErr && enrollErr.message ? enrollErr.message : 'Enrollment failed';
          result.errors.push({ row: i + 1, error: `Created but enrollment failed: ${msg}` });
        }
      }
    } catch (err) {
      const message = err && err.message ? err.message : 'Unknown error';
      result.errors.push({ row: i + 1, error: message });
    }
  }

  sendResponse(res, { statusCode: 201, message: 'Import finished', data: result });
});

const getImportTemplate = catchAsync(async (req, res) => {
  // Create a new workbook
  const worksheet = xlsx.utils.aoa_to_sheet([
    ['TEMPLATE IMPORT SISWA - SEKOLAHKU'],
    ['Baca instruksi di bawah sebelum mengisi data'],
    [],
    ['INSTRUKSI:'],
    ['1. Isi data siswa mulai dari baris 8 (ROW 8)'],
    ['2. Kolom NIS dan Nama WAJIB diisi, kolom lainnya OPSIONAL'],
    ['3. Format tanggal: YYYY-MM-DD (contoh: 2010-05-15)'],
    ['4. Gender: M (Laki-laki) atau F (Perempuan)'],
    ['5. Jangan menghapus atau mengubah header di baris 8'],
    ['6. Jangan tambahkan kolom baru'],
    [],
    ['NIS', 'Nama', 'Tempat Lahir', 'Tanggal Lahir', 'Gender', 'Alamat', 'No HP Orang Tua', 'Email'],
    ['001', 'Ahmad Rizki', 'Jakarta', '2010-05-15', 'M', 'Jl. Merdeka No. 123', '08123456789', 'ahmad@example.com'],
    ['002', 'Siti Nurhaliza', 'Bandung', '2011-03-20', 'F', 'Jl. Sudirman No. 456', '08234567890', 'siti@example.com'],
    ['003', 'Budi Santoso', 'Surabaya', '2010-08-12', 'M', 'Jl. Ahmad Yani No. 789', '08345678901', ''],
  ]);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // NIS
    { wch: 20 }, // Nama
    { wch: 18 }, // Tempat Lahir
    { wch: 15 }, // Tanggal Lahir
    { wch: 10 }, // Gender
    { wch: 25 }, // Alamat
    { wch: 18 }, // No HP Orang Tua
    { wch: 20 }, // Email
  ];

  // Set row heights for header sections
  worksheet['!rows'] = [
    { hpx: 25 }, // Title
    { hpx: 18 }, // Subtitle
    { hpx: 10 }, // Empty
    { hpx: 18 }, // INSTRUKSI
    { hpx: 16 }, // Instructions
    { hpx: 16 },
    { hpx: 16 },
    { hpx: 16 },
    { hpx: 16 },
    { hpx: 16 },
    { hpx: 10 }, // Empty
    { hpx: 18 }, // Headers
    { hpx: 16 }, // Example rows
    { hpx: 16 },
    { hpx: 16 },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');

  // Generate buffer
  const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  // Send file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Siswa.xlsx"');
  res.end(buffer);
});

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  deleteStudent,
  enrollStudent,
  disenrollStudent,
  importStudents,
  getImportTemplate,
};
