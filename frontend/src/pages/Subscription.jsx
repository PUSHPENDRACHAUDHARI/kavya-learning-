import { useState, useEffect } from "react";
import { ArrowLeft, Star, Clock, ChevronRight, Users } from "lucide-react";
import "../assets/Subscription.css";
import AppLayout from "../components/AppLayout";
import { useNavigate, useLocation } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";
import boyAvatar from "../assets/boy-showing-course.png";

// Static demo courses removed — subscription page relies only on backend course data
// (This prevents five demo courses from appearing to students.)

const fallbackLogo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%232b6cb0"/><text x="50" y="58" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="32" fill="%23ffffff">Course</text></svg>';

const courseLogoMap = {
  1: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="%231f2937"/><path d="M50 25l20 15v20c0 10-8 18-18 18H48c-10 0-18-8-18-18V40l20-15z" fill="%23f59e0b"/><text x="50" y="90" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Ethical Hacking</text></svg>',
  2: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" rx="12" fill="%230b63a5"/><path d="M15 50h70M50 15v70" stroke="%23ffffff" stroke-width="8" stroke-linecap="round"/><text x="50" y="94" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="14" fill="%23ffffff">CCNA</text></svg>',
  3: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%232b6cb0"/><path d="M30 70l10-30 20 20 10-25" stroke="%23ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="50" y="92" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Forensics</text></svg>',
  4: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="%231a365d"/><path d="M20 60c10-20 50-20 60 0" stroke="%23ffffff" stroke-width="6" fill="none" stroke-linecap="round"/><text x="50" y="90" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Networking</text></svg>',
  5: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="%231f2937"/><path d="M20 30h60v40H20z" fill="%234b5563"/><rect x="28" y="38" width="44" height="24" fill="%23ffffff"/><circle cx="50" cy="70" r="4" fill="%23ffffff"/><text x="50" y="92" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Hardware</text></svg>',
  'complete-ethical-hacking-course': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%231f2937"/><path d="M50 25l20 15v20c0 10-8 18-18 18H48c-10 0-18-8-18-18V40l20-15z" fill="%23f59e0b"/><text x="50" y="90" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Ethical Hacking</text></svg>',
  'advanced-networking-with-cisco-ccna': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="12" fill="%230b63a5"/><path d="M20 50h60M50 20v60" stroke="%23ffffff" stroke-width="6" stroke-linecap="round"/><text x="50" y="94" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">CCNA</text></svg>',
  'cyber-forensics-masterclass-with-hands-on-learning': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%232b6cb0"/><path d="M30 70l10-30 20 20 10-25" stroke="%23ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="50" y="92" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Forensics</text></svg>',
  'computer-networking-course': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="%231a365d"/><path d="M20 60c10-20 50-20 60 0" stroke="%23ffffff" stroke-width="6" fill="none" stroke-linecap="round"/><text x="50" y="90" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Networking</text></svg>',
  'computer-hardware': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="%231f2937"/><path d="M20 30h60v40H20z" fill="%234b5563"/><rect x="28" y="38" width="44" height="24" fill="%23ffffff"/><circle cx="50" cy="70" r="4" fill="%23ffffff"/><text x="50" y="92" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="12" fill="%23ffffff">Hardware</text></svg>'
};

const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const resolveCourseLogo = (course) => {
  if (courseLogoMap[course.id]) return courseLogoMap[course.id];
  if (courseLogoMap[normalize(course.title)]) return courseLogoMap[normalize(course.title)];
  return fallbackLogo;
};

