import React, { useEffect, useState, useMemo } from "react";
import axiosClient from "../../api/axiosClient";
import AppLayout from "../../components/AppLayout";
import AddInstructorForm from "../../components/AddInstructorForm";
import "../../assets/admin-dark-mode.css";

const AdminInstructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/api/admin/instructors");
      setInstructors(res.data.data || res.data);
    } catch (err) {
      console.error("Failed loading instructors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  // Filter and search instructors
  const filteredInstructors = useMemo(() => {
    let out = instructors.filter((i) => {
      const name = (i.fullName || "").toLowerCase();
      const email = (i.email || "").toLowerCase();
      const searchName = (searchQuery || "").toLowerCase().trim();
      const searchEmail = (emailSearch || "").toLowerCase().trim();

      if (searchName && !name.includes(searchName)) return false;
      if (searchEmail && !email.includes(searchEmail)) return false;

      if (statusFilter !== "all") {
        const status = i.status || "active";
        if (statusFilter === "active" && status !== "active") return false;
        if (statusFilter === "blocked" && status !== "blocked") return false;
      }

      return true;
    });

    return out;
  }, [instructors, searchQuery, emailSearch, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredInstructors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInstructors = filteredInstructors.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Handle block/unblock
  const handleBlockUnblock = async (instructorId, action) => {
    try {
      const endpoint =
        action === "block"
          ? `/api/admin/users/${instructorId}/block`
          : `/api/admin/users/${instructorId}/unblock`;
      await axiosClient.put(endpoint);
      await loadInstructors();
    } catch (err) {
      alert(err?.response?.data?.message || `Failed to ${action} instructor`);
    }
  };

  // Handle delete
  const handleDelete = async (instructorId) => {
    if (!window.confirm('Are you sure you want to delete this instructor? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(instructorId);
      await axiosClient.delete(`/api/admin/instructors/${instructorId}`);
      await loadInstructors();
      alert('Instructor deleted successfully');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete instructor');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleFormSuccess = () => {
    loadInstructors();
  };

  if (loading)
    return (
      <AppLayout>
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading instructors...
        </div>
      </AppLayout>
    );

  return (
    <AppLayout showGreeting={false}>
      <div className="admin-instructors-page" style={{ padding: "20px" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>
            Manage Instructors
          </h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Add Instructor
          </button>
        </div>

        {/* Add Instructor Form Modal */}
        <AddInstructorForm
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          onSuccess={handleFormSuccess}
        />

        {/* SEARCH & FILTER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "15px",
            marginBottom: 20,
          }}
        >
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="form-control"
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />
          <input
            type="text"
            placeholder="Search by email..."
            value={emailSearch}
            onChange={(e) => {
              setEmailSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="form-control"
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-control"
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* INSTRUCTORS TABLE */}
        <div style={{ overflowX: "auto", marginBottom: 20 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
              backgroundColor: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #dee2e6",
                }}
              >
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Full Name
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedInstructors.length > 0 ? (
                paginatedInstructors.map((instructor) => (
                  <tr
                    key={instructor._id}
                    style={{ borderBottom: "1px solid #dee2e6" }}
                  >
                    <td style={{ padding: "12px" }}>{instructor.email}</td>
                    <td style={{ padding: "12px" }}>
                      {instructor.fullName || "N/A"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "4px",
                          backgroundColor:
                            instructor.status === "blocked"
                              ? "#f8d7da"
                              : "#d4edda",
                          color:
                            instructor.status === "blocked"
                              ? "#721c24"
                              : "#155724",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {instructor.status === "blocked" ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {instructor.status === "blocked" ? (
                        <button
                          onClick={() =>
                            handleBlockUnblock(instructor._id, "unblock")
                          }
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleBlockUnblock(instructor._id, "block")
                          }
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#ffc107",
                            color: "#333",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          Block
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(instructor._id)}
                        disabled={deleteLoading === instructor._id}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: deleteLoading === instructor._id ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                          opacity: deleteLoading === instructor._id ? 0.6 : 1,
                        }}
                      >
                        {deleteLoading === instructor._id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: "20px", textAlign: "center" }}>
                    No instructors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: 20,
            }}
          >
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "8px 12px",
                backgroundColor: currentPage === 1 ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: "14px", fontWeight: "500" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 12px",
                backgroundColor:
                  currentPage === totalPages ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminInstructors;
