import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import AppLayout from "../../components/AppLayout";

const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [parents, setParents] = useState([]);

  const [form, setForm] = useState({
    studentId: "",
    courseId: "",
    instructorId: "",
    parentId: "",
    progressPercentage: 0,
    completed: false
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);

  // Load All Data
  const loadData = async () => {
    try {
      setLoading(true);

      const [enr, stu, cou, ins, par] = await Promise.all([
        axiosClient.get("/api/admin/enrollments"),
        axiosClient.get("/api/admin/students"),
        axiosClient.get("/api/admin/courses"),
        axiosClient.get("/api/admin/instructors"),
        axiosClient.get("/api/admin/parents"),
      ]);

      setEnrollments(enr.data.data || enr.data);
      setStudents(stu.data.data || stu.data);
      setCourses(cou.data.data || cou.data);
      setInstructors(ins.data.data || ins.data);
      setParents(par.data.data || par.data);
    } catch (err) {
      console.error("Loading error", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Create or Update Enrollment
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await axiosClient.put(`/api/admin/enrollments/${editingId}`, form);
      } else {
        await axiosClient.post("/api/admin/enrollments", form);
      }

      loadData();
      setForm({
        studentId: "",
        courseId: "",
        instructorId: "",
        parentId: "",
        progressPercentage: 0,
        completed: false,
      });
      setEditingId(null);

      alert(editingId ? "Enrollment Updated!" : "Enrollment Created!");
    } catch (err) {
      console.error("Submit Error", err);
      alert("Failed!");
    }
  };

  // Edit enrollment
  const handleEdit = (enr) => {
    setEditingId(enr._id);
    setForm({
      studentId: enr.studentId?._id,
      courseId: enr.courseId?._id,
      instructorId: enr.instructorId?._id,
      parentId: enr.parentId?._id,
      progressPercentage: enr.progressPercentage,
      completed: enr.completed,
    });
  };

  // Delete enrollment
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      await axiosClient.delete(`/api/admin/enrollments/${id}`);
      loadData();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  if (loading) return <AppLayout><h3 style={{ padding: '20px', textAlign: 'center' }}>Loading enrollments...</h3></AppLayout>;

  return (
    <AppLayout showGreeting={false}>
      <div className="container mt-4">
      <h2 className="mb-3">Enrollment Management</h2>

      {/* Enrollment Form */}
      <div className="card p-3 mb-4">
        <h4>{editingId ? "Edit Enrollment" : "Add Enrollment"}</h4>

        <form onSubmit={handleSubmit}>

          <div className="row">
            <div className="col-md-3">
              <label>Student</label>
              <select
                name="studentId"
                className="form-control"
                value={form.studentId}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label>Course</label>
              <select
                name="courseId"
                className="form-control"
                value={form.courseId}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label>Instructor</label>
              <select
                name="instructorId"
                className="form-control"
                value={form.instructorId}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {instructors.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label>Parent</label>
              <select
                name="parentId"
                className="form-control"
                value={form.parentId}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-3">
              <label>Progress (%)</label>
              <input
                type="number"
                name="progressPercentage"
                className="form-control"
                value={form.progressPercentage}
                onChange={handleChange}
                min="0"
                max="100"
              />
            </div>

            <div className="col-md-3">
              <label className="d-block">Completed</label>
              <input
                type="checkbox"
                name="completed"
                checked={form.completed}
                onChange={handleChange}
              />{" "}
              Yes
            </div>
          </div>

          <button className="btn btn-primary mt-3">
            {editingId ? "Update" : "Create"}
          </button>
        </form>
      </div>

      {/* Enrollment Table */}
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Student</th>
            <th>Parent</th>
            <th>Instructor</th>
            <th>Course</th>
            <th>Progress (%)</th>
            <th>Completed</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {enrollments.map((e) => (
            <tr key={e._id}>
              <td>{e.studentId?.fullName}</td>
              <td>{e.parentId?.fullName}</td>
              <td>{e.instructorId?.fullName}</td>
              <td>{e.courseId?.title}</td>
              <td>{e.progressPercentage}</td>
              <td>{e.completed ? "Yes" : "No"}</td>

              <td>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => handleEdit(e)}
                >
                  Edit
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(e._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </AppLayout>
  );
};

export default AdminEnrollments;
