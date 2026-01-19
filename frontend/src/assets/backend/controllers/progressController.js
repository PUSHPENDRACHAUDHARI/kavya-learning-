const User = require('../models/userModel');
const ActivityLog = require('../models/activityLogModel');
const Quiz = require('../models/quizModel');
const Course = require('../models/courseModel');
const { logActivity } = require('../utils/activityLogger');
const PDFDocument = require('pdfkit');

/**
 * Compute a basic skill level label from an overall percentage.
 */
function deriveSkillLevel(percent) {
  if (!percent || percent <= 0) {
    return { label: 'Beginner', percent: 0 };
  }
  if (percent < 40) return { label: 'Beginner', percent: Math.round(percent) };
  if (percent < 70) return { label: 'Intermediate', percent: Math.round(percent) };
  if (percent < 90) return { label: 'Advanced', percent: Math.round(percent) };
  return { label: 'Expert', percent: Math.round(percent) };
}

/**
 * @desc    Get a student's overall learning progress, stats, skills, certificates and recent activity
 * @route   GET /api/progress/overview
 * @access  Private (Student)
 */
exports.getProgressOverview = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate({
        path: 'enrolledCourses.course',
        select: 'title',
        model: Course,
      })
      .populate('achievements', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const enrolledCourses = user.enrolledCourses || [];
    const enrolledCoursesCount = enrolledCourses.length;
    const learningHours =
      enrolledCourses.reduce((sum, ec) => sum + (ec.hoursSpent || 0), 0) ||
      user.totalHoursLearned ||
      0;
    const achievementsCount = (user.achievements || []).length;

    // Average course completion across enrolled courses
    let avgCompletion = 0;
    if (enrolledCourses.length > 0) {
      const totalCompletion = enrolledCourses.reduce(
        (sum, ec) => sum + (ec.completionPercentage || 0),
        0
      );
      avgCompletion = Math.round(totalCompletion / enrolledCourses.length);
    }

    // Average quiz score across all attempts for this student
    let avgScore = 0;

const quizAgg = await Quiz.aggregate([
  { $match: { 'attempts.student': userId } },
  { $unwind: '$attempts' },
  { $match: { 'attempts.student': userId } },

  {
    $project: {
      percentage: {
        $cond: [
          { $gt: ['$totalMarks', 0] },
          {
            $multiply: [
              { $divide: ['$attempts.score', '$totalMarks'] },
              100
            ]
          },
          0
        ]
      }
    }
  },

  {
    $group: {
      _id: null,
      avgPercentage: { $avg: '$percentage' }
    }
  }
]);


    if (quizAgg && quizAgg.length > 0) {
      avgScore = Math.round(quizAgg[0].avgPercentage || 0);
    }

    const skillBase = avgScore || avgCompletion;
    const skillMeta = deriveSkillLevel(skillBase);

    // Build skills list for the UI
    const skills = [
      {
        name: 'Course Progress',
        percent: avgCompletion || 0,
        color: '#1b65d4',
      },
      {
        name: 'Quiz Performance',
        percent: avgScore || 0,
        color: '#2db88e',
      },
      {
        name: 'Engagement',
        // Clamp hours to 100 for progress bar purposes
        percent: Math.max(
          0,
          Math.min(100, Math.round((learningHours / 50) * 100))
        ),
        color: '#4acb9a',
      },
      {
        name: 'Overall Skill',
        percent: skillMeta.percent,
        color: '#27c5aa',
      },
    ];

    // Certificates derived from enrolled courses
    const certificates = enrolledCourses.map((enrollment) => {
      const course = enrollment.course || {};
      const completed = (enrollment.completionPercentage || 0) >= 100;
      let status = 'Pending';
      if (completed && enrollment.certificateDownloadedAt) {
        status = 'Downloaded';
      } else if (completed) {
        status = 'Available';
      }

      return {
        id: enrollment._id,
        courseId: course._id,
        title: course.title || 'Course',
        enrolledAt: enrollment.enrollmentDate,
        status,
      };
    });

    // Recent activity
    const recentActivityDocs = await ActivityLog.find({ performedBy: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentActivity = recentActivityDocs.map((log) => {
      let type = log.targetType || 'general';
      let color = '#1b65d4';
      if (type === 'Course') color = '#1b65d4';
      else if (type === 'Lesson') color = '#27c5aa';
      else if (type === 'Quiz') color = '#f1c40f';
      else if (type === 'Certificate') color = '#28a745';
      else if (type === 'Achievement') color = '#9b59b6';

      return {
        id: log._id,
        action: log.action,
        description:
          (log.details && log.details.description) || log.action || '',
        type,
        color,
        createdAt: log.createdAt,
      };
    });

    res.json({
      stats: {
        enrolledCourses: enrolledCoursesCount,
        learningHours,
        achievements: achievementsCount,
        avgScore: avgScore || 0,
        skillLevelLabel: skillMeta.label,
        skillLevelPercent: skillMeta.percent,
      },
      skills,
      certificates,
      recentActivity,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Get only the recent activity log for the current user
 * @route   GET /api/progress/activity
 * @access  Private
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const recentActivityDocs = await ActivityLog.find({ performedBy: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const recentActivity = recentActivityDocs.map((log) => ({
      id: log._id,
      action: log.action,
      description:
        (log.details && log.details.description) || log.action || '',
      type: log.targetType || 'general',
      createdAt: log.createdAt,
    }));

    res.json({ recentActivity });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Generate and stream a course completion certificate PDF
 *          Only available once the course is fully completed.
 * @route   GET /api/progress/certificates/:courseId/download
 * @access  Private
 */
exports.downloadCertificate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const user = await User.findById(userId).populate({
      path: 'enrolledCourses.course',
      select: 'title',
      model: Course,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const enrollment = (user.enrolledCourses || []).find((ec) => {
      const c = ec.course;
      if (!c) return false;
      return (
        c._id.toString() === courseId.toString() ||
        ec.course.toString() === courseId.toString()
      );
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ message: 'Enrollment for this course not found' });
    }

    if ((enrollment.completionPercentage || 0) < 100) {
      return res.status(400).json({
        message: 'Certificate is only available after course completion',
      });
    }

    const courseTitle =
      (enrollment.course && enrollment.course.title) || 'Course';

    // Prepare PDF response headers
    const safeTitle = courseTitle.replace(/[^a-z0-9]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}_Certificate.pdf"`
    );

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40,
    });

    doc.pipe(res);

    // Simple but clean certificate layout
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Border
    doc.lineWidth(4);
    doc.strokeColor('#D4AF37');
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke();

    // Title
    doc
      .fontSize(32)
      .fillColor('#1B337F')
      .font('Helvetica-Bold')
      .text('Certificate of Completion', 0, 80, {
        align: 'center',
      });

    // Subtitle
    doc
      .moveDown(1)
      .fontSize(16)
      .fillColor('#000000')
      .font('Helvetica-Oblique')
      .text('This certificate is proudly presented to', {
        align: 'center',
      });

    // Learner name
    doc
      .moveDown(0.5)
      .fontSize(26)
      .fillColor('#1B337F')
      .font('Helvetica-Bold')
      .text(user.fullName || 'Student', { align: 'center' });

    // Course info
    doc
      .moveDown(1)
      .fontSize(16)
      .fillColor('#000000')
      .font('Helvetica')
      .text('for successfully completing the course', {
        align: 'center',
      });

    doc
      .moveDown(0.5)
      .fontSize(20)
      .fillColor('#3C3C3C')
      .font('Helvetica-Bold')
      .text(courseTitle, {
        align: 'center',
      });

    // Date / footer
    const dateStr = new Date().toLocaleDateString();
    doc
      .moveDown(2)
      .fontSize(14)
      .fillColor('#555555')
      .font('Helvetica')
      .text(`Date: ${dateStr}`, { align: 'center' });

    doc
      .moveDown(1)
      .fontSize(16)
      .fillColor('#666666')
      .font('Helvetica-Bold')
      .text('KavyaLearn Academy', { align: 'center' });

    doc.end();

    // Update enrollment + log activity (do not await doc piping)
    enrollment.certificateDownloadedAt = new Date();
    await user.save();

    logActivity({
      userId,
      action: 'Certificate Downloaded',
      targetType: 'Certificate',
      targetId: enrollment.course && enrollment.course._id,
      details: {
        courseId,
        courseTitle,
      },
    }).catch(() => {});
  } catch (error) {
    // If headers have already been sent, we cannot send JSON
    if (!res.headersSent) {
      res.status(400).json({ message: error.message });
    } else {
      console.error('Error while streaming certificate PDF', error);
    }
  }
};


