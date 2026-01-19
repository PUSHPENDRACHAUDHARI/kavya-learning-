import { useState } from "react";
import { ArrowLeft, Star, Clock, ChevronRight, Users } from "lucide-react";
import "../assets/Subscription.css";
import AppLayout from "../components/AppLayout";
import { useNavigate } from "react-router-dom"; // <-- Added

// Courses Data
const courses = [
  {
    id: 1,
    title: "Complete Ethical Hacking Course",
    language: "English",
    image: "ethical-hacking",
    students: "1,92,028",
    rating: 4.6,
    reviews: 99,
    isPremium: true,
    tutor: "LearnVern",
    sellingStatus: "Course Selling",
    totalStudents: "143,098 students",
    overview: "Online Ethical Hacking Course in Hindi is Step By Step To Free",
    description:
      "Cyber-attacks now routinely hit companies. They must either find a training company to secure their systems or be left exposed. You will learn ethical hacking from our Ethical Hacking training course. In this cyber security course, you will explore the many phases of ethical hacking. Additionally, you will know about foot printing and reconnecting.",
    additionalInfo:
      "Contents of Ethical Hacking and cyber security are available as downloadable resources. Enroll now and get started!",
    sections: [
      { title: "Introduction to Ethical Hacking", duration: "1h 2m" },
      { title: "Basics of Ethical Hacking", duration: "1h 2m" },
      { title: "Ethical Hacking Phases", duration: "1h 2m" },
      { title: "Hacking and Assessment", duration: "1h 2m" },
      { title: "Hacking and Enumeration Server", duration: "1h 2m" },
      { title: "Anonymous Browsing and Steganography", duration: "1h 2m" },
      { title: "Hacking and Sniffing", duration: "1h 2m" },
      { title: "Hacking and Malwares", duration: "1h 2m" },
      { title: "Hacking and Password Cracking", duration: "1h 2m" },
      { title: "Hacking and Session Hijacking", duration: "1h 2m" },
      { title: "Hacking and Phishing", duration: "1h 2m" },
      { title: "Firewall Evasion", duration: "1h 2m" },
      { title: "Website Hacking", duration: "1h 2m" },
      { title: "Wireless Hacking", duration: "1h 2m" },
      { title: "Reporting Cyber Correct", duration: "1h 2m" },
      { title: "Cyber Laws", duration: "1h 2m" },
      { title: "Course Summary", duration: "1h 2m" },
      { title: "Interview Question", duration: "1h 2m" },
      { title: "Career Guidelines", duration: "1h 2m" },
    ],
    ratings: {
      overall: 4.6,
      breakdown: [
        { stars: 5, percentage: 75 },
        { stars: 4, percentage: 15 },
        { stars: 3, percentage: 5 },
        { stars: 2, percentage: 3 },
        { stars: 1, percentage: 2 },
      ],
    },
    faqs: [
      {
        question: "How LearnVern's course teaches Ethical Hacking?",
        answer:
          "LearnVern's Ethical Hacking course provides comprehensive step-by-step training in Hindi. The course covers all phases of ethical hacking including footprinting, reconnaissance, scanning, enumeration, system hacking, and more. Our instructors use practical examples and hands-on exercises to ensure you understand both theory and practical implementation.",
      },
      {
        question:
          "What will you learn in LearnVern's Ethical Hacking course in Hindi?",
        answer:
          "In this course, you will learn about ethical hacking phases, footprinting and reconnaissance, network scanning, vulnerability assessment, system hacking, password cracking, session hijacking, social engineering, web application security, wireless network security, firewall evasion, and cyber laws. The course also includes downloadable resources and practical demonstrations.",
      },
      {
        question: "Can I go an Ethical Hacking course from LearnVern Online?",
        answer:
          "Yes, absolutely! LearnVern's Ethical Hacking course is designed for online learning. You can access all course materials, videos, and resources from anywhere, anytime. The course is self-paced, allowing you to learn at your own convenience. All contents are available as downloadable resources so you can study offline as well.",
      },
    ],
  },
  {
    id: 2,
    title: "Advanced Networking with CISCO (CCNA)",
    language: "English",
    image: "networking",
    students: "29,411",
    rating: 4.5,
    reviews: 87,
    isPremium: true,
    tutor: "CISCO Certified",
    sellingStatus: "Course Selling",
    totalStudents: "29,411 students",
    overview: "Master CISCO networking fundamentals and advanced CCNA concepts",
    description:
      "This comprehensive CCNA course covers all aspects of networking including routing, switching, network security, and troubleshooting. Learn from industry experts and gain hands-on experience with real-world scenarios.",
    additionalInfo:
      "Includes practice labs, exam preparation materials, and certification guidance. Perfect for networking professionals looking to advance their careers.",
    sections: [
      { title: "Introduction to Networking", duration: "1h 15m" },
      { title: "OSI and TCP/IP Models", duration: "1h 30m" },
      { title: "IP Addressing and Subnetting", duration: "2h 0m" },
      { title: "Routing Fundamentals", duration: "2h 15m" },
      { title: "Switching Concepts", duration: "1h 45m" },
      { title: "VLANs and Trunking", duration: "1h 30m" },
      { title: "Network Security", duration: "2h 0m" },
      { title: "WAN Technologies", duration: "1h 45m" },
      { title: "Network Troubleshooting", duration: "2h 0m" },
      { title: "CCNA Exam Preparation", duration: "1h 30m" },
    ],
    ratings: {
      overall: 4.5,
      breakdown: [
        { stars: 5, percentage: 65 },
        { stars: 4, percentage: 25 },
        { stars: 3, percentage: 7 },
        { stars: 2, percentage: 2 },
        { stars: 1, percentage: 1 },
      ],
    },
    faqs: [
      {
        question: "What is covered in this CCNA course?",
        answer:
          "This course covers all CCNA exam topics including networking fundamentals, IP addressing, routing and switching, network security, WAN technologies, and troubleshooting. You'll also get hands-on practice with real networking scenarios.",
      },
      {
        question: "Do I need prior networking experience?",
        answer:
          "Basic computer knowledge is recommended, but the course starts with fundamentals, making it suitable for beginners. We cover everything from the ground up to advanced CCNA concepts.",
      },
      {
        question: "Will this help me pass the CCNA exam?",
        answer:
          "Yes! The course includes comprehensive exam preparation materials, practice questions, and exam-taking strategies. Many students have successfully passed their CCNA certification after completing this course.",
      },
    ],
  },
  {
    id: 3,
    title: "Cyber Forensics Masterclass with Hands on learning",
    language: "English",
    image: "forensics",
    students: "25,016",
    rating: 4.7,
    reviews: 124,
    isPremium: true,
    tutor: "Forensics Expert",
    sellingStatus: "Course Selling",
    totalStudents: "25,016 students",
    overview: "Learn digital forensics and cyber investigation techniques",
    description:
      "Master the art of digital forensics and cybercrime investigation. This hands-on course teaches you how to collect, analyze, and preserve digital evidence. Learn to use professional forensics tools and techniques used by law enforcement and security professionals.",
    additionalInfo:
      "Includes real-world case studies, hands-on labs, and access to forensics tools. Perfect for cybersecurity professionals and aspiring digital investigators.",
    sections: [
      { title: "Introduction to Digital Forensics", duration: "1h 0m" },
      { title: "Forensics Tools and Software", duration: "1h 30m" },
      { title: "Disk Imaging and Analysis", duration: "2h 0m" },
      { title: "File System Forensics", duration: "2h 15m" },
      { title: "Network Forensics", duration: "2h 0m" },
      { title: "Memory Forensics", duration: "1h 45m" },
      { title: "Mobile Device Forensics", duration: "2h 0m" },
      { title: "Malware Analysis", duration: "2h 15m" },
      { title: "Report Writing and Documentation", duration: "1h 30m" },
      { title: "Legal Aspects of Forensics", duration: "1h 15m" },
    ],
    ratings: {
      overall: 4.7,
      breakdown: [
        { stars: 5, percentage: 78 },
        { stars: 4, percentage: 18 },
        { stars: 3, percentage: 3 },
        { stars: 2, percentage: 1 },
        { stars: 1, percentage: 0 },
      ],
    },
    faqs: [
      {
        question: "What tools will I learn to use?",
        answer:
          "You'll learn to use industry-standard forensics tools including Autopsy, FTK Imager, Wireshark, Volatility, and many others. The course provides hands-on experience with real forensics scenarios.",
      },
      {
        question: "Is this course suitable for beginners?",
        answer:
          "Yes, the course starts with fundamentals and gradually progresses to advanced topics. Basic computer knowledge is helpful, but we cover all necessary concepts from the ground up.",
      },
      {
        question: "Will I get hands-on practice?",
        answer:
          "Absolutely! The course includes numerous hands-on labs, real-world case studies, and practical exercises. You'll work with actual forensics scenarios and learn by doing.",
      },
    ],
  },
  {
    id: 4,
    title: "Computer Networking Course",
    language: "English",
    image: "computer-network",
    students: "56,318",
    rating: 4.2,
    reviews: 203,
    isPremium: true,
    tutor: "Network Specialist",
    sellingStatus: "Course Selling",
    totalStudents: "56,318 students",
    overview:
      "Comprehensive computer networking fundamentals and advanced concepts",
    description:
      "Learn everything about computer networks from basics to advanced topics. This course covers network architecture, protocols, security, and troubleshooting. Perfect for IT professionals and networking enthusiasts.",
    additionalInfo:
      "Includes practical labs, network simulation exercises, and real-world scenarios. Gain the skills needed to design, implement, and maintain computer networks.",
    sections: [
      { title: "Network Fundamentals", duration: "1h 30m" },
      { title: "Network Topologies", duration: "1h 15m" },
      { title: "Network Protocols", duration: "2h 0m" },
      { title: "TCP/IP Suite", duration: "2h 15m" },
      { title: "Network Devices", duration: "1h 45m" },
      { title: "Wireless Networking", duration: "2h 0m" },
      { title: "Network Security", duration: "2h 0m" },
      { title: "Network Troubleshooting", duration: "1h 45m" },
      { title: "Network Design", duration: "2h 0m" },
      { title: "Advanced Networking Concepts", duration: "1h 30m" },
    ],
    ratings: {
      overall: 4.6,
      breakdown: [
        { stars: 5, percentage: 70 },
        { stars: 4, percentage: 22 },
        { stars: 3, percentage: 5 },
        { stars: 2, percentage: 2 },
        { stars: 1, percentage: 1 },
      ],
    },
    faqs: [
      {
        question: "What will I learn in this networking course?",
        answer:
          "You'll learn network fundamentals, protocols, network design, security, troubleshooting, and advanced networking concepts. The course covers both theoretical knowledge and practical skills.",
      },
      {
        question: "Do I need any prerequisites?",
        answer:
          "Basic computer knowledge is recommended. The course starts with fundamentals, making it accessible to beginners while also covering advanced topics for experienced professionals.",
      },
      {
        question: "Are there practical exercises?",
        answer:
          "Yes! The course includes hands-on labs, network simulation exercises, and real-world scenarios to help you apply what you learn and build practical networking skills.",
      },
    ],
  },
  {
    id: 5,
    title: "Computer Hardware",
    language: "English",
    image: "hardware",
    students: "54,517",
    rating: 4.6,
    reviews: 189,
    isPremium: true,
    tutor: "Hardware Expert",
    sellingStatus: "Course Selling",
    totalStudents: "54,517 students",
    overview: "Complete guide to computer hardware components and maintenance",
    description:
      "Master computer hardware from components to assembly and troubleshooting. Learn about CPUs, motherboards, RAM, storage devices, GPUs, and more. This comprehensive course covers everything you need to know about computer hardware.",
    additionalInfo:
      "Includes hands-on assembly tutorials, troubleshooting guides, and hardware compatibility information. Perfect for IT professionals, technicians, and hardware enthusiasts.",
    sections: [
      { title: "Introduction to Computer Hardware", duration: "1h 0m" },
      { title: "Motherboards and CPUs", duration: "2h 0m" },
      { title: "Memory (RAM)", duration: "1h 30m" },
      { title: "Storage Devices", duration: "2h 0m" },
      { title: "Graphics Cards", duration: "1h 45m" },
      { title: "Power Supplies", duration: "1h 30m" },
      { title: "Cooling Systems", duration: "1h 15m" },
      { title: "Computer Assembly", duration: "2h 30m" },
      { title: "Hardware Troubleshooting", duration: "2h 0m" },
      { title: "Hardware Upgrades", duration: "1h 45m" },
    ],
    ratings: {
      overall: 4.6,
      breakdown: [
        { stars: 5, percentage: 72 },
        { stars: 4, percentage: 20 },
        { stars: 3, percentage: 5 },
        { stars: 2, percentage: 2 },
        { stars: 1, percentage: 1 },
      ],
    },
    faqs: [
      {
        question: "What hardware components are covered?",
        answer:
          "The course covers all major computer hardware components including motherboards, CPUs, RAM, storage devices (HDD/SSD), graphics cards, power supplies, cooling systems, and peripherals.",
      },
      {
        question: "Will I learn to build a computer?",
        answer:
          "Yes! The course includes comprehensive assembly tutorials that guide you through building a complete computer from individual components. You'll learn proper installation techniques and best practices.",
      },
      {
        question: "Is this suitable for beginners?",
        answer:
          "Absolutely! The course starts with basics and gradually covers more advanced topics. No prior hardware knowledge is required, making it perfect for beginners interested in computer hardware.",
      },
    ],
  },
];

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
function CourseCard({ course, onEnroll }) {
  return (
    <div className="course-card">
      <div className="course-card-content">
        {course.isPremium && <span className="premium-badge">PREMIUM</span>}

        <div className="course-image-container">
          <div className="course-image-wrapper">
            <img
              src={resolveCourseLogo(course)}
              alt={`${course.title} logo`}
              className="course-image"
              loading="lazy"
              decoding="async"
              onError={(e) => { e.currentTarget.src = fallbackLogo; }}
            />
          </div>
        </div>

        <div className="course-info">
          <p className="course-language">{course.language}</p>
          <h3 className="course-title">{course.title}</h3>
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

        <button onClick={() => onEnroll(course)} className="course-button">
          Enroll Now
        </button>
      </div>
    </div>
  );
}

