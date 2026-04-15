const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

module.exports = notFoundHandler;
