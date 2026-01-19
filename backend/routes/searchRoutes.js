const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Course = require('../models/courseModel');
const User = require('../models/userModel');
const Lesson = require('../models/lessonModel');
const Quiz = require('../models/quizModel');

// Helper to detect section keywords
const detectSectionKeyword = (query) => {
  const qLower = query.toLowerCase().trim();
  const sectionKeywords = {
    'curriculum': 'curriculum',
    'instructor': 'instructor',
    'reviews': 'reviews',
    'review': 'reviews',
    'quizzes': 'quizzes',
    'quiz': 'quizzes',
    'resources': 'resources',
    'resource': 'resources'
  };
  
  // Check if query exactly matches or contains a section keyword
  for (const [key, section] of Object.entries(sectionKeywords)) {
    if (qLower === key || qLower.includes(key)) {
      return section;
    }
  }
  return null;
};

// GET /api/search?q=keyword
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, message: 'Query required', results: [] });

    // Check for section keywords
    const sectionType = detectSectionKeyword(q);
    
    // Escape regex special chars to avoid injection
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');

    // If searching for a section keyword, search course metadata
    if (sectionType) {
      const courseQuery = {};
      const populateFields = [];
      
      // Build query based on section type
      switch (sectionType) {
        case 'curriculum':
          // Find courses with lessons
          courseQuery['lessons.0'] = { $exists: true };
          populateFields.push('lessons');
          break;
        case 'instructor':
          // Find courses with instructor populated
          courseQuery['instructor'] = { $exists: true };
          populateFields.push('instructor');
          break;
        case 'reviews':
          // Find courses with reviews
          courseQuery['reviews.0'] = { $exists: true };
          break;
        case 'quizzes':
          // Find courses that have quizzes (we'll check via Quiz model)
          break;
        case 'resources':
          // Find courses with resources
          courseQuery.$or = [
            { resourceUrl: { $exists: true, $ne: '' } },
            { resourceName: { $exists: true, $ne: '' } }
          ];
          break;
      }

      let courses = [];
      
      if (sectionType === 'quizzes') {
        // For quizzes, find courses that have quizzes
        const quizzesWithCourses = await Quiz.find({}).populate('course').limit(50).lean();
        const courseIds = [...new Set(quizzesWithCourses.map(q => q.course?._id?.toString()).filter(Boolean))];
        if (courseIds.length > 0) {
          courses = await Course.find({ _id: { $in: courseIds } })
            .populate('instructor', 'fullName email')
            .limit(50)
            .lean();
        }
      } else {
        // For other sections, query courses directly
        courses = await Course.find(courseQuery)
          .populate('instructor', 'fullName email')
          .populate('lessons')
          .limit(50)
          .lean();
      }

      const results = courses.map(c => {
        let route = `/courses?id=${c._id}&tab=${sectionType}`;
        let snippet = `View ${sectionType} for this course`;
        
        // Add section-specific snippets
        switch (sectionType) {
          case 'curriculum':
            const lessonCount = c.lessons?.length || 0;
            snippet = lessonCount > 0 ? `${lessonCount} lesson(s) available` : 'Curriculum available';
            break;
          case 'instructor':
            const instructorName = c.instructor?.fullName || 'Instructor';
            snippet = `Taught by ${instructorName}`;
            break;
          case 'reviews':
            const reviewCount = c.reviews?.length || 0;
            snippet = reviewCount > 0 ? `${reviewCount} review(s) available` : 'Reviews available';
            break;
          case 'quizzes':
            snippet = 'Quizzes available for this course';
            break;
          case 'resources':
            snippet = c.resourceName || 'Resources available';
            break;
        }

        return {
          type: 'course-section',
          id: c._id,
          title: c.title,
          snippet,
          route,
          meta: {
            category: c.category || null,
            sectionType,
            courseId: c._id
          }
        };
      });

      return res.json({
        success: true,
        query: q,
        count: results.length,
        results,
        sectionType,
        message: results.length === 0 ? 'No Results Found' : null
      });
    }

    // Standard search for non-section keywords - search across all categories
    // Run queries in parallel for all sections
    const [courses, users, lessons, quizzes, coursesWithLessons, coursesWithInstructors, coursesWithReviews, coursesWithQuizzes, coursesWithResources] = await Promise.all([
      // Regular course search
      Course.find({ $or: [{ title: regex }, { description: regex }, { category: regex }] })
        .populate('instructor', 'fullName email')
        .limit(10).lean(),
      // User/instructor search
      User.find({ $or: [{ fullName: regex }, { email: regex }] }).limit(10).select('fullName email avatar role').lean(),
      // Lesson search (curriculum content)
      Lesson.find({ $or: [{ title: regex }, { description: regex }, { content: regex }] }).limit(10).lean(),
      // Quiz search
      Quiz.find({ title: regex }).limit(10).lean(),
      // Courses with curriculum (lessons)
      Course.find({ 'lessons.0': { $exists: true } })
        .populate('lessons')
        .populate('instructor', 'fullName email')
        .limit(5).lean(),
      // Courses with instructors
      Course.find({ instructor: { $exists: true } })
        .populate('instructor', 'fullName email')
        .limit(5).lean(),
      // Courses with reviews
      Course.find({ 'reviews.0': { $exists: true } })
        .populate('instructor', 'fullName email')
        .limit(5).lean(),
      // Courses with quizzes
      (async () => {
        const quizzesWithCourses = await Quiz.find({}).populate('course').limit(10).lean();
        const courseIds = [...new Set(quizzesWithCourses.map(q => q.course?._id?.toString()).filter(Boolean))];
        if (courseIds.length > 0) {
          return await Course.find({ _id: { $in: courseIds } })
            .populate('instructor', 'fullName email')
            .limit(5).lean();
        }
        return [];
      })(),
      // Courses with resources
      Course.find({
        $or: [
          { resourceUrl: { $exists: true, $ne: '' } },
          { resourceName: { $exists: true, $ne: '' } }
        ]
      })
        .populate('instructor', 'fullName email')
        .limit(5).lean()
    ]);

    // Organize results by category for context-aware display
    const categorizedResults = {
      courses: [],
      curriculum: [],
      instructors: [],
      reviews: [],
      quizzes: [],
      resources: [],
      users: [],
      lessons: []
    };

    // Regular courses
    courses.forEach(c => categorizedResults.courses.push({
      type: 'course',
      id: c._id,
      title: c.title,
      snippet: c.description ? (c.description.substring(0, 200) + (c.description.length > 200 ? '...' : '')) : '',
      route: `/subscription?courseId=${c._id}`,
      meta: { category: c.category || null }
    }));

    // Curriculum results (from lessons search and courses with lessons)
    lessons.forEach(l => {
      const courseId = l.course?.toString() || l.course;
      categorizedResults.curriculum.push({
        type: 'curriculum-item',
        id: l._id,
        title: l.title,
        snippet: l.description ? (l.description.substring(0, 150) + (l.description.length > 150 ? '...' : '')) : '',
        route: `/courses?id=${courseId}&tab=curriculum`,
        meta: { lessonId: l._id, courseId, sectionType: 'curriculum' }
      });
    });

    // Add courses with curriculum
    coursesWithLessons.forEach(c => {
      const lessonCount = c.lessons?.length || 0;
      if (lessonCount > 0 && !categorizedResults.curriculum.some(r => r.id === c._id.toString())) {
        categorizedResults.curriculum.push({
          type: 'course-section',
          id: c._id,
          title: c.title,
          snippet: `${lessonCount} lesson(s) in curriculum`,
          route: `/courses?id=${c._id}&tab=curriculum`,
          meta: { sectionType: 'curriculum', courseId: c._id }
        });
      }
    });

    // Instructor results
    const instructorUsers = users.filter(u => u.role === 'instructor');
    instructorUsers.forEach(u => {
      categorizedResults.instructors.push({
        type: 'instructor',
        id: u._id,
        title: u.fullName || u.email,
        snippet: u.email || 'Instructor profile',
        route: `/profile`,
        meta: { userId: u._id, role: u.role }
      });
    });

    // Add courses with instructors
    coursesWithInstructors.forEach(c => {
      const instructorName = c.instructor?.fullName || 'Instructor';
      if (!categorizedResults.instructors.some(r => r.meta?.courseId === c._id.toString())) {
        categorizedResults.instructors.push({
          type: 'course-section',
          id: c._id,
          title: c.title,
          snippet: `Taught by ${instructorName}`,
          route: `/courses?id=${c._id}&tab=instructor`,
          meta: { sectionType: 'instructor', courseId: c._id, instructorId: c.instructor?._id }
        });
      }
    });

    // Reviews results
    coursesWithReviews.forEach(c => {
      const reviewCount = c.reviews?.length || 0;
      if (reviewCount > 0) {
        categorizedResults.reviews.push({
          type: 'course-section',
          id: c._id,
          title: c.title,
          snippet: `${reviewCount} review(s) available`,
          route: `/courses?id=${c._id}&tab=reviews`,
          meta: { sectionType: 'reviews', courseId: c._id }
        });
      }
    });

    // Quizzes results
    quizzes.forEach(qz => {
      const courseId = qz.course?.toString() || qz.course;
      categorizedResults.quizzes.push({
        type: 'quiz-item',
        id: qz._id,
        title: qz.title,
        snippet: 'Quiz in course',
        route: `/courses?id=${courseId}&tab=quizzes`,
        meta: { quizId: qz._id, courseId, sectionType: 'quizzes' }
      });
    });

    // Add courses with quizzes
    coursesWithQuizzes.forEach(c => {
      if (!categorizedResults.quizzes.some(r => r.meta?.courseId === c._id.toString() && r.type === 'course-section')) {
        categorizedResults.quizzes.push({
          type: 'course-section',
          id: c._id,
          title: c.title,
          snippet: 'Quizzes available',
          route: `/courses?id=${c._id}&tab=quizzes`,
          meta: { sectionType: 'quizzes', courseId: c._id }
        });
      }
    });

    // Resources results
    coursesWithResources.forEach(c => {
      const resourceName = c.resourceName || 'Course resources';
      categorizedResults.resources.push({
        type: 'course-section',
        id: c._id,
        title: c.title,
        snippet: resourceName,
        route: `/courses?id=${c._id}&tab=resources`,
        meta: { sectionType: 'resources', courseId: c._id }
      });
    });

    // Regular users (non-instructors)
    users.filter(u => u.role !== 'instructor').forEach(u => {
      categorizedResults.users.push({
        type: 'user',
        id: u._id,
        title: u.fullName || u.email,
        snippet: u.email || '',
        route: `/profile`,
        meta: { userId: u._id, role: u.role }
      });
    });

    // Flatten results for backward compatibility, but also include categorized structure
    const flatResults = [
      ...categorizedResults.courses,
      ...categorizedResults.curriculum,
      ...categorizedResults.instructors,
      ...categorizedResults.reviews,
      ...categorizedResults.quizzes,
      ...categorizedResults.resources,
      ...categorizedResults.users
    ];

    return res.json({
      success: true,
      query: q,
      count: flatResults.length,
      results: flatResults,
      categorized: {
        courses: categorizedResults.courses,
        curriculum: categorizedResults.curriculum,
        instructors: categorizedResults.instructors,
        reviews: categorizedResults.reviews,
        quizzes: categorizedResults.quizzes,
        resources: categorizedResults.resources,
        users: categorizedResults.users
      },
      message: flatResults.length === 0 ? 'No Results Found' : null
    });
  } catch (err) {
    next(err);
  }
});