// CourseListing Component
function CourseListing({ onCourseSelect }) {
  return (
    <div className="course-listing">
      <div className="course-listing-container">
        <div className="course-grid">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEnroll={onCourseSelect}
            />
          ))}
        </div>
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

        // If backend returned a conflict with existing enrollmentId, reuse it
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}));
          const enrollmentId = data.enrollmentId;
          if (enrollmentId) {
            navigate(`/payment?courseId=${encodeURIComponent(qCourseId)}&title=${encodeURIComponent(qTitle)}&enrollmentId=${encodeURIComponent(enrollmentId)}`);
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
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          <span>Back to Courses</span>
        </button>

        <div className="course-header">
          <h1 className="course-title-large">{course.title}</h1>

          <div className="course-meta">
            <span className="status-badge">{course.sellingStatus}</span>
            <span className="course-tutor">Tutor: {course.tutor}</span>
            <div className="rating-display">
              <Star size={16} className="rating-icon" />
              <span className="rating-value">{course.rating}</span>
              <span className="rating-text">({course.reviews} reviews)</span>
            </div>
            <span className="course-students">{course.totalStudents}</span>
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

          <div className="pay-button-container">
            <button className="pay-button" onClick={handlePayNow}>
              PAY NOW
            </button>
          </div>
        </div>

        <div className="ratings-section">
          <h2 className="section-title">Learner's Ratings</h2>

          <div className="ratings-content">
            <div className="ratings-summary">
              <div className="ratings-overall">{course.ratings.overall}</div>
              <div className="ratings-stars">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={
                      i < Math.floor(course.ratings.overall)
                        ? "star-filled"
                        : "star-empty"
                    }
                  />
                ))}
              </div>
              <p className="ratings-label">Course Rating</p>
            </div>

            <div className="ratings-breakdown">
              {course.ratings.breakdown.map((item, index) => (
                <div key={index} className="rating-item">
                  <div className="rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < item.stars ? "star-filled" : "star-empty"
                        }
                      />
                    ))}
                  </div>
                  <div className="rating-bar-container">
                    <div
                      className="rating-bar"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="rating-percentage">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="faqs-section">
          <h2 className="section-title">FAQs</h2>
          <div className="faqs-list">
            {course.faqs &&
              course.faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`faq-item ${
                    expandedFaqs[index] ? "faq-item-expanded" : ""
                  }`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="faq-header">
                    <ChevronRight
                      size={20}
                      className={`faq-icon ${
                        expandedFaqs[index] ? "faq-icon-expanded" : ""
                      }`}
                    />
                    <span className="faq-question">{faq.question}</span>
                  </div>
                  {expandedFaqs[index] && faq.answer && (
                    <div className="faq-answer">{faq.answer}</div>
                  )}
                </div>
              ))}
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
    <AppLayout showGreeting={false}>
      <div className="app-container">
        {selectedCourse ? (
          <CourseDetail course={selectedCourse} onBack={handleBack} />
        ) : (
          <CourseListing onCourseSelect={handleCourseSelect} />
        )}
      </div>
    </AppLayout>
  );
}

export default Subscription;