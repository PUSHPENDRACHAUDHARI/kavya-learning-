import React, { useEffect, useState, useMemo } from "react";
import axiosClient from "../../api/axiosClient";
import AppLayout from "../../components/AppLayout";
import CreateUserModal from "../../components/CreateUserModal";
import "../../assets/admin-dark-mode.css";



const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [courseCache, setCourseCache] = useState({}); // { courseId: { title, instructorName } }
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  // Search & sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [nameSort, setNameSort] = useState("none"); // none | asc | desc

  const loadStudents = async (opts = {}) => {
    try {
      let url = "/api/admin/users?role=student";
      if (opts.sortBy) url += `&sortBy=${encodeURIComponent(opts.sortBy)}`;
      if (opts.sortOrder) url += `&sortOrder=${encodeURIComponent(opts.sortOrder)}`;
      const res = await axiosClient.get(url);

      // Expect backend to send enrolledCourses & achievements
      setStudents(res.data.data || res.data);
      // after setting students, kick off course prefetch for enrolled course ids
      try {
        const payload = res.data.data || res.data || [];
        const courseIds = new Set();
        (payload || []).forEach(s => {
          (s.enrolledCourses || []).forEach(ec => {
            const cid = ec.course?._id || ec.courseId?._id || ec.courseId || ec.course || null;
            if (cid && typeof cid === 'string' && !courseCache[cid]) courseIds.add(cid);
            if (cid && typeof cid === 'object' && cid._id && !courseCache[cid._id]) courseIds.add(String(cid._id));
          });
        });
        if (courseIds.size > 0) {
          for (const id of courseIds) {
            // fetch each course if not cached
            if (!courseCache[id]) {
              axiosClient.get(`/api/courses/${id}`).then(r => {
                const c = r.data && r.data.data ? r.data.data : r.data;
                setCourseCache(prev => ({ ...prev, [id]: { title: c?.title || c?.name || 'Untitled', instructorName: (c?.instructor && (c.instructor.fullName || c.instructor)) || 'N/A' } }));
              }).catch(() => {});
            }
          }
        }
      } catch (e) {}
    } catch (err) {
      console.error("Failed loading students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // When sort order changes, request sorted data from backend (also handled client-side)
  useEffect(() => {
    if (!nameSort || nameSort === 'none') {
      // reload default ordering
      loadStudents();
    } else {
      loadStudents({ sortBy: 'fullName', sortOrder: nameSort });
    }
  }, [nameSort]);

  // compute filtered and sorted students with stable hook order
  const filteredStudents = useMemo(() => {
    let out = students.filter((s) => {
      const name = (s.fullName || "").toLowerCase();
      const q = (searchQuery || "").toLowerCase().trim();
      const qCity = (cityQuery || "").toLowerCase().trim();

      if (q && !name.includes(q)) return false;

      if (qCity) {
        // derive a normalized city value from address whether it's an object or string
        let addressStr = '';
        let cityNorm = '';
        if (s.address) {
          if (typeof s.address === 'object') {
            addressStr = Object.values(s.address).join(' ').toLowerCase();
            cityNorm = (s.address.city || '').toString().toLowerCase();
          } else {
            addressStr = String(s.address).toLowerCase();
            // try split by comma and take first non-empty token as city
            const parts = addressStr.split(',').map(p => p.trim()).filter(Boolean);
            cityNorm = parts.length ? parts[0].toLowerCase() : addressStr;
          }
        }

        // match either the normalized city token OR anywhere inside the full address string
        if (!(cityNorm.includes(qCity) || addressStr.includes(qCity))) return false;
      }

      if (genderFilter && genderFilter !== 'all') {
        if (genderFilter === 'notset') return !s.gender;
        return (s.gender || '').toLowerCase() === genderFilter;
      }
      return true;
    });

    if (nameSort && nameSort !== 'none') {
      out = out.slice().sort((a, b) => {
        const na = (a.fullName || '').toLowerCase();
        const nb = (b.fullName || '').toLowerCase();
        const cmp = na.localeCompare(nb);
        return nameSort === 'asc' ? cmp : -cmp;
      });
    }

    return out;
  }, [students, searchQuery, cityQuery, genderFilter, nameSort]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset to first page when filters/results change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStudents.length, searchQuery, cityQuery, genderFilter, nameSort]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const pagedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading students...</div></AppLayout>;

  return (
    <AppLayout showGreeting={false}>
      <div className="admin-students-page">
      {/* FORM SECTION */}
      {showForm && (
        <div style={{
          background: '#fff',
          borderRadius: '15px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3>Add New Student</h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowForm(false)}
              style={{ padding: '8px 16px' }}
            >
              ✕ Close
            </button>
          </div>
          <CreateUserModal
            isOpen={true}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              loadStudents();
              setShowForm(false);
            }}
          />
        </div>
      )}

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 className="admin-heading">Student Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Hide Form" : "Add Student"}
        </button>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search student by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: 8, width: 280 }}
        />

          <input
            type="text"
            placeholder="Search by city..."
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            style={{ padding: 8, width: 200 }}
          />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Gender:
          <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} style={{ padding: 8 }}>
            <option value="all">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="notset">Not set</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Sort By Seq:
          <select value={nameSort} onChange={e => setNameSort(e.target.value)} style={{ padding: 8 }}>
            <option value="none">None</option>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </label>
      </div>

      {/* STUDENT TABLE */}
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Student Info</th>
            <th>Parent</th>
            <th>Courses</th>
            <th>Free Course</th>
            <th>Performance</th>
            <th>Achievements</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {pagedStudents.map((s) => (
            <tr key={s._id}>
              {/* STUDENT PERSONAL INFO */}
              <td>
                <strong>{s.fullName}</strong> <br />
                Email: {s.email} <br />
                Phone: {s.phone || "-"} <br />
                Gender: {s.gender || "Not set"} <br />
                Age: {s.age || "Not set"} <br />
                Address: {s.address && typeof s.address === 'object'
                  ? `${s.address.street || ''}, ${s.address.city || ''}, ${s.address.state || ''} ${s.address.zipCode || ''}`.trim() || "Not available"
                  : s.address || "Not available"} <br />
                Status:{" "}
                <span
                  className={`badge bg-${
                    (s.user_status === 'Blocked' || s.status === 'inactive') ? 'danger' : 'success'
                  }`}
                >
                  {s.user_status ? s.user_status : (s.status ? (s.status === 'active' ? 'Active' : 'Inactive') : 'Active')}
                </span>
              </td>

              {/* PARENT DETAILS */}
              <td>
                {s.parent ? (
                  <strong>{s.parent.fullName}</strong>
                ) : (
                  "No Parent Assigned"
                )}
              </td>

              {/* ENROLLED COURSES */}
              <td>
                {s.enrolledCourses?.length > 0 ? (
                  s.enrolledCourses.map((e, idx) => {
                    // Enrollment object shapes may vary: support several possible shapes
                    const courseObj = e.course || e.courseId || e.courseId?.course || null;
                    let courseTitle = (courseObj && (courseObj.title || courseObj.name)) || e.courseTitle || e.title || 'Untitled Course';
                    let instructorName = (courseObj && (courseObj.instructor?.fullName || courseObj.instructor)) || e.instructorId?.fullName || e.instructorName || 'N/A';

                    // If we don't have a populated course title, try the cache (prefetched)
                    const possibleId = (e.course && (typeof e.course === 'string' ? e.course : (e.course._id || null))) || (e.courseId && (typeof e.courseId === 'string' ? e.courseId : (e.courseId._id || null)));
                    const cid = possibleId ? String(possibleId) : null;
                    if (cid && courseCache[cid]) {
                      courseTitle = courseCache[cid].title || courseTitle;
                      instructorName = courseCache[cid].instructorName || instructorName;
                    }

                    // Progress may be stored at different keys
                    const progress = (typeof e.progressPercentage === 'number') ? e.progressPercentage : (typeof e.completionPercentage === 'number' ? e.completionPercentage : (e.progress || 0));

                    // Completed flag: prefer boolean, fallback to progress === 100
                    const completedFlag = (typeof e.completed === 'boolean') ? e.completed : (Math.round(Number(progress) || 0) === 100);

                    return (
                      <div
                        key={e._id || idx}
                        style={{
                          padding: "6px",
                          borderBottom: "1px solid #ddd",
                          marginBottom: 5,
                        }}
                      >
                        <strong>{courseTitle}</strong> <br />
                        Instructor: {instructorName} <br />
                        Progress: {Number(progress || 0)}% <br />
                        Completed: {completedFlag ? "Yes" : "No"}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-muted">No courses purchased</span>
                )}
              </td>

              {/* FREE COURSE ACTION */}
              <td>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setModalStudent(s);
                    setShowFreeModal(true);
                    setModalMessage(null);
                    // load courses lazily
                    if (courses.length === 0) {
                      axiosClient.get('/api/admin/courses').then(res => setCourses(res.data.data || res.data)).catch(() => setCourses([]));
                    }
                  }}
                >
                  Free Course
                </button>
              </td>

              {/* PERFORMANCE SECTION */}
              <td>
                  {(() => {
                    const enrolls = s.enrolledCourses || [];
                    const totalCourses = enrolls.length;
                    const completedCourses = enrolls.reduce((acc, c) => {
                      const prog = Number(c.progressPercentage ?? c.completionPercentage ?? c.progress ?? 0) || 0;
                      return acc + (prog === 100 ? 1 : 0);
                    }, 0);
                    const avgProgress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
                    return (
                      <>
                        Total Courses: {totalCourses} <br />
                        Completed Courses: {completedCourses} <br />
                        Avg Progress: {avgProgress}%
                      </>
                    );
                  })()}
              </td>

              {/* ACHIEVEMENTS */}
              <td>
                {s.achievements?.length > 0 ? (
                  s.achievements.map((a, i) => (
                    <div key={i}>
                      🏅 {a.title} <br />
                      <small>{a.date}</small>
                      <hr />
                    </div>
                  ))
                ) : (
                  <span className="text-muted">No achievements</span>
                )}
              </td>

              {/* BLOCK / UNBLOCK ACTION */}
              <td style={{ textAlign: 'center' }}>
                {/* Block / Unblock button */}
                {s.user_status === 'Blocked' ? (
                  <button
                    className="btn btn-sm"
                    style={{ backgroundColor: 'green', color: 'white', border: '1px solid green', width: '80px', height: '30px', padding: '2px 8px' }}
                    onClick={async () => {
                      if (!window.confirm(`Unblock ${s.fullName}?`)) return;
                      try {
                        await axiosClient.put(`/api/admin/users/${s._id}/unblock`);
                        await loadStudents();
                      } catch (err) {
                        alert(err?.response?.data?.message || 'Failed to unblock user');
                      }
                    }}
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    className="btn btn-sm"
                    style={{ backgroundColor: 'red', color: 'black', border: '1px solid red', width: '80px', height: '30px', padding: '2px 8px' }}
                    onClick={async () => {
                      if (!window.confirm(`Block ${s.fullName}? This will prevent them from logging in and accessing protected content.`)) return;
                      try {
                        await axiosClient.put(`/api/admin/users/${s._id}/block`);
                        await loadStudents();
                      } catch (err) {
                        alert(err?.response?.data?.message || 'Failed to block user');
                      }
                    }}
                  >
                    Block
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div className="muted small">Showing {(filteredStudents.length === 0) ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          {/* simple numbered pages */}
          {Array.from({ length: totalPages }).map((_, i) => {
            const page = i + 1;
            return (
              <button key={page} className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setCurrentPage(page)}>{page}</button>
            );
          })}
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      </div>

      {/* Free Course Modal */}
      {showFreeModal && modalStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 420 }}>
            <h3>Assign Free Course to {modalStudent.fullName}</h3>
            <div style={{ marginTop: 12 }}>
              <label>Course</label>
              <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }}>
                <option value="">-- Select course --</option>
                {courses.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>
            {modalMessage && <div style={{ marginTop: 8 }}>{modalMessage}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => { setShowFreeModal(false); setModalStudent(null); setSelectedCourseId(''); setModalMessage(null); }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={modalLoading}
                onClick={async () => {
                  if (!selectedCourseId) { setModalMessage('Please select a course'); return; }
                  setModalLoading(true);
                  try {
                    await axiosClient.post('/api/admin/enrollments', { studentId: modalStudent._id, courseId: selectedCourseId, isFree: true });
                    setModalMessage('Course added as free successfully');
                    // refresh students table
                    await loadStudents();
                    setTimeout(() => {
                      setShowFreeModal(false);
                      setModalStudent(null);
                      setSelectedCourseId('');
                      setModalMessage(null);
                    }, 900);
                  } catch (err) {
                    const msg = err?.response?.data?.message || 'Failed to add course';
                    setModalMessage(msg);
                  } finally {
                    setModalLoading(false);
                  }
                }}
              >
                {modalLoading ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
};

export default AdminStudents;