// CourseCard Component
function CourseCard({ course, onEnroll, isFavorite, onToggleFavorite }) {
  return (
    <div className="course-card">
      <button
        className={`favorite-btn ${isFavorite ? 'favorite-active' : ''}`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(course.id); }}
        title={isFavorite ? 'Unpin from Favorites' : 'Pin to Favorites'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" className="favorite-icon" aria-hidden="true">
          <path d="M12 21s-6.716-4.694-9.243-7.028C-1.424 10.124 1.5 6 5.5 6c2.245 0 3.5 1.5 6.5 1.5S16.255 6 18.5 6C22.5 6 25.424 10.124 21.243 13.972 18.716 16.306 12 21 12 21z" fill="currentColor" />
        </svg>
      </button>

      <div className="course-card-content">
        {course.isPremium && <span className="premium-badge">PREMIUM</span>}

        <div className="course-image-container">
          <div className="course-image-wrapper">
            {
              (() => {
                const src = (course.image && course.image !== 'default') ? course.image : resolveCourseLogo(course);
                return (
                  <img
                    src={src}
                    alt={`${course.title} logo`}
                    className="course-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = fallbackLogo; }}
                  />
                );
              })()
            }
          </div>
          
            <span className="language-badge">{course.language}</span>

          </div>

          <div className="course-info">
          <h3 className="course-title">{course.title}</h3>
          <div className="course-price">{`₹${course.price ?? 0}`}</div>
        </div>

        <div className="course-stats">
          <div className="course-stat">
            <Users size={16} className="course-stat-icon" />
            <span>{course.students}</span>
          </div>
          <div className="course-stat">
            <Star size={16} className="course-stat-icon" />
            <span>{course.rating}</span>
          </div>
        </div>

        <button 
          onClick={() => onEnroll(course)} 
          className="course-button"
        >
          Enroll Now
        </button>
      </div>
    </div>
  );
}

