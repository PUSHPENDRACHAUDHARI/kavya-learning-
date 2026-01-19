const User = require('../models/userModel');

// Get children linked to the parent
exports.getChildrenForParent = async (req, res) => {
	try {
		const parentId = req.user._id;
		const parent = await User.findById(parentId).populate({
			path: 'children',
			select: '_id fullName email enrolledCourses'
		});
		if (!parent) return res.status(404).json({ message: 'Parent not found' });

		const children = (parent.children || []).map(c => ({
			_id: c._id,
			fullName: c.fullName,
			email: c.email,
			enrolledCount: Array.isArray(c.enrolledCourses) ? c.enrolledCourses.length : 0,
			avgProgress: c.enrolledCourses && c.enrolledCourses.length ? Math.round(c.enrolledCourses.reduce((s, ec) => s + (ec.completionPercentage || 0), 0) / c.enrolledCourses.length) : 0
		}));

		res.json({ children });
	} catch (err) {
		console.error('getChildrenForParent error', err);
		res.status(500).json({ message: err.message });
	}
};

// Get detailed student report (only if linked to parent)
exports.getStudentReport = async (req, res) => {
	try {
		const parentId = req.user._id;
		const studentId = req.params.studentId;

		const parent = await User.findById(parentId).select('children');
		if (!parent) return res.status(404).json({ message: 'Parent not found' });

		const linked = (parent.children || []).some(id => id.toString() === studentId.toString());
		if (!linked) return res.status(403).json({ message: 'Student not linked to this parent' });

		const student = await User.findById(studentId).select('-password -__v').populate({
			path: 'enrolledCourses.course',
			model: 'Course',
			select: 'title'
		});
		if (!student) return res.status(404).json({ message: 'Student not found' });

		const report = {
			_id: student._id,
			fullName: student.fullName,
			email: student.email,
			totalHoursLearned: student.totalHoursLearned || 0,
			achievements: student.achievements || [],
			enrolledCourses: (student.enrolledCourses || []).map(ec => ({
				courseId: ec.course ? ec.course._id : ec.course,
				courseTitle: ec.course ? ec.course.title : 'Unknown',
				completionPercentage: ec.completionPercentage || 0,
				completedLessonsCount: Array.isArray(ec.completedLessons) ? ec.completedLessons.length : 0,
				enrollmentDate: ec.enrollmentDate
			}))
		};

		res.json({ report });
	} catch (err) {
		console.error('getStudentReport error', err);
		res.status(500).json({ message: err.message });
	}
};

// Link a child (student) to the logged-in parent by email or id
exports.linkChild = async (req, res) => {
	try {
		const parentId = req.user._id;
		const { email, studentId } = req.body;
		if (!email && !studentId) return res.status(400).json({ message: 'Provide student email or studentId' });

		let student;
		if (studentId) student = await User.findById(studentId);
		else student = await User.findOne({ email: (email || '').toLowerCase() });

		if (!student) return res.status(404).json({ message: 'Student not found' });
		if (student.role !== 'student') return res.status(400).json({ message: 'Can only link users with role student' });

		const parent = await User.findById(parentId);
		if (!parent) return res.status(404).json({ message: 'Parent not found' });

		parent.children = parent.children || [];
		if (parent.children.some(id => id.toString() === student._id.toString())) {
			return res.status(400).json({ message: 'Student already linked' });
		}

		parent.children.push(student._id);
		await parent.save();

		res.status(201).json({ message: 'Student linked', student: { _id: student._id, fullName: student.fullName, email: student.email } });
	} catch (err) {
		console.error('linkChild error', err);
		res.status(500).json({ message: err.message });
	}
};

// Unlink a child from the parent
exports.unlinkChild = async (req, res) => {
	try {
		const parentId = req.user._id;
		const studentId = req.params.studentId;
		const parent = await User.findById(parentId);
		if (!parent) return res.status(404).json({ message: 'Parent not found' });

		parent.children = parent.children || [];
		const idx = parent.children.findIndex(id => id.toString() === studentId.toString());
		if (idx === -1) return res.status(404).json({ message: 'Student not linked' });

		parent.children.splice(idx, 1);
		await parent.save();
		res.json({ message: 'Student unlinked' });
	} catch (err) {
		console.error('unlinkChild error', err);
		res.status(500).json({ message: err.message });
	}
};

// Parent dashboard: children summaries, recent notifications, upcoming events
exports.getDashboard = async (req, res) => {
	try {
		const Notification = require('../models/notificationModel');
		const Event = require('../models/eventModel');
		const parentId = req.user._id;
		const parent = await User.findById(parentId).populate({
			path: 'children',
			select: '_id fullName email enrolledCourses achievements totalHoursLearned className'
		});
		if (!parent) return res.status(404).json({ message: 'Parent not found' });

		const children = (parent.children || []).map(c => ({
			_id: c._id,
			fullName: c.fullName,
			email: c.email,
			enrolledCount: Array.isArray(c.enrolledCourses) ? c.enrolledCourses.length : 0,
			avgProgress: c.enrolledCourses && c.enrolledCourses.length ? Math.round(c.enrolledCourses.reduce((s, ec) => s + (ec.completionPercentage || 0), 0) / c.enrolledCourses.length) : 0,
			totalHoursLearned: c.totalHoursLearned || 0,
			recentAchievements: (c.achievements || []).slice(-3).reverse(),
			className: c.className || null
		}));

		// recent notifications for the parent
		const notifications = await Notification.find({ userId: parentId }).sort({ createdAt: -1 }).limit(6);

		// upcoming events (next 14 days)
		const now = new Date();
		const future = new Date();
		future.setDate(now.getDate() + 14);
		const upcomingEvents = await Event.find({ date: { $gte: now, $lte: future } }).sort({ date: 1 }).limit(6).select('title date startTime endTime location type');

		res.json({ children, notifications, upcomingEvents });
	} catch (err) {
		console.error('getDashboard error', err);
		res.status(500).json({ message: err.message });
	}
};
