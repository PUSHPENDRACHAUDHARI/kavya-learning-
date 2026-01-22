import React, { useEffect, useState, useMemo } from "react";
import axiosClient from "../../api/axiosClient";
import AppLayout from "../../components/AppLayout";
import "../../assets/admin-dark-mode.css";

const AdminParents = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const loadParents = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/api/admin/users?role=parent");
      setParents(res.data.data || res.data);
    } catch (err) {
      console.error("Failed loading parents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  // Filter and search parents
  const filteredParents = useMemo(() => {
    let out = parents.filter((p) => {
      const name = (p.fullName || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      const searchName = (searchQuery || "").toLowerCase().trim();
      const searchEmail = (emailSearch || "").toLowerCase().trim();
      const searchPhone = (phoneSearch || "").toLowerCase().trim();

      if (searchName && !name.includes(searchName)) return false;
      if (searchEmail && !email.includes(searchEmail)) return false;
      if (searchPhone && !phone.includes(searchPhone)) return false;

      if (statusFilter !== "all") {
        const status = p.user_status || p.status || "Active";
        if (statusFilter === "active" && status === "Blocked") return false;
        if (statusFilter === "blocked" && status !== "Blocked") return false;
      }

      return true;
    });

    return out;
  }, [parents, searchQuery, emailSearch, phoneSearch, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredParents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParents = filteredParents.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Handle block/unblock
  const handleBlockUnblock = async (parentId, action) => {
    try {
      const endpoint =
        action === "block"
          ? `/api/admin/users/${parentId}/block`
          : `/api/admin/users/${parentId}/unblock`;
      await axiosClient.put(endpoint);
      await loadParents();
    } catch (err) {
      alert(err?.response?.data?.message || `Failed to ${action} parent`);
    }
  };

  if (loading)
    return (
      <AppLayout>
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading parents...
        </div>
      </AppLayout>
    );

  return (
    <AppLayout showGreeting={false}>
      <div className="admin-parents-page">
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 className="admin-heading">Parent Management</h2>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Total Parents: <strong>{filteredParents.length}</strong>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Search parent by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: 8, width: 220 }}
          />

          <input
            type="text"
            placeholder="Search by email..."
            value={emailSearch}
            onChange={(e) => {
              setEmailSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: 8, width: 200 }}
          />

          <input
            type="text"
            placeholder="Search by phone..."
            value={phoneSearch}
            onChange={(e) => {
              setPhoneSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: 8, width: 180 }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Status:
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: 8 }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>

        {/* PARENT TABLE */}
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Parent Info</th>
              <th>Contact Details</th>
              <th>Associated Students</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedParents.length > 0 ? (
              paginatedParents.map((p) => (
                <tr key={p._id}>
                  {/* PARENT PERSONAL INFO */}
                  <td>
                    <strong>{p.fullName}</strong>
                  </td>

                  {/* CONTACT DETAILS */}
                  <td>
                    Email: {p.email || "N/A"} <br />
                    Phone: {p.phone || "N/A"} <br />
                    {p.address && (
                      <>
                        Address:{" "}
                        {typeof p.address === "object"
                          ? `${p.address.street || ""}, ${p.address.city || ""}, ${p.address.state || ""}`
                          : p.address}
                      </>
                    )}
                  </td>

                  {/* ASSOCIATED STUDENTS */}
                  <td>
                    {p.children && p.children.length > 0 ? (
                      <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                        {p.children.map((child, idx) => (
                          <li key={idx}>
                            {typeof child === "object"
                              ? child.fullName
                              : "Student"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted">No students linked</span>
                    )}
                  </td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={`badge bg-${
                        p.user_status === "Blocked" ||
                        p.status === "inactive"
                          ? "danger"
                          : "success"
                      }`}
                    >
                      {p.user_status
                        ? p.user_status
                        : p.status === "active"
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  {/* CREATED DATE */}
                  <td>
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </td>

                  {/* ACTIONS */}
                  <td style={{ textAlign: "center" }}>
                    {p.user_status === "Blocked" ? (
                      <button
                        className="btn btn-sm"
                        style={{
                          backgroundColor: "green",
                          color: "white",
                          border: "1px solid green",
                          width: "80px",
                          height: "30px",
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Unblock ${p.fullName}?`
                            )
                          )
                            return;
                          await handleBlockUnblock(p._id, "unblock");
                        }}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{
                          backgroundColor: "red",
                          color: "white",
                          border: "1px solid red",
                          width: "80px",
                          height: "30px",
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Block ${p.fullName}? They will not be able to access their account.`
                            )
                          )
                            return;
                          await handleBlockUnblock(p._id, "block");
                        }}
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 20 }}>
                  <span className="text-muted">No parents found</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 20,
            }}
          >
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum =
                currentPage <= 3
                  ? i + 1
                  : currentPage - 2 + i;
              return (
                pageNum <= totalPages && (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${
                      currentPage === pageNum
                        ? "btn-primary"
                        : "btn-outline-primary"
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              );
            })}
            <span style={{ marginLeft: 12, alignSelf: "center" }}>
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminParents;
