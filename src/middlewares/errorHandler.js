const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  const isStudentScheduleEndpoint = req.originalUrl.startsWith(
    `${config.apiPrefix}/schedules/students/`
  );

  const shouldShowStack = config.env === 'development' && !isStudentScheduleEndpoint;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message);
    error.stack = err.stack;
  }

  const response = {
    success: false,
    message: error.message,
    ...(error.errors.length > 0 && { errors: error.errors }),
    ...(shouldShowStack && { stack: error.stack }),
  };

  if (error.statusCode >= 500) {
    logger.error(`${error.statusCode} - ${error.message}`, {
      url: req.originalUrl,
      method: req.method,
      stack: error.stack,
    });
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
