import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../assets/Courses.css";
import AppLayout from "../components/AppLayout";
import api from "../api";
import { useNavigate, useLocation } from "react-router-dom";

// ===================================
// UTILITY HOOK FOR LOCAL STORAGE
// ===================================
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    // Check if window is defined (for server-side rendering safety)
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      // If item is found and not empty, parse it, otherwise return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};
// ===================================

// Initial hardcoded data (will be combined with localStorage data)
const initialGettingStarted = [
  {
    title: "Introduction to Ethical Hacking",
    duration: "10 min",
    status: "Review",
    iconClass: "bi-check2-circle",
    iconBgClass: "lesson-icon",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/w_oxcjPOWos",
  },
  {
    title: "Basics of Ethical Hacking",
    duration: "15 min",
    status: "Review",
    iconClass: "bi-check2-circle",
    iconBgClass: "lesson-icon",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/-9iIOWBc6qw",
  },
  {
    title: "Ethical Hacking Phases",
    duration: "20 min",
    status: "Start",
    iconClass: "bi-play-circle",
    iconBgClass: "lesson-icon",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/xI-_dwTO608",
  },
];

const initialCoreConcepts = [
  {
    title: "Hacking and Assessment",
    duration: "30 min",
    status: "Start",
    iconClass: "bi-play-fill",
    iconBgClass: "lesson-icon",
    actionClass: "lesson-action1",
    videoLink: "https://www.youtube.com/embed/w_oxcjPOWos",
  },
  {
    title: "Hacking and Enumeration Server",
    duration: "45 min",
    status: "Start",
    iconClass: "bi-lock-fill",
    iconBgClass: "muted-circle",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/-9iIOWBc6qw"
  },
  {
    title: "Anonymous Browsing and Steganography",
    duration: "35 min",
    status: "Start",
    iconClass: "bi-lock-fill",
    iconBgClass: "muted-circle",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/w_oxcjPOWos"
  },
];

const initialPracticalApplications = [
  {
    title: "Project Setup",
    duration: "25 min",
    status: "Start",
    iconClass: "bi-lock-fill",
    iconBgClass: "muted-circle",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/w_oxcjPOWos"
  },
  {
    title: "Building Your First Project",
    duration: "1h 30 min",
    status: "Start",
    iconClass: "bi-lock-fill",
    iconBgClass: "muted-circle",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/-9iIOWBc6qw"
  },
  {
    title: "Testing and Deployment",
    duration: "40 min",
    status: "Start",
    iconClass: "bi-lock-fill",
    iconBgClass: "muted-circle",
    actionClass: "lesson-action",
    videoLink: "https://www.youtube.com/embed/w_oxcjPOWos"
  },
];

const initialInstructor = {
  name: "John Smith",
  title:
    "Senior Full Stack Developer with 10+ years of experience in web development. Passionate about teaching and helping students achieve their goals.",
  stats: {
    students: "25,000+",
    courses: "12",
    rating: "4.9",
  },
};

const initialReviews = [
  {
    id: 1,
    name: "Student 1",
    rating: 5,
    text: "Excellent course! The instructor explains everything clearly and the projects are very practical. Highly recommended for anyone wanting to learn web development.",
    avatar: "U1",
  },
  {
    id: 2,
    name: "Student 2",
    rating: 5,
    text: "Excellent course! The instructor explains everything clearly and the projects are very practical. Highly recommended for anyone wanting to learn web development.",
    avatar: "U2",
  },
  {
    id: 3,
    name: "Student 3",
    rating: 5,
    text: "Excellent course! The instructor explains everything clearly and the projects are very practical. Highly recommended for anyone wanting to learn web development.",
    avatar: "U3",
  },
];

// Initial Resource data (Note: they don't have dataURL initially)
const initialResources = [
  { name: "Course Syllabus.pdf", type: "pdf", dataURL: null },
  { name: "Code Examples.zip", type: "zip", dataURL: null },
  { name: "Reference Guide.pdf", type: "pdf", dataURL: null },
  { name: "Project Templates.zip", type: "zip", dataURL: null },
];

const initialQuizzes = [
  {
    name: "Module 1 Assessment",
    questions: 10,
    passingScore: 70,
    status: "Start Quiz",
    iconClass: "bi-patch-question",
    iconBgClass: "lesson-icon",
  },
];

// Utility function for stars
const renderStars = (rating) => {
  const fullStars = Array(rating)
    .fill()
    .map((_, i) => <i key={i} className="bi bi-star-fill"></i>);
  return fullStars;
};

// ===================================
// CURRICULUM, INSTRUCTOR, REVIEW, RESOURCE FORMS (Updated CurriculumForm)
// ===================================

