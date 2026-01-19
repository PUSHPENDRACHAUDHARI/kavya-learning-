import { useState, useMemo,useEffect } from "react";
import { useLocation } from 'react-router-dom';
import { Calendar, Bell } from "lucide-react";
import "../assets/schedule.css";
import AppLayout from "../components/AppLayout";
 
function AddEventModal({ isOpen, onClose, onAdd, userRole, presetDate }) {
  const [form, setForm] = useState({
    title: "",
    instructor: "",
    type: "Live Class",
    date: "",
    startTime: "",
    startPeriod: "AM",
    endTime: "",
    endPeriod: "AM",
    location: "",
    maxStudents: 30,
  });
  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [instructorsError, setInstructorsError] = useState(null);

  useEffect(() => {
    if (presetDate) {
      // presetDate is a Date object
      const iso = new Date(presetDate).toISOString().slice(0,10);
      setForm((f) => ({ ...f, date: iso }));
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
    })();
  }, [presetDate, isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
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

    // Prevent past dates (client-side)
    const selected = new Date(form.date);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (selected < today) {
      alert('Cannot create events for past dates');
      return;
    }
    const timeRange = `${form.startTime} ${form.startPeriod} - ${form.endTime} ${form.endPeriod}`;
    const newEvent = userRole === 'student' ? {
      title: form.title,
      instructor: form.instructor,
      type: form.type,
      date: form.date,
      startTime: `${form.startTime} ${form.startPeriod}`,
      endTime: `${form.endTime} ${form.endPeriod}`
    } : {
      title: form.title,
      instructor: form.instructor,
      date: form.date,
      startTime: `${form.startTime} ${form.startPeriod}`,
      endTime: `${form.endTime} ${form.endPeriod}`,
      location: form.location || "Online",
      maxStudents: form.maxStudents,
      type: form.type,
    };
 
    // Try to save to backend; fall back to local update on failure
    (async () => {
      try {
        const api = await import("../api");
        const res = await api.createEvent(newEvent);
        if (res && res._id) {
          onAdd({
            title: res.title,
            instructor: res.instructor && (res.instructor.fullName || res.instructor.email) || form.instructor,
            date: res.date ? new Date(res.date).toLocaleDateString() : form.date,
            time: `${res.startTime || form.startTime} - ${res.endTime || form.endTime}`,
            location: res.location || (form.location || 'Online'),
            students: (res.enrolledStudents || []).length + ' students',
            type: res.type || form.type,
            status: res.status || 'Scheduled',
            _id: res._id
          });
        } else {
          // Local fallback: mark event as local and attach expiry based on end time
          const computeLocalExpiry = (dateStr, timeStr) => {
            try {
              if (!dateStr) return null;
              const base = new Date(dateStr);
              if (isNaN(base)) return null;
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
        // On network error, also persist as local event with expiry
        const computeLocalExpiry = (dateStr, timeStr) => {
          try {
            if (!dateStr) return null;
            const base = new Date(dateStr);
            if (isNaN(base)) return null;
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
          <h5 style={{ marginBottom: 0 }}>Add New Event</h5>
          <button className="btn btn-light btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
 
        <form onSubmit={handleSubmit}>
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
              <input
                name="instructor"
                value={form.instructor}
                onChange={handleChange}
                className="form-control"
                placeholder="Type instructor name"
              />
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
                  <label className="form-label">Max Students</label>
                  <input
                    type="number"
                    min="1"
                    name="maxStudents"
                    value={form.maxStudents}
                    onChange={handleChange}
                    className="form-control"
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
              Add Event
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
  const [isSmallChatOpen, setIsSmallChatOpen] = useState(false);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || 'student');
  const [presetDate, setPresetDate] = useState(null);
  const [remindersSet, setRemindersSet] = useState(new Set());
  const location = useLocation();
  const [highlightEventTitle, setHighlightEventTitle] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userProfile, setUserProfile] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({ attended: 0, studyHours: 0, upcoming: 0 });
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  // Background-sync storage key for locally-created events
  const LOCAL_EVENTS_KEY = 'schedule_local_events_v1';

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
 
  // Do not load global events — users should only see their own events.
  // (Global loader removed for privacy; upcomingClasses and selectedDateEvents
  // are fetched per-user below.)
 
  // Fetch events for the selected date, but only include events related to the current user
  useEffect(() => {
    (async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      setSelectedDate(today);

      try {
        const api = await import("../api");
        const events = await api.getEventsByDate(dateStr);
        if (Array.isArray(events) && userProfile && userProfile._id) {
          // Filter events to those where the user is the instructor or is enrolled
          const uid = userProfile._id;
          const filtered = events.filter(e => {
            const instr = e.instructor && (e.instructor._id || e.instructor) ? (e.instructor._id || e.instructor) : null;
            const enrolled = Array.isArray(e.enrolledStudents) ? e.enrolledStudents.map(x => x.toString()) : [];
            return (instr && instr.toString() === uid.toString()) || enrolled.includes(uid.toString());
          });

          const transformed = filtered.map((e) => ({
            time: e.startTime || 'TBD',
            title: e.title,
            instructor: e.instructor && (e.instructor.fullName || e.instructor.name || e.instructor.email) || "TBD",
            date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
            location: e.location || 'Online',
            students: (e.enrolledStudents || []).length + ' students',
            type: e.type || 'Live Class',
            status: e.status || 'Scheduled',
            _id: e._id
          }));
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

      classes.forEach((c) => {
        const d = new Date(c.date);
        if (isNaN(d)) return;
        d.setHours(0, 0, 0, 0);
        if (d >= start && d <= end) {
          if (c.status === 'Completed') attended += 1;
          else upcoming += 1;
          studyHours += parseDuration(c.time || '');
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
   
    // Format date as YYYY-MM-DD for API
    const dateStr = day.toISOString().split('T')[0];
   
    try {
      const api = await import("../api");
      const events = await api.getEventsByDate(dateStr);
      if (Array.isArray(events)) {
        // Transform backend events to match the display format
        const transformed = events.map((e) => ({
          time: e.startTime || 'TBD',
          title: e.title,
          instructor: e.instructor && (e.instructor.fullName || e.instructor.name || e.instructor.email) || "TBD",
          date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
          location: e.location || 'Online',
          students: (e.enrolledStudents || []).length + ' students',
          type: e.type || 'Live Class',
          status: e.status || 'Scheduled',
          _id: e._id
        }));
        setSelectedDateEvents(transformed);
      }
    } catch (err) {
      console.warn('Failed to fetch events for selected date', err.message || err);
      setSelectedDateEvents([]);
    }
  }

  // Fetch upcoming classes for the logged-in user and refresh periodically
  const fetchUpcomingClasses = async () => {
    try {
      const api = await import('../api');
      const res = await api.getUpcomingClasses(20, 1);
      if (res && res.success) {
        setUpcomingCount(res.upcomingCount || 0);
        const mapped = (res.upcoming || []).map((e) => ({
          title: e.title,
          instructor: e.instructor && (e.instructor.fullName || e.instructor.email) || 'TBD',
          date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
          time: `${e.startTime || 'TBD'} - ${e.endTime || 'TBD'}`,
          location: e.location || 'Online',
          students: (e.enrolledStudents || []).length + ' students',
          type: e.type || 'Live Class',
          status: e.status || 'Scheduled',
          _id: e._id
        }));
        // Preserve any locally-created events that haven't expired and are not duplicated by server
        const now = Date.now();
        const storedLocal = loadLocalEventsFromStorage();
        const localKeep = (storedLocal || []).filter(l => l && l._local).filter(l => {
          try {
            if (!l.localExpiresAt) return true; // keep if unknown
            return new Date(l.localExpiresAt).getTime() > now;
          } catch (err) { return true; }
        }).filter(local => {
          // avoid duplicates: same title+date+time
          return !mapped.some(m => m.title === local.title && m.date === local.date && m.time === local.time);
        });

        setUpcomingClasses([...mapped, ...localKeep]);
        
        // Fetch reminders from backend notifications
        await fetchRemindersFromBackend();
        return;
      }

      if (Array.isArray(res)) {
        const mapped = res.map((e) => ({
          title: e.title,
          instructor: e.instructor && (e.instructor.fullName || e.instructor.email) || 'TBD',
          date: e.date ? new Date(e.date).toLocaleDateString() : 'TBD',
          time: `${e.startTime || 'TBD'} - ${e.endTime || 'TBD'}`,
          location: e.location || 'Online',
          students: (e.enrolledStudents || []).length + ' students',
          type: e.type || 'Live Class',
          status: e.status || 'Scheduled',
          _id: e._id
        }));

        // Preserve any locally-created events that haven't expired and are not duplicated by server
        const now = Date.now();
        const storedLocal = loadLocalEventsFromStorage();
        const localKeep = (storedLocal || []).filter(l => l && l._local).filter(l => {
          try {
            if (!l.localExpiresAt) return true;
            return new Date(l.localExpiresAt).getTime() > now;
          } catch (err) { return true; }
        }).filter(local => {
          return !mapped.some(m => m.title === local.title && m.date === local.date && m.time === local.time);
        });

        setUpcomingCount((mapped.length || 0) + localKeep.length);
        setUpcomingClasses([...mapped, ...localKeep]);

        // Fetch reminders from backend notifications
        await fetchRemindersFromBackend();
        return;
      }

      setUpcomingCount(0);
      setUpcomingClasses([]);
    } catch (err) {
      console.warn('Failed to fetch upcoming classes', err.message || err);
      setUpcomingCount(0);
      setUpcomingClasses([]);
    }
  };

  // --- Local events persistence & background sync helpers ---
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
      const filtered = existing.filter(e => !(e.title === evt.title && e.date === evt.date && e.time === evt.time));
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
              instructor: res.instructor && (res.instructor.fullName || res.instructor.email) || ev.instructor,
              date: res.date ? new Date(res.date).toLocaleDateString() : ev.date,
              time: `${res.startTime || ev.time?.split('-')[0]?.trim() || 'TBD'} - ${res.endTime || ev.time?.split('-')[1]?.trim() || 'TBD'}`,
              location: res.location || ev.location || 'Online',
              students: (res.enrolledStudents || []).length + ' students',
              type: res.type || ev.type || 'Live Class',
              status: res.status || 'Scheduled',
              _id: res._id
            };

            // Replace local event in upcomingClasses state
            setUpcomingClasses(prev => {
              const withoutLocal = (prev || []).filter(p => !(p._local && p.title === ev.title && p.date === ev.date && p.time === ev.time));
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
            const exists = merged.some(m => m.title === le.title && m.date === le.date && m.time === le.time);
            if (!exists) merged.unshift(le);
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
        
        // Filter and extract reminder event titles from all notifications
        notifications.forEach(notif => {
          try {
            // Primary: Extract from route if it contains eventTitle parameter
            if (notif.route && typeof notif.route === 'string') {
              const match = notif.route.match(/eventTitle=([^&]*)/);
              if (match && match[1]) {
                const decodedTitle = decodeURIComponent(match[1]);
                if (decodedTitle) {
                  reminderTitles.add(decodedTitle);
                  console.log('Added reminder title from route:', decodedTitle);
                  return;
                }
              }
            }
            
            // Fallback: Use notification title if it looks like an event title
            if (notif.title && typeof notif.title === 'string' && notif.title.length > 0) {
              reminderTitles.add(notif.title);
              console.log('Added reminder title from notification title:', notif.title);
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
  }, []);

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
 
              <button
                className="btn btn-event d-flex align-items-center gap-2"
                onClick={() => { setPresetDate(currentDate); setIsAddOpen(true); }}
              >
                <Calendar size={20} />
                Add Event
              </button>
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
                    {classItem.status === 'Completed' ? (
                      <button
                        className="btn btn-secondary btn-sm d-flex align-items-center gap-1"
                        disabled
                      >
                        <Bell size={16} />
                        Already Done
                      </button>
                    ) : remindersSet.has(classItem.title) ? (
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

                            if (reminderRes.ok) {
                              setRemindersSet(prev => new Set([...prev, classItem.title]));
                              alert(`✅ Reminder set for ${classItem.title}`);
                            } else {
                              const errData = await reminderRes.json();
                              alert(errData.message || 'Failed to set reminder');
                            }
                          } catch (err) {
                            console.warn('Error setting reminder:', err);
                            alert('Error setting reminder: ' + err.message);
                          }
                        }}
                      >
                        <Bell size={16} />
                        Remind
                      </button>
                    )}
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
 
        {/* Add Event Modal */}
        <AddEventModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAdd={(evt) => {
            // persist local-created events to localStorage so they survive reloads
            if (evt && evt._local) {
              try { addLocalEventToStorage(evt); } catch (err) { /* ignore */ }
            }
            setClasses((prev) => [...prev, evt]);
            // Add locally so creator sees the event immediately
            setUpcomingClasses((prev) => [evt, ...prev]);
            setUpcomingCount((c) => (c || 0) + 1);
            // If the event was persisted on the server (has an _id), refresh immediately.
            // If not persisted (student-local fallback), avoid overwriting the local event
            // by delaying the refresh so the local entry remains visible.
            if (evt && evt._id) {
              fetchUpcomingClasses().catch(() => {});
            } else {
              setTimeout(() => fetchUpcomingClasses().catch(() => {}), 5000);
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
   