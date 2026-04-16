const ACADEMIC_YEAR_HEADER = 'x-academic-year-id';

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const applyAcademicYearContext = (req, res, next) => {
  const headerAcademicYearId = toPositiveInt(req.headers[ACADEMIC_YEAR_HEADER]);

  if (!headerAcademicYearId) {
    return next();
  }

  req.context = {
    ...(req.context || {}),
    academicYearId: headerAcademicYearId,
  };

  if (req.query && !hasValue(req.query.academic_year_id)) {
    req.query.academic_year_id = String(headerAcademicYearId);
  }

  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    if (!hasValue(req.body.academic_year_id)) {
      req.body.academic_year_id = headerAcademicYearId;
    }

    if (!hasValue(req.body.academicYearId)) {
      req.body.academicYearId = headerAcademicYearId;
    }
  }

  return next();
};

module.exports = applyAcademicYearContext;