function CurriculumForm({ addCurriculumModule, toggleForm }) {
  // Module State
  const [moduleTitle, setModuleTitle] = useState("");
  const [totalDuration, setTotalDuration] = useState("");

  // Lesson 1 States (Required)
  const [title1, setTitle1] = useState("");
  const [duration1, setDuration1] = useState("");
  const [status1, setStatus1] = useState("Start");

  // NEW: State for dynamically added lessons (replaces Lessons 2 & 3)
  const [additionalLessons, setAdditionalLessons] = useState([]);

  // Utility function to generate a unique ID for new lessons
  const generateId = () => Date.now() + Math.random();

  // Handler to add a new optional lesson
  const addLesson = () => {
    setAdditionalLessons((prevLessons) => [
      ...prevLessons,
      {
        id: generateId(),
        title: "",
        duration: "",
        status: "Start",
      },
    ]);
  };

  // Handler to remove a dynamic lesson
  const removeLesson = (id) => {
    setAdditionalLessons((prevLessons) =>
      prevLessons.filter((lesson) => lesson.id !== id)
    );
  };

  // Handler to update the fields of a dynamic lesson
  const handleAdditionalLessonChange = (id, field, value) => {
    setAdditionalLessons((prevLessons) =>
      prevLessons.map((lesson) =>
        lesson.id === id ? { ...lesson, [field]: value } : lesson
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Lesson 1 data (Required)
    const lesson1Data = { title: title1, duration: duration1, status: status1 };

    // Combine Lesson 1 with dynamically added lessons
    const allLessonsInput = [lesson1Data, ...additionalLessons];

    // Process and filter lessons (only include if title is present)
    let lessons = allLessonsInput
      .filter((l) => l.title.trim() !== "")
      .map((l) => ({
        title: l.title,
        // Individual lesson duration uses the minutes input with " min" suffix
        duration:
          l.duration && l.duration.toString().trim() !== ""
            ? l.duration + " min"
            : "N/A",
        // keep initial status from the form but we'll normalise below to ensure
        // first lesson is unlocked and subsequent lessons start locked by default
        status: l.status,
      }));

    // Normalize statuses for sequential unlocking: first lesson Start, others Locked
    lessons = lessons.map((lsn, idx) => {
      const normalizedStatus = idx === 0 ? 'Start' : 'Locked';
      const statusToUse = lsn.status === 'Review' ? 'Review' : normalizedStatus;
      return {
        ...lsn,
        status: statusToUse,
        iconClass: statusToUse === "Start" || statusToUse === 'Review' ? "bi-play-circle" : "bi-lock-fill",
        iconBgClass: statusToUse === "Start" || statusToUse === 'Review' ? "lesson-icon" : "muted-circle",
        actionClass: statusToUse === "Locked" ? "muted small" : "lesson-action",
      };
    });

    if (lessons.length === 0) {
      alert("Please add at least one lesson title.");
      return;
    }

    // Create the new module object
    const newModule = {
      title: moduleTitle,
      lessons: lessons,
      // Use the manually entered duration string
      totalDuration: totalDuration || "N/A",
    };

    addCurriculumModule(newModule); // Pass the entire new module
    toggleForm(false); // Close the form after successful save
  };

  // Form structure matching the look of the curriculum panels
  return (
    <div className="curriculum-panel rounded-3 overflow-hidden mb-3">
      <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-plus-square header-icon"></i>
          <strong>Add New Module and Lessons</strong>
        </div>
        <button
          className="btn btn-sm btn-light"
          onClick={() => toggleForm(false)}
        >
          <i className="bi bi-x"></i> Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white">
        {/* MODIFIED: Module Name and Manual Total Duration side-by-side */}
        <div className="row mb-4">
          {/* Module Name Input (Required) */}
          <div className="col-md-8 mb-3 mb-md-0">
            <label className="form-label small muted">New Module Name</label>
            <input
              type="text"
              className="form-control"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="e.g. React Hooks"
              required
            />
          </div>

          {/* MODIFIED: Manual Total Duration Input */}
          <div className="col-md-4">
            <label className="form-label small muted">
              Total Duration (e.g., 2h 30min)
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-clock"></i>
              </span>
              <input
                type="text"
                className="form-control"
                value={totalDuration}
                onChange={(e) => setTotalDuration(e.target.value)}
                placeholder="e.g. 2h 30min"
                required
              />
            </div>
          </div>
        </div>

        {/* --- Lesson 1 (Required) with PLUS button --- */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Lesson 1 Details (Required)</h6>
          {/* The requested + icon to add new lessons */}
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={addLesson}
            title="Add New Lesson"
          >
            <i className="bi bi-plus"></i> Add New Lesson
          </button>
        </div>
        <div className="row mb-3">
          <div className="col-md-6 mb-3 mb-md-0">
            <label className="form-label small muted">Lesson 1 Title</label>
            <input
              type="text"
              className="form-control"
              value={title1}
              onChange={(e) => setTitle1(e.target.value)}
              placeholder="e.g. State Management"
              required
            />
          </div>
          <div className="col-md-3 mb-3 mb-md-0">
            <label className="form-label small muted">Duration (mins)</label>
            <input
              type="number"
              className="form-control"
              value={duration1}
              onChange={(e) => setDuration1(e.target.value)}
              placeholder="e.g. 30"
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small muted">Status</label>
            <select
              className="form-select"
              value={status1}
              onChange={(e) => setStatus1(e.target.value)}
            >
              <option value="Start">Start</option>
              <option value="Locked">Locked</option>
            </select>
          </div>
        </div>

        {/* --- Dynamically Added Lessons (Replaces Lessons 2 & 3) --- */}
        {additionalLessons.map((lesson, index) => (
          <div key={lesson.id} className="mt-4 pt-4 border-top">
            <div className="d-flex justify-content-between align-items-center mb-3">
              {/* Lesson numbering starts after Lesson 1 (i.e., Lesson 2, 3, 4, ...) */}
              <h6 className="mb-0">Lesson {index + 2} Details (Optional)</h6>
              {/* Remove button for dynamic lessons */}
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeLesson(lesson.id)}
                title="Remove Lesson"
              >
                <i className="bi bi-x"></i> Remove
              </button>
            </div>
            <div className="row mb-3">
              <div className="col-md-6 mb-3 mb-md-0">
                <label className="form-label small muted">Lesson Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={lesson.title}
                  onChange={(e) =>
                    handleAdditionalLessonChange(
                      lesson.id,
                      "title",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Custom Hooks"
                />
              </div>
              <div className="col-md-3 mb-3 mb-md-0">
                <label className="form-label small muted">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={lesson.duration}
                  onChange={(e) =>
                    handleAdditionalLessonChange(
                      lesson.id,
                      "duration",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 20"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small muted">Status</label>
                <select
                  className="form-select"
                  value={lesson.status}
                  onChange={(e) =>
                    handleAdditionalLessonChange(
                      lesson.id,
                      "status",
                      e.target.value
                    )
                  }
                >
                  <option value="Start">Start</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <button type="submit" className="btn btn-sm btn-primary mt-3">
          Save New Module
        </button>
      </form>
    </div>
  );
}

// ... rest of the component functions (InstructorForm, ReviewForm, etc.)

function InstructorForm({ addInstructor, toggleForm }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [students, setStudents] = useState("");
  const [courses, setCourses] = useState("");
  const [rating, setRating] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const newInstructor = {
      name,
      title,
      stats: {
        students: students || "N/A",
        courses: courses || "N/A",
        rating: rating || "N/A",
      },
    };
    addInstructor(newInstructor); // Adds a new card
    toggleForm(false);
  };
  return (
    <div className="instructor-card p-4 rounded-3 d-flex flex-column mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Add New Instructor</h5>
        <button
          className="btn btn-sm btn-light"
          onClick={() => toggleForm(false)}
        >
          <i className="bi bi-x"></i> Close
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label small muted">Name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Doe"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label small muted">Title/Description</label>
          <textarea
            className="form-control"
            rows="3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Expert in React and Node.js"
            required
          ></textarea>
        </div>
        <div className="row mb-3">
          <div className="col-md-4">
            <label className="form-label small muted">Students</label>
            <input
              type="text"
              className="form-control"
              value={students}
              onChange={(e) => setStudents(e.target.value)}
              placeholder="e.g. 50,000+"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small muted">Courses</label>
            <input
              type="text"
              className="form-control"
              value={courses}
              onChange={(e) => setCourses(e.target.value)}
              placeholder="e.g. 8"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small muted">Rating</label>
            <input
              type="text"
              className="form-control"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="e.g. 4.7"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-sm btn-primary">
          Save New Instructor
        </button>
      </form>
    </div>
  );
}

function ReviewForm({ addReview, toggleForm }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const newReview = {
      id: Date.now(),
      name,
      rating: parseInt(rating),
      text,
      avatar: name.substring(0, 2).toUpperCase(),
    };
    addReview(newReview);
    toggleForm(false);
  };

  return (
    <div className="review-card-screenshot p-4 rounded-3 d-flex flex-column mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Add New Review</h5>
        <button
          className="btn btn-sm btn-light"
          onClick={() => toggleForm(false)}
        >
          <i className="bi bi-x"></i> Close
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label small muted">Student Name</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small muted">Rating (1-5)</label>
            <select
              className="form-select"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Star
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label small muted">Review Text</label>
          <textarea
            className="form-control"
            rows="3"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your review here..."
            required
          ></textarea>
        </div>

        <button type="submit" className="btn btn-sm btn-primary">
          Submit Review
        </button>
      </form>
    </div>
  );
}

function ResourceList({ resources, enrolled = false }) {
  const downloadFile = (resource) => {
    if (!enrolled) {
      alert("Please enroll in this course to download resources.");
      return;
    }

    // If resource already has a stored dataURL (uploaded by user), download directly
    if (resource.dataURL) {
      const link = document.createElement("a");
      link.href = resource.dataURL;
      link.download = resource.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For default PDF resources, generate a simple PDF dynamically
    if (resource.type === "pdf") {
      const doc = new jsPDF("landscape", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      // Simple certificate-style PDF (copied from Full Stack Development certificate)
      const certTitle = "Full Stack Development";
      const profileName = "Deepak Kumar";

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(5);
      doc.rect(20, 20, pageWidth - 40, 550);

      doc.setFont("times", "bold");
      doc.setFontSize(32);
      doc.setTextColor(27, 51, 127);
      doc.text("Certificate of Completion", pageWidth / 2, 100, {
        align: "center",
      });

      doc.setFontSize(18);
      doc.setFont("times", "italic");
      doc.setTextColor(0, 0, 0);
      doc.text("This certificate is proudly presented to", pageWidth / 2, 150, {
        align: "center",
      });

      doc.setFont("times", "bold");
      doc.setFontSize(28);
      doc.setTextColor(27, 51, 127);
      doc.text(profileName, pageWidth / 2, 200, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(`for successfully completing the`, pageWidth / 2, 240, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(60, 60, 60);
      doc.text(certTitle, pageWidth / 2, 270, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text(`Date: Oct 2024`, pageWidth / 2, 320, { align: "center" });

      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text("KavyaLearn Academy", pageWidth / 2, 370, { align: "center" });

      // Save with the resource name so clicking any default PDF downloads a certificate file
      doc.save(resource.name);
      return;
    }

    // If resource has an external URL (e.g. uploaded to cloud storage), open in new tab
    const externalUrl = resource.url || resource.resourceUrl || resource.resource_url;
    if (externalUrl) {
      // Use anchor to trigger download where possible, otherwise open in new tab
      const link = document.createElement('a');
      link.href = externalUrl;
      // Try to set filename when possible
      try {
        link.download = resource.name || '';
      } catch (e) {}
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For default non-PDF resources (e.g., .zip), create a simple placeholder file
    const blob = new Blob(
      [`Sample content for ${resource.name} (placeholder file).`],
      { type: "application/octet-stream" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = resource.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="resources-panel p-4 rounded-3">
      <h5 className="resource-header-title">Course Resources</h5>
      {!enrolled && (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-info-circle me-2"></i>
          Please enroll in this course to download resources.
        </div>
      )}
      <div className="list-group list-group-flush resource-list-group">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="list-group-item d-flex align-items-center justify-content-between resource-item"
          >
            <div className="d-flex align-items-center gap-3">
              <div className="resource-icon d-flex align-items-center justify-content-center">
                <i className="bi bi-download"></i>
              </div>
              <div className="resource-name">
                {resource.name}
                {(resource.dataURL || resource.url || resource.resourceUrl) && (
                  <span className="badge bg-success ms-2">Uploaded</span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="resource-download-link btn btn-sm"
              disabled={!enrolled}
              title={!enrolled ? "Enroll to download this resource" : ""}
              onClick={() => {
                if (enrolled) {
                  downloadFile(resource);
                } else {
                  alert("Please enroll in this course to download resources.");
                }
              }}
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceForm({ addResource, toggleForm }) {
  const [file, setFile] = useState(null);
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a PDF file to upload.");
      return;
    }
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target.result;
      const newResource = {
        name: file.name,
        type: file.type,
        dataURL: dataURL,
      };
      addResource(newResource);
      toggleForm(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="resources-panel rounded-3 overflow-hidden mb-4">
      <div className="resource-header-title d-flex justify-content-between align-items-center px-4 pt-4">
        <h5 className="mb-0">Add New PDF Resource</h5>
        <button
          className="btn btn-sm btn-light"
          onClick={() => toggleForm(false)}
        >
          <i className="bi bi-x"></i> Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 pt-2">
        <div className="mb-3">
          <label className="form-label small muted">
            Upload PDF File (Max 10MB for storage test)
          </label>
          <input
            type="file"
            className="form-control"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
          {file && (
            <div className="small mt-2 text-primary">
              Selected: **{file.name}**
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-sm btn-primary">
          Save Resource
        </button>
      </form>
    </div>
  );
}

// ===================================

// ===================================
// QUIZ COMPONENTS (Modified/New)
// ===================================

// Hardcoded Questions (5 Questions)
const defaultQuizQuestions = [
  {
    id: 1,
    question:
      "What is the primary purpose of ethical hacking?",
    options: [
      "To steal sensitive data",
      "To find and fix security vulnerabilities",
      "To damage computer systems",
      "To perform illegal activities"
    ],
    answerIndex: 1, // find and fix vulnerabilities
  },
  {
    id: 2,
    question: "Which tool is commonly used for network scanning?",
    options: ["Nmap", "Photoshop", "MySQL", "React"],
    answerIndex: 0, // Nmap
  },
  {
    id: 3,
    question: "What does SQL Injection target?",
    options: [
      "Web server hardware",
      "Database queries",
      "Email accounts",
      "Operating system files"
    ],
    answerIndex: 1, // Database queries
  },
  {
    id: 4,
    question: "Which of the following is a type of malware?",
    options: ["Firewall", "Trojan", "VPN", "HTTP"],
    answerIndex: 1, // Trojan
  },
  {
    id: 5,
    question: "What does VPN stand for?",
    options: [
      "Virtual Private Network",
      "Verified Protection Node",
      "Variable Protocol Number",
      "Virtual Process Navigation"
    ],
    answerIndex: 0, // Virtual Private Network
  },
];


// NEW Component: QuizResultModal (For pop-up display)
function QuizResultModal({ show, score, quizData, onClose }) {
  const totalQuestionsFixed = defaultQuizQuestions.length; // 5 questions
  const percentage = (score / totalQuestionsFixed) * 100;
  // Get passing score from the quiz data, default to 70 if not available
  const passingScore = quizData.passingScore || 70;
  const isPassed = percentage >= passingScore;

  if (!show) {
    return null;
  }

  // --- PASS Content ---
  const passContent = (
    <div className="text-center text-success">
      <h3
        className="mb-3"
        style={{ fontSize: "30px", fontWeight: "700", color: "#0bb7ab" }}
      >
        PASS:
      </h3>
      <h4 className="mb-3" style={{ fontWeight: "600" }}>
        Congratulations! 🎉
      </h4>
      <p style={{ fontSize: "16px" }}>You’ve successfully passed this quiz!</p>
      {/* Displaying actual score as per the request, formatted to match '85%' style */}
      <div
        className="fw-bold mb-4"
        style={{ fontSize: "24px", color: "#0bb7ab" }}
      >
        You scored {Math.round(percentage)}%.
      </div>
      <button
        className="btn btn-primary"
        onClick={() => onClose(true)} // Close and end quiz view
      >
        <i className="bi bi-check-circle me-2"></i> Close
      </button>
    </div>
  );

  // --- FAIL Content ---
  const failContent = (
    <div className="text-center text-danger">
      <h3
        className="mb-3"
        style={{ fontSize: "30px", fontWeight: "700", color: "#dc3545" }}
      >
        FAIL:
      </h3>
      <h4 className="mb-3" style={{ fontWeight: "600" }}>
        Missed It by a Bit 🎯
      </h4>
      <p style={{ fontSize: "16px" }}>
        Keep the focus — you’re already improving!
      </p>
      {/* Displaying actual score for context */}
      <div
        className="fw-bold mb-4"
        style={{ fontSize: "24px", color: "#dc3545" }}
      >
        You scored {Math.round(percentage)}%.
      </div>
      <button
        className="btn btn-outline-danger"
        onClick={() => onClose(false)} // Close and reset quiz for retake
      >
        <i className="bi bi-arrow-clockwise me-2"></i> Retake Quiz
      </button>
    </div>
  );

  return (
    // 1. Modal Overlay (Backdrop)
    <div
      onClick={() => onClose(true)} // Close when clicking backdrop
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        // MODIFICATION: Set background to transparent to remove black overlay
        backgroundColor: "rgba(0, 0, 0, 0.0)",
        // Centering is already correct
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1050,
      }}
    >
      {/* 2. Modal Content Box */}
      <div
        className="rounded-3 p-5"
        style={{
          width: "90%",
          maxWidth: "500px",
          backgroundColor: "#fff",
          boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Close Button on Modal */}
        <button
          type="button"
          className="btn-close"
          style={{ position: "absolute", top: "15px", right: "15px" }}
          onClick={() => onClose(true)}
        ></button>
        <h5 className="modal-title mb-4 text-center border-bottom pb-3">
          Quiz Result for: {quizData.name}
        </h5>
        {isPassed ? passContent : failContent}
      </div>
    </div>
  );
}

// NEW QuizInterface Component
function QuizInterface({ quizData, endQuiz }) {
  const [selections, setSelections] = useState({}); // Stores {questionId: selectedOptionIndex}
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [, setPercentageScore] = useState(0); // New state for percentage
  const [showResultModal, setShowResultModal] = useState(false); // New state for modal

  const handleOptionChange = (questionId, optionIndex) => {
    if (submitted) return;
    setSelections((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleModalClose = (endQuizView) => {
    setShowResultModal(false); // Hide the modal

    // If we pass 'true' (from PASS button or modal X/backdrop click), return to quiz list.
    if (endQuizView) {
      endQuiz(score);
    } else {
      // If we pass 'false' (from Retake Quiz button), reset quiz state for retake.
      setSelections({});
      setSubmitted(false);
      setScore(0);
      setPercentageScore(0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitted) return;

    let correctAnswers = 0;
    const totalQuestions = defaultQuizQuestions.length;

    defaultQuizQuestions.forEach((q) => {
      const selectedIndex = selections[q.id];
      if (selectedIndex === q.answerIndex) {
        correctAnswers++;
      }
    });

    const calculatedPercentage = (correctAnswers / totalQuestions) * 100;

    setScore(correctAnswers);
    setPercentageScore(calculatedPercentage);
    setSubmitted(true);
    // Show the new modal!
    setShowResultModal(true);
    // Do NOT call endQuiz here. Call it when the modal is closed via the 'Close' button.
  };

  const getResultColor = (questionId, optionIndex) => {
    if (!submitted) return "";
    const question = defaultQuizQuestions.find((q) => q.id === questionId);
    const selectedIndex = selections[questionId];

    // If submitted, check for correctness/selection
    if (optionIndex === question.answerIndex) {
      return "text-success fw-bold"; // Correct answer (green)
    }
    if (optionIndex === selectedIndex && optionIndex !== question.answerIndex) {
      return "text-danger fw-bold"; // Incorrect selection (red)
    }

    return "";
  };

  return (
    <div className="p-4 bg-white rounded-3 shadow-sm">
      <h4 className="mb-4">{quizData.name}</h4>
      <p className="small muted">
        Answer all {defaultQuizQuestions.length} questions. You need a score of{" "}
        {quizData.passingScore}% to pass.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="d-flex flex-column gap-4">
          {defaultQuizQuestions.map((q, qIndex) => (
            <div key={q.id} className="p-3 border rounded">
              <p className="fw-bold mb-3">
                {" "}
                {qIndex + 1}. {q.question}{" "}
              </p>
              {/* Options */}
              <div className="d-flex flex-column gap-2">
                {q.options.map((option, oIndex) => (
                  <div key={oIndex} className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`question-${q.id}`}
                      id={`option-${q.id}-${oIndex}`}
                      checked={selections[q.id] === oIndex}
                      onChange={() => handleOptionChange(q.id, oIndex)}
                      disabled={submitted}
                    />
                    <label
                      className={`form-check-label ${getResultColor(
                        q.id,
                        oIndex
                      )}`}
                      htmlFor={`option-${q.id}-${oIndex}`}
                      style={{ cursor: submitted ? "default" : "pointer" }}
                    >
                      {option}
                      {submitted && oIndex === q.answerIndex && (
                        <i className="bi bi-check-circle-fill text-success ms-2"></i>
                      )}
                      {submitted &&
                        oIndex === selections[q.id] &&
                        oIndex !== q.answerIndex && (
                          <i className="bi bi-x-circle-fill text-danger ms-2"></i>
                        )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-primary mt-4"
          disabled={submitted}
        >
          Submit Quiz
        </button>
      </form>

      {/* NEW: Result Modal is rendered here */}
      <QuizResultModal
        show={showResultModal}
        score={score}
        quizData={quizData}
        onClose={handleModalClose}
      />
    </div>
  );
}

// Quiz Form (Unchanged)
function QuizForm({ addQuiz, toggleForm }) {
  const [quizName, setQuizName] = useState("");
  const [questions, setQuestions] = useState("");
  const [passingScore, setPassingScore] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const newQuiz = {
      name: quizName,
      questions: parseInt(questions) || 0,
      passingScore: parseInt(passingScore) || 0,
      status: "Start Quiz",
      iconClass: "bi-patch-question",
      iconBgClass: "lesson-icon",
      // Add a unique ID for persistent results later (simplified for now)
      id: Date.now(),
    };
    addQuiz(newQuiz);
    toggleForm(false);
  };

  return (
    <div className="curriculum-panel rounded-3 overflow-hidden mb-3">
      <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-patch-question header-icon"></i>
          <strong>Add New Quiz</strong>
        </div>
        <button
          className="btn btn-sm btn-light"
          onClick={() => toggleForm(false)}
        >
          <i className="bi bi-x"></i> Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white">
        <div className="row mb-3">
          <div className="col-md-6 mb-3 mb-md-0">
            <label className="form-label small muted">Quiz Name</label>
            <input
              type="text"
              className="form-control"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="e.g. Module 2 Assessment"
              required
            />
          </div>

          <div className="col-md-3 mb-3 mb-md-0">
            <label className="form-label small muted">
              Total Questions (Not Implemented)
            </label>
            <input
              type="number"
              className="form-control"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="e.g. 10"
              required
            />
          </div>

          <div className="col-md-3">
            <label className="form-label small muted">Passing Score (%)</label>
            <input
              type="number"
              className="form-control"
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              placeholder="e.g. 70"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-sm btn-primary mt-3">
          Save New Quiz
        </button>
      </form>
    </div>
  );
}

// Quiz List (Unchanged)
function QuizList({ quizzes, startQuiz, enrolled = false }) {
  return (
    <div className="curriculum-panel rounded-3 overflow-hidden mb-3">
      <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-patch-question header-icon"></i>
          <strong>Available Quizzes</strong>
        </div>
      </div>
      {!enrolled && (
        <div className="alert alert-warning m-3 mb-0">
          <i className="bi bi-info-circle me-2"></i>
          Please enroll in this course to attempt quizzes.
        </div>
      )}
      <div className="list-group list-group-flush">
        {quizzes.map((quiz, index) => (
          <div
            key={index}
            className="list-group-item d-flex align-items-start justify-content-between"
          >
            <div className="d-flex align-items-start gap-3">
              <div
                className={`${quiz.iconBgClass} rounded-circle d-flex align-items-center justify-content-center`}
                style={{
                  width: "44px",
                  height: "44px",
                  fontSize: "18px",
                  background: "#f3fcfb",
                  color: "#0bb7ab",
                  marginRight: "12px",
                }}
              >
                <i className={`bi ${quiz.iconClass}`}></i>
              </div>
              <div>
                <div className="lesson-title">{quiz.name}</div>
                <div className="lesson-duration">
                  {quiz.questions} Questions | Pass: {quiz.passingScore}%
                </div>
              </div>
            </div>
            <button
              type="button"
              className="lesson-action"
              disabled={!enrolled}
              title={!enrolled ? "Enroll to attempt this quiz" : ""}
              onClick={() => {
                if (enrolled) {
                  startQuiz(quiz);
                } else {
                  alert("Please enroll in this course to attempt quizzes.");
                }
              }}
            >
              {quiz.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================================
// ===================================
// MAIN COMPONENT
// ===================================

export default function Courses() {
  // --- UI STATES ---
  const navigate = useNavigate();
  // `tab` holds the currently expanded section. null means all collapsed.
  const [tab, setTab] = useState(null);
  const curriculumRef = useRef(null);
  const [showInstructorForm, setShowInstructorForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  // ✅ NEW: State for active quiz interface
  const [activeQuiz, setActiveQuiz] = useState(null);
  // State for active videos in different sections
  const [heroVideo, setHeroVideo] = useState(null);
  const [heroTitle, setHeroTitle] = useState("");
  const [gettingStartedVideo, setGettingStartedVideo] = useState(null);
  const [gettingStartedTitle, setGettingStartedTitle] = useState("");
  const [coreConceptsVideo, setCoreConceptsVideo] = useState(null);
  const [coreConceptsTitle, setCoreConceptsTitle] = useState("");

  // --- STATE WITH LOCAL STORAGE PERSISTENCE ---
  // Curriculum: Only persisting the NEW modules
  const [newModules, setNewModules] = useLocalStorage("newModules", []);
  const [gettingStarted] = useState(initialGettingStarted);
  const [coreConcepts] = useState(initialCoreConcepts);
  const [practicalApplications] = useState(initialPracticalApplications);

  // Course metadata (defaults to 0 when not available)
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [courseRating, setCourseRating] = useState(0);

  // Enrollment and watched lessons state
  // 'enrolled' controls whether the student can access lessons
  // NOTE: We'll persist enrollment per-user+course in localStorage to avoid
  // leaking optimistic enrollment to other users of the same browser.
  const [enrolled, setEnrolled] = useState(false);

  // Keep track of watched lesson titles to compute progress
  // We'll persist watched lessons per-user *per-course* in localStorage under key `watchedLessons_{userId}`
  // The value is an object mapping { [courseId]: [lessonTitle, ...] }
  const [userProfile, setUserProfile] = useState(null);
  const [watchedByCourse, setWatchedByCourse] = useState({});
  // Server-side enrollment/progress load state: keep UI at 0% until backend confirms progress
  const [serverProgressLoaded, setServerProgressLoaded] = useState(false);
  const [serverProgressValue, setServerProgressValue] = useState(null); // percent (0-100) or null
  const [enrolledCourseTitle, setEnrolledCourseTitle] = useState('Complete Ethical Hacking Course');

  // Get watched lessons for a course id
  const getWatchedFor = (courseId) => {
    if (!courseId) return [];
    return watchedByCourse[courseId] || [];
  };

  // Persist watched lessons for a specific course and update local state + localStorage
  const persistWatchedFor = (courseId, lessonsArray) => {
    const cid = courseId || 'unknownCourse';
    setWatchedByCourse((prev) => {
      const next = Object.assign({}, prev, { [cid]: lessonsArray || [] });
      try {
        const key = userProfile && userProfile._id ? `watchedLessons_${userProfile._id}` : 'watchedLessons_guest';
        const storedRaw = window.localStorage.getItem(key);
        let stored = {};
        if (storedRaw) {
          try { stored = JSON.parse(storedRaw) || {}; } catch (e) { stored = {}; }
        }
        stored[cid] = lessonsArray || [];
        window.localStorage.setItem(key, JSON.stringify(stored));
      } catch (err) {
        console.warn('Could not persist watched lessons by course', err);
      }
      return next;
    });
  };

  const location = useLocation();
  // Current course id (from URL) used to scope watched lessons locally
  const currentCourseId = new URLSearchParams(location.search || window.location.search).get('id');

  // Whenever we navigate to a different course, reset server progress loaded flag so
  // UI shows 0% until the backend confirms the enrollment/progress for the new course.
  useEffect(() => {
    setServerProgressLoaded(false);
    setServerProgressValue(null);
  }, [currentCourseId]);

  // Helper: compute storage key for persisted enrolled flag scoped to user and course
  const getPersistedEnrolledKey = (uProfile = null, cId = null) => {
    try {
      const courseIdFromUrl = cId || new URLSearchParams(location.search || window.location.search).get('id') || window.localStorage.getItem('currentCourseId') || 'unknownCourse';
      const userId = uProfile && uProfile._id ? uProfile._id : null;
      return userId ? `enrolled_${userId}_${courseIdFromUrl}` : `enrolled_guest_${courseIdFromUrl}`;
    } catch (e) {
      return `enrolled_guest_unknown`;
    }
  };

  const readPersistedEnrolledFor = (uProfile = null, cId = null) => {
    try {
      const key = getPersistedEnrolledKey(uProfile, cId);
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) === true : false;
    } catch (e) {
      return false;
    }
  };

  const writePersistedEnrolledFor = (value, uProfile = null, cId = null) => {
    try {
      const key = getPersistedEnrolledKey(uProfile, cId);
      window.localStorage.setItem(key, JSON.stringify(!!value));
    } catch (e) {
      // ignore
    }
  };

  // Helper to compute a storage key for course completion date per user+course
  const getCompletionStorageKey = (uProfile = null, cId = null) => {
    try {
      const courseIdFromUrl = cId || new URLSearchParams(location.search || window.location.search).get('id') || window.localStorage.getItem('currentCourseId') || 'unknownCourse';
      const userId = uProfile && uProfile._id ? uProfile._id : null;
      return userId ? `completionDate_${userId}_${courseIdFromUrl}` : `completionDate_guest_${courseIdFromUrl}`;
    } catch (e) {
      return `completionDate_guest_unknown`;
    }
  };

  // Check enrollment status with backend on component mount and when URL query changes
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Determine courseId early so persisted keys can be computed
        const courseId = new URLSearchParams(location.search || window.location.search).get('id');

        // Read token first. If user is authenticated, defer reading any guest-scoped
        // persisted enrollment until we have the user profile. This prevents a
        // previously-set guest key from granting access to a different logged-in user.
        const token = localStorage.getItem('token');

        let persistedEnrolled = false;
        if (!token) {
          // No auth token: it's safe to consider guest-scoped persisted enrollment
          persistedEnrolled = readPersistedEnrolledFor(null, courseId);
          if (persistedEnrolled && active) setEnrolled(true);
        } else {
          // Authenticated flow: do NOT apply guest-scoped persisted enrollments here.
          // We will apply any user-scoped persisted enrollment after the profile is loaded.
          persistedEnrolled = false;
        }
        if (!token) {
          // No token and no persisted enrolled flag -> not enrolled
          if (!persistedEnrolled) {
            if (active) setEnrolled(false);
            return;
          }
          // No token but persistedEnrolled is true: keep optimistic state and skip backend checks
          return;
        }

        // If we were just redirected from a successful payment, optimistically unlock
        // while we poll the backend for authoritative activation status.
        try {
          const justPaid = window.localStorage.getItem('justPaid');
          if (justPaid) {
            // Optimistically mark the course as enrolled so the UI unlocks immediately
            setEnrolled(true);
            // Persist the enrolled flag scoped to user+course. If we have a token but
            // no loaded profile yet, fetch the profile so we can write a user-scoped key
            // instead of a guest key.
            try {
              if (token && !userProfile) {
                try {
                  const profileRes = await fetch('/api/auth/profile', { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
                  if (profileRes.ok) {
                    const profile = await profileRes.json();
                    setUserProfile(profile);
                    writePersistedEnrolledFor(true, profile, courseId);
                  } else {
                    // fallback to guest-scoped key if profile fetch fails
                    writePersistedEnrolledFor(true, null, courseId);
                  }
                } catch (e) {
                  writePersistedEnrolledFor(true, null, courseId);
                }
              } else {
                writePersistedEnrolledFor(true, userProfile, courseId);
              }
            } catch (err) {}
            // remove the transient justPaid flag so we don't keep optimistic-only state
            window.localStorage.removeItem('justPaid');
          }
        } catch (e) {
          // ignore
        }

        // Validate the courseId looks like a Mongo ObjectId. If not present or invalid,
        // we'll attempt a fallback: fetch the user's enrollments and try to locate
        // a matching enrollment by stored enrollment id or stored course id.
        const isValidObjectId = (id) => !!id && /^[0-9a-fA-F]{24}$/.test(id);

        // Helper to check enrollment via course endpoint (preferred when we have a valid id)
        const fetchStatusByCourse = async (cId) => {
          try {
            const res = await fetch(`/api/enrollments/course/${cId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return null;
            return await res.json();
          } catch (e) {
            return null;
          }
        };

        // Helper to get user's enrollments list and attempt to find a matching enrollment
        const fetchStatusFromList = async () => {
          try {
            const res = await fetch(`/api/enrollments`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return null;
            const list = await res.json();
            const storedEnrollmentId = window.localStorage.getItem('currentEnrollmentId');
            const storedCourseId = window.localStorage.getItem('currentCourseId') || courseId;

            const found = list.find((e) => {
              // enrollment id may be in _id
              if (storedEnrollmentId && e._id && e._id.toString() === storedEnrollmentId) return true;
              // courseId might be populated as object or raw id
              if (storedCourseId && e.courseId) {
                if (typeof e.courseId === 'string' && e.courseId === storedCourseId) return true;
                if (e.courseId._id && e.courseId._id.toString() === storedCourseId) return true;
              }
              return false;
            });

            if (!found) return { enrolled: false, status: null };

            return {
              enrolled: found.enrollmentStatus === 'active',
              status: found.enrollmentStatus,
              enrollmentId: found._id,
              progressPercentage: found.progressPercentage,
              completed: found.completed
            };
          } catch (e) {
            return null;
          }
        };

        // Primary attempt: if courseId looks valid, query the course endpoint
        let statusData = null;
        if (isValidObjectId(courseId)) {
          statusData = await fetchStatusByCourse(courseId);
        } else {
          // Try to resolve enrollment using user's enrollments list (demo/static ids)
          statusData = await fetchStatusFromList();
        }

        // If primary attempt failed but we have a stored enrollment id, try listing enrollments
        if (!statusData) {
          statusData = await fetchStatusFromList();
        }

        if (statusData) {
          const isNowEnrolled = statusData.enrolled === true || statusData.status === 'active';
          // Do not override a locally persisted enrolled flag with a server 'not enrolled'
          if (active && !persistedEnrolled) setEnrolled(isNowEnrolled);
          else if (active && persistedEnrolled && isNowEnrolled) setEnrolled(true);

          // Mark server progress loaded for this course and record the server value (if provided)
          try {
            setServerProgressLoaded(true);
            setServerProgressValue(typeof statusData.progressPercentage === 'number' ? statusData.progressPercentage : 0);
          } catch (e) {
            // ignore
          }

          // If not yet active, poll a few times to catch asynchronous activation
          if (!isNowEnrolled) {
            const pendingEnrollmentId = statusData.enrollmentId || window.localStorage.getItem('currentEnrollmentId');
            const shouldPoll = pendingEnrollmentId || statusData.status === 'pending';
            if (shouldPoll) {
              let attempts = 0;
              const maxAttempts = 6; // ~6 seconds
              let polledEnrolled = false;
              while (attempts < maxAttempts && !polledEnrolled) {
                // wait 1s
                await new Promise((res) => setTimeout(res, 1000));
                attempts += 1;
                try {
                  let retryData = null;
                  if (isValidObjectId(courseId)) {
                    const retryRes = await fetch(`/api/enrollments/course/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (retryRes.ok) retryData = await retryRes.json();
                  } else {
                    // Re-list user enrollments and search for the pending enrollment
                    const listRes = await fetch(`/api/enrollments`, { headers: { Authorization: `Bearer ${token}` } });
                    if (listRes.ok) {
                      const list = await listRes.json();
                      const storedEnrollmentId = window.localStorage.getItem('currentEnrollmentId');
                      const found = list.find((e) => (storedEnrollmentId && e._id && e._id.toString() === storedEnrollmentId) || (e.courseId && ((typeof e.courseId === 'string' && e.courseId === (window.localStorage.getItem('currentCourseId') || courseId)) || (e.courseId._id && e.courseId._id.toString() === (window.localStorage.getItem('currentCourseId') || courseId)))));
                      if (found) retryData = {
                        enrolled: found.enrollmentStatus === 'active',
                        status: found.enrollmentStatus,
                        enrollmentId: found._id
                      };
                    }
                  }

                  if (retryData && (retryData.enrolled === true || retryData.status === 'active')) {
                    polledEnrolled = true;
                    if (active) setEnrolled(true);
                    if (retryData.enrollmentId) {
                      try { window.localStorage.setItem('currentEnrollmentId', retryData.enrollmentId); } catch (e) {}
                    }
                    // Update server progress info from retry data
                    try {
                      setServerProgressLoaded(true);
                      setServerProgressValue(typeof retryData.progressPercentage === 'number' ? retryData.progressPercentage : 0);
                    } catch (e) {}
                    break;
                  }
                } catch (e) {
                  // ignore transient errors and continue polling
                }
              }
            }
          }
        } else {
          // If cannot determine enrollment, default to not enrolled only when
          // there is no locally persisted enrolled flag (used for local tests).
          if (!persistedEnrolled) {
            if (active) setEnrolled(false);
          }
          // Mark server progress as loaded (no enrollment found -> 0%) so UI shows 0 until user takes action
          try { setServerProgressLoaded(true); setServerProgressValue(0); } catch (e) {}
        }
      } catch (err) {
        console.warn('Could not verify enrollment status:', err);
        // On error, default to not enrolled
        if (active) setEnrolled(false);
      }
    })();
    return () => { active = false; };
  }, [location.search]);

  // Load user profile and per-user watched lessons on mount
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const profileRes = await fetch('/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData);
          // After loading profile, make sure persisted per-user enrolled flag is applied
          try {
            const courseId = new URLSearchParams(location.search || window.location.search).get('id');
            const p = readPersistedEnrolledFor(profileData, courseId);
            if (p) setEnrolled(true);
            // Remove any guest-scoped persisted enrollment for this course so a previous
            // anonymous payment cannot accidentally grant access to the logged-in user.
            try {
              const guestKey = `enrolled_guest_${courseId || 'unknownCourse'}`;
              window.localStorage.removeItem(guestKey);
            } catch (e) {}
          } catch (e) {}
          // load per-user watched lessons (stored as map by courseId)
          const key = `watchedLessons_${profileData._id}`;
          const raw = window.localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              setWatchedByCourse(parsed && typeof parsed === 'object' ? parsed : {});
            } catch (e) {
              setWatchedByCourse({});
            }
          } else {
            // No stored watched lessons for this user: start with empty map (0% progress per course)
            setWatchedByCourse({});
            try {
              window.localStorage.setItem(key, JSON.stringify({}));
            } catch (err) {
              console.warn('Failed to persist watched lessons map', err);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load profile for watched lessons', err);
      }
    })();
  }, []);

  // Load persisted enrolled course title (set after payment)
  useEffect(() => {
    try {
      const t = window.localStorage.getItem('currentCourseTitle');
      if (t) setEnrolledCourseTitle(t);
    } catch (e) {}
  }, []);

  // When courseId in URL changes, fetch the course title so hero shows correct name
  useEffect(() => {
    const courseId = new URLSearchParams(location.search || window.location.search).get('id');
    if (!courseId) return;

    let active = true;
    (async () => {
      try {
        // Try public course endpoint first (works for both paid and free courses)
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) return;
        const payload = await res.json();
        // payload might be course object or { data: course }
        const course = payload && payload.data ? payload.data : payload;
        if (!course) return;
        const title = course.title || course.name || '';
        if (active && title) {
          setEnrolledCourseTitle(title);
          try { window.localStorage.setItem('currentCourseTitle', title); } catch (e) {}
        }
      } catch (err) {
        // ignore errors
      }
    })();

    return () => { active = false; };
  }, [location.search]);

  // Active lesson player state (for Practical Applications and new modules)
  const [activeLessonVideo, setActiveLessonVideo] = useState(null);
  const [activeLessonTitle, setActiveLessonTitle] = useState("");

  // Track total courses count for "View More" button visibility
  const [totalCoursesCount, setTotalCoursesCount] = useState(0);

  // Instructor: Persisting the added instructors
  const [instructor] = useState(initialInstructor);
  const [otherInstructors, setOtherInstructors] = useLocalStorage(
    "otherInstructors",
    []
  );

  // Reviews: Persisting the reviews (default reviews + new ones)
  const [reviews, setReviews] = useLocalStorage("reviews", initialReviews);

  // Resources: Persisting the resources (default resources + new ones)
  const [resources, setResources] = useLocalStorage(
    "resources",
    initialResources
  );

  // Quizzes: Persisting the quizzes (default quizzes + new ones)
  const [quizzes, setQuizzes] = useLocalStorage("quizzes", initialQuizzes);

  // --- HANDLERS ---
  const addCurriculumModule = (newModule) => {
    setNewModules((prevModules) => [...prevModules, newModule]);
  };

  const addInstructor = (newInstructor) => {
    setOtherInstructors((prevInstructors) => [
      ...prevInstructors,
      newInstructor,
    ]);
  };

  const addReview = (newReview) => {
    setReviews((prevReviews) => [newReview, ...prevReviews]); // Newest first
  };

  const addResource = (newResource) => {
    setResources((prevResources) => [...prevResources, newResource]);
  };

  const addQuiz = (newQuiz) => {
    setQuizzes((prevQuizzes) => [...prevQuizzes, newQuiz]);
  };

  // Quiz Handlers
  const startQuizHandler = (quiz) => {
    setActiveQuiz(quiz);
  };

  const endQuizHandler = (finalScore) => {
    // This function can be used to update the quiz status/score in the main list
    console.log(`Quiz ended with score: ${finalScore}`);
    setActiveQuiz(null); // Return to the quiz list view
  };

  // Handle Enrollment
  const handleEnrollClick = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login first to enroll in this course');
        return;
      }

      // Get courseId from URL params
      let courseId = new URLSearchParams(window.location.search).get('id');
      
      // If no courseId in URL, try to get from localStorage
      if (!courseId) {
        courseId = localStorage.getItem('currentCourseId');
      }

      // If courseId is missing or not a DB id, don't block navigation —
      // the subscription page can handle selection or show available courses.
      if (!courseId) {
        console.warn('No courseId found; proceeding to subscription without course identifier.');
      }

      // Store courseId only when available
      if (courseId) localStorage.setItem('currentCourseId', courseId);

      // Navigate to subscription page using React Router (SPA navigation)
      navigate('/subscription');
      
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('An error occurred while enrolling. Please try again.');
    }
  };

  const handleDownloadCertificate = async () => {
    // Only allow certificate download when progress is 100%
    if (typeof progressPercent !== 'undefined' && progressPercent < 100) {
      alert('You must complete 100% of the course to download the certificate.');
      return;
    }

    // Resolve dynamic values: student name, course title and completion date
    const courseId = new URLSearchParams(location.search || window.location.search).get('id') || window.localStorage.getItem('currentCourseId');
    const certTitle = enrolledCourseTitle || window.localStorage.getItem('currentCourseTitle') || 'Course Completion';

    // Derive profile name from loaded profile if available (try several fields)
    // If we have an auth token but no loaded `userProfile`, try to fetch it so we have the real name
    try {
      const token = window.localStorage.getItem('token');
      if (token && !userProfile) {
        try {
          const res = await fetch('/api/auth/profile', { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const profileData = await res.json();
            // helpful debug log — can be removed later
            console.debug('Fetched profile for certificate generation:', profileData);
            // update local state so the rest of the component can reuse it
            setUserProfile(profileData);
          } else {
            console.debug('Profile fetch returned non-ok status for certificate generation');
          }
        } catch (e) {
          console.debug('Profile fetch failed in certificate generation:', e);
        }
      }
    } catch (e) {
      // ignore
    }

  const profileName = (() => {
      try {
        const p = userProfile || {};
        // Common full-name fields
        if (p.name) return p.name;
        if (p.fullName) return p.fullName;
        if (p.full_name) return p.full_name;

        // First/last combos (different possible keys)
        const first = (p.firstName || p.first_name || p.firstname || '').trim();
        const last = (p.lastName || p.last_name || p.lastname || '').trim();
        const combined = `${first} ${last}`.trim();
        if (combined) return combined;

        // Other fallbacks
        if (p.username) return p.username;
        if (p.displayName) return p.displayName;
        if (p.email) return p.email.split('@')[0];

        // Nested shapes (e.g. { user: { name: ... } })
        if (p.user && (p.user.name || p.user.first_name || p.user.firstName)) {
          return p.user.name || `${p.user.firstName || p.user.first_name} ${p.user.lastName || p.user.last_name}`.trim();
        }

        // Try localStorage keys the app or other pages might set
        const stored = window.localStorage.getItem('profileName') || window.localStorage.getItem('name') || window.localStorage.getItem('user');
        if (stored) return stored;

        return 'Student';
      } catch (e) {
        return 'Student';
      }
    })();

    // Normalize display: title-case each word (turn 'ruhi' -> 'Ruhi')
    const displayName = (() => {
      try {
        if (!profileName) return 'Student';
        return profileName
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } catch (e) {
        return profileName || 'Student';
      }
    })();

    // Try to read a persisted completion date (ISO) for this user+course; fallback to today
    let completionIso = null;
    try {
      const key = getCompletionStorageKey(userProfile, courseId);
      completionIso = window.localStorage.getItem(key);
    } catch (e) {
      completionIso = null;
    }
    const completionDate = completionIso ? new Date(completionIso).toLocaleDateString() : new Date().toLocaleDateString();

    const cert = { title: certTitle, date: completionDate };
    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Border
    doc.setDrawColor(212, 175, 55); // Gold
    doc.setLineWidth(5);
    doc.rect(20, 20, pageWidth - 40, 550);

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(32);
    doc.setTextColor(27, 51, 127);
    doc.text("Certificate of Completion", pageWidth / 2, 100, {
      align: "center",
    });

    // Subtitle
    doc.setFontSize(18);
    doc.setFont("times", "italic");
    doc.setTextColor(0, 0, 0);
    doc.text("This certificate is proudly presented to", pageWidth / 2, 150, {
      align: "center",
    });

  // Recipient Name
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(27, 51, 127);
  doc.text(displayName, pageWidth / 2, 200, { align: "center" });

    // Course Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`for successfully completing the`, pageWidth / 2, 240, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(60, 60, 60);
    doc.text(`${cert.title}`, pageWidth / 2, 270, { align: "center" });

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(`Date: ${cert.date}`, pageWidth / 2, 320, { align: "center" });

    // Footer
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text("KavyaLearn Academy", pageWidth / 2, 370, { align: "center" });

    // Download PDF
    doc.save(`${cert.title}_Certificate.pdf`);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getCourses();
        if (res && res.courses) {
          // Store the count of available courses for "View More Courses" button visibility
          setTotalCoursesCount(Array.isArray(res.courses) ? res.courses.length : 0);
          // Replace the student stat with live course count for visibility
          // This is minimal, non-intrusive integration to show backend data
          // If you want more, we can wire the whole curriculum to course data
          // Update local 'students enrolled' stat (first stat card) by hijacking DOM via state is intrusive,
          // instead set a new local state for remoteCourses
          // For now, set quizzes list from backend if returned (as available)
          // If there are courses, also pre-populate quizzes list placeholder
          // We'll update quizzes local storage only when backend provides quizzes separately.
          // (This keeps original UX when backend unauthenticated.)
        }
      } catch (err) {
        console.warn('Failed to fetch courses for UI integration', err.message || err);
      }
    })();
  }, []);

  // Fetch single course details (if viewing a course) and merge backend-provided
  // resource into the resources list so students can see/download uploaded PDFs.
  useEffect(() => {
    const courseId = new URLSearchParams(location.search || window.location.search).get('id');
    if (!courseId) return;

    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) return;
        const course = await res.json();
        if (!course) return;
        const url = course.pdfResource || course.resourceUrl || course.resource_url || course.resource;
        if (!url) return;
        const name = course.pdfResourceName || course.resourceName || course.resource_name || (url.split('/').pop() || 'resource.pdf');
        if (active) {
          setResources((prev) => {
            // avoid duplicates by URL or name
            const exists = prev && prev.some(r => r.url === url || r.resourceUrl === url || r.name === name || r.dataURL === url);
            if (exists) return prev;
            const newRes = { name, type: 'pdf', url, dataURL: null };
            return [newRes, ...(prev || [])];
          });
        }
      } catch (e) {
        // ignore fetch errors
      }
    })();
    return () => { active = false; };
  }, [location.search]);

  // Handle tab parameter from URL (for search navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    // Valid tab names
    const validTabs = ['curriculum', 'instructor', 'reviews', 'quizzes', 'resources'];
    
    if (tabParam && validTabs.includes(tabParam.toLowerCase())) {
      setTab(tabParam.toLowerCase());
      
      // Scroll to curriculum if curriculum tab is opened
      if (tabParam.toLowerCase() === 'curriculum' && curriculumRef.current) {
        setTimeout(() => {
          curriculumRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }
  }, [location.search]);

  // Scroll curriculum into view whenever it's opened
  useEffect(() => {
    if (tab === "curriculum" && curriculumRef.current) {
      // Smooth scroll so user sees the curriculum content
      curriculumRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tab]);

  // Scroll to enroll button when navigating from search (if not enrolled)
  useEffect(() => {
    const courseId = new URLSearchParams(location.search || window.location.search).get('id');
    if (courseId && !enrolled) {
      // Delay to ensure the enroll button is rendered
      const timer = setTimeout(() => {
        const enrollButton = document.querySelector('[data-enroll-button="true"]');
        if (enrollButton) {
          enrollButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the button briefly
          enrollButton.style.transition = 'box-shadow 0.3s ease';
          enrollButton.style.boxShadow = '0 0 20px rgba(27, 101, 212, 0.5)';
          setTimeout(() => {
            enrollButton.style.boxShadow = '';
          }, 2000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.search, enrolled]);

  // Compute course progress based on watched lessons
  // If not enrolled, progress should always be 0%
  const totalLessons =
    gettingStarted.length +
    coreConcepts.length +
    practicalApplications.length +
    (newModules ? newModules.reduce((s, m) => s + (m.lessons ? m.lessons.length : 0), 0) : 0);

  const watchedCount = (enrolled && currentCourseId) ? getWatchedFor(currentCourseId).length : 0;
  let progressPercent = 0;
  if (!enrolled) {
    progressPercent = 0;
  } else if (!serverProgressLoaded) {
    // show 0 until server confirms enrollment/progress
    progressPercent = 0;
  } else if (serverProgressValue !== null) {
    // Prefer server-provided progress when available
    progressPercent = serverProgressValue;
  } else {
    progressPercent = totalLessons > 0 ? Math.round((watchedCount / totalLessons) * 100) : 0;
  }



  // Helper: Get all lessons in order across modules (for sequential unlocking)
  const allLessonsInOrder = [
    ...gettingStarted,
    ...coreConcepts,
    ...practicalApplications,
    ...(newModules ? newModules.flatMap(m => m.lessons || []) : [])
  ];

  // Function to render a curriculum list with sequential unlocking
  const renderCurriculumList = (list, onVideoClick, moduleKey = null) => (
    <div className="list-group list-group-flush">
      {list.map((lesson, index) => (
        <div
          key={index}
          className="list-group-item d-flex align-items-start justify-content-between"
        >
          <div className="d-flex align-items-start gap-3">
            {
              (() => {
                // Determine dynamic icon based on enrollment, sequential unlock, and watched status
                let dynamicIconClass = lesson.iconClass;
                let dynamicBgClass = lesson.iconBgClass;
                
                const isWatched = getWatchedFor(currentCourseId).includes(lesson.title);
                const currentLessonIndex = allLessonsInOrder.findIndex(l => l.title === lesson.title);
                
                // Check if previous lesson is watched (for sequential unlocking)
                let isPreviousLessonWatched = true;
                if (currentLessonIndex > 0) {
                  const previousLesson = allLessonsInOrder[currentLessonIndex - 1];
                  isPreviousLessonWatched = getWatchedFor(currentCourseId).includes(previousLesson.title);
                }
                
                // Determine if lesson is available (first lesson or previous watched)
                const isLessonUnlocked = currentLessonIndex === 0 || isPreviousLessonWatched;
                
                if (!enrolled) {
                  // When unenrolled: show lock icon for all lessons
                  dynamicIconClass = "bi-lock-fill";
                  dynamicBgClass = "muted-circle";
                } else if (isWatched) {
                  // When enrolled and watched: show checkmark (green)
                  dynamicIconClass = "bi-check2-circle";
                  dynamicBgClass = "lesson-icon";
                } else if (isLessonUnlocked) {
                  // When enrolled and available to start (first lesson or previous watched): show play icon (blue)
                  dynamicIconClass = "bi-play-circle";
                  dynamicBgClass = "lesson-icon";
                } else {
                  // When enrolled but locked (previous lesson not watched): show lock icon (gray)
                  dynamicIconClass = "bi-lock-fill";
                  dynamicBgClass = "muted-circle";
                }
                
                return (
                  <div
                    className={`${dynamicBgClass} rounded-circle d-flex align-items-center justify-content-center`}
                  >
                    <i className={`bi ${dynamicIconClass}`}></i>
                  </div>
                );
              })()
            }
            <div>
              <div className="lesson-title">{lesson.title}</div>
              <div className="lesson-duration">{lesson.duration}</div>
            </div>
          </div>
          {
            // Determine the visible label: Review and Start lessons locked until enrolled, then show as Start
            (() => {
              let visibleLabel = lesson.status;

              // Check if lesson is watched
              const isWatched = getWatchedFor(currentCourseId).includes(lesson.title);

              // Pre-compute sequence unlocking so it can be referenced in onClick as well
              const currentLessonIndex = allLessonsInOrder.findIndex(l => l.title === lesson.title);
              let isPreviousLessonWatched = true;
              if (currentLessonIndex > 0) {
                const previousLesson = allLessonsInOrder[currentLessonIndex - 1];
                isPreviousLessonWatched = getWatchedFor(currentCourseId).includes(previousLesson.title);
              }
              const isLessonsUnlockedBySequence = currentLessonIndex === 0 || isPreviousLessonWatched;

              // If user is not enrolled, everything (including previously watched items) should appear locked
              if (!enrolled) {
                visibleLabel = "Locked";
              } else if (isWatched) {
                // When enrolled and watched: show "Review"
                visibleLabel = "Review";
              } else if (lesson.status === "Review" || lesson.status === "Start") {
                // Enrolled: check sequential unlock
                visibleLabel = isLessonsUnlockedBySequence ? "Start" : "Locked";
              }

              const isLocked = visibleLabel === "Locked" || lesson.status === "Locked";

              return (
                <button
                  type="button"
                  className={lesson.actionClass}
                  disabled={isLocked}
                  onClick={(e) => {
                    e.preventDefault();

                    if (isLocked) {
                      // Prompt to enroll when locked
                      if (!enrolled) {
                        alert("Please enroll in this course to access lessons.");
                      } else if (!isLessonsUnlockedBySequence) {
                        alert("Please complete the previous lesson first.");
                      }
                      return;
                    }

                    // When visible as Start, play the lesson
                    if (onVideoClick) {
                      onVideoClick(lesson);
                    } else if (lesson.videoLink) {
                      setActiveLessonVideo(lesson.videoLink);
                      setActiveLessonTitle(lesson.title);
                    }

                    // Mark lesson as watched (persisted). Only add once.
                    if (lesson.title) {
                      // persist per-user watched lessons scoped to course
                      const prevArr = getWatchedFor(currentCourseId);
                      if (!prevArr.includes(lesson.title)) {
                        const updated = [...prevArr, lesson.title];
                        persistWatchedFor(currentCourseId, updated);
                        try {
                          // Optimistically update displayed server progress so UI reflects new progress
                          const optimisticPercent = totalLessons > 0 ? Math.round((updated.length / totalLessons) * 100) : 0;
                          setServerProgressValue(optimisticPercent);
                          setServerProgressLoaded(true);
                        } catch (e) {}

                        // Call backend API to track hours and mark lesson complete
                        (async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const courseId = new URLSearchParams(location.search || window.location.search).get('id');
                            
                            if (!token || !courseId) {
                              console.log('⚠️ No token or courseId, skipping backend lesson completion');
                              return;
                            }
                            
                            // Get course lessons to find the lesson ID
                            const lessonsRes = await fetch(`/api/courses/${courseId}`, {
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              }
                            });
                            
                            if (!lessonsRes.ok) {
                              console.warn('⚠️ Failed to fetch course details');
                              return;
                            }
                            
                            const courseData = await lessonsRes.json();
                            const backendLesson = courseData.lessons?.find(l => l.title === lesson.title);
                            
                            if (!backendLesson || !backendLesson._id) {
                              console.log('⚠️ Lesson not found in backend, title:', lesson.title);
                              return;
                            }
                            
                            // Each lesson is assumed to be 0.75 hours (45 minutes)
                            const hoursSpent = 0.75;
                            
                            const completeRes = await fetch(`/api/student/courses/${courseId}/lessons/${backendLesson._id}/complete`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ hoursSpent })
                            });
                            
                            if (completeRes.ok) {
                              const data = await completeRes.json();
                              console.log('✅ Lesson completed! Hours tracked:', data);
                              // Trigger Dashboard and Profile refresh
                              window.dispatchEvent(new Event('enrollmentUpdated'));
                            } else {
                              const errorText = await completeRes.text();
                              console.warn('⚠️ Failed to complete lesson:', errorText);
                            }
                          } catch (err) {
                            console.warn('⚠️ Error marking lesson complete:', err);
                          }
                        })();

                        // If the updated watched list completes the course, persist a completion date
                        try {
                          const courseIdForKey = new URLSearchParams(location.search || window.location.search).get('id') || window.localStorage.getItem('currentCourseId');
                          const key = getCompletionStorageKey(userProfile, courseIdForKey);
                          if (enrolled && Array.isArray(updated) && updated.length === totalLessons) {
                            const nowIso = new Date().toISOString();
                            window.localStorage.setItem(key, nowIso);
                          }
                        } catch (err) {
                          console.warn('Could not persist course completion date', err);
                        }

                        }
                      }
                    }}
                  >
                  {visibleLabel}
                </button>
              );
            })()
          }
        </div>
      ))}
    </div>
  );

  return (
    <AppLayout showGreeting={false}>
      <div className="page-wrap container pt-3">
        {/* HERO CARD */}
        <div className="course-hero d-flex flex-column flex-lg-row justify-content-between">
          <div className="hero-left">
            {/* <div className="hero-tag mb-3"> </div> */}
            <h2 className="hero-title mb-3">{enrolledCourseTitle}</h2>
            <p className="hero-desc mb-4">
              {" "}
              A comprehensive course designed to turn beginners into professional ethical hackers. Learn how to secure systems and perform real-world penetration testing using industry-standard tools and techniques.
              {" "}
            </p>
            {
              // Show PDF resource preview/link if available
              (() => {
                const pdf = (resources || []).find(r => {
                  const u = r.url || r.resourceUrl || r.dataURL || r.pdfResource || '';
                  if (!u) return false;
                  return u.toLowerCase().endsWith('.pdf') || (r.type && r.type === 'pdf');
                });
                if (!pdf) return null;
                // const href = pdf.url || pdf.resourceUrl || pdf.dataURL || pdf.pdfResource;
                
              })()
            }
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn btn-learn d-flex align-items-center gap-2"
                onClick={() => {
                  if (!enrolled) {
                    alert("Please enroll in this course to continue learning.");
                    return;
                  }

                  // Open curriculum tab
                  setTab("curriculum");

                  // Try to open the last watched lesson. If none, open the first available lesson.
                  const _watched = getWatchedFor(currentCourseId);
                  const lastWatched = _watched && _watched.length ? _watched[_watched.length - 1] : null;

                  // Helper to find a lesson by title across modules
                  const findLesson = (title) => {
                    if (!title) return null;
                    // Search in Getting Started
                    let found = gettingStarted.find(l => l.title === title);
                    if (found) return { lesson: found, module: 'gettingStarted' };
                    found = coreConcepts.find(l => l.title === title);
                    if (found) return { lesson: found, module: 'coreConcepts' };
                    found = practicalApplications.find(l => l.title === title);
                    if (found) return { lesson: found, module: 'practicalApplications' };
                    // Search in newModules
                    for (const module of (newModules || [])) {
                      const inModule = (module.lessons || []).find(l => l.title === title);
                      if (inModule) return { lesson: inModule, module: 'newModule' };
                    }
                    return null;
                  };

                  // Determine which lesson to open
                  let target = null;
                  if (lastWatched) target = findLesson(lastWatched);
                  if (!target) {
                    // fallback: open first lesson from ordered list
                    const first = allLessonsInOrder && allLessonsInOrder.length ? allLessonsInOrder[0] : null;
                    if (first) target = findLesson(first.title) || { lesson: first, module: 'gettingStarted' };
                  }

                  // Open the lesson using the appropriate setter so the corresponding module shows the player
                  if (target && target.lesson) {
                    const lesson = target.lesson;
                    if (target.module === 'gettingStarted') {
                      setGettingStartedVideo(lesson.videoLink);
                      setGettingStartedTitle(lesson.title);
                    } else if (target.module === 'coreConcepts') {
                      setCoreConceptsVideo(lesson.videoLink);
                      setCoreConceptsTitle(lesson.title);
                    } else {
                      // practicalApplications and newModules use activeLessonVideo
                      setActiveLessonVideo(lesson.videoLink);
                      setActiveLessonTitle(lesson.title);
                    }
                  }
                }}
              >
                <i className="bi bi-play-fill"></i> Continue Learning
              </button>
              {/* Enroll Button: show only when not enrolled. Do not provide an Unenroll option. */}
              {!enrolled && (
                <button
                  className="btn btn-learn d-flex align-items-center gap-2"
                  onClick={handleEnrollClick}
                  title="Click to enroll in this course"
                  data-enroll-button="true"
                >
                  <i className="bi bi-person-plus"></i> Enroll
                </button>
              )}
              <button
                className="btn btn-download d-flex align-items-center gap-2"
                onClick={handleDownloadCertificate}
                disabled={progressPercent < 100}
                title={progressPercent < 100 ? 'Complete the course to download certificate' : 'Download certificate'}
              >
                <i className="bi bi-download "></i> Download Certificate
              </button>
            </div>
            {heroVideo && (
              <div
                className="card"
                style={{ borderRadius: "15px", marginTop: "20px" }}
              >
                <div
                  className="card-header bg-white d-flex justify-content-between align-items-center"
                  style={{ borderColor: "white" }}
                >
                  <h3 className="fw-normal mb-0">
                    Now Playing: {heroTitle}
                  </h3>
                  <button
                    className="view-btn"
                    style={{ fontSize: "14px" }}
                    onClick={() => {
                      setHeroVideo(null);
                      setHeroTitle("");
                    }}
                  >
                    Close
                  </button>
                </div>
                <div style={{ marginTop: "15px" }}>
                  <iframe
                    width="100%"
                    height="300"
                    src={heroVideo}
                    style={{ borderRadius: "10px" }}
                    allow="autoplay; encrypted-media"
                    title={heroTitle}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>
          <div className="hero-right mt-4 mt-lg-0">
            <div className="progress-box p-3 rounded-3">
              <div className="small muted">Course Progress</div>
              <div className="d-flex align-items-center mt-2 mb-2">
                <div className="percent">{progressPercent}%</div>
                <div className="ms-2 ">Complete</div>
              </div>
              <div className="progress custom" style={{ height: 20 }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="muted small mt-2">{watchedCount} of {totalLessons} lessons completed</div>
            </div>
          </div>
          
          
        </div>
        {/* STATS ROW */}
        <div className="stats-wrap container-fluid">
          <div className="row">
            {/* Students */}
            <div className="col-12 col-sm-6 col-lg-3 d-flex">
              <div className="stat-card flex-fill d-flex gap-3 p-3 rounded-3 align-items-center">
                <div
                  className="w-18 h-20 rounded-2 d-flex align-items-center justify-content-center"
                  style={{
                    background: "linear-gradient(135deg, #f5f5f5, #e0e0e0)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="27"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2B6CB0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-users"
                    aria-hidden="true"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div>
                  <div className="stat-title">Students Enrolled</div>
                  <div className="stat-value">{enrolledCount}</div>
                </div>
              </div>
            </div>
            {/* Rating */}
            <div className="col-12 col-sm-6 col-lg-3 d-flex">
              <div className="stat-card flex-fill d-flex gap-3 p-3 rounded-3 align-items-center">
                <div
                  className="w-18 h-20 rounded-2 d-flex align-items-center justify-content-center"
                  style={{
                    background: "linear-gradient(135deg, #f5f5f5, #e0e0e0)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="27"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2B6CB0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-star"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div>
                  <div className="stat-title">Course Rating</div>
                  <div className="stat-value">{courseRating ? `${courseRating}/5.0` : '0/5.0'}</div>
                </div>
              </div>
            </div>
            {/* Duration */}
            <div className="col-12 col-sm-6 col-lg-3 d-flex">
              <div className="stat-card flex-fill d-flex gap-3 p-3 rounded-3 align-items-center">
                <div
                  className="w-18 h-20 rounded-2 d-flex align-items-center justify-content-center"
                  style={{
                    background: "linear-gradient(135deg, #f5f5f5, #e0e0e0)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="27"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2B6CB0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-clock"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div>
                  <div className="stat-title">Total Duration</div>
                  <div className="stat-value">8 hours</div>
                </div>
              </div>
            </div>
            {/* Lessons */}
            <div className="col-12 col-sm-6 col-lg-3 d-flex">
              <div className="stat-card flex-fill d-flex gap-3 p-3 rounded-3 align-items-center">
                <div
                  className="w-14 h-14 rounded-2 d-flex align-items-center justify-content-center"
                  style={{
                    background: "linear-gradient(135deg, #f5f5f5, #e0e0e0)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="27"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2B6CB0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-book-open"
                    aria-hidden="true"
                  >
                    <path d="M2 17a5 5 0 0 1 10 0v2a5 5 0 0 1-10 0v-2zm0 0a5 5 0 0 0 10 0"></path>
                    <path d="M12 17a5 5 0 0 1 10 0v2a5 5 0 0 1-10 0v-2zm0 0a5 5 0 0 0 10 0"></path>
                    <path d="M18 10h-6"></path>
                    <path d="M18 7h-6"></path>
                  </svg>
                </div>
                <div>
                  <div className="stat-title"> Lessons</div>
                  <div className="stat-value">24 </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* TABS */}
        <div className="tabs-row my-3 d-flex gap-2 border-bottom pb-2">
          <button
            className={`tab-pill ${tab === "curriculum" ? "active" : ""}`}
            onClick={() => setTab(tab === "curriculum" ? null : "curriculum")}
            aria-expanded={tab === "curriculum"}
          >
            Curriculum
          </button>
          <button
            className={`tab-pill ${tab === "instructor" ? "active" : ""}`}
            onClick={() => setTab(tab === "instructor" ? null : "instructor")}
            aria-expanded={tab === "instructor"}
          >
            Instructor
          </button>
          <button
            className={`tab-pill ${tab === "reviews" ? "active" : ""}`}
            onClick={() => setTab(tab === "reviews" ? null : "reviews")}
            aria-expanded={tab === "reviews"}
          >
            Reviews
          </button>
          <button
            className={`tab-pill ${tab === "quizzes" ? "active" : ""}`}
            onClick={() => setTab(tab === "quizzes" ? null : "quizzes")}
            aria-expanded={tab === "quizzes"}
          >
            Quizzes
          </button>
          <button
            className={`tab-pill ${tab === "resources" ? "active" : ""}`}
            onClick={() => setTab(tab === "resources" ? null : "resources")}
            aria-expanded={tab === "resources"}
          >
            Resources
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content-wrap">
          {/* Curriculum tab */}
          {tab === "curriculum" && (
            <div ref={curriculumRef} className="container-fluid p-0 mt-4">
              {/* Add New Module UI removed per request */}

              {/* Lock Notification when not enrolled */}
              {!enrolled && (
                <div className="alert alert-warning mb-4 d-flex align-items-center gap-3" style={{ backgroundColor: '#fff3cd', borderColor: '#ffeeba', borderRadius: '8px' }}>
                  <i className="bi bi-lock-fill" style={{ fontSize: '24px', color: '#ff9800' }}></i>
                  <div>
                    <strong style={{ color: '#333' }}>Course Locked</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                      Enroll in this course to watch lessons and attempt quizzes.
                    </p>
                  </div>
                </div>
              )}

              {/* Module Panels */}
              <div className="module-panel">
                {/* Module 1 */}
                <div className="curriculum-panel rounded-3 overflow-hidden mb-3">
                  <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-folder-plus header-icon"></i>
                      <strong>Getting Started</strong>
                    </div>
                    <div className="muted small">
                      <i className="bi bi-clock me-1"></i> 45 min
                    </div>
                  </div>
                  {renderCurriculumList(gettingStarted, (lesson) => {
                  setGettingStartedVideo(lesson.videoLink);
                  setGettingStartedTitle(lesson.title);
                  })}
                {/* Video player shown inside Getting Started section */}
                {gettingStartedVideo && (
                  <div
                    className="card"
                    style={{ borderRadius: "15px", marginTop: "20px" }}
                  >
                    <div
                      className="card-header bg-white d-flex justify-content-between align-items-center"
                      style={{ borderColor: "white" }}
                    >
                      <h3 className="fw-normal mb-0">
                        Now Playing: {gettingStartedTitle}
                      </h3>
                      <button
                        className="view-btn"
                        style={{ fontSize: "14px" }}
                        onClick={() => {
                          setGettingStartedVideo(null);
                          setGettingStartedTitle("");
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div style={{ marginTop: "15px" }}>
                      <iframe
                        width="100%"
                        height="300"
                        src={gettingStartedVideo}
                        style={{ borderRadius: "10px" }}
                        allow="autoplay; encrypted-media"
                        title={gettingStartedTitle}
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}
                </div>
                {/* Module 2 */}
                <div className="curriculum-panel rounded-3 overflow-hidden mb-3">
                  <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-folder-plus header-icon"></i>
                      <strong>Core Concepts</strong>
                    </div>
                    <div className="muted small">
                      <i className="bi bi-clock me-1"></i> 1h 50 min
                    </div>
                  </div>
                  {renderCurriculumList(coreConcepts, (lesson) => {
                  setCoreConceptsVideo(lesson.videoLink);
                  setCoreConceptsTitle(lesson.title);
                })}
                {/* Video player shown inside Core Concepts section */}
                {coreConceptsVideo && (
                  <div
                    className="card"
                    style={{ borderRadius: "15px", marginTop: "20px" }}
                  >
                    <div
                      className="card-header bg-white d-flex justify-content-between align-items-center"
                      style={{ borderColor: "white" }}
                    >
                      <h3 className="fw-normal mb-0">
                        Now Playing: {coreConceptsTitle}
                      </h3>
                      <button
                        className="view-btn"
                        style={{ fontSize: "14px" }}
                        onClick={() => {
                          setCoreConceptsVideo(null);
                          setCoreConceptsTitle("");
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div style={{ marginTop: "15px" }}>
                      <iframe
                        width="100%"
                        height="300"
                        src={coreConceptsVideo}
                        style={{ borderRadius: "10px" }}
                        allow="autoplay; encrypted-media"
                        title={coreConceptsTitle}
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}
                </div>
                {/* Module 3 */}
                <div className="curriculum-panel rounded-3 overflow-hidden mb-3">
                  <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-folder-plus header-icon"></i>
                      <strong>Practical Applications</strong>
                    </div>
                    <div className="muted small">
                      <i className="bi bi-clock me-1"></i> 2h 35 min
                    </div>
                  </div>
                  {renderCurriculumList(practicalApplications, (lesson) => {
                    setActiveLessonVideo(lesson.videoLink);
                    setActiveLessonTitle(lesson.title);
                  })}
                {/* Video player shown inside Practical Applications section */}
                {activeLessonVideo && (
                  <div
                    className="card"
                    style={{ borderRadius: "15px", marginTop: "20px" }}
                  >
                    <div
                      className="card-header bg-white d-flex justify-content-between align-items-center"
                      style={{ borderColor: "white" }}
                    >
                      <h3 className="fw-normal mb-0">Now Playing: {activeLessonTitle}</h3>
                      <button
                        className="view-btn"
                        style={{ fontSize: "14px" }}
                        onClick={() => {
                          setActiveLessonVideo(null);
                          setActiveLessonTitle("");
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div style={{ marginTop: "15px" }}>
                      <iframe
                        width="100%"
                        height="300"
                        src={activeLessonVideo}
                        style={{ borderRadius: "10px" }}
                        allow="autoplay; encrypted-media"
                        title={activeLessonTitle}
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}
                </div>

                

                {/* New Modules added by user */}
                {newModules.map((module, index) => (
                  <div
                    key={index}
                    className="curriculum-panel rounded-3 overflow-hidden mb-3"
                  >
                    <div className="curriculum-header d-flex justify-content-between align-items-center p-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-folder-plus header-icon"></i>
                        <strong>{module.title}</strong>
                      </div>
                      <div className="muted small">
                        <i className="bi bi-clock me-1"></i>{" "}
                        {module.totalDuration}
                      </div>
                    </div>
                    {renderCurriculumList(module.lessons)}
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Instructor tab */}
          {tab === "instructor" && (
            <div className="container-fluid p-0 mt-4">
              {/* Default Instructor Card (Single Card) */}
              <div className="instructor-card p-4 rounded-3 d-flex flex-column flex-md-row gap-4 mb-4">
                <div className="instructor-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                  JS
                </div>
                <div>
                  <h5>{instructor.name}</h5>
                  <p className="mb-3">{instructor.title}</p>
                  <div className="d-flex gap-4 small muted">
                    <div>
                      <i className="bi bi-people me-1"></i>
                      {instructor.stats.students} Students
                    </div>
                    <div>
                      <i className="bi bi-journal-check me-1"></i>
                      {instructor.stats.courses} Courses
                    </div>
                    <div>
                      <i className="bi bi-star me-1"></i>
                      {instructor.stats.rating} Rating
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Instructors (Added by user) */}
              {otherInstructors.map((inst, index) => (
                <div
                  key={index}
                  className="instructor-card p-4 rounded-3 d-flex flex-column flex-md-row gap-4 mb-4"
                >
                  <div className="instructor-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                    {inst.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5>{inst.name}</h5>
                    <p className="mb-3">{inst.title}</p>
                    <div className="d-flex gap-4 small muted">
                      <div>
                        <i className="bi bi-people me-1"></i>
                        {inst.stats.students} Students
                      </div>
                      <div>
                        <i className="bi bi-journal-check me-1"></i>
                        {inst.stats.courses} Courses
                      </div>
                      <div>
                        <i className="bi bi-star me-1"></i>
                        {inst.stats.rating} Rating
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews tab */}
          {tab === "reviews" && (
            <>
              <button
                className="btn btn-sm btn-primary mb-3 d-flex align-items-center gap-1"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                <i className="bi bi-chat-dots"></i> Add New Review
              </button>

              {showReviewForm && (
                <ReviewForm
                  addReview={addReview}
                  toggleForm={setShowReviewForm}
                />
              )}

              <div className="reviews-container d-flex flex-wrap gap-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="review-card-screenshot p-3 rounded-3"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      navigate("/course-review", {
                        state: { review },
                      })
                    }
                  >
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="review-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                        {review.avatar}
                      </div>
                      <div>
                        {/* <div className="review-name fw-bold">
                        {review.name}
                        {review.id <= 3 && (
                          <span className="badge bg-secondary ms-2">
                            Verified
                          </span>
                        )}
                      </div> */}
                        <div className="text-success">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="review-text mb-0">{review.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Quizzes tab */}
          {tab === "quizzes" && (
            <div className="container-fluid p-0 mt-4">
              {activeQuiz ? (
                // 1. Show the Quiz Interface when a quiz is active
                <QuizInterface quizData={activeQuiz} endQuiz={endQuizHandler} />
              ) : (
                // 2. Show the quiz list
                <>
                  <QuizList quizzes={quizzes} startQuiz={startQuizHandler} enrolled={enrolled} />
                </>
              )}
            </div>
          )}

          {/* Resources tab */}
          {tab === "resources" && (
            <div className="container-fluid p-0 mt-4">
              <ResourceList resources={resources} enrolled={enrolled} />
            </div>
          )}
        </div>

        {/* View More Button - Only show if 2 or more courses are available */}
        {totalCoursesCount >= 2 && (
            <div className="mt-5 mb-5 d-flex justify-content-start">
            
          </div>
        )}
      </div>
    </AppLayout>
  );
}
