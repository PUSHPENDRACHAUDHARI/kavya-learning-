// Shared event utilities for Schedule and Dashboard
export const getStudentsText = (evt) => {
  try {
    if (!evt) return '0 students';
    if (Array.isArray(evt.enrolledStudents) && evt.enrolledStudents.length > 0) return `${evt.enrolledStudents.length} students`;
    if (typeof evt.enrolledStudents === 'number' && evt.enrolledStudents > 0) return `${evt.enrolledStudents} students`;
    if (typeof evt.maxStudents === 'number' && evt.maxStudents >= 0) return `${evt.maxStudents} students`;
    if (evt.maxStudents) return `${evt.maxStudents} students`;
    if (typeof evt.students === 'string') return evt.students;
    return '0 students';
  } catch (err) { return '0 students'; }
};

export const getInstructorName = (evt) => {
  try {
    if (!evt) return 'TBD';
    if (evt.instructorName) return evt.instructorName;
    if (typeof evt.instructor === 'string' && evt.instructor.trim()) return evt.instructor;
    if (evt.instructor && (evt.instructor.fullName || evt.instructor.name || evt.instructor.email)) return (evt.instructor.fullName || evt.instructor.name || evt.instructor.email);
    if (evt.createdByUser && (evt.createdByUser.fullName || evt.createdByUser.name || evt.createdByUser.email)) return (evt.createdByUser.fullName || evt.createdByUser.name || evt.createdByUser.email);
    if (evt.createdByUserId && typeof evt.createdByUserId === 'object' && (evt.createdByUserId.fullName || evt.createdByUserId.name || evt.createdByUserId.email)) return (evt.createdByUserId.fullName || evt.createdByUserId.name || evt.createdByUserId.email);
    if (evt.createdByUserName) return evt.createdByUserName;
    if (evt.createdByName) return evt.createdByName;
    return 'TBD';
  } catch (err) { return 'TBD'; }
};

const parseDateSafe = (v) => {
  try {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d;
  } catch (e) { return null; }
};

// Returns list of upcoming events using the same logic the Schedule page uses.
// - events: array from api.getEvents()
// - userProfile: object with _id and role
// - userRole: fallback role string
export function getUpcomingFromApi(events, userProfile, userRole = 'student') {
  if (!Array.isArray(events)) return [];
  const nowMidnight = new Date();
  nowMidnight.setHours(0,0,0,0);

  const mapped = events.filter(e => {
    try {
      const d = e.date ? parseDateSafe(e.date) : null;
      if (!d || isNaN(d)) return false;
      return d >= nowMidnight || (userRole === 'admin');
    } catch (err) { return false; }
  }).map(e => ({
    title: e.title,
    instructor: getInstructorName(e),
    instructorId: e.instructor && (e.instructor._id || e.instructor) ? (e.instructor._id || e.instructor).toString() : null,
    createdByUserId: e.createdByUserId && (e.createdByUserId._id || e.createdByUserId) ? (e.createdByUserId._id || e.createdByUserId).toString() : null,
    createdByRole: e.createdByRole || null,
    deletedByRole: e.deletedByRole || null,
    date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
    rawDate: e.date || null,
    time: `${e.startTime || 'TBD'} - ${e.endTime || 'TBD'}`,
    location: e.location || 'Online',
    students: getStudentsText(e),
    type: e.type || 'Live Class',
    status: e.status || 'Scheduled',
    meetLink: e.meetLink || null,
    course: e.course || null,
    courseId: e.course && (e.course._id || e.course) ? (e.course._id || e.course) : null,
    _id: e._id
  }));

  // Filter out soft-deleted events for non-admins
  const visible = mapped.filter(ev => {
    if (!ev.deletedByRole) return true;
    if (ev.deletedByRole === 'instructor') return (userRole === 'admin' || userRole === 'sub-admin');
    return false;
  });

  // Sort by date ascending
  visible.sort((a,b) => {
    try {
      const da = parseDateSafe(a.rawDate || a.date);
      const db = parseDateSafe(b.rawDate || b.date);
      if (!da || !db) return 0;
      return da - db;
    } catch (e) { return 0; }
  });

  return visible;
}

export default { getStudentsText, getInstructorName, getUpcomingFromApi };