// Helper to escape regex special chars
const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/search - accepts long-form bodies for large/multi-sentence searches
router.post('/', async (req, res, next) => {
  try {
    const qRaw = (req.body && req.body.q) ? String(req.body.q).trim() : '';
    if (!qRaw) return res.status(400).json({ success: false, message: 'Query required', results: [] });

    // Check for section keywords
    const sectionType = detectSectionKeyword(qRaw);

    // Split into sentences and limit to 100 sentences
    const sentences = qRaw.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const limitedText = sentences.slice(0, 100).join(' ');

    // Tokenize and keep a safe number of tokens for regex
    const tokens = Array.from(new Set(limitedText.split(/[^A-Za-z0-9_]+/).map(t => t.toLowerCase()).filter(t => t && t.length >= 2))).slice(0, 200);

    if (tokens.length === 0) {
      return res.json({
        success: true,
        query: qRaw,
        count: 0,
        results: [],
        message: 'No Results Found'
      });
    }

    // If searching for a section keyword, search course metadata
    if (sectionType) {
      const courseQuery = {};
      
      switch (sectionType) {
        case 'curriculum':
          courseQuery['lessons.0'] = { $exists: true };
          break;
        case 'instructor':
          courseQuery['instructor'] = { $exists: true };
          break;
        case 'reviews':
          courseQuery['reviews.0'] = { $exists: true };
          break;
        case 'quizzes':
          break;
        case 'resources':
          courseQuery.$or = [
            { resourceUrl: { $exists: true, $ne: '' } },
            { resourceName: { $exists: true, $ne: '' } }
          ];
          break;
      }

      let courses = [];
      
      if (sectionType === 'quizzes') {
        const quizzesWithCourses = await Quiz.find({}).populate('course').limit(50).lean();
        const courseIds = [...new Set(quizzesWithCourses.map(q => q.course?._id?.toString()).filter(Boolean))];
        if (courseIds.length > 0) {
          courses = await Course.find({ _id: { $in: courseIds } })
            .populate('instructor', 'fullName email')
            .limit(50)
            .lean();
        }
      } else {
        courses = await Course.find(courseQuery)
          .populate('instructor', 'fullName email')
          .populate('lessons')
          .limit(50)
          .lean();
      }

      const results = courses.map(c => {
        let snippet = `View ${sectionType} for this course`;
        
        switch (sectionType) {
          case 'curriculum':
            const lessonCount = c.lessons?.length || 0;
            snippet = lessonCount > 0 ? `${lessonCount} lesson(s) available` : 'Curriculum available';
            break;
          case 'instructor':
            const instructorName = c.instructor?.fullName || 'Instructor';
            snippet = `Taught by ${instructorName}`;
            break;
          case 'reviews':
            const reviewCount = c.reviews?.length || 0;
            snippet = reviewCount > 0 ? `${reviewCount} review(s) available` : 'Reviews available';
            break;
          case 'quizzes':
            snippet = 'Quizzes available for this course';
            break;
          case 'resources':
            snippet = c.resourceName || 'Resources available';
            break;
        }

        return {
          type: 'course-section',
          id: c._id,
          title: c.title,
          snippet,
          route: `/courses?id=${c._id}&tab=${sectionType}`,
          meta: {
            category: c.category || null,
            sectionType,
            courseId: c._id
          }
        };
      });

      return res.json({
        success: true,
        query: qRaw,
        count: results.length,
        results,
        sectionType,
        message: results.length === 0 ? 'No Results Found' : null
      });
    }

    // Standard search for non-section keywords
    const tokenRegex = new RegExp(tokens.map(escapeRegex).join('|'), 'i');

    // Run queries in parallel with larger limits
    const [courses, users, lessons, quizzes] = await Promise.all([
      Course.find({ $or: [{ title: tokenRegex }, { description: tokenRegex }, { category: tokenRegex }] }).limit(50).lean(),
      User.find({ $or: [{ fullName: tokenRegex }, { email: tokenRegex }] }).limit(50).select('fullName email avatar role').lean(),
      Lesson.find({ $or: [{ title: tokenRegex }, { description: tokenRegex }, { content: tokenRegex }] }).limit(50).lean(),
      Quiz.find({ title: tokenRegex }).limit(50).lean(),
    ]);

    const results = [];

    courses.forEach(c => results.push({
      type: 'course',
      id: c._id,
      title: c.title,
      snippet: c.description ? (c.description.substring(0, 200) + (c.description.length > 200 ? '...' : '')) : '',
      route: `/subscription?courseId=${c._id}`,
      meta: { category: c.category || null }
    }));

    users.forEach(u => results.push({
      type: 'user',
      id: u._id,
      title: u.fullName || u.email,
      snippet: u.email || '',
      route: `/profile`,
      meta: { userId: u._id, role: u.role }
    }));

    lessons.forEach(l => results.push({
      type: 'lesson',
      id: l._id,
      title: l.title,
      snippet: l.description ? (l.description.substring(0, 200) + (l.description.length > 200 ? '...' : '')) : '',
      route: `/student/courses/${l.course}`,
      meta: { lessonId: l._id, courseId: l.course }
    }));

    quizzes.forEach(qz => results.push({
      type: 'quiz',
      id: qz._id,
      title: qz.title,
      snippet: '',
      route: `/student/courses/${qz.course}`,
      meta: { quizId: qz._id, courseId: qz.course }
    }));

    // For POST requests, return the same categorized structure as GET
    // Organize results by category (similar to GET endpoint)
    const categorizedResults = {
      courses: [],
      curriculum: [],
      instructors: [],
      reviews: [],
      quizzes: [],
      resources: [],
      users: []
    };

    // Categorize results
    results.forEach(r => {
      if (r.type === 'course') {
        categorizedResults.courses.push(r);
      } else if (r.type === 'curriculum-item' || (r.type === 'course-section' && r.meta?.sectionType === 'curriculum')) {
        categorizedResults.curriculum.push(r);
      } else if (r.type === 'instructor' || (r.type === 'course-section' && r.meta?.sectionType === 'instructor')) {
        categorizedResults.instructors.push(r);
      } else if (r.type === 'course-section' && r.meta?.sectionType === 'reviews') {
        categorizedResults.reviews.push(r);
      } else if (r.type === 'quiz-item' || (r.type === 'course-section' && r.meta?.sectionType === 'quizzes')) {
        categorizedResults.quizzes.push(r);
      } else if (r.type === 'course-section' && r.meta?.sectionType === 'resources') {
        categorizedResults.resources.push(r);
      } else if (r.type === 'user') {
        categorizedResults.users.push(r);
      }
    });

    return res.json({
      success: true,
      query: qRaw,
      count: results.length,
      results,
      categorized: categorizedResults,
      message: results.length === 0 ? 'No Results Found' : null
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/courses?q=keyword - Course-specific search endpoint
router.get('/courses', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, message: 'Query required', results: [] });

    // Escape regex special chars to avoid injection
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');

    // Search courses with partial matching on title, description, and category
    const courses = await Course.find({
      $or: [
        { title: regex },
        { description: regex },
        { category: regex }
      ]
    })
    .select('title description category thumbnail price level')
    .limit(50)
    .lean();

    const results = courses.map(c => ({
      type: 'course',
      id: c._id,
      title: c.title,
      snippet: c.description ? (c.description.substring(0, 200) + (c.description.length > 200 ? '...' : '')) : '',
      route: `/subscription?courseId=${c._id}`,
      meta: {
        category: c.category || null,
        price: c.price || 0,
        level: c.level || null,
        thumbnail: c.thumbnail || null
      }
    }));

    return res.json({
      success: true,
      query: q,
      count: results.length,
      results,
      message: results.length === 0 ? 'Course Not Available' : null
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/search/courses - Course-specific search with long-form queries
router.post('/courses', async (req, res, next) => {
  try {
    const qRaw = (req.body && req.body.q) ? String(req.body.q).trim() : '';
    if (!qRaw) return res.status(400).json({ success: false, message: 'Query required', results: [] });

    // Tokenize the query for better matching
    const tokens = Array.from(new Set(qRaw.split(/[^A-Za-z0-9_]+/).map(t => t.toLowerCase()).filter(t => t && t.length >= 2))).slice(0, 200);

    if (tokens.length === 0) {
      return res.json({
        success: true,
        query: qRaw,
        count: 0,
        results: [],
        message: 'Course Not Available'
      });
    }

    const tokenRegex = new RegExp(tokens.map(escapeRegex).join('|'), 'i');

    // Search courses with token matching
    const courses = await Course.find({
      $or: [
        { title: tokenRegex },
        { description: tokenRegex },
        { category: tokenRegex }
      ]
    })
    .select('title description category thumbnail price level')
    .limit(50)
    .lean();

    const results = courses.map(c => ({
      type: 'course',
      id: c._id,
      title: c.title,
      snippet: c.description ? (c.description.substring(0, 200) + (c.description.length > 200 ? '...' : '')) : '',
      route: `/subscription?courseId=${c._id}`,
      meta: {
        category: c.category || null,
        price: c.price || 0,
        level: c.level || null,
        thumbnail: c.thumbnail || null
      }
    }));

    return res.json({
      success: true,
      query: qRaw,
      count: results.length,
      results,
      message: results.length === 0 ? 'Course Not Available' : null
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