// CourseListing Component
function CourseListing({ onCourseSelect }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('favoriteCourses') || '[]';
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/courses', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.courses && data.courses.length > 0) {
            const mappedCourses = data.courses.map(course => ({
              id: course._id,
              title: course.title,
              language: course.language || 'English',
              image: course.thumbnail || 'default',
              students: `${course.enrolledStudents?.length || 0} students`,
              price: course.price || 0,
              rating: course.rating || 4.5,
              reviews: course.reviews || 0,
              isPremium: course.isPremium !== false,
              tutor: course.instructor?.fullName || 'KavyaLearn',
              totalStudents: `${course.enrolledStudents?.length || 0} students`,
              overview: course.description?.substring(0, 100) || 'Learn from experts',
              description: course.description || 'No description available',
              additionalInfo: 'Enroll now and get started!',
              sections: course.sections || [],
              ratings: { overall: course.rating || 4.5, breakdown: [] },
              faqs: course.faqs || []
            }));
            setCourses(mappedCourses);
          } else {
            setCourses([]);
          }
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch backend courses:', err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('favoriteCourses', JSON.stringify(favorites || []));
    } catch (e) {
      console.warn('Could not persist favorites', e);
    }
  }, [favorites]);

  const toggleFavorite = (courseId) => {
    setFavorites((prev) => {
      if (!prev) return [courseId];
      if (prev.includes(courseId)) return prev.filter((id) => id !== courseId);
      return [...prev, courseId];
    });
  };

  if (loading) {
    return (
      <div className="course-listing">
        <div className="course-listing-container">
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayedCourses = showFavoritesOnly
    ? courses.filter((c) => favorites && favorites.includes(c.id))
    : courses;

  return (
    <div className="course-listing">
      <div className="course-listing-container">
        <div className="favorites-bar">
          <label className="favorites-toggle">
            <input
              type="checkbox"
              checked={showFavoritesOnly}
              onChange={() => setShowFavoritesOnly((s) => !s)}
            />
            Show Favorites only
          </label>
          <div className="favorites-count">Favorites: {favorites ? favorites.length : 0}</div>
        </div>
        {displayedCourses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>No courses available right now. Please check back later or contact support if this looks unexpected.</p>
            <p style={{ fontSize: '14px', color: '#999' }}>If you're an instructor or admin, create courses from the admin panel.</p>
          </div>
        ) : (
          <div className="course-grid">
            {displayedCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEnroll={onCourseSelect}
                isFavorite={favorites && favorites.includes(course.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// CourseDetail Component
function CourseDetail({ course, onBack }) {
  const [expandedFaqs, setExpandedFaqs] = useState({});
  const navigate = useNavigate(); // <-- Added

  if (!course) return null;

  const toggleFaq = (index) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const [showFullDesc, setShowFullDesc] = useState(false);

  const defaultFaqs = [
    {
      question: 'How do I enroll in this course?',
      answer:
        'Click the "Pay Now" button and complete the payment flow. After successful payment the course will be added to your Enrolled Courses and accessible from your dashboard.'
    },
    {
      question: 'What if my payment fails during checkout?',
      answer:
        'If a payment fails, you will receive an error message and no charge will be applied. Try again or contact support with your transaction id — we will help complete the enrollment.'
    },
    {
      question: 'When will I get access to the course materials?',
      answer:
        'Access is typically granted immediately after successful payment. If access is delayed, refresh your Enrolled Courses page or contact support — we will verify and enable access.'
    },
    {
      question: 'Do I get a certificate after completion?',
      answer:
        'Yes — on successful completion of the course requirements you will be issued a completion certificate which can be downloaded from the course dashboard.'
    },
    {
      question: 'What if I want a refund?',
      answer:
        'Refunds are handled according to the course refund policy; please contact support with your order details. Short requests (within the refund window) are processed promptly.'
    },
    {
      question: 'Are there prerequisites for this course?',
      answer:
        'Most beginner courses have no strict prerequisites. Check the course overview for recommended background; advanced courses may list required prior knowledge.'
    },
    {
      question: 'How can I get help if I face issues?',
      answer:
        'Use the support link in the footer or contact our helpdesk with details of the issue — include screenshots and transaction ID for payment problems.'
    }
  ];

  const handlePayNow = () => {
    (async () => {
      if (!window.confirm(`Are you sure you want to purchase "${course.title}"?`)) return;

      const qCourseId = String(course.id);
      const qTitle = String(course.title || '');

      try {
        // Try to create a pending enrollment first (backend will validate course exists)
        const token = localStorage.getItem('token');
        const res = await fetch('/api/enrollments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ courseId: qCourseId })
        });

        if (res.ok) {
          const data = await res.json();
          const enrollmentId = data.enrollmentId;
          navigate(`/payment?courseId=${encodeURIComponent(qCourseId)}&title=${encodeURIComponent(qTitle)}&enrollmentId=${encodeURIComponent(enrollmentId)}`);
          return;
        }

        // If backend returned a conflict with an existing enrollment
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}));

          // If the existing enrollment is pending, reuse its id and continue to payment
          if (data.enrollmentId && data.enrollmentStatus === 'pending') {
            navigate(`/payment?courseId=${encodeURIComponent(qCourseId)}&title=${encodeURIComponent(qTitle)}&enrollmentId=${encodeURIComponent(data.enrollmentId)}`);
            return;
          }

          // If enrollment already exists and is active or free, show a friendly alert
          if (data.alreadyEnrolled || data.enrollmentStatus === 'active' || data.isFree || (data.purchaseStatus && String(data.purchaseStatus).toLowerCase() === 'free')) {
            alert('You have already enrolled in this course.');
            return;
          }

          // Fallback: if we have an enrollmentId but no status, open payment (rare)
          if (data.enrollmentId) {
            navigate(`/payment?courseId=${encodeURIComponent(qCourseId)}&title=${encodeURIComponent(qTitle)}&enrollmentId=${encodeURIComponent(data.enrollmentId)}`);
            return;
          }
        }

        // If backend returned a 400 with explanatory message (already enrolled), surface it
        if (res.status === 400) {
          const data = await res.json().catch(() => ({}));
          if (data && /already enrolled/i.test(data.message || '')) {
            alert('You have already enrolled in this course.');
            return;
          }
        }

        // For demo/static courses where backend can't create enrollment, fall back to open payment page
        navigate(`/payment?courseId=${encodeURIComponent(qCourseId)}&title=${encodeURIComponent(qTitle)}`);
      } catch (err) {
        console.warn('Could not create enrollment before payment, opening payment page', err);
        navigate(`/payment?courseId=${encodeURIComponent(String(course.id))}&title=${encodeURIComponent(String(course.title || ''))}`);
      }
    })();
  };

  return (
    <div className="course-detail">
      <div className="course-detail-container">
        <button onClick={onBack} className="back-button" 
        style={{marginBottom:'20px'}}>
          <ArrowLeft size={20} />
          <span>Back to Courses</span>
        </button>

        <div className="course-hero">
          <div className="hero-image">
            <img src={boyAvatar} alt="student avatar" className="hero-boy" />
          </div>
          <div className="hero-content">
            <h1 className="hero-title">{course.title}</h1>
            <div className="hero-sub">• Created by: {course.tutor}</div>
            <div className="hero-sub">• {course.totalStudents} seats left (Filling Fast)</div>

            <div className="hero-features">
              <div className="feature">
                <div className="feature-icon">✔</div>
                <div className="feature-text">Lifetime Access to Course Material</div>
              </div>
              <div className="feature">
                <div className="feature-icon">✔</div>
                <div className="feature-text">Learn from industry-relevant content</div>
              </div>
              <div className="feature">
                <div className="feature-icon">✔</div>
                <div className="feature-text">Certificate of Completion</div>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Overview</h2>
          <h3 className="section-subtitle">{course.overview}</h3>
          <p className="section-text">
            {showFullDesc
              ? course.description
              : course.description && course.description.length > 220
              ? `${course.description.slice(0, 220)}...`
              : course.description}
          </p>
          {showFullDesc && course.additionalInfo && (
            <p className="section-text">{course.additionalInfo}</p>
          )}

          {course.description && course.description.length > 220 && (
            <button
              className="read-more-button"
              onClick={() => setShowFullDesc((s) => !s)}
            >
              {showFullDesc ? "Show Less" : "Read More..."}
            </button>
          )}
        </div>

        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Course Content</h2>
            <span className="sections-count">
              {course.sections.length} Sections
            </span>
          </div>

          <div className="sections-list">
            {course.sections.map((section, index) => (
              <div key={index} className="section-item">
                <div className="section-item-left">
                  <ChevronRight size={20} className="section-icon" />
                  <span className="section-name">{section.title}</span>
                </div>
                <div className="section-item-right">
                  <Clock size={16} />
                  <span>{section.duration}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="faqs-section">
            <h2 className="section-title mt-3">Frequently Asked Questions</h2>
            <div className="faqs-list">
              {(course.faqs && course.faqs.length ? course.faqs : defaultFaqs).map((f, i) => {
                const open = !!expandedFaqs[i];
                return (
                  <div key={i} className={`faq-item ${open ? 'faq-item-expanded' : ''}`} onClick={() => toggleFaq(i)}>
                    <div className={`faq-header`}>
                      <div className={`faq-icon ${open ? 'faq-icon-expanded' : ''}`}>
                        <ChevronRight size={18} />
                      </div>
                      <div className="faq-question">{f.question}</div>
                    </div>
                    {open && <div className="faq-answer">{f.answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>

            <div className="price-row">
              <div className="discount-input">
                <input placeholder="Have a discount code?" />
                <button className="discount-apply">➜</button>
              </div>
              <div className="price-pill">{`₹ ${course.price ?? 0}`}</div>
              <button className="pay-now-primary" onClick={handlePayNow}>Pay Now</button>
            </div>
        </div>

        

      </div>
    </div>
  );
}

// Main App Component
function Subscription() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
  };

  const handleBack = () => {
    setSelectedCourse(null);
  };

  return (
    <ErrorBoundary>
      <AppLayout showGreeting={false}>
        <div className="app-container">
          {selectedCourse ? (
            <CourseDetail course={selectedCourse} onBack={handleBack} />
          ) : (
            <CourseListing onCourseSelect={handleCourseSelect} />
          )}
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}

export default Subscription;