const express = require('express');
const { healthCheck } = require('./health.controller');

const router = express.Router();

router.get('/', healthCheck);

module.exports = router;
