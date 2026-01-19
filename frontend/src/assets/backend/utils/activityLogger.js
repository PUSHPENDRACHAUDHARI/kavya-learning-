const ActivityLog = require('../models/activityLogModel');

/**
 * Helper to create an activity log entry.
 * This keeps activity logging consistent across controllers.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.userId - ID of the user performing the action
 * @param {string} params.action - Short action label, e.g. "Course Enrolled"
 * @param {string} [params.targetType] - Domain type, e.g. "Course", "Quiz", "Certificate"
 * @param {string|ObjectId} [params.targetId] - Related entity ID
 * @param {Object} [params.details] - Arbitrary additional metadata
 */
async function logActivity({ userId, action, targetType, targetId, details }) {
  try {
    await ActivityLog.create({
      action,
      performedBy: userId,
      targetType,
      targetId,
      details,
    });
  } catch (err) {
    // Do not break main request flow if logging fails
    console.error('Failed to log activity', err);
  }
}

module.exports = {
  logActivity,
};


