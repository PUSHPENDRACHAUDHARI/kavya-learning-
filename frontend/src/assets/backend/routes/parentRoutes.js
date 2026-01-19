const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('parent'));

router.get('/dashboard', parentController.getDashboard);
router.get('/students', parentController.getChildrenForParent);
router.get('/student/:studentId/report', parentController.getStudentReport);
router.post('/link', parentController.linkChild);
router.delete('/child/:studentId', parentController.unlinkChild);

module.exports = router;
