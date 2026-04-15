const express = require('express');
const healthRoute = require('../modules/health/health.route');
const authRoute = require('../modules/auth/auth.route');
const dutyRoute = require('../modules/duty/duty.route');
const usersRoute = require('../modules/users/users.route');
const classesRoute = require('../modules/classes/classes.route');
const academicYearsRoute = require('../modules/settings/academic-years.route');
const settingsRoute = require('../modules/settings/settings.route');
const studentsRoute = require('../modules/students/students.route');
const teachersRoute = require('../modules/teachers/teachers.route');
const subjectsRoute = require('../modules/subjects/subjects.route');
const schedulesRoute = require('../modules/schedules/schedules.route');
const assessmentsRoute = require('../modules/assessments/assessments.route');
const scoresRoute = require('../modules/scores/scores.route');

const router = express.Router();

router.use('/health', healthRoute);
router.use('/auth', authRoute);
router.use('/duties', dutyRoute);
router.use('/users', usersRoute);
router.use('/classes', classesRoute);
router.use('/academic-years', academicYearsRoute);
router.use('/settings', settingsRoute);
router.use('/students', studentsRoute);
router.use('/teachers', teachersRoute);
router.use('/subjects', subjectsRoute);
router.use('/schedules', schedulesRoute);
router.use('/assessments', assessmentsRoute);
router.use('/scores', scoresRoute);

module.exports = router;
