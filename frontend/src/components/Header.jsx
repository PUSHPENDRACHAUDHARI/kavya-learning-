import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoLogOutOutline, IoPersonOutline } from "react-icons/io5";
import { FiSearch } from "react-icons/fi"; 
import notification from "../assets/notification.png";
import profile from "../assets/profile.png";
import avatarFemale from "../assets/avatar-female.svg";
import * as api from "../api";
 
function Header({ onToggleSidebar, children }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userGender, setUserGender] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userInitials, setUserInitials] = useState("");

  // Normalize avatar values coming from localStorage/backend
  const normalizeAvatar = (val) => {
    if (!val) return "";
    if (typeof val !== 'string') return "";
    const trimmed = val.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return "";
    return trimmed;
  };

  // Search state & handlers
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);

  // Expanded client-side route index with templates for dynamic routes
  const ROUTE_INDEX = [
    { type: 'page', id: 'dashboard', title: 'Dashboard', route: '/dashboard' },
    { type: 'page', id: 'courses', title: 'Courses', route: '/courses' },
    { type: 'page', id: 'student-courses', title: 'My Courses', route: '/student/courses' },
    { type: 'page', id: 'schedule', title: 'Schedule', route: '/schedule' },
    { type: 'page', id: 'leaderboard', title: 'Leaderboard', route: '/leaderboard' },
    { type: 'page', id: 'profile', title: 'Profile', route: '/profile' },
    { type: 'page', id: 'subscription', title: 'Subscription', route: '/subscription' },
    { type: 'page', id: 'notes', title: 'Notes', route: '/student/notes' },
    { type: 'page', id: 'admin-notes', title: 'Admin Notes', route: '/admin/notes' },
    { type: 'page', id: 'enrolled-courses', title: 'Enrolled Courses', route: '/student/enrolled-courses' },
    { type: 'page', id: 'payment', title: 'Payment', route: '/payment' },
    { type: 'page', id: 'achievements', title: 'Achievements', route: '/student/achievements' },
    { type: 'page', id: 'activity', title: 'Activity', route: '/student/activity' },
    { type: 'page', id: 'admin-dashboard', title: 'Admin Dashboard', route: '/admin/dashboard' },
    { type: 'page', id: 'instructor-dashboard', title: 'Instructor Dashboard', route: '/instructor/dashboard' },
    { type: 'page', id: 'student-report', title: 'Student Report', route: '/parent/student-report' },

    // More granular / dynamic templates
    { type: 'course', id: 'course-template', title: 'Course (by id)', routeTemplate: '/student/courses/:courseId' },
    { type: 'lesson', id: 'lesson-template', title: 'Lesson (in course)', routeTemplate: '/student/courses/:courseId?highlightLesson=:lessonId', params: ['courseId', 'lessonId'] },
    { type: 'quiz', id: 'quiz-template', title: 'Quiz (in course)', routeTemplate: '/student/courses/:courseId?highlightQuiz=:quizId', params: ['courseId', 'quizId'] },
    { type: 'instructor-lesson', id: 'instructor-lessons', title: 'Instructor Lessons', route: '/instructor/lessons' },
    { type: 'student-course-lessons', id: 'student-course-lessons', title: 'Course Lessons', routeTemplate: '/student/courses/:courseId' }
  ];

  // Helper to resolve template routes using metadata provided with backend results
  const resolveTemplateRoute = (template, meta = {}) => {
    if (!template) return null;
    const placeholders = (template.match(/:([a-zA-Z0-9_]+)/g) || []).map(s => s.substring(1));
    let route = template;

    for (const name of placeholders) {
      // Accept different common meta key names
      const val = meta[name] ?? meta[name.charAt(0).toLowerCase() + name.slice(1)] ?? meta[name.replace(/Id$/i, '_id')];
      if (!val) return null; // cannot resolve
      route = route.replace(new RegExp(`:${name}`, 'g'), encodeURIComponent(val));
    }

    return route;
  };

  // Perform search via API and local route index (augments backend results with template-resolved routes)
  const performSearch = async (q) => {
    const trimmed = (q || '').trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    // Quick shortcuts: handle very common page keywords immediately
    const tLower = trimmed.toLowerCase();
    try {
      // Admin-specific shortcuts (only when logged in as admin)
      const role = localStorage.getItem('userRole') || '';
      const isAdmin = role && role.toLowerCase().includes('admin');
      if (isAdmin) {
        if (['manage student', 'manage students', 'manage student page', 'students', 'student management'].includes(tLower)) {
          navigate('/admin/students');
          setSearchOpen(false);
          setSearchQuery('');
          setSearchResults([]);
          return;
        }

        if (['manage courses', 'manage course', 'manage course page', 'courses', 'course management'].includes(tLower)) {
          navigate('/admin/courses');
          setSearchOpen(false);
          setSearchQuery('');
          setSearchResults([]);
          return;
        }

        if (['admin setting', 'admin settings', 'manage settings', 'settings', 'manage admin setting'].includes(tLower)) {
          navigate('/admin/settings');
          setSearchOpen(false);
          setSearchQuery('');
          setSearchResults([]);
          return;
        }
      }

      if (['enrolled courses', 'enrolled course', 'my courses', 'my course', 'enrolled'].includes(tLower)) {
        // Navigate to the enrolled-courses page (student view)
        navigate('/student/enrolled-courses');
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      if (['notes', 'my notes'].includes(tLower)) {
        const roleLocal = localStorage.getItem('userRole') || '';
        if (roleLocal && roleLocal.toLowerCase().includes('admin')) navigate('/admin/notes');
        else navigate('/student/notes');
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }
    } catch (e) {
      // ignore navigation errors and continue with normal search
      console.error('Shortcut navigation failed', e);
    }
    setSearchLoading(true);
    try {
      // Prefer backend results when available
      const api = await import('../api');
      const res = await api.search(trimmed);
      let results = [];
      let categorizedData = null;
      if (res && res.success) {
        if (Array.isArray(res.results) && res.results.length) {
          results = res.results.map(r => ({ ...r, _categorized: res.categorized }));
        }
        // Store categorized data for display
        if (res.categorized) {
          categorizedData = res.categorized;
        }
      }

      // If backend returned nothing, fall back to page text search
      if (results.length === 0) {
        const pageResults = searchPage(trimmed);
        results = pageResults.map(r => ({ ...r }));
      }

      // Augment backend results by resolving template routes when metadata is available
      results = results.map(r => {
        const copy = { ...r };
        if (!copy.route) {
          // If result gives us a course id or lesson/quiz metadata, try to resolve
          if (copy.type === 'course' && (copy.id || copy.meta?.id || copy.meta?.courseId)) {
            const cid = copy.id || copy.meta?.id || copy.meta?.courseId;
            copy.route = `/subscription?courseId=${encodeURIComponent(cid)}`;
          } else if ((copy.type === 'lesson' || copy.type === 'quiz') && copy.meta) {
            const tpl = copy.type === 'lesson'
              ? '/student/courses/:courseId?highlightLesson=:lessonId'
              : '/student/courses/:courseId?highlightQuiz=:quizId';
            const resolved = resolveTemplateRoute(tpl, { courseId: copy.meta.courseId || copy.meta.course_id || copy.meta?.course, lessonId: copy.meta.lessonId || copy.meta.lesson_id || copy.id, quizId: copy.meta.quizId || copy.meta.quiz_id || copy.id });
            if (resolved) copy.route = resolved;
          }
        }
        return copy;
      });

      // Always augment with local route matches (deduplicated by route)
      const qLower = trimmed.toLowerCase();

      // Static local matches: only include static routes or exact title matches
      const localStaticMatches = ROUTE_INDEX.filter(r => r.route && ((r.title || '').toLowerCase().includes(qLower) || (r.route || '').toLowerCase().includes(qLower))).map(r => ({ ...r }));

      // For template entries, we only include them if we can resolve them with metadata from existing results
      const localResolvedFromResults = [];
      ROUTE_INDEX.forEach(r => {
        if (r.routeTemplate || r.params) {
          // try to resolve from any result that contains needed metadata
          for (const resItem of results) {
            const resolved = resolveTemplateRoute(r.routeTemplate || r.route, resItem.meta || { id: resItem.id });
            if (resolved && ((r.title || '').toLowerCase().includes(qLower) || resolved.toLowerCase().includes(qLower) || (resItem.title || '').toLowerCase().includes(qLower))) {
              localResolvedFromResults.push({ type: r.type, id: r.id + '-' + (resItem.id || ''), title: resItem.title || r.title, route: resolved, snippet: resItem.snippet });
            }
          }
        }
      });

      const byRoute = new Map();
      results.forEach(it => {
        if (it.route) byRoute.set(it.route, it);
        else byRoute.set((it.type || '') + '-' + (it.id || Math.random()), it);
      });
      localStaticMatches.forEach(it => {
        if (it.route && !byRoute.has(it.route)) byRoute.set(it.route, it);
      });
      localResolvedFromResults.forEach(it => {
        if (it.route && !byRoute.has(it.route)) byRoute.set(it.route, it);
      });

      const merged = Array.from(byRoute.values());
      setSearchResults(merged);

      // If the query matches a known static route (exact or strong partial match), navigate directly.
      const directMatch = merged.find(r => {
        if (!r || !r.route) return false;
        const title = (r.title || '').toLowerCase().trim();
        const id = (r.id || '').toString().toLowerCase().trim();
        // exact match first
        if (title === trimmed.toLowerCase() || id === trimmed.toLowerCase()) return true;
        // accept short partial matches for common pages (e.g., 'profile', 'dashboard', 'courses', 'subscription')
        const short = ['profile','dashboard','courses','subscription','enrolled courses','my courses','subscriptions','notes'];
        if (short.includes(trimmed.toLowerCase()) && title.includes(trimmed.toLowerCase())) return true;
        return false;
      });

      if (directMatch) {
        navigate(directMatch.route);
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      // Auto-navigate if any course result matches (course-specific search behavior)
      const courseResults = merged.filter(r => r.type === 'course');
      if (courseResults.length > 0) {
        // Course found - auto-navigate to Subscription page with the most relevant course
        navigate(`/subscription?courseId=${courseResults[0].id}`);
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }
    } catch (err) {
      console.error('Search failed', err);
      // fallback to route index + page search
      const pageResults = searchPage(trimmed);
      const qLower = trimmed.toLowerCase();
      const localMatches = ROUTE_INDEX.filter(r => (r.title || '').toLowerCase().includes(qLower) || (r.route || '').toLowerCase().includes(qLower));
      const merged = [...pageResults, ...localMatches];
      setSearchResults(merged);
    } finally {
      setSearchLoading(false);
      setSearchOpen(true);
    }
  };

  // Search current page content
  const searchPage = (query) => {
    if (!query) return [];
    const bodyText = document.body.innerText || '';
    const lowerQuery = query.toLowerCase();
    const lowerText = bodyText.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(bodyText.length, index + query.length + 50);
      const snippet = bodyText.substring(start, end);
      return [{ type: 'page', id: 'current', title: 'Found on this page', snippet: snippet + (end < bodyText.length ? '...' : ''), route: window.location.pathname }];
    }
    return [];
  };

  // NOTE: Debounced per-keystroke search removed to support long-form searches as a single action (press Search or Ctrl+Enter).
  // Long-form queries can be large; the UI provides an explicit Search button so users don't need to re-open the input for each word.


  // Close search when clicking outside
  useEffect(() => {
    const handle = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const navigateToResult = (item) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    if (!item) return;

    // If it's a user, navigate to profile and pass state
    if (item.type === 'user') {
      navigate('/profile', { state: { user: item.meta?.userId } });
      return;
    }

    // If lesson/quiz/course, navigate to course and highlight via query params
    if (item.type === 'lesson') {
      navigate(`/student/courses/${item.meta?.courseId}?highlightLesson=${item.meta?.lessonId}`);
      return;
    }

    if (item.type === 'quiz') {
      navigate(`/student/courses/${item.meta?.courseId}?highlightQuiz=${item.meta?.quizId}`);
      return;
    }

    if (item.type === 'course') {
      // Navigate to Subscription page with courseId parameter
      navigate(`/subscription?courseId=${item.id}`);
      return;
    }

    // Handle course-section type (for Curriculum, Instructor, Reviews, Quizzes, Resources)
    if (item.type === 'course-section') {
      // Navigate to Courses page with courseId and tab parameters
      navigate(item.route || `/courses?id=${item.id}&tab=${item.meta?.sectionType || ''}`);
      return;
    }

    // Handle curriculum-item type
    if (item.type === 'curriculum-item') {
      navigate(item.route || `/courses?id=${item.meta?.courseId}&tab=curriculum`);
      return;
    }

    // Handle quiz-item type
    if (item.type === 'quiz-item') {
      navigate(item.route || `/courses?id=${item.meta?.courseId}&tab=quizzes`);
      return;
    }

    // Handle instructor type
    if (item.type === 'instructor') {
      // Navigate to profile or instructor page
      if (item.meta?.courseId) {
        navigate(`/courses?id=${item.meta.courseId}&tab=instructor`);
      } else {
        navigate(item.route || '/profile');
      }
      return;
    }

    // fallback: open route if provided
    if (item.route) {
      navigate(item.route);
    }
  };

  // SearchBox component — replaced with a search icon that opens a long-form textarea panel
  function SearchBox() {
    const [sentenceCount, setSentenceCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const textareaRef = useRef(null);

    const MAX_SENTENCES = 100;
    const MAX_CHARS = 20000;

    const countSentences = (text = '') => {
      // Split on sentence boundary punctuation or newlines; trim empty segments
      const parts = (text || '').split(/(?<=[.!?])\s+|\n+/).map(p => p.trim()).filter(Boolean);
      return parts.length;
    };

    useEffect(() => {
      setCharCount((searchQuery || '').length);
      setSentenceCount(countSentences(searchQuery || ''));
    }, [searchQuery]);

    useEffect(() => {
      if (searchOpen && textareaRef.current) {
        const el = textareaRef.current;
        el.focus();
        const len = (el.value || '').length;
        try { el.setSelectionRange(len, len); } catch (e) { /* ignore */ }
      }
    }, [searchOpen]);

    const handleChange = (e) => {
      let v = e.target.value || '';
      if (v.length > MAX_CHARS) {
        v = v.substring(0, MAX_CHARS);
      }
      setSearchQuery(v);
      setCharCount(v.length);
      setSentenceCount(countSentences(v));
    };

    const handleSubmit = () => {
      let q = (searchQuery || '').trim();
      if (!q) return;

      // Enforce sentence cap — truncate to first MAX_SENTENCES sentences
      const parts = (q || '').split(/(?<=[.!?])\s+|\n+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > MAX_SENTENCES) {
        q = parts.slice(0, MAX_SENTENCES).join(' ');
      }

      performSearch(q);
    };

    return (
      <div ref={searchRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Open search"
          aria-expanded={searchOpen}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--text)',
            fontSize: '18px'
          }}
        >
          <FiSearch size={22} />
        </button>

        {searchOpen && (
          <div style={{
            position: 'absolute',
            top: '40px',
            right: 0,
            width: '300px',
            maxWidth: '92vw',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 300,
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <input
                ref={textareaRef}
                type="text"
                aria-label="Search input"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                  }
                }}
                style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--text)' }}
              />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setSearchOpen(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    Cancel
                  </button>

                  <button onClick={handleSubmit} disabled={searchLoading || !searchQuery.trim()} style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: searchLoading || !searchQuery.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiSearch size={16} />
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '8px' }}>
              {searchLoading && <div style={{ padding: '12px', color: 'var(--muted)' }}>Searching...</div>}

              {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                <div style={{ padding: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No Results Found</div>
                  <div style={{ fontSize: '12px' }}>No results found for "{searchQuery}"</div>
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (() => {
                // Get categorized results from API response if available
                const searchResponse = searchResults.length > 0 && searchResults[0]._categorized ? 
                  searchResults[0]._categorized : null;
                
                // Group results by category for display
                const categories = {
                  courses: searchResults.filter(r => r.type === 'course'),
                  curriculum: searchResults.filter(r => r.type === 'curriculum-item' || (r.type === 'course-section' && r.meta?.sectionType === 'curriculum')),
                  instructors: searchResults.filter(r => r.type === 'instructor' || (r.type === 'course-section' && r.meta?.sectionType === 'instructor')),
                  reviews: searchResults.filter(r => r.type === 'course-section' && r.meta?.sectionType === 'reviews'),
                  quizzes: searchResults.filter(r => r.type === 'quiz-item' || (r.type === 'course-section' && r.meta?.sectionType === 'quizzes')),
                  resources: searchResults.filter(r => r.type === 'course-section' && r.meta?.sectionType === 'resources'),
                  users: searchResults.filter(r => r.type === 'user' && r.meta?.role !== 'instructor'),
                  lessons: searchResults.filter(r => r.type === 'lesson')
                };

                // Determine a primary category when section-specific results exist.
                // This ensures we only show the relevant panel instead of mixing categories.
                const primaryCategory =
                  categories.curriculum.length ? 'curriculum' :
                  categories.instructors.length ? 'instructors' :
                  categories.reviews.length ? 'reviews' :
                  categories.quizzes.length ? 'quizzes' :
                  categories.resources.length ? 'resources' :
                  null;

                const categoryLabels = {
                  courses: 'Courses',
                  curriculum: 'Curriculum',
                  instructors: 'Instructors',
                  reviews: 'Reviews',
                  quizzes: 'Quizzes',
                  resources: 'Resources',
                  users: 'Users',
                  lessons: 'Lessons'
                };

                const categoryColors = {
                  courses: '#1b65d4',
                  curriculum: '#10b981',
                  instructors: '#8b5cf6',
                  reviews: '#f59e0b',
                  quizzes: '#ef4444',
                  resources: '#06b6d4',
                  users: '#2db88e',
                  lessons: '#6366f1'
                };

                const renderCategory = (categoryKey, items) => {
                  if (!items || items.length === 0) return null;

                  return (
                    <div key={categoryKey} style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        padding: '6px 8px', 
                        background: 'var(--surface)', 
                        borderLeft: `3px solid ${categoryColors[categoryKey] || '#666'}`,
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        marginBottom: '8px'
                      }}>
                        {categoryLabels[categoryKey]} ({items.length})
                      </div>
                      {items.map((r) => (
                        <div 
                          key={`${r.type}-${r.id}`} 
                          role="button" 
                          tabIndex={0} 
                          onClick={() => navigateToResult(r)} 
                          onKeyDown={(e) => { if (e.key === 'Enter') navigateToResult(r); }} 
                          style={{ 
                            padding: '8px', 
                            borderBottom: '1px solid var(--border)', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            gap: '8px', 
                            alignItems: 'center',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '3px', 
                            background: categoryColors[categoryKey] || '#666',
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.title}
                            </div>
                            {r.snippet && (
                              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.snippet}
                              </div>
                            )}
                            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', textTransform: 'capitalize' }}>
                              {r.type === 'course-section' ? (r.meta?.sectionType || 'course section') : r.type === 'curriculum-item' ? 'lesson' : r.type === 'quiz-item' ? 'quiz' : r.type}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                };

                // Render all categories that have results
                return (
                  <>
                    {Object.keys(categories)
                      .filter(key => {
                        // If a primary category exists (e.g., curriculum search), show only that panel.
                        if (primaryCategory) return key === primaryCategory;
                        // Otherwise show all categories that have results.
                        return categories[key] && categories[key].length > 0;
                      })
                      .map(key => renderCategory(key, categories[key]))}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Notifications fetched from API
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationDetail, setShowNotificationDetail] = useState(false);

  const handleNotificationClick = (notif) => {
    // Mark as read via API
    if (notif.unread) {
      api.markNotificationAsRead(notif._id).catch(err => console.error('Error marking as read:', err));
    }

    // Update local state
    setNotifications((prev) => prev.map(n => n._id === notif._id ? { ...n, unread: false, readAt: new Date() } : n));

    // Set selected and open detail card
    setSelectedNotification({ ...notif, unread: false });
    setShowNotifications(false);
    setShowNotificationDetail(true);
  };

  const handleDeleteNotification = (id) => {
    // Delete via API
    setLoading(true);
    api.deleteNotification(id)
      .then(() => {
        setNotifications((prev) => prev.filter(n => n._id !== id));
        setShowNotificationDetail(false);
        setSelectedNotification(null);
      })
      .catch(err => console.error('Error deleting notification:', err))
      .finally(() => setLoading(false));
  };

  const handleOpenFromDetail = () => {
    if (!selectedNotification) return;
    const route = selectedNotification.route;
    setShowNotificationDetail(false);
    setSelectedNotification(null);
    if (route) navigate(route);
  };

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.getNotifications(10, 1);
        if (data.success && Array.isArray(data.notifications)) {
          // Convert createdAt string to relative time format
          const notificationsWithTime = data.notifications.map(notif => ({
            ...notif,
            time: getRelativeTime(notif.createdAt),
          }));
          setNotifications(notificationsWithTime);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to empty array if API fails
        setNotifications([]);
      }
    };

    // Load user avatar and gender from localStorage (normalize gender)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const genderNormalized = (user.gender || "").toString().toLowerCase();
        setUserGender(genderNormalized);
        setUserAvatar(normalizeAvatar(user.avatar));
        
        // Generate initials: get first char of first and last name, or first 2 chars if single word
        const fullName = (user.fullName || "").trim();
        let initials = "";
        if (fullName.length > 0) {
          const parts = fullName.split(/\s+/); // Split by whitespace
          if (parts.length >= 2) {
            // Multi-word name: first char of first + first char of last
            initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          } else {
            // Single word: first two chars
            initials = fullName.substring(0, 2).toUpperCase();
          }
        }
        setUserInitials(initials);
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }
    }

    fetchNotifications();

    // Refresh notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Convert ISO timestamp to relative time (e.g., "2 hours ago")
  const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
 
  // Close dropdowns if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for updates to the stored user (so Header updates when Dashboard saves profile)
  useEffect(() => {
    const handleUserUpdated = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const genderNormalized = (user.gender || "").toString().toLowerCase();
          setUserGender(genderNormalized);
          setUserAvatar(normalizeAvatar(user.avatar));

          const fullName = (user.fullName || "").trim();
          let initials = "";
          if (fullName.length > 0) {
            const parts = fullName.split(/\s+/);
            if (parts.length >= 2) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            else initials = fullName.substring(0, 2).toUpperCase();
          }
          setUserInitials(initials);
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      } else {
        setUserGender("");
        setUserAvatar("");
        setUserInitials("");
      }
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, []);
 
  const handleLogout = () => {
    // Clear session and user role
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
   
    // Close dropdown
    setShowDropdown(false);
 
    // Redirect to login page with success message
    navigate("/", {
      replace: true,
      state: { message: "You have successfully logged out" }
    });
  };

  const goToProfile = () => {
    // Close dropdown and navigate to profile page
    setShowDropdown(false);
    navigate("/profile");
  };
 
  const unreadCount = notifications.filter(n => n.unread).length;
 
  return (
    <header className="header-wrapper" style={{ position: "relative" }}>
      <div className="header-left">
        <button className="mobile-toggle" onClick={onToggleSidebar}>☰</button>
        <div className="header-title" style={{ color: 'var(--text)' }}>{children}</div>
      </div>
 
      <div className="header-right" style={{ position: "relative" }}>
        {/* Global Search Bar */}
        <div style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }}>
          <SearchBox />
        </div>

        {/* Notification Icon */}
        <div ref={notificationRef} style={{ display: "inline-block", position: "relative", marginRight: "15px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={notification}
              alt="Notification"
              className="header-notification"
              style={{ cursor: "pointer" }}
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {/* Notification Badge */}
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                backgroundColor: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: "bold"
              }}>
                {unreadCount}
              </span>
            )}
          </div>
 
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              style={{
                  position: "absolute",
                  top: "50px",
                  right: "0",
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  width: "350px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  zIndex: 100,
                }}
            >
              {/* Header */}
              <div style={{
                padding: "15px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                backgroundColor: "var(--header-bg)",
                zIndex: 1
              }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "500" }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
 
              {/* Notification List */}
              {notifications && notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notif)}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notif); }}
                    style={{
                      padding: "15px 20px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      backgroundColor: notif.unread ? "rgba(58,124,255,0.08)" : "var(--card)",
                      transition: "background-color 0.2s",
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(58,124,255,0.08)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.unread ? "rgba(58,124,255,0.08)" : "var(--card)"}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        {notif.unread && (
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "var(--primary)",
                          marginTop: "6px",
                          flexShrink: 0
                        }}></div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: "0 0 5px 0",
                          fontSize: "14px",
                          fontWeight: notif.unread ? "600" : "500",
                          color: "var(--text)"
                        }}>
                          {notif.title}
                        </h4>
                        <p style={{
                          margin: "0 0 5px 0",
                          fontSize: "13px",
                          color: "var(--muted)",
                          lineHeight: "1.4"
                        }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {notif.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                  No notifications
                </div>
              )}
 
              {/* End list */}
            </div>
          )}
        </div>

        {/* Notification Detail Card (modal-like) */}
        {showNotificationDetail && selectedNotification && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
            onClick={() => { setShowNotificationDetail(false); setSelectedNotification(null); }}
          >
            <div role="dialog" aria-modal="true" aria-label="Notification details" onClick={(e) => e.stopPropagation()} style={{
              width: '420px',
              background: 'var(--card)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>{selectedNotification.title}</h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{selectedNotification.time}</span>
              </div>
              <p style={{ marginTop: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{selectedNotification.message}</p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button onClick={() => handleDeleteNotification(selectedNotification._id)} style={{ padding: '8px 12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Delete
                </button>
                <button onClick={() => { setShowNotificationDetail(false); setSelectedNotification(null); }} style={{ padding: '8px 12px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* Profile Avatar */}
        <div ref={dropdownRef} style={{ display: "inline-block", position: "relative" }}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="header-profile"
              style={{ cursor: "pointer", width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
              onClick={() => setShowDropdown(!showDropdown)}
            />
          ) : userGender === "female" ? (
            <div
              style={{
                cursor: "pointer",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <img
                src={avatarFemale}
                alt="Female Avatar"
                style={{ width: "32px", height: "32px" }}
              />
            </div>
          ) : (
            <div
              style={{
                cursor: "pointer",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <img
                src={profile}
                alt="Male Avatar"
                style={{ width: "32px", height: "32px" }}
              />
            </div>
      
          )}
 
          {/* Profile Dropdown */}
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "0",
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                padding: "10px 0",
                zIndex: 100,
                minWidth: "200px",
                display: "flex",
                flexDirection: "column",
                gap: "0",
              }}
            >
              {/* Profile Button */}
              <button
                onClick={goToProfile}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "transparent",
                  color: "var(--text)",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "10px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <IoPersonOutline size={18} />
                Profile
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "transparent",
                  color: "var(--danger)",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "10px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <IoLogOutOutline size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
 
export default Header;