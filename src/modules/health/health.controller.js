const { sendResponse } = require('../../utils/response');

const healthCheck = (req, res) => {
  sendResponse(res, {
    message: 'Server is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { healthCheck };
