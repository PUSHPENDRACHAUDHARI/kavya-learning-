import { useState, useMemo, useEffect, useRef } from "react";
import { io as ioClient } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { Calendar, Bell } from "lucide-react";
import "../assets/schedule.css";
import AppLayout from "../components/AppLayout";
import axiosClient from '../api/axiosClient';

// Date helpers: parse YYYY-MM-DD as local date (avoid UTC parsing that can shift day)
const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  try {
    const s = (dateStr || '').toString().trim();
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const year = parseInt(m[1], 10);
      const monthIndex = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const dt = new Date(year, monthIndex, day, 0, 0, 0, 0);
      return isNaN(dt) ? null : dt;
    }
    // Fallback: try Date constructor
    const d = new Date(dateStr);
    return isNaN(d) ? null : d;
  } catch (e) { return null; }
};

const toLocalDateForCompare = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return parseDateOnly(dateVal);
  try { const d = new Date(dateVal); return isNaN(d) ? null : d; } catch (e) { return null; }
};

const formatLocalYYYYMMDD = (dateVal) => {
  const d = (dateVal && dateVal instanceof Date) ? dateVal : parseDateOnly(dateVal);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Time helpers: convert between 24-hour input (HH:MM) and 12-hour display (h:MM AM/PM)
const to12HourString = (time24) => {
  if (!time24) return '';
  const m = String(time24).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  let hh = parseInt(m[1], 10);
  const mm = String(m[2]).padStart(2, '0');
  const period = hh >= 12 ? 'PM' : 'AM';
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${mm} ${period}`;
};

const normalizeStoredTimeToInput = (stored) => {
  // stored may be "13:30" or "1:30 PM" or other forms; return 24-hour HH:MM and period
  if (!stored) return { time24: '', period: 'AM' };
  const s = String(stored).trim();
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return { time24: '', period: 'AM' };
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const mer = m[3] ? m[3].toUpperCase() : null;
  if (mer) {
    if (mer === 'AM' && hh === 12) hh = 0;
    else if (mer === 'PM' && hh !== 12) hh += 12;
  }
  if (isNaN(hh)) return { time24: '', period: 'AM' };
  const time24 = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const period = hh >= 12 ? 'PM' : 'AM';
  return { time24, period };
};
 
// Helper available to modal and other early code: prefer enrolledStudents, then maxStudents
const getStudentsText = (evt) => {
  try {
    if (!evt) return '0 students';
    // Prefer enrolledStudents only when there are enrolled students (>0).
    if (Array.isArray(evt.enrolledStudents) && evt.enrolledStudents.length > 0) return `${evt.enrolledStudents.length} students`;
    if (typeof evt.enrolledStudents === 'number' && evt.enrolledStudents > 0) return `${evt.enrolledStudents} students`;
    // Fall back to maxStudents when no enrolled students exist
    if (typeof evt.maxStudents === 'number' && evt.maxStudents >= 0) return `${evt.maxStudents} students`;
    if (evt.maxStudents) return `${evt.maxStudents} students`;
    if (typeof evt.students === 'string') return evt.students;
    return '0 students';
  } catch (err) {
    return '0 students';
  }
};

// Normalize instructor display name from different event shapes
const getInstructorName = (evt) => {
  try {
    if (!evt) return 'TBD';
    // prefer free-text instructorName saved on event
    if (evt.instructorName) return evt.instructorName;
    // if instructor is a string (free text) use it
    if (typeof evt.instructor === 'string' && evt.instructor.trim()) return evt.instructor;
    // if instructor is populated object use fullName/name/email
    if (evt.instructor && (evt.instructor.fullName || evt.instructor.name || evt.instructor.email)) return (evt.instructor.fullName || evt.instructor.name || evt.instructor.email);
    // if createdByUser info is available as object, use that
    if (evt.createdByUser && (evt.createdByUser.fullName || evt.createdByUser.name || evt.createdByUser.email)) return (evt.createdByUser.fullName || evt.createdByUser.name || evt.createdByUser.email);
    // sometimes createdByUserId is populated as object
    if (evt.createdByUserId && typeof evt.createdByUserId === 'object' && (evt.createdByUserId.fullName || evt.createdByUserId.name || evt.createdByUserId.email)) return (evt.createdByUserId.fullName || evt.createdByUserId.name || evt.createdByUserId.email);
    // last resort: createdByUserName or createdByName string if present
    if (evt.createdByUserName) return evt.createdByUserName;
    if (evt.createdByName) return evt.createdByName;
    return 'TBD';
  } catch (err) { return 'TBD'; }
}

function AddEventModal({ isOpen, onClose, onAdd, userRole, presetDate, eventToEdit }) {
  const [form, setForm] = useState({
    title: "",
      instructor: "", // This line remains unchanged
    instructorName: "",
    course: "",
    type: "Live Class",
    date: "",
    startTime: "",
    startPeriod: "AM",
    endTime: "",
    endPeriod: "AM",
    location: "",
    maxStudents: 100,
    meetLink: "",
  });
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState(null);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [instructorsError, setInstructorsError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [showInstructorDropdown, setShowInstructorDropdown] = useState(false);

  // Filter instructors based on search
  const filteredInstructors = instructors.filter(instr => {
    const searchLower = instructorSearch.toLowerCase();
    const fullName = (instr.fullName || instr.name || "").toLowerCase();
    const email = (instr.email || "").toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  useEffect(() => {
    // If editing, populate form with event data
    if (eventToEdit && isOpen) {
      const formattedDate = eventToEdit.date ? formatLocalYYYYMMDD(eventToEdit.date) : '';
      const startNorm = normalizeStoredTimeToInput(eventToEdit.startTime);
      const endNorm = normalizeStoredTimeToInput(eventToEdit.endTime);
      // Coerce instructor/course to id strings when populated objects are returned
      const isObjectIdLike = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
      let instrVal = '';
      let instrNameFromInstructor = '';
      if (eventToEdit.instructor) {
        if (typeof eventToEdit.instructor === 'object' && (eventToEdit.instructor._id || eventToEdit.instructor)) {
          instrVal = eventToEdit.instructor._id || eventToEdit.instructor;
        } else if (typeof eventToEdit.instructor === 'string') {
          // If it's a 24-char hex string treat as ObjectId, otherwise it's a free-text name
          if (isObjectIdLike(eventToEdit.instructor)) instrVal = eventToEdit.instructor;
          else instrNameFromInstructor = eventToEdit.instructor;
        }
      }
      const courseVal = eventToEdit.course && (eventToEdit.course._id || eventToEdit.course)
        ? (eventToEdit.course._id || eventToEdit.course)
        : '';
      // Determine a display name for the instructor search input
      const instrDisplay = eventToEdit.instructorName || instrNameFromInstructor || (eventToEdit.instructor && (eventToEdit.instructor.fullName || eventToEdit.instructor.name || eventToEdit.instructor.email)) || '';
      setForm({
        title: eventToEdit.title || "",
        instructor: instrVal,
        instructorName: eventToEdit.instructorName || instrNameFromInstructor || "",
        course: courseVal,
        type: eventToEdit.type || "Live Class",
        date: formattedDate,
        startTime: startNorm.time24 || "",
        startPeriod: startNorm.period || "AM",
        endTime: endNorm.time24 || "",
        endPeriod: endNorm.period || "AM",
        location: eventToEdit.location || "",
        maxStudents: 100,
        meetLink: eventToEdit.meetLink || "",
      });
      setInstructorSearch(instrDisplay);
    } else if (presetDate && isOpen) {
      // presetDate may be a Date or a date-string; build YYYY-MM-DD from local components
      const pd = parseDateOnly(presetDate);
      if (pd) {
        const iso = `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}-${String(pd.getDate()).padStart(2,'0')}`;
        setForm((f) => ({ ...f, date: iso }));
      }
      setInstructorSearch("");
    }
    // Fetch instructors when modal opens
    (async () => {
      if (!isOpen) return;
      setLoadingInstructors(true);
      try {
        const api = await import('../api');
        const res = await api.getInstructors();
        if (Array.isArray(res)) setInstructors(res);
        setInstructorsError(null);
      } catch (err) {
        console.warn('Failed to load instructors', err.message || err);
        setInstructorsError('Unable to load instructors');
      } finally {
        setLoadingInstructors(false);
      }
      // Fetch instructor's courses when modal opens (instructor role)
        // load courses: try general courses endpoint first (admins), fallback to instructor-specific
        (async () => {
          try {
            const res = await axiosClient.get('/api/courses');
            setCourses(res.data.courses || []);
          } catch (err) {
            try {
              const res2 = await axiosClient.get('/api/instructor/courses');
              setCourses(res2.data.courses || []);
            } catch (err2) {
              setCourses([]);
            }
          }
        })();
    })();
  }, [presetDate, isOpen, eventToEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    // client-side validation
    if (userRole === 'student' || userRole === 'parent') {
      if (!form.title || !form.instructor || !form.date || !form.startTime || !form.endTime) {
        alert('Please fill in title, instructor, date, start time, and end time.');
        return;
      }
    } else {
      if (!form.title || !form.date || !form.startTime || !form.endTime) {
        alert('Please fill in title, date, start time, and end time.');
        return;
      }
    }

    // Prevent past dates (client-side) — parse date as local YYYY-MM-DD
    const parseDateOnly = (dateStr) => {
      if (!dateStr) return null;
      const m = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!m) return null;
      const year = parseInt(m[1], 10);
      const monthIndex = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const dt = new Date(year, monthIndex, day, 0, 0, 0, 0);
      return isNaN(dt) ? null : dt;
    };

    const selected = parseDateOnly(form.date);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (!selected || selected < today) {
      setFormError('Cannot create events for past dates');
      return;
    }

    // Build start and end datetimes from date + time + AM/PM using local construction
    const buildDateTime = (dateStr, timeStr, period) => {
      if (!dateStr || !timeStr) return null;
      const mTime = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!mTime) return null;
      let hh = parseInt(mTime[1], 10);
      const mm = parseInt(mTime[2], 10);
      if (isNaN(hh) || isNaN(mm)) return null;
      if (period && (period === 'AM' || period === 'PM')) {
        if (hh === 12 && period === 'AM') hh = 0;
        else if (period === 'PM' && hh !== 12) hh += 12;
      }
      const mDate = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!mDate) return null;
      const year = parseInt(mDate[1], 10);
      const monthIndex = parseInt(mDate[2], 10) - 1;
      const day = parseInt(mDate[3], 10);
      const dt = new Date(year, monthIndex, day, hh, mm, 0, 0);
      return isNaN(dt) ? null : dt;
    };

    const startDateTime = buildDateTime(form.date, form.startTime, form.startPeriod);
    const endDateTime = buildDateTime(form.date, form.endTime, form.endPeriod);
    if (!startDateTime || !endDateTime) {
      setFormError('Please provide valid start and end times in HH:mm format');
      return;
    }
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      setFormError('End time must be later than start time');
      return;
    }

    // Normalize times: convert 24-hour input values to 12-hour strings for storage/display
    const startTimeString = to12HourString(form.startTime) || (form.startTime && `${form.startTime}`) || '';
    const endTimeString = to12HourString(form.endTime) || (form.endTime && `${form.endTime}`) || '';
    const timeRange = `${startTimeString} - ${endTimeString}`;
    const newEvent = userRole === 'student' ? {
      title: form.title,
      instructor: form.instructorName || form.instructor,
      type: form.type,
      date: form.date,
      startTime: startTimeString,
      endTime: endTimeString
    } : {
      title: form.title,
      instructor: form.instructorName || form.instructor || null,
      course: form.course || null,
      type: form.type,
      date: form.date,
      startTime: startTimeString,
      endTime: endTimeString,
      location: form.location || '',
      maxStudents: form.maxStudents || 30,
      meetLink: form.meetLink || null,
    };
    // If admin provided a free-text instructorName prefer that
    if ((userRole === 'admin' || userRole === 'sub-admin') && form.instructorName) {
      newEvent.instructorName = form.instructorName;
    } else if (form.instructor) {
      newEvent.instructor = form.instructor;
    }
 
    // Try to save to backend; fall back to local update on failure
    (async () => {
      try {
        const api = await import("../api");
        let res;
        
        // If editing, use PUT request; otherwise use POST
        if (eventToEdit && eventToEdit._id) {
          // Update existing event
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/events/${eventToEdit._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : undefined,
            },
            body: JSON.stringify(newEvent),
          });
          res = await response.json();
        } else {
          // Create new event
          res = await api.createEvent(newEvent);
        }
        
        // Success when server returns created event with _id
        if (res && res._id) {
          // If the creator is an instructor or admin, also create a shared event
          (async () => {
            try {
              const role = userRole;
              if (role !== 'student' && role !== 'parent') {
                try {
                  await axiosClient.post('/api/shared-events', {
                    title: res.title,
                    instructor: res.instructorName || (res.instructor && (res.instructor._id || res.instructor)) || form.instructorName || form.instructor || null,
                    course: res.course || form.course || null,
                    date: res.date || form.date,
                    startTime: res.startTime || (newEvent.startTime || startTimeString),
                    endTime: res.endTime || (newEvent.endTime || endTimeString),
                    location: res.location || form.location || 'Online',
                    maxStudents: res.maxStudents || form.maxStudents || 0,
                    meetLink: res.meetLink || form.meetLink || null,
                  });
                } catch (e) {
                  // ignore shared event creation failures
                  console.warn('Failed to create shared event', e && e.message ? e.message : e);
                }
              }
            } catch (err) {
              // no-op
            }
          })();

          onAdd({
            title: res.title,
             instructor: res.instructorName || (res.instructor && (res.instructor.fullName || res.instructor.email)) || form.instructorName || form.instructor || null,
            createdByUserId: res.createdByUserId && (res.createdByUserId._id || res.createdByUserId) ? (res.createdByUserId._id || res.createdByUserId).toString() : null,
            createdByRole: res.createdByRole || null,
            date: res.date ? new Date(res.date).toLocaleDateString() : form.date,
            time: `${res.startTime || newEvent.startTime || startTimeString} - ${res.endTime || newEvent.endTime || endTimeString}`,
            location: res.location || (form.location || 'Online'),
            students: getStudentsText(res),
            type: res.type || form.type,
            status: res.status || 'Scheduled',
            meetLink: res.meetLink || form.meetLink || null,
            _id: res._id
          });
        } else if (res && (res.message || res.error)) {
          // Server-side validation error or other rejection - show to user and do not save locally
          setFormError(res.message || res.error || (eventToEdit ? 'Failed to update event' : 'Failed to create event'));
          return;
        } else {
          // Unknown server response - for instructors/admins try saving to backend SharedEvent
          if (userRole !== 'student' && userRole !== 'parent') {
            try {
              const rShared = await axiosClient.post('/api/shared-events', {
                title: newEvent.title,
                instructor: newEvent.instructorName || newEvent.instructor || form.instructorName || form.instructor || null,
                course: newEvent.course || form.course || null,
                date: newEvent.date || form.date,
                startTime: newEvent.startTime || startTimeString,
                endTime: newEvent.endTime || endTimeString,
                location: newEvent.location || form.location || 'Online',
                maxStudents: newEvent.maxStudents || form.maxStudents || 0,
                meetLink: newEvent.meetLink || form.meetLink || null,
              });
              const shared = rShared && (rShared.data && (rShared.data.data || rShared.data)) ? (rShared.data.data || rShared.data) : (rShared.data || rShared);
              if (shared) {
                onAdd({
                  title: shared.title || newEvent.title,
                  instructor: shared.instructor || form.instructor,
                  createdByUserId: shared.createdByUserId && (shared.createdByUserId._id || shared.createdByUserId) ? (shared.createdByUserId._id || shared.createdByUserId).toString() : null,
                  createdByRole: shared.createdByRole || null,
                  date: shared.date ? new Date(shared.date).toLocaleDateString() : (newEvent.date || form.date),
                  time: `${shared.startTime || newEvent.startTime || startTimeString} - ${shared.endTime || newEvent.endTime || endTimeString}`,
                  location: shared.location || newEvent.location || form.location || 'Online',
                  students: getStudentsText(shared),
                  type: shared.type || newEvent.type || form.type,
                  status: shared.status || 'Scheduled',
                  meetLink: shared.meetLink || newEvent.meetLink || form.meetLink || null,
                  _id: shared._id || shared._id
                });
                onClose();
                return;
              }
            } catch (e) {
              setFormError('Failed to persist event to server. Please try again.');
              return;
            }
          }
          // Fallback for students/parents or if shared-event creation not attempted: save locally
          const computeLocalExpiry = (dateStr, timeStr) => {
            try {
              if (!dateStr) return null;
              const base = parseDateOnly(dateStr);
              if (!base) return null;
              const parts = (timeStr || '').split('-').map(p => p.trim());
              const endPart = parts[1] || parts[0] || '';
              const m = endPart.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
              let hh = 23, mm = 59;
              if (m) {
                hh = parseInt(m[1], 10);
                mm = m[2] ? parseInt(m[2], 10) : 0;
                const mer = (m[3] || '').toUpperCase();
                if (mer === 'PM' && hh !== 12) hh += 12;
                if (mer === 'AM' && hh === 12) hh = 0;
              }
              base.setHours(hh, mm, 0, 0);
              return base.toISOString();
            } catch (err) {
              return null;
            }
          };

          onAdd({
            title: newEvent.title,
            instructor: newEvent.instructor,
            date: newEvent.date,
            time: timeRange,
            location: newEvent.location,
            students: `${newEvent.maxStudents || 30} students`,
            type: newEvent.type,
            status: 'Scheduled',
            _local: true,
            localExpiresAt: computeLocalExpiry(newEvent.date, timeRange)
          });
        }
      } catch (err) {
          console.warn('API create event failed, falling back to local state', err.message || err);
          // On network error, for instructors/admins attempt to save as SharedEvent instead of local
          if (userRole !== 'student' && userRole !== 'parent') {
            try {
              const rShared = await axiosClient.post('/api/shared-events', {
                title: newEvent.title,
                instructor: newEvent.instructor || form.instructor || null,
                course: newEvent.course || form.course || null,
                date: newEvent.date || form.date,
                startTime: newEvent.startTime || startTimeString,
                endTime: newEvent.endTime || endTimeString,
                location: newEvent.location || form.location || 'Online',
                maxStudents: newEvent.maxStudents || form.maxStudents || 0,
                meetLink: newEvent.meetLink || form.meetLink || null,
              });
              const shared = rShared && (rShared.data && (rShared.data.data || rShared.data)) ? (rShared.data.data || rShared.data) : (rShared.data || rShared);
              if (shared) {
                onAdd({
                  title: shared.title || newEvent.title,
                  instructor: shared.instructor || form.instructor,
                  createdByUserId: shared.createdByUserId && (shared.createdByUserId._id || shared.createdByUserId) ? (shared.createdByUserId._id || shared.createdByUserId).toString() : null,
                  createdByRole: shared.createdByRole || null,
                  date: shared.date ? new Date(shared.date).toLocaleDateString() : (newEvent.date || form.date),
                  time: `${shared.startTime || newEvent.startTime || startTimeString} - ${shared.endTime || newEvent.endTime || endTimeString}`,
                  location: shared.location || newEvent.location || form.location || 'Online',
                  students: getStudentsText(shared),
                  type: shared.type || newEvent.type || form.type,
                  status: shared.status || 'Scheduled',
                  meetLink: shared.meetLink || newEvent.meetLink || form.meetLink || null,
                  _id: shared._id || shared._id
                });
                onClose();
                return;
              }
            } catch (e) {
              setFormError('Failed to persist event to server. Please try again.');
              return;
            }
          }
          // On network error, also persist as local event with expiry (students/parents)
        const computeLocalExpiry = (dateStr, timeStr) => {
          try {
            if (!dateStr) return null;
            const base = parseDateOnly(dateStr);
            if (!base) return null;
            const parts = (timeStr || '').split('-').map(p => p.trim());
            const endPart = parts[1] || parts[0] || '';
            const m = endPart.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
            let hh = 23, mm = 59;
            if (m) {
              hh = parseInt(m[1], 10);
              mm = m[2] ? parseInt(m[2], 10) : 0;
              const mer = (m[3] || '').toUpperCase();
              if (mer === 'PM' && hh !== 12) hh += 12;
              if (mer === 'AM' && hh === 12) hh = 0;
            }
            base.setHours(hh, mm, 0, 0);
            return base.toISOString();
          } catch (err) {
            return null;
          }
        };

        onAdd({
          title: newEvent.title,
          instructor: newEvent.instructor,
          date: newEvent.date,
          time: timeRange,
          location: newEvent.location,
          students: `${newEvent.maxStudents} students`,
          type: newEvent.type,
          _local: true,
          localExpiresAt: computeLocalExpiry(newEvent.date, timeRange)
        });
      }
      onClose();
    })();
  }
 
  if (!isOpen) return null;
 
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 style={{ marginBottom: 0 }}>{eventToEdit ? 'Edit Event' : 'Add New Event'}</h5>
          <button className="btn btn-light btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
 
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="alert alert-danger mb-3" role="alert">
              {formError}
            </div>
          )}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Event Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., Advanced Mathematics"
              />
            </div>
 
            <div className="col-md-6">
              <label className="form-label">Instructor</label>
              <div className="position-relative">
                {/* For admins allow typing a free-text instructor name */}
                {(userRole === 'admin' || userRole === 'sub-admin') && (
                  <input
                    name="instructorName"
                    value={form.instructorName}
                    onChange={handleChange}
                    className="form-control mb-2"
                    placeholder="Type instructor name (optional)"
                  />
                )}
                <input
                  type="text"
                  value={instructorSearch}
                  onChange={(e) => {
                    setInstructorSearch(e.target.value);
                    setShowInstructorDropdown(true);
                  }}
                  onFocus={() => setShowInstructorDropdown(true)}
                  onBlur={() => setTimeout(() => setShowInstructorDropdown(false), 200)}
                  className="form-control"
                  placeholder="Search instructor by name or email..."
                  disabled={loadingInstructors}
                />
                {showInstructorDropdown && filteredInstructors.length > 0 && (
                  <div className="dropdown-menu" style={{
                    display: 'block',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginTop: '2px'
                  }}>
                    {filteredInstructors.map(instr => (
                      <button
                        key={instr._id}
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setForm(prev => ({ ...prev, instructor: instr._id }));
                          setInstructorSearch(instr.fullName || instr.name || instr.email);
                          setShowInstructorDropdown(false);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div>
                          <strong>{instr.fullName || instr.name}</strong>
                          <br />
                          <small className="text-muted">{instr.email}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showInstructorDropdown && filteredInstructors.length === 0 && instructorSearch && (
                  <div className="dropdown-menu" style={{
                    display: 'block',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginTop: '2px'
                  }}>
                    <div className="dropdown-item text-muted">
                      No instructors found
                    </div>
                  </div>
                )}
              </div>
              {instructorsError && <small className="text-danger d-block mt-2">{instructorsError}</small>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Event Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="form-select"
              >
                <option>Live Class</option>
                <option>Workshop</option>
                <option>Lab Session</option>
                <option>Seminar</option>
              </select>
            </div>
 
            <div className="col-md-6">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="form-control"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Start Time</label>
              <div className="d-flex gap-2 align-items-end">
                <div style={{ flex: 1 }}>
                  <input
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <select
                  name="startPeriod"
                  value={form.startPeriod}
                  onChange={handleChange}
                  className="form-select"
                  style={{ flex: 0, minWidth: "80px" }}
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">End Time</label>
              <div className="d-flex gap-2 align-items-end">
                <div style={{ flex: 1 }}>
                  <input
                    type="time"
                    name="endTime"
                    value={form.endTime}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <select
                  name="endPeriod"
                  value={form.endPeriod}
                  onChange={handleChange}
                  className="form-select"
                  style={{ flex: 0, minWidth: "80px" }}
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
 
            {/* Only show these fields to instructors/admins (hide for student/parent) */}
            {!(userRole === 'student' || userRole === 'parent') && (
              <>
                <div className="col-md-6">
                  <label className="form-label">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g., Virtual Room 1"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Student Limit</label>
                  <div style={{
                    padding: '10px 12px',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6',
                    fontSize: '15px',
                    color: '#495057',
                    fontWeight: '500'
                  }}>
                    Maximum 100 students can join this meeting.
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Subject (Course)</label>
                  <select
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">-- Select course --</option>
                    {courses && courses.map(c => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                  {loadingCourses && <small className="text-muted">Loading courses...</small>}
                  {coursesError && <small className="text-danger d-block">{coursesError}</small>}
                </div>
                <div className="col-12">
                  <label className="form-label">Meet Link (for live class)</label>
                  <input
                    type="url"
                    name="meetLink"
                    value={form.meetLink}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g., https://meet.google.com/abc-defg-hij"
                  />
                </div>
              </>
            )}
          </div>
 
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-modal" disabled={loadingInstructors}>
              {eventToEdit ? 'Update Event' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
 
function Schedule() {
  // For privacy, start with no events shown — users see only their own events
  const [classes, setClasses] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [isSmallChatOpen, setIsSmallChatOpen] = useState(false);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || 'student');
  const [presetDate, setPresetDate] = useState(null);
  const [remindersSet, setRemindersSet] = useState(new Set());

  const reminderKey = (title, dateVal) => {
    try {
      const d = formatLocalYYYYMMDD(dateVal);
      return `${(title || '').trim()}@@${d || ''}`;
    } catch (e) { return `${(title || '').trim()}@@`; }
  };
  const location = useLocation();
  const [highlightEventTitle, setHighlightEventTitle] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userProfile, setUserProfile] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({ attended: 0, studyHours: 0, upcoming: 0 });
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  // Attendance modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceEditing, setAttendanceEditing] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState({});
  // Background-sync storage key for locally-created events
  const LOCAL_EVENTS_KEY = 'schedule_local_events_v1';

  const latestUpcomingFetchId = useRef(0);

  // Define weekStart early so it's available for effects
  const weekStart = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const start = new Date(date);
    start.setDate(date.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [currentDate]);

  // compute local expiry for locally-persisted events based on end time
  const computeLocalExpiry = (dateStr, timeStr) => {
    try {
      if (!dateStr) return null;
      const base = parseDateOnly(dateStr);
      if (!base) return null;
      const parts = (timeStr || '').split('-').map(p => p.trim());
      const endPart = parts[1] || parts[0] || '';
      const m = endPart.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      let hh = 23, mm = 59;
      if (m) {
        hh = parseInt(m[1], 10);
        mm = m[2] ? parseInt(m[2], 10) : 0;
        const mer = (m[3] || '').toUpperCase();
        if (mer === 'PM' && hh < 12) hh += 12;
        if (mer === 'AM' && hh === 12) hh = 0;
      }
      base.setHours(hh, mm, 0, 0);
      return base.toISOString();
    } catch (err) {
      return null;
    }
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString(); } catch (e) { return '-'; }
  };

  const downloadAttendancePdf = async () => {
    if (!attendanceEvent || !Array.isArray(attendanceList)) return;
    const sessionName = (attendanceEvent.title || 'session').replace(/[^a-z0-9\-\_ ]/gi, '').replace(/\s+/g, '_');
    const dateStr = formatLocalYYYYMMDD(attendanceEvent.date) || formatLocalYYYYMMDD(new Date());
    const filename = `attendance_${sessionName}_${dateStr}.pdf`;

    // Prepare rows
    const rows = attendanceList.map(s => ([
      s.name || s.email || s.studentId,
      (s.status || '').toString().charAt(0).toUpperCase() + (s.status || '').toString().slice(1),
      s.joinedAt ? formatDateTime(s.joinedAt) : '-',
      s.leftAt ? formatDateTime(s.leftAt) : '-',
    ]));

    // Session metadata lines
    const meta = [
      ['Attendance Report'],
      [`Session: ${attendanceEvent.title || ''}`],
      [`Date: ${attendanceEvent.date ? new Date(attendanceEvent.date).toLocaleDateString() : '-'}`],
      [`Time: ${attendanceEvent.startTime || '-'} - ${attendanceEvent.endTime || '-'}`],
      [`Instructor: ${getInstructorName(attendanceEvent)}`]
    ];

    try {
      const { jsPDF } = await import('jspdf');
      let doc = new jsPDF();

      // Try to use autoTable if available
      let autoTable = null;
      try {
        const at = await import('jspdf-autotable');
        autoTable = at.default || at;
      } catch (e) {
        autoTable = null;
      }

      // Title & metadata
      doc.setFontSize(16);
      doc.text('Attendance Report', 14, 20);
      doc.setFontSize(11);
      let y = 30;
      meta.slice(1).forEach(line => { doc.text(line[0], 14, y); y += 7; });

      // Counts summary
      const presentCount = attendanceList.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const absentCount = attendanceList.filter(a => (a.status || '').toLowerCase() === 'absent').length;
      doc.text(`Present: ${presentCount}    Absent: ${absentCount}    Total: ${attendanceList.length}`, 14, y + 4);

      // Table
      if (autoTable && doc.autoTable) {
        doc.autoTable({ head: [['Student Name', 'Status', 'Joined At', 'Left At']], body: rows, startY: y + 12, styles: { fontSize: 10 } });
      } else if (autoTable) {
        // some builds export plugin but not attached — call directly
        autoTable(doc, { head: [['Student Name', 'Status', 'Joined At', 'Left At']], body: rows, startY: y + 12, styles: { fontSize: 10 } });
      } else {
        // Fallback: render rows as plain text with spacing
        y += 18;
        doc.setFontSize(10);
        const colX = [14, 90, 140, 180];
        doc.text('Student Name', colX[0], y);
        doc.text('Status', colX[1], y);
        doc.text('Joined At', colX[2], y);
        doc.text('Left At', colX[3], y);
        y += 6;
        rows.forEach(r => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(String(r[0] || ''), colX[0], y);
          doc.text(String(r[1] || ''), colX[1], y);
          doc.text(String(r[2] || ''), colX[2], y);
          doc.text(String(r[3] || ''), colX[3], y);
          y += 6;
        });
      }

      doc.save(filename);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF. Please install `jspdf` and `jspdf-autotable` (optional) or try again.');
    }
  };

  // `getStudentsText` is defined above so the modal can call it early.
 
  // Do not load global events — users should only see their own events.
  // (Global loader removed for privacy; upcomingClasses and selectedDateEvents
  // are fetched per-user below.)
 
  // Fetch events for the selected date, but only include events related to the current user
  useEffect(() => {
    (async () => {
      const today = new Date();
      const dateStr = formatLocalYYYYMMDD(today);
      setSelectedDate(today);

      try {
        const api = await import("../api");
        const events = await api.getEventsByDate(dateStr);
        // Fetch shared events for the same date and merge them so events created by instructors/admins
        // are visible across browsers
        let shared = [];
        try {
          const s = await api.getSharedEvents(dateStr);
          if (Array.isArray(s)) shared = s;
        } catch (e) {
          console.warn('Failed to load shared events', e && e.message ? e.message : e);
        }
        if (Array.isArray(events) && userProfile && userProfile._id) {
          // Admins should see all events. Non-admins only see events where they are instructor or enrolled.
          const uid = userProfile._id;
          const isAdmin = (userProfile.role === 'admin' || userProfile.role === 'sub-admin' || userRole === 'admin' || userRole === 'sub-admin');
          const filtered = isAdmin ? events : events.filter(e => {
            const instr = e.instructor && (e.instructor._id || e.instructor) ? (e.instructor._id || e.instructor) : null;
            const enrolled = Array.isArray(e.enrolledStudents) ? e.enrolledStudents.map(x => x.toString()) : [];
            const createdByRole = e.createdByRole || (e.createdBy && e.createdBy.role) || null;
            // Students should see events they are enrolled in, events they teach, and events created by instructors/admins
            const publicByInstructorOrAdmin = createdByRole === 'instructor' || createdByRole === 'admin' || createdByRole === 'sub-admin';
            return publicByInstructorOrAdmin || (instr && instr.toString() === uid.toString()) || enrolled.includes(uid.toString());
          });

          // Merge backend events + shared events, de-duping by _id when available
          const backendTransformed = filtered.map((e) => ({
            time: e.startTime || 'TBD',
            title: e.title,
            instructor: getInstructorName(e),
            createdByUserId: e.createdByUserId && (e.createdByUserId._id || e.createdByUserId) ? (e.createdByUserId._id || e.createdByUserId).toString() : null,
            createdByRole: e.createdByRole || null,
            date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
            location: e.location || 'Online',
            students: getStudentsText(e),
            type: e.type || 'Live Class',
            status: e.status || 'Scheduled',
            meetLink: e.meetLink || null,
            _id: e._id
          }));

          const sharedTransformed = (shared || []).map(se => ({
            time: se.startTime || 'TBD',
            title: se.title,
            instructor: getInstructorName(se),
            createdByUserId: se.createdByUserId && (se.createdByUserId._id || se.createdByUserId) ? (se.createdByUserId._id || se.createdByUserId).toString() : null,
            createdByRole: se.createdByRole || null,
            date: se.date ? new Date(se.date).toLocaleDateString() : 'TBD',
            location: se.location || 'Online',
            students: getStudentsText(se),
            type: se.type || 'Live Class',
            status: se.status || 'Scheduled',
            meetLink: se.meetLink || null,
            _id: se._id
          }));

          // Combine and dedupe by _id
          const map = new Map();
          backendTransformed.forEach(it => { if (it._id) map.set(it._id.toString(), it); else map.set(JSON.stringify([it.title, it.date, it.time]), it); });
          sharedTransformed.forEach(it => { if (it._id) map.set(it._id.toString(), it); else map.set(JSON.stringify([it.title, it.date, it.time]), it); });

          const transformed = Array.from(map.values());
          setSelectedDateEvents(transformed);
        } else {
          // No user or no related events => empty
          setSelectedDateEvents([]);
        }
      } catch (err) {
        console.warn('Failed to fetch events for today', err.message || err);
        setSelectedDateEvents([]);
      }
    })();
  }, [userProfile]);

  // Load user profile (if logged in) and per-user weekly stats
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const profileRes = await fetch('/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData);
          if (profileData.role) setUserRole(profileData.role);

          // Load weekly stats from backend (preferred) with localStorage fallback
          try {
            const res = await fetch('/api/users/weekly-stats', {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              setWeeklyStats(data || { attended: 0, studyHours: 0, upcoming: 0 });
            } else {
              // Fallback to localStorage
              const key = `weeklyStats_${profileData._id}`;
              const raw = window.localStorage.getItem(key);
              if (raw) setWeeklyStats(JSON.parse(raw));
              else {
                const initial = { attended: 0, studyHours: 0, upcoming: 0 };
                setWeeklyStats(initial);
                window.localStorage.setItem(key, JSON.stringify(initial));
              }
            }
          } catch (e) {
            // On network error, fallback to localStorage
            try {
              const key = `weeklyStats_${profileData._id}`;
              const raw = window.localStorage.getItem(key);
              if (raw) setWeeklyStats(JSON.parse(raw));
              else setWeeklyStats({ attended: 0, studyHours: 0, upcoming: 0 });
            } catch (err) {
              setWeeklyStats({ attended: 0, studyHours: 0, upcoming: 0 });
            }
          }
        }
      } catch (err) {
        console.warn('Could not load profile for schedule', err.message || err);
      }
    })();
  }, []);

  // Helper: parse a time-range like "1:00 PM - 2:30 PM" into hours (float)
  function parseDuration(timeRange) {
    if (!timeRange) return 0;
    const parts = timeRange.split("-").map((p) => p.trim());
    if (parts.length < 2) return 0;
    const toMinutes = (t) => {
      if (!t) return 0;
      const [time, meridian] = t.split(' ');
      const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
      let hours = isNaN(hh) ? 0 : hh;
      const minutes = isNaN(mm) ? 0 : mm;
      if (meridian) {
        const m = meridian.toUpperCase();
        if (m === 'PM' && hours !== 12) hours += 12;
        if (m === 'AM' && hours === 12) hours = 0;
      }
      return hours * 60 + minutes;
    };
    const start = toMinutes(parts[0]);
    const end = toMinutes(parts[1]);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return (end - start) / 60;
  }

  // Helper: parse a single time like "1:30 PM" into {hours, minutes}
  function parseTimePart(t) {
    if (!t) return null;
    const parts = t.trim().split(' ');
    const time = parts[0];
    const meridian = parts[1] ? parts[1].toUpperCase() : null;
    const [hhStr, mmStr] = time.split(':');
    let hh = parseInt(hhStr, 10);
    const mm = mmStr ? parseInt(mmStr, 10) : 0;
    if (isNaN(hh) || isNaN(mm)) return null;
    if (meridian) {
      if (meridian === 'PM' && hh !== 12) hh += 12;
      if (meridian === 'AM' && hh === 12) hh = 0;
    }
    return { hh, mm };
  }

  // Helper: build start/end Date objects for an event using `time` (range) or `startTime`/`endTime`.
  function getEventStartEnd(event) {
    try {
      if (!event || !event.date) return { start: null, end: null };
      const base = new Date(event.date);
      if (isNaN(base)) return { start: null, end: null };

      // Prefer explicit startTime / endTime fields if present
      if (event.startTime || event.endTime) {
        const sPart = parseTimePart(event.startTime || '');
        const ePart = parseTimePart(event.endTime || '');
        const start = sPart ? new Date(base) : null;
        const end = ePart ? new Date(base) : null;
        if (start) start.setHours(sPart.hh, sPart.mm, 0, 0);
        if (end) end.setHours(ePart.hh, ePart.mm, 0, 0);
        return { start, end };
      }

      // Fallback to `time` string like "1:00 PM - 2:30 PM"
      if (event.time && typeof event.time === 'string') {
        const parts = event.time.split('-').map(p => p.trim());
        const sPart = parseTimePart(parts[0] || '');
        const ePart = parseTimePart(parts[1] || '');
        const start = sPart ? new Date(base) : null;
        const end = ePart ? new Date(base) : null;
        if (start) start.setHours(sPart.hh, sPart.mm, 0, 0);
        if (end) end.setHours(ePart.hh, ePart.mm, 0, 0);
        return { start, end };
      }

      // No time info: treat event as all-day — start at 00:00, end at 23:59:59
      const start = new Date(base);
      start.setHours(0, 0, 0, 0);
      const end = new Date(base);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } catch (e) {
      return { start: null, end: null };
    }
  }

  // Compute weekly stats derived from `classes` for the current week
  async function computeWeeklyStats() {
    try {
      const start = new Date(weekStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      let attended = 0;
      let upcoming = 0;
      let studyHours = 0;

      const now = new Date();
      classes.forEach((c) => {
        const d = new Date(c.date);
        if (isNaN(d)) return;
        // Compare by date to determine week membership
        const dDay = new Date(d);
        dDay.setHours(0, 0, 0, 0);
        if (dDay >= start && dDay <= end) {
          // Determine event start/end datetimes
          const { start: evStart, end: evEnd } = getEventStartEnd(c);

          // If we have an end time, use it to decide completed vs upcoming
          let isCompleted = false;
          if (evEnd) {
            isCompleted = evEnd <= now;
          } else if (c.status) {
            // Fallback: if event marked Completed, treat as completed
            isCompleted = String(c.status).toLowerCase() === 'completed';
          } else {
            // No precise end time: treat event as completed if the day has passed
            const endOfDay = new Date(d);
            endOfDay.setHours(23, 59, 59, 999);
            isCompleted = endOfDay <= now;
          }

          if (isCompleted) {
            attended += 1;
            // add study hours only for completed events (use precise duration if available)
            if (evStart && evEnd) {
              const diffHrs = (evEnd.getTime() - evStart.getTime()) / (1000 * 60 * 60);
              if (!isNaN(diffHrs) && diffHrs > 0) studyHours += diffHrs;
            } else {
              // fallback to parsing duration string
              studyHours += parseDuration(c.time || '');
            }
          } else {
            upcoming += 1;
          }
        }
      });

      const stats = { attended, studyHours: Math.round(studyHours), upcoming };
      setWeeklyStats(stats);
      // Persist to backend if logged in, otherwise to localStorage
      if (userProfile && userProfile._id) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            await fetch('/api/users/weekly-stats', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(stats),
            });
            return;
          }
        } catch (err) {
          console.warn('Failed to persist weekly stats to server, falling back to localStorage', err);
        }
        try {
          window.localStorage.setItem(`weeklyStats_${userProfile._id}`, JSON.stringify(stats));
        } catch (e) {
          console.warn('Could not persist weekly stats', e);
        }
      } else {
        try {
          window.localStorage.setItem('weeklyStats_guest', JSON.stringify(stats));
        } catch (e) {
          console.warn('Could not persist weekly stats for guest', e);
        }
      }
    } catch (e) {
      console.warn('Failed to compute weekly stats', e);
    }
  }

  // Recompute weekly stats when classes, current week or user changes
  useEffect(() => {
    computeWeeklyStats();
  }, [classes, weekStart, userProfile]);

  // Also recompute periodically (every 60s) so counts update as time passes
  useEffect(() => {
    const id = setInterval(() => {
      computeWeeklyStats();
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [classes, weekStart, userProfile]);

  // Load events for the current week and populate `classes` so the side-panel stats and week view work
  const fetchWeekEvents = async () => {
    try {
      const api = await import('../api');
      const all = await api.getEvents();
      if (!Array.isArray(all)) {
        setClasses([]);
        return;
      }

      const start = new Date(weekStart);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const uid = userProfile && (userProfile._id || userProfile.id) ? (userProfile._id || userProfile.id).toString() : null;
  // Normalize role values to avoid casing/format issues and compute admin flag
  const role = (userProfile && (userProfile.role || userRole)) || userRole || 'student';
  const roleLower = (role || '').toString().toLowerCase();
  const isAdmin = roleLower === 'admin' || roleLower === 'sub-admin';

      const filtered = all.filter(e => {
        try {
          if (!e || !e.date) return false;
          const d = new Date(e.date);
          d.setHours(0,0,0,0);
          if (isNaN(d)) return false;
          if (d < start || d > end) return false;

          if (isAdmin) return true;

          // instructor: show if instructor matches user or event is public
          const instrId = e.instructor && (e.instructor._id || e.instructor) ? (e.instructor._id || e.instructor).toString() : null;
          const enrolled = Array.isArray(e.enrolledStudents) ? e.enrolledStudents.map(x => x.toString()) : [];
          if (role === 'instructor') {
            if (instrId && uid && instrId === uid) return true;
            if (e.createdByRole && (e.createdByRole === 'admin' || e.createdByRole === 'instructor' || e.createdByRole === 'sub-admin')) return true;
            return false;
          }

          // student/parent: show if enrolled or public or course matches enrolledCourses
          if (enrolled.includes(uid)) return true;
          if (e.createdByRole && (e.createdByRole === 'admin' || e.createdByRole === 'instructor' || e.createdByRole === 'sub-admin')) return true;
          // course-based visibility (if profile lists enrolledCourses)
          const evtCourse = e.course && (e.course._id || e.course) ? (e.course._id || e.course).toString() : null;
          const enrolledCourseIds = (userProfile && Array.isArray(userProfile.enrolledCourses)) ? userProfile.enrolledCourses.map(ec => (ec.course || ec).toString()) : [];
          if (evtCourse && enrolledCourseIds.length && enrolledCourseIds.includes(evtCourse)) return true;

          return false;
        } catch (err) { return false; }
      });

      const mapped = filtered.map(e => ({
      title: e.title,
      instructor: getInstructorName(e),
        instructorId: e.instructor && (e.instructor._id || e.instructor) ? (e.instructor._id || e.instructor).toString() : null,
        createdByUserId: e.createdByUserId && (e.createdByUserId._id || e.createdByUserId) ? (e.createdByUserId._id || e.createdByUserId).toString() : null,
        createdByRole: e.createdByRole || null,
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

      setClasses(mapped);
    } catch (err) {
      console.warn('Failed to load weekly events', err.message || err);
      setClasses([]);
    }
  };

  useEffect(() => {
    fetchWeekEvents();
  }, [weekStart, userProfile, userRole]);
 
  const todaySchedule = [
    {
      time: "09:00 AM",
      title: "Morning Study Session",
      bgColor: "#EDF2F7",
      textColor: "#4a5568",
    },
    {
      time: "11:00 AM",
      title: "Data Structures Lecture",
      bgColor: "#2B6CB0",
      textColor: "#ffffff",
    },
    {
      time: "02:00 PM",
      title: "AI Tutor Session",
      bgColor: "#38B2AC",
      textColor: "#ffffff",
    },
    {
      time: "04:00 PM",
      title: "Group Project Meeting",
      bgColor: "#48BB78",
      textColor: "#ffffff",
    },
  ];
 
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);
 
  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    });
    return formatter.format(currentDate);
  }, [currentDate]);
 
  const longDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );
 
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }),
    []
  );
 
  const scheduleForSelectedDay = useMemo(() => {
    const longLabel = longDateFormatter.format(currentDate);
    const shortLabel = shortDateFormatter.format(currentDate);
    const matching = classes.filter(
      (c) => c.date === longLabel || c.date === shortLabel
    );
 
    if (matching.length === 0) return [];
 
    const palette = [
      { bgColor: "#EDF2F7", textColor: "#4a5568" },
      { bgColor: "#2B6CB0", textColor: "#ffffff" },
      { bgColor: "#38B2AC", textColor: "#ffffff" },
      { bgColor: "#48BB78", textColor: "#ffffff" },
    ];
 
    return matching.map((c, idx) => {
      const start = (c.time || "").split("-")[0]?.trim() || "TBD";
      const colors = palette[idx % palette.length];
      return { time: start, title: c.title, ...colors };
    });
  }, [classes, currentDate, longDateFormatter, shortDateFormatter]);
 
  function handlePrevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }
 
  function handleNextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }
 
  // Fetch events for selected date from backend
  const handleDateClick = async (day) => {
    setCurrentDate(new Date(day));
    setPresetDate(new Date(day));
    setSelectedDate(new Date(day));
   
    // Format date as YYYY-MM-DD for API using local components (avoid toISOString UTC conversion)
    const dateStr = formatLocalYYYYMMDD(day);
   
      try {
      const api = await import("../api");
      const events = await api.getEventsByDate(dateStr);
      // also fetch shared events for this date
      let shared = [];
      try {
        const s = await api.getSharedEvents(dateStr);
        if (Array.isArray(s)) shared = s;
      } catch (e) {
        console.warn('Failed to load shared events', e && e.message ? e.message : e);
      }
      if (Array.isArray(events) || Array.isArray(shared)) {
        // Transform backend events to match the display format
        const backend = Array.isArray(events) ? events.map((e) => ({
          time: e.startTime || 'TBD',
          title: e.title,
          instructor: getInstructorName(e),
          instructorId: e.instructor && (e.instructor._id || e.instructor) ? (e.instructor._id || e.instructor).toString() : null,
          createdByUserId: e.createdByUserId && (e.createdByUserId._id || e.createdByUserId) ? (e.createdByUserId._id || e.createdByUserId).toString() : null,
          createdByRole: e.createdByRole || null,
          date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
          location: e.location || 'Online',
          students: getStudentsText(e),
          type: e.type || 'Live Class',
          status: e.status || 'Scheduled',
          _id: e._id
        })) : [];

        const sharedTransformed = Array.isArray(shared) ? shared.map(se => ({
          time: se.startTime || 'TBD',
          title: se.title,
          instructor: getInstructorName(se),
          instructorId: se.instructor && (se.instructor._id || se.instructor) ? (se.instructor._id || se.instructor).toString() : null,
          createdByUserId: se.createdByUserId && (se.createdByUserId._id || se.createdByUserId) ? (se.createdByUserId._id || se.createdByUserId).toString() : null,
          createdByRole: se.createdByRole || null,
          date: se.date ? new Date(se.date).toLocaleDateString() : 'TBD',
          location: se.location || 'Online',
          students: getStudentsText(se),
          type: se.type || 'Live Class',
          status: se.status || 'Scheduled',
          _id: se._id
        })) : [];

        const map = new Map();
        backend.forEach(it => { if (it._id) map.set(it._id.toString(), it); else map.set(JSON.stringify([it.title, it.date, it.time]), it); });
        sharedTransformed.forEach(it => { if (it._id) map.set(it._id.toString(), it); else map.set(JSON.stringify([it.title, it.date, it.time]), it); });

        const transformed = Array.from(map.values());
        setSelectedDateEvents(transformed);
      }
    } catch (err) {
      console.warn('Failed to fetch events for selected date', err.message || err);
      setSelectedDateEvents([]);
    }
  }

  // Fetch upcoming classes for the logged-in user and refresh periodically
  const fetchUpcomingClasses = async () => {
    // Wait for authenticated profile
    if (!userProfile) return;

    const fetchId = ++latestUpcomingFetchId.current;
    try {
      const api = await import('../api');
      // Use role-aware endpoint /api/events which returns appropriate events per role
      const res = await api.getEvents();
      console.log('Schedule.fetchUpcomingClasses: /api/events returned', Array.isArray(res) ? res.length : typeof res, res && res.slice ? res.map(r => r._id) : res);
      if (!Array.isArray(res)) {
        // Fallback: do not clear UI
        return;
      }

      const nowMidnight = new Date();
      nowMidnight.setHours(0,0,0,0);

      const mapped = res.filter(e => {
        try {
          // keep upcoming or today's events; admin may see past events too but we keep scheduled
          const d = e.date ? new Date(e.date) : null;
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

      // Merge with local events and preferences
      const now = Date.now();
      const storedLocal = loadLocalEventsFromStorage();
      const validLocal = (storedLocal || []).filter(l => l && l._local).filter(l => {
        try { if (!l.localExpiresAt) return true; return new Date(l.localExpiresAt).getTime() > now; } catch (err) { return true; }
      });
      // For Instructor role we must not rely on cached local events to avoid stale/ghost UI.
      // Only include local-only events for non-instructor roles (students/admin may keep pending local items).
      const localMap = (userRole === 'instructor') ? new Map() : new Map((validLocal || []).map(l => [eventKey(l), l]));
      const merged = visible.map(m => {
        try {
          const key = eventKey(m);
          const match = localMap.get(key);
          if (match && match._local && userProfile && userProfile._id && match.createdByUserId && match.createdByUserId.toString() === userProfile._id.toString()) {
            return { ...match };
          }
        } catch (err) { }
        return m;
      });

      const localOnly = (userRole === 'instructor') ? [] : (validLocal || []).filter(l => !merged.some(m => eventKey(m) === eventKey(l)));
      if (fetchId !== latestUpcomingFetchId.current) return;
      // Deduplicate server items by _id first, then merge with local-only items
      const byId = new Map();
      merged.forEach(it => {
        try {
          if (it && it._id) byId.set(it._id.toString(), it);
          else byId.set(eventKey(it), it);
        } catch (e) { /* ignore */ }
      });
      localOnly.forEach(l => {
        try {
          const key = l._id ? l._id.toString() : eventKey(l);
          if (!byId.has(key)) byId.set(key, l);
        } catch (e) {}
      });

      const mergedFinal = Array.from(byId.values()).sort((a,b) => {
        try {
          const da = toLocalDateForCompare(a && a.date ? a.date : a);
          const db = toLocalDateForCompare(b && b.date ? b.date : b);
          if (!da || !db) return 0;
          return da - db;
        } catch (e) { return 0; }
      });
      console.log('Schedule.fetchUpcomingClasses: mergedFinal length', mergedFinal.length);
      setUpcomingCount(mergedFinal.length || 0);
      setUpcomingClasses(mergedFinal);
      await fetchRemindersFromBackend();
      return;
    } catch (err) {
      console.warn('Failed to fetch upcoming classes', err.message || err);
    }
  };

  // --- Local events persistence & background sync helpers ---
  const normalizeDateForKey = (dateStr) => {
    try {
      const d = parseDateOnly(dateStr);
      if (!d) return (dateStr || '').toString().trim();
      return formatLocalYYYYMMDD(d);
    } catch (e) { return (dateStr || '').toString().trim(); }
  };

  const normalizeTimeForKey = (timeStr) => {
    try {
      if (!timeStr) return '';
      const parts = timeStr.split('-').map(p => p.trim());
      const fmt = parts.map(p => {
        // parse like "1:00 PM" or "13:00"
        const m = p.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (m) {
          let hh = parseInt(m[1], 10);
          const mm = parseInt(m[2], 10);
          const mer = (m[3] || '').toUpperCase();
          if (mer === 'PM' && hh < 12) hh += 12;
          if (mer === 'AM' && hh === 12) hh = 0;
          return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
        }
        return p.replace(/\s+/g,' ').toLowerCase();
      });
      return fmt.join('-');
    } catch (e) { return (timeStr || '').toString().trim(); }
  };

  const eventKey = (e) => {
    try {
      const t = (e.title || '').toString().trim().toLowerCase();
      const d = normalizeDateForKey(e.date || e.dateString || '');
      const ti = normalizeTimeForKey(e.time || `${e.startTime || ''} - ${e.endTime || ''}`);
      return `${t}|${d}|${ti}`;
    } catch (err) { return `${(e.title||'').toString()}`; }
  };
    // Merge an incoming list of events with locally-stored `_local` events.
    const mergeIncomingWithLocal = (incoming) => {
      try {
        const now = Date.now();
        const storedLocal = loadLocalEventsFromStorage();
        const inMemoryLocal = (upcomingClasses || []).filter(l => l && l._local);
        const combinedLocal = (storedLocal || []).concat(inMemoryLocal || []);
        const validLocal = (combinedLocal || []).filter(l => l && l._local).filter(l => {
          try {
            if (!l.localExpiresAt) return true;
            return new Date(l.localExpiresAt).getTime() > now;
          } catch (err) { return true; }
        });

        const map = new Map();
        (incoming || []).forEach(it => {
          try {
            if (it && it._id) map.set(it._id.toString(), it);
            else map.set(eventKey(it), it);
          } catch (e) { /* ignore */ }
        });

        // Prefer local creator copies for duplicates, and include local-only items
        validLocal.forEach(l => {
          try {
            const key = l._id ? l._id.toString() : eventKey(l);
            const existing = map.get(key);
            if (!existing) map.set(key, l);
            else if (l._local && userProfile && userProfile._id && l.createdByUserId && l.createdByUserId.toString() === userProfile._id.toString()) {
              map.set(key, l);
            }
          } catch (err) { /* ignore */ }
        });

        return Array.from(map.values());
      } catch (err) {
        return incoming || [];
      }
    };
  const loadLocalEventsFromStorage = () => {
    try {
      const raw = window.localStorage.getItem(LOCAL_EVENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // filter out expired
      const now = Date.now();
      return parsed.filter(ev => {
        try {
          if (!ev._local) return false;
          if (!ev.localExpiresAt) return true;
          return new Date(ev.localExpiresAt).getTime() > now;
        } catch (err) {
          return true;
        }
      });
    } catch (err) {
      console.warn('Failed to load local events from storage', err);
      return [];
    }
  };

  const saveLocalEventsToStorage = (events) => {
    try {
      window.localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
    } catch (err) {
      console.warn('Failed to save local events', err);
    }
  };

  const addLocalEventToStorage = (evt) => {
    try {
      const existing = loadLocalEventsFromStorage();
      existing.push(evt);
      saveLocalEventsToStorage(existing);
    } catch (err) {
      console.warn('Failed to add local event to storage', err);
    }
  };

  const removeLocalEventFromStorage = (evt) => {
    try {
      const existing = loadLocalEventsFromStorage();
      const filtered = existing.filter(e => {
        try {
          // Remove by matching server _id when present
          if (evt && evt._id && e && e._id && e._id === evt._id) return false;
          return !(e.title === evt.title && e.date === evt.date && e.time === evt.time);
        } catch (err) { return true; }
      });
      saveLocalEventsToStorage(filtered);
    } catch (err) {
      console.warn('Failed to remove local event from storage', err);
    }
  };

  // Try to persist any local events to backend. On success replace local item with server event
  const attemptSyncLocalEvents = async () => {
    try {
      const pending = loadLocalEventsFromStorage();
      if (!pending || pending.length === 0) return;
      const api = await import('../api');
      for (const ev of pending) {
        // If the local entry already references a server _id, skip re-creating it.
        if (ev && ev._id) {
          // ensure it appears in upcomingClasses state (merge if missing)
          setUpcomingClasses(prev => {
            const exists = (prev || []).some(p => p._id && ev._id && p._id === ev._id);
            if (exists) return prev;
            return [ev, ...(prev || [])];
          });
          continue;
        }
        try {
          // Skip if already expired
          if (ev.localExpiresAt && new Date(ev.localExpiresAt).getTime() <= Date.now()) {
            removeLocalEventFromStorage(ev);
            continue;
          }

          const payload = {
            title: ev.title,
            instructor: ev.instructor,
            date: ev.date,
            startTime: ev.time ? ev.time.split('-')[0].trim() : undefined,
            endTime: ev.time ? ev.time.split('-')[1]?.trim() : undefined,
            location: ev.location,
            type: ev.type
          };

          const res = await api.createEvent(payload);
          if (res && res._id) {
            // map server event to display format
            const serverEvt = {
              title: res.title,
                    instructor: (res.instructor && (res.instructor.fullName || res.instructor.email))
                      || (res.createdByUserId && (res.createdByUserId.fullName || res.createdByUserId.email))
                      || ev.instructor,
                instructorId: res.instructor && (res.instructor._id || res.instructor) ? (res.instructor._id || res.instructor).toString() : (ev.instructorId || null),
                createdByUserId: res.createdByUserId && (res.createdByUserId._id || res.createdByUserId) ? (res.createdByUserId._id || res.createdByUserId).toString() : (ev.createdByUserId || null),
                createdByRole: res.createdByRole || ev.createdByRole || null,
              date: res.date ? new Date(res.date).toLocaleDateString() : ev.date,
              time: `${res.startTime || ev.time?.split('-')[0]?.trim() || 'TBD'} - ${res.endTime || ev.time?.split('-')[1]?.trim() || 'TBD'}`,
              location: res.location || ev.location || 'Online',
              students: getStudentsText(res) || getStudentsText(ev),
              type: res.type || ev.type || 'Live Class',
              status: res.status || 'Scheduled',
              _id: res._id
            };

            // Replace local event in upcomingClasses state (use normalized key)
            setUpcomingClasses(prev => {
              const withoutLocal = (prev || []).filter(p => {
                try {
                  return p._local && eventKey(p) === eventKey(ev);
                } catch (err) { return !(p._local && p.title === ev.title && p.date === ev.date && p.time === ev.time); }
              }).filter(p => !(p && p._local && eventKey(p) === eventKey(ev)));
              return [serverEvt, ...withoutLocal];
            });

            // remove from storage
            removeLocalEventFromStorage(ev);
            // update counts
            setUpcomingCount(c => (c || 0));
          }
        } catch (err) {
          // keep trying later
          // console.warn('Sync event failed, will retry', err);
        }
      }
    } catch (err) {
      console.warn('Background sync failed', err);
    }
  };

  // Load persisted local events on mount and schedule periodic sync
  useEffect(() => {
    try {
      const stored = loadLocalEventsFromStorage();
      if (stored.length > 0) {
        // merge with upcomingClasses (avoid duplicates)
        setUpcomingClasses(prev => {
          const prevList = prev || [];
          const merged = [...prevList];
          stored.forEach(le => {
            try {
              const exists = merged.some(m => eventKey(m) === eventKey(le));
              if (!exists) merged.unshift(le);
            } catch (err) {
              const exists = merged.some(m => m.title === le.title && m.date === le.date && m.time === le.time);
              if (!exists) merged.unshift(le);
            }
          });
          setUpcomingCount((merged.length || 0));
          return merged;
        });
      }
    } catch (err) {
      console.warn('Failed to load persisted local events', err);
    }

    // start periodic background sync
    const syncInterval = setInterval(() => {
      attemptSyncLocalEvents();
    }, 10000);

    // try an immediate sync too
    attemptSyncLocalEvents();

    return () => clearInterval(syncInterval);
  }, []);

  // Allow owner (instructor/admin) to delete their own events
  const handleEditEvent = (evt) => {
    if (!evt) return;
    // Set the event to edit and populate the form
    setEventToEdit(evt);
    // Parse the event date and set preset date
    const eventDate = new Date(evt.date);
    setPresetDate(eventDate);
    // Open the modal
    setIsAddOpen(true);
  };

  // Real-time: listen for event changes via WebSocket and update UI
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socketUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = ioClient(socketUrl, { transports: ['websocket', 'polling'] });

    const removeEventById = (id) => {
      try {
        setUpcomingClasses(prev => {
          const list = (prev || []).filter(p => {
            try { const pid = p && p._id ? (p._id.toString ? p._id.toString() : p._id) : null; return pid !== id; } catch (e) { return true; }
          });
          try { setUpcomingCount(list.length || 0); } catch (e) {}
          return list;
        });
        setClasses(prev => (prev || []).filter(c => {
          try { const cid = c && c._id ? (c._id.toString ? c._id.toString() : c._id) : null; return cid !== id; } catch (e) { return true; }
        }));
        // Remove from local storage if present
        removeLocalEventFromStorage({ _id: id });
      } catch (err) { console.warn('Failed to remove event from UI', err); }
    };

    socket.on('connect', () => {
      socket.emit('auth', token);
    });

    socket.on('event:deleted', (payload) => {
      try {
        const id = payload && payload._id ? payload._id.toString() : null;
        if (id) removeEventById(id);
      } catch (e) { console.warn('Invalid event:deleted payload', e); }
    });

    socket.on('events:changed', (payload) => {
      try {
        if (!payload) return;
        // Deleted events include immediate removal
        if (payload.action === 'deleted' && payload._id) {
          // Remove immediately from UI, then refetch authoritative list to avoid stale/ghost items
          removeEventById(payload._id.toString());
          (async () => { try { await fetchUpcomingClasses(); } catch (e) { console.warn('Failed to refresh after delete event', e); } })();
          return;
        }
        // For created/updated events, refetch upcoming classes (role-aware)
        if ((payload.action === 'updated' || payload.action === 'created') && payload._id) {
          (async () => { try { await fetchUpcomingClasses(); } catch (e) { console.warn('Failed to refresh after events:changed', e); } })();
          return;
        }
      } catch (e) { console.warn('Invalid events:changed payload', e); }
    });

    return () => { try { socket.disconnect(); } catch (e) {} };
  }, []);

  const handleDeleteEvent = async (evt) => {
    try {
      if (!evt) return;
      // If event exists on server, request deletion
      if (evt._id) {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/events/${evt._id}` : `/api/events/${evt._id}`;

        const res = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.message || 'Failed to delete event');
          return;
        }
          // Refresh authoritative list after deleting to avoid stale UI
          try { await fetchUpcomingClasses(); } catch (e) { console.warn('Failed to refresh classes after delete', e); }
      }

      // Remove locally (from state and localStorage) using normalized id comparison
      setUpcomingClasses(prev => {
        const list = (prev || []).filter(p => {
          try {
            const pid = p && p._id ? (p._id.toString ? p._id.toString() : p._id) : null;
            const eid = evt && evt._id ? (evt._id.toString ? evt._id.toString() : evt._id) : null;
            if (pid && eid) return pid !== eid;
            // fallback to title/date/time match
            return !(p.title === evt.title && p.date === evt.date && p.time === evt.time);
          } catch (err) { return true; }
        });
        try { setUpcomingCount(list.length || 0); } catch (e) {}
        return list;
      });

      setClasses(prev => {
        const list = (prev || []).filter(c => {
          try {
            const cid = c && c._id ? (c._id.toString ? c._id.toString() : c._id) : null;
            const eid = evt && evt._id ? (evt._id.toString ? evt._id.toString() : evt._id) : null;
            if (cid && eid) return cid !== eid;
            return !(c.title === evt.title && c.date === evt.date && c.time === evt.time);
          } catch (err) { return true; }
        });
        return list;
      });

      removeLocalEventFromStorage(evt);
    } catch (err) {
      console.warn('Failed to delete event', err);
      alert('Failed to delete event: ' + (err.message || err));
    }
  };

  // Fetch reminders from backend notifications
  const fetchRemindersFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token available to fetch reminders');
        return;
      }
      
      // Fetch notifications directly from API
      const notificationsRes = await fetch('/api/notifications', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!notificationsRes.ok) {
        console.warn('Failed to fetch notifications:', notificationsRes.status);
        return;
      }
      
      const notificationsData = await notificationsRes.json();
      
      if (notificationsData && Array.isArray(notificationsData.notifications || notificationsData)) {
        const reminderTitles = new Set();
        const notifications = notificationsData.notifications || notificationsData;
        
        // Filter and extract reminder event keys (title + date) from all notifications
        notifications.forEach(notif => {
          try {
            // Primary: Extract from route if it contains eventTitle parameter
            if (notif.route && typeof notif.route === 'string') {
              const titleMatch = notif.route.match(/eventTitle=([^&]*)/);
              const dateMatch = notif.route.match(/eventDate=([^&]*)/);
              const decodedTitle = titleMatch && titleMatch[1] ? decodeURIComponent(titleMatch[1]) : null;
              const decodedDate = dateMatch && dateMatch[1] ? decodeURIComponent(dateMatch[1]) : null;
              if (decodedTitle) {
                const key = reminderKey(decodedTitle, decodedDate || '');
                reminderTitles.add(key);
                console.log('Added reminder key from route:', key);
                return;
              }
            }
            
            // Fallback: Use notification title if it looks like an event title
            if (notif.title && typeof notif.title === 'string' && notif.title.length > 0) {
              // We don't have date info here; store title-only key (won't match dated keys)
              const key = reminderKey(notif.title, '');
              reminderTitles.add(key);
              console.log('Added reminder key from notification title:', key);
            }
          } catch (err) {
            console.warn('Error processing notification:', notif, err);
          }
        });
        
        console.log('Final reminderTitles set:', Array.from(reminderTitles));
        setRemindersSet(reminderTitles);
      }
    } catch (err) {
      console.warn('Failed to fetch reminders from backend', err.message || err);
    }
  };

  useEffect(() => {
    // Only start periodic fetching once the authenticated profile is available
    if (!userProfile || !userProfile._id) return;

    fetchUpcomingClasses();
    fetchRemindersFromBackend();
    const interval = setInterval(() => {
      fetchUpcomingClasses();
      fetchRemindersFromBackend();
    }, 10000);
    const onFocus = () => {
      fetchUpcomingClasses();
      fetchRemindersFromBackend();
    };
    const onReminderSet = () => {
      console.log('Reminder set event received, refreshing reminders');
      fetchRemindersFromBackend();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('reminderSet', onReminderSet);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('reminderSet', onReminderSet);
    };
  }, [userProfile]);

  // Read query param when navigated from a notification and set highlight
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || window.location.search);
      const title = params.get('eventTitle');
      if (title) {
        // decode in case it's encoded
        setHighlightEventTitle(decodeURIComponent(title));
      }
    } catch (err) {
      console.warn('Failed to parse schedule query params', err);
    }
  }, [location.search]);

  // When upcomingClasses load and we have a highlight target, scroll to and highlight it
  useEffect(() => {
    if (!highlightEventTitle || upcomingClasses.length === 0) return;

    // Find element by data-title attribute (exact match or case-insensitive)
    const exact = document.querySelector(`[data-title="${CSS.escape(highlightEventTitle)}"]`);
    if (exact) {
      exact.classList.add('highlighted-reminder');
      exact.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setRemindersSet(prev => new Set([...Array.from(prev), highlightEventTitle]));
      return;
    }

    // Fallback: case-insensitive match
    const nodes = Array.from(document.querySelectorAll('[data-title]'));
    for (const n of nodes) {
      if ((n.getAttribute('data-title') || '').toLowerCase() === highlightEventTitle.toLowerCase()) {
        n.classList.add('highlighted-reminder');
        n.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setRemindersSet(prev => new Set([...Array.from(prev), n.getAttribute('data-title')]));
        break;
      }
    }
  }, [upcomingClasses, highlightEventTitle]);
 
  return (
    <AppLayout showGreeting={false}>
      <div
        className="container-fluid"
        style={{
          backgroundColor: "#f5f7fa",
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1
                  style={{
                    fontSize: "1.875rem",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginBottom: "4px",
                  }}
                >
                  My Schedule
                </h1>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.875rem",
                    marginBottom: 0,
                  }}
                >
                  Manage your classes and study sessions
                </p>
              </div>
 
              {userRole !== 'student' && (
                <button
                  className="btn btn-event d-flex align-items-center gap-2"
                  onClick={() => { setPresetDate(currentDate); setIsAddOpen(true); }}
                >
                  <Calendar size={20} />
                  Add Event
                </button>
              )}
            </div>
          </div>
        </div>
 
        {/* Calendar + Navigation */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="schedule-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: 0,
                  }}
                >
                  {monthLabel}
                </h5>
 
                <div>
                  <button
                    className="btn btn-sm btn-light me-2"
                    onClick={handlePrevWeek}
                  >
                    Previous
                  </button>
 
                  <button
                    className="btn btn-sm btn-light"
                    onClick={handleNextWeek}
                  >
                    Next
                  </button>
                </div>
              </div>
 
              <div className="row g-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="col text-center">
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        marginBottom: "8px",
                        fontWeight: "500",
                      }}
                    >
                      {d}
                    </div>
                  </div>
                ))}
              </div>
 
              <div className="row g-2">
                {weekDays.map((day) => {
                  const isActive =
                    day.toDateString() === currentDate.toDateString();
                  return (
                    <div key={day.toISOString()} className="col">
                      <div
                        className={`calendar-day ${isActive ? "active" : ""}`}
                        onClick={() => handleDateClick(day)}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
 
        {/* Main Content */}
        <div className="row">
          <div className="col-lg-8 mb-4">
            <h5
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Upcoming Classes
            </h5>
 
            {upcomingClasses.map((classItem, idx) => (
              <div key={idx} className={`class-card ${highlightEventTitle === classItem.title ? 'highlighted-reminder' : ''}`} data-title={classItem.title} id={`class-${classItem._id || idx}`}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      onClick={async () => {
                        try {
                          if (userRole === 'student' || userRole === 'parent') {
                            const api = await import('../api');
                            await api.accessAttendance(classItem._id).catch(() => {});
                          }
                        } catch (e) { /* ignore */ }
                      }}
                    >
                      {classItem.title}
                    </h6>
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "0.875rem",
                        marginBottom: 0,
                      }}
                    >
                      {classItem.instructor}
                    </p>
                  </div>

                  <div className="d-flex gap-2">
                    {(userRole === 'admin' || (userRole === 'instructor' && userProfile && userProfile._id && (
                      (classItem.instructorId && classItem.instructorId.toString() === userProfile._id.toString()) ||
                      (classItem.createdByUserId && classItem.createdByUserId.toString() === userProfile._id.toString())
                    ))) && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleEditEvent(classItem)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (confirm(`Delete event "${classItem.title}"? This cannot be undone.`)) {
                              handleDeleteEvent(classItem);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {classItem.status === 'Completed' ? (
                      <button
                        className="btn btn-secondary btn-sm d-flex align-items-center gap-1"
                        disabled
                      >
                        <Bell size={16} />
                        Already Done
                      </button>
                    ) : (remindersSet.has(reminderKey(classItem.title, classItem.date)) || classItem.reminderSet) ? (
                      <button
                        className="btn btn-success btn-sm d-flex align-items-center gap-1"
                        disabled
                      >
                        <Bell size={16} />
                        Reminder Set
                      </button>
                    ) : (
                      <button
                        className="btn btn-reminder btn-sm d-flex align-items-center gap-1"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            if (!token) {
                              alert('Please log in to set reminders');
                              return;
                            }

                            console.log('🔔 Setting reminder for:', { title: classItem.title, date: classItem.date });

                            const reminderRes = await fetch('/api/events/reminder', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                eventTitle: classItem.title,
                                eventDate: classItem.date,
                                reminderType: 'upcoming_class'
                              })
                            });

                            console.log('Response status:', reminderRes.status);

                            const responseData = await reminderRes.json();
                            console.log('Response data:', responseData);

                            if (reminderRes.ok) {
                              const key = reminderKey(classItem.title, classItem.date);
                              setRemindersSet(prev => new Set([...Array.from(prev || []), key]));
                              
                              // mark locally so newly-created/unsynced events update immediately
                              setUpcomingClasses(prev => (prev || []).map(ev => {
                                try {
                                  const same = (ev._id && classItem._id && ev._id.toString() === classItem._id.toString()) || (ev.title === classItem.title && (ev.date || '') === (classItem.date || ''));
                                  if (same) return { ...ev, reminderSet: true };
                                } catch (e) {}
                                return ev;
                              }));
                              
                              // notify other listeners/tabs
                              window.dispatchEvent(new Event('reminderSet'));
                              console.log('✅ Reminder set successfully');
                              alert(`✅ Reminder set for ${classItem.title}`);
                            } else {
                              const errMessage = responseData.message || 'Failed to set reminder';
                              console.error('❌ Error response:', errMessage);
                              alert(errMessage);
                            }
                          } catch (err) {
                            console.error('❌ Error setting reminder:', err);
                            alert('Error setting reminder: ' + err.message);
                          }
                        }}
                      >
                        <Bell size={16} />
                        Remind
                      </button>
                    )}
                    {/* Join button moved to bottom-right of card for clearer layout */}
                  </div>
                </div>

                <div
                  className="d-flex flex-wrap gap-3"
                  style={{ fontSize: "0.875rem", color: "#64748b" }}
                >
                  <div className="d-flex align-items-center gap-1">
                    <Calendar size={16} />
                    {classItem.date}
                  </div>

                  <div className="d-flex align-items-center gap-1">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {classItem.time}
                  </div>
                </div>

                <div
                  className="d-flex flex-wrap gap-3 mt-2"
                  style={{ fontSize: "0.875rem", color: "#64748b" }}
                >
                  <div className="d-flex align-items-center gap-1">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {classItem.location}
                  </div>

                  <div className="d-flex align-items-center gap-1">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {classItem.students}
                  </div>

                  <span className={`schedule-badge`}>{classItem.type}</span>
                </div>

                {/* Floating Join Meet button at bottom-right of card */}
                {classItem.meetLink ? (
                  <button
                    className="join-meet-btn"
                    onClick={async () => {
                      // Time-guard: validate join is within event time window (start time <= now <= end time)
                      try {
                        if (classItem.rawDate && classItem.time) {
                          const pd = new Date(classItem.rawDate);
                          if (!isNaN(pd)) {
                            const parts = classItem.time.split('-').map(p => p.trim());
                            const startRaw = parts[0];
                            const endRaw = parts[1];
                            
                            const startNorm = normalizeStoredTimeToInput(startRaw);
                            const endNorm = normalizeStoredTimeToInput(endRaw);
                            
                            if (startNorm && startNorm.time24 && endNorm && endNorm.time24) {
                              const [startHH, startMM] = startNorm.time24.split(':').map(x => parseInt(x, 10));
                              const [endHH, endMM] = endNorm.time24.split(':').map(x => parseInt(x, 10));
                              
                              const startDT = new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), startHH, startMM, 0, 0);
                              const endDT = new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), endHH, endMM, 0, 0);
                              const now = Date.now();
                              
                              // Block join if BEFORE start time
                              if (now < startDT.getTime()) {
                                alert('Class has not started yet');
                                return;
                              }
                              // Block join if AFTER end time
                              if (now > endDT.getTime()) {
                                alert('Class has ended');
                                return;
                              }
                              // Within time window - proceed to open meet
                            }
                          }
                        }

                      } catch (guardErr) {
                        // if time-guard parse fails, fall back to allowing join
                        console.warn('Join time check failed, allowing join by default', guardErr);
                      }

                      let win = null;
                      try {
                        // Dynamic import of api helpers
                        const api = await import('../api');
                        // Mark present (joinedAt) but don't block opening the meet
                        try {
                          await api.joinAttendance(classItem._id);
                        } catch (e) {
                          // If server reports capacity reached, show a clear message and do not open the meeting link
                          const msg = (e && e.message) ? String(e.message) : 'Failed to join event';
                          if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('exceeded')) {
                            alert('Student limit has exceeded for this event.');
                            return;
                          }
                          // otherwise, ignore join errors but proceed to open meet (legacy behavior)
                          console.warn('joinAttendance failed', e);
                        }

                        // Setup reliable leave handling: use beacon on unload, and poll popup close as fallback
                        const handleUnload = () => {
                          try {
                            // Best-effort beacon call; api.leaveAttendanceBeacon handles fallback
                            if (api && typeof api.leaveAttendanceBeacon === 'function') {
                              api.leaveAttendanceBeacon(classItem._id);
                            } else {
                              // Last-resort synchronous fetch (not ideal)
                              navigator.sendBeacon && navigator.sendBeacon(`/api/attendance/${classItem._id}/leave-beacon`);
                            }
                          } catch (e) { /* ignore */ }
                        };
                        window.addEventListener('beforeunload', handleUnload);
                        window.addEventListener('pagehide', handleUnload);

                        // Open the meet in a new window and monitor it.
                        win = window.open(classItem.meetLink, '_blank');

                        // Poll for the window being closed to record leftAt and remove listeners
                        if (win) {
                          const poll = setInterval(async () => {
                            try {
                              if (win.closed) {
                                clearInterval(poll);
                                try {
                                  await (api.leaveAttendanceBeacon ? api.leaveAttendanceBeacon(classItem._id) : api.leaveAttendance(classItem._id)).catch(() => {});
                                } catch (e) { /* ignore */ }
                                window.removeEventListener('beforeunload', handleUnload);
                                window.removeEventListener('pagehide', handleUnload);
                              }
                            } catch (e) {
                              clearInterval(poll);
                              window.removeEventListener('beforeunload', handleUnload);
                              window.removeEventListener('pagehide', handleUnload);
                            }
                          }, 1000);
                        } else {
                          // If popup blocked, fall back to opening in same tab and record leave on unload
                          window.location.href = classItem.meetLink;
                        }
                      } catch (err) {
                        console.warn('Failed to record attendance or open meet', err?.response?.data || err.message || err);
                        // Best-effort: open link
                        try { window.open(classItem.meetLink, '_blank'); } catch (e) { window.location.href = classItem.meetLink; }
                      }
                    }}
                  >
                    Join Meet
                  </button>
                ) : null}
                {/* View/Mark attendance for instructors/admins */}
                {(userRole === 'instructor' || userRole === 'admin' || userRole === 'sub-admin') && (
                  <button
                    className="btn btn-sm btn-outline-primary ms-2"
                    onClick={async () => {
                      try {
                        setAttendanceLoading(true);
                        setAttendanceModalOpen(true);
                        setAttendanceEvent(classItem);
                        setAttendanceEditing(false);
                        setAttendanceChanges({});
                        
                        // Fetch enrolled students and attendance records for this event
                        const token = localStorage.getItem('token');
                        
                        // Fetch attendance records from backend
                        const attResponse = await fetch(`/api/attendance/event/${classItem._id}/details`, {
                          headers: {
                            Authorization: `Bearer ${token}`
                          }
                        });

                        let allStudents = [];
                        
                        if (attResponse.ok) {
                          const attData = await attResponse.json();
                          if (attData.attendance && Array.isArray(attData.attendance)) {
                            allStudents = attData.attendance;
                          }
                        }
                        
                        // Try to fetch all enrolled students for the course to get complete list
                        try {
                          if (classItem.course || classItem.courseId) {
                            const courseId = classItem.course?._id || classItem.course || classItem.courseId;
                            const enrollResponse = await fetch(`/api/courses/${courseId}/students`, {
                              headers: { Authorization: `Bearer ${token}` }
                            }).catch(() => null);
                            
                            if (enrollResponse && enrollResponse.ok) {
                              const enrollData = await enrollResponse.json();
                              const enrolledStudents = enrollData.students || enrollData.data || [];
                              
                              // Create attendance map from records
                              const attMap = new Map();
                              allStudents.forEach(student => {
                                const key = student.studentId || student.student?._id;
                                if (key) attMap.set(key.toString(), student);
                              });
                              
                              // Merge enrolled students with attendance records
                              const mergedList = enrolledStudents.map(enrolledStudent => {
                                const studentId = enrolledStudent._id || enrolledStudent.id;
                                const existing = attMap.get(studentId?.toString());
                                
                                if (existing) {
                                  return existing;
                                } else {
                                  // Create entry for enrolled student with default "Absent" status
                                  return {
                                    _id: studentId,
                                    studentId: studentId,
                                    studentName: enrolledStudent.fullName || enrolledStudent.name || 'Unknown',
                                    studentEmail: enrolledStudent.email || 'N/A',
                                    status: 'Absent',
                                    joinedAt: null,
                                    leftAt: null
                                  };
                                }
                              });
                              
                              setAttendanceList(mergedList.length > 0 ? mergedList : allStudents);
                            } else {
                              setAttendanceList(allStudents);
                            }
                          } else {
                            setAttendanceList(allStudents);
                          }
                        } catch (err) {
                          console.warn('Failed to fetch enrolled students, using attendance records only', err);
                          setAttendanceList(allStudents);
                        }
                      } catch (err) {
                        console.error('Failed to load attendance', err);
                        setAttendanceList([]);
                      } finally {
                        setAttendanceLoading(false);
                      }
                    }}
                  >
                    {classItem.status === 'Completed' ? '📋 Mark Attendance' : '👁️ View Attendance'}
                  </button>
                )}
              </div>
            ))}
          </div>
 
          {/* Side Panel */}
          <div className="col-lg-4">
            {/* Weekly Summary */}
            <div className="schedule-card p-4 mb-4">
              <h5
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                This Week
              </h5>
 
              <div className="d-flex justify-content-between mb-3">
                <span style={{ color: "#64748b" }}>Classes Attended</span>
                <span style={{ fontWeight: "600" }}>
                  {weeklyStats.attended} / {weeklyStats.attended + weeklyStats.upcoming}
                </span>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span style={{ color: "#64748b" }}>Study Hours</span>
                <span style={{ fontWeight: "600" }}>{weeklyStats.studyHours} hrs</span>
              </div>

              <div className="d-flex justify-content-between">
                <span style={{ color: "#64748b" }}>Upcoming Classes</span>
                <span style={{ fontWeight: "600" }}>{weeklyStats.upcoming}</span>
              </div>
            </div>
 

          </div>
        </div>
 
        {/* Enhanced Attendance Modal */}
        {attendanceModalOpen && (
          <div className="attendance-modal-backdrop" style={{ position: 'fixed', left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)', zIndex:1100 }} onClick={() => setAttendanceModalOpen(false)}>
            <div className="attendance-modal" style={{ width: '720px', maxHeight: '80vh', overflowY: 'auto', margin: '60px auto', background: '#fff', padding: 20, borderRadius: 8 }} onClick={(e)=>e.stopPropagation()}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 style={{ margin: 0 }}>
                  {attendanceEditing ? '✏️ Mark Attendance' : '📋 Attendance'} - {attendanceEvent ? attendanceEvent.title : 'Event'}
                </h5>
                <button className="btn btn-sm btn-light" onClick={() => setAttendanceModalOpen(false)}>✕ Close</button>
              </div>

              {attendanceLoading ? (
                <div style={{ textAlign:'center', padding:'40px' }}>Loading attendance…</div>
              ) : (
                <div>
                  {/* Summary */}
                  <div style={{ marginBottom: 16, padding: '12px', background: '#f0f9ff', borderRadius: 6 }}>
                    <strong>Summary:</strong> 
                    <span style={{marginLeft:'8px'}}>
                      Present: {attendanceList.filter(a => (attendanceChanges[a._id]?.status || a.status || '').toLowerCase() === 'present').length} / 
                      Absent: {attendanceList.filter(a => (attendanceChanges[a._id]?.status || a.status || '').toLowerCase() === 'absent').length}
                      ({attendanceList.length} total)
                    </span>
                  </div>

                  {/* Edit Mode Toggle (for completed classes) */}
                  {attendanceEvent && attendanceEvent.status === 'Completed' && (userRole === 'instructor' || userRole === 'admin') && (
                    <div style={{marginBottom: '16px'}}>
                      <button 
                        className={`btn btn-sm ${attendanceEditing ? 'btn-warning' : 'btn-primary'} me-2`}
                        onClick={() => {
                          if (attendanceEditing) {
                            setAttendanceChanges({});
                          }
                          setAttendanceEditing(!attendanceEditing);
                        }}
                      >
                        {attendanceEditing ? '❌ Cancel' : '✏️ Edit Attendance'}
                      </button>
                      
                      {attendanceEditing && (
                        <button 
                          className="btn btn-sm btn-success me-2"
                          onClick={async () => {
                            try {
                              setAttendanceLoading(true);
                              const token = localStorage.getItem('token');
                              
                              const attendanceData = attendanceList.map(student => ({
                                studentId: student.studentId,
                                studentName: student.studentName || student.student?.fullName || 'Unknown',
                                studentEmail: student.studentEmail || student.student?.email || 'unknown@email.com',
                                status: attendanceChanges[student._id]?.status || student.status || 'Absent'
                              }));

                              console.log('🎓 Sending attendance:', { eventId: attendanceEvent._id, attendanceList: attendanceData });

                              const response = await fetch('/api/attendance/mark-attendance', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  eventId: attendanceEvent._id,
                                  attendanceList: attendanceData
                                })
                              });

                              if (response.ok) {
                                const result = await response.json();
                                console.log('✅ Attendance marked:', result);
                                alert(`✅ Attendance marked for ${result.marked} students`);
                                setAttendanceEditing(false);
                                setAttendanceChanges({});
                              } else {
                                const error = await response.json();
                                throw new Error(error.message || 'Failed to mark attendance');
                              }
                            } catch (err) {
                              console.error('❌ Error marking attendance:', err);
                              alert('Error marking attendance: ' + err.message);
                            } finally {
                              setAttendanceLoading(false);
                            }
                          }}
                        >
                          ✅ Save Attendance
                        </button>
                      )}
                    </div>
                  )}

                  {/* Attendance List */}
                  <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {attendanceList.length === 0 ? (
                      <div style={{padding:'20px', textAlign:'center', color:'#999'}}>
                        No student records found
                      </div>
                    ) : (
                      <table className="table table-sm" style={{marginBottom:0}}>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            {attendanceEditing && <th>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceList.map(student => {
                            const currentStatus = attendanceChanges[student._id]?.status || student.status || 'Absent';
                            return (
                              <tr key={student._id || student.studentId} style={{
                                background: currentStatus?.toLowerCase() === 'present' ? '#ecfdf5' : '#fef2f2'
                              }}>
                                <td><strong>{student.studentName || student.student?.fullName || 'Unknown'}</strong></td>
                                <td>{student.studentEmail || student.student?.email || 'N/A'}</td>
                                <td>
                                  {attendanceEditing ? (
                                    <select 
                                      value={currentStatus}
                                      onChange={(e) => setAttendanceChanges(prev => ({
                                        ...prev,
                                        [student._id]: { status: e.target.value }
                                      }))}
                                      className="form-select form-select-sm"
                                      style={{width:'100px'}}
                                    >
                                      <option value="Present">Present</option>
                                      <option value="Absent">Absent</option>
                                    </select>
                                  ) : (
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      background: currentStatus?.toLowerCase() === 'present' ? '#d1fae5' : '#fee2e2',
                                      color: currentStatus?.toLowerCase() === 'present' ? '#065f46' : '#991b1b',
                                      fontWeight: '600'
                                    }}>
                                      {currentStatus}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Event Modal */}
        <AddEventModal
          isOpen={isAddOpen}
          onClose={() => {
            setIsAddOpen(false);
            setEventToEdit(null);
          }}
          eventToEdit={eventToEdit}
          onAdd={(evt) => {
            try {
              // For events created without server persistence (network fallback)
              // keep them in local storage so they survive reloads.
              if (evt && evt._local) addLocalEventToStorage(evt);

              // For admin/instructor-created events that are persisted on the server
              // the backend's upcoming endpoint only returns events where the user
              // is enrolled. To ensure admins see events they create immediately,
              // also persist a local copy (marked _local) so it will be merged
              // into upcomingClasses on subsequent fetches instead of being
              // wiped out by the server response.
              if (evt && evt._id && !(userRole === 'student' || userRole === 'parent')) {
                try {
                  const localCopy = { ...evt, _local: true };
                  // ensure local expiry is set based on the event end time so it persists
                  try { localCopy.localExpiresAt = computeLocalExpiry(localCopy.date, localCopy.time || `${localCopy.startTime || ''} - ${localCopy.endTime || ''}`); } catch (e) {}
                  addLocalEventToStorage(localCopy);
                  evt = localCopy;
                } catch (err) { /* ignore */ }
              }
            } catch (err) { /* ignore */ }

            // Normalize students display: prefer existing, otherwise derive from maxStudents
            const normalized = { ...evt };
            // Attach owner id to local events so we can show owner-only actions
            try {
              if (!normalized.instructorId && userProfile && userProfile._id) normalized.instructorId = userProfile._id.toString();
              if (!normalized.createdByUserId && userProfile && userProfile._id) normalized.createdByUserId = userProfile._id.toString();
              if (!normalized.createdByRole && userRole) normalized.createdByRole = userRole;
            } catch (e) {}
            if (!normalized.students) normalized.students = getStudentsText(normalized);

            setClasses((prev) => {
              if (!normalized._id) return [...prev, normalized];
              // For edits: replace if exists by _id, otherwise add
              const idx = (prev || []).findIndex(x => x._id && x._id === normalized._id);
              if (idx >= 0) {
                const updated = [...(prev || [])];
                updated[idx] = normalized;
                return updated;
              }
              return [...(prev || []), normalized];
            });
            // Add/update in upcomingClasses to reflect changes immediately
            setUpcomingClasses((prev) => {
              const list = prev || [];
              // For edits by _id: replace, otherwise add if not duplicate
              if (normalized._id) {
                const idx = list.findIndex(x => x._id && x._id === normalized._id);
                if (idx >= 0) {
                  const updated = [...list];
                  updated[idx] = normalized;
                  return updated;
                }
              }
              // avoid duplicate by _id, otherwise by title+date+time
              const exists = normalized._id ? list.some(x => x._id && x._id === normalized._id) : list.some(x => x.title === normalized.title && x.date === normalized.date && x.time === normalized.time);
              if (exists) return list;
              return [normalized, ...list];
            });
            setUpcomingCount((c) => (c || 0) + 1);

            // Only refresh upcoming list immediately for student/parent roles
            // because the server will include their events. For admin/instructor
            // we avoid an immediate fetch which would remove the locally-added
            // copy (server does not return it since the admin isn't enrolled).
            if (userRole === 'student' || userRole === 'parent') {
              if (evt && evt._id) {
                fetchUpcomingClasses().catch(() => {});
              } else {
                setTimeout(() => fetchUpcomingClasses().catch(() => {}), 5000);
              }
            }
          }}
          userRole={userRole}
          presetDate={presetDate}
        />
      </div>
    </AppLayout>
  );
}
 
export { AddEventModal };
export default Schedule;
   