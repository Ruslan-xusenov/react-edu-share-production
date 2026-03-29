import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import Navbar from './components/Navbar/Navbar';
import apiClient, { API_ENDPOINTS } from './config/api';
import SplashScreen from './components/SplashScreen/SplashScreen';
const AIChatBot = lazy(() => import('./components/AIChatBot/AIChatBot'));
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';

// ⚡ Lazy-loaded pages — code-splitting for better performance
const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage/CourseDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage/SignupPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage/LeaderboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage/ProfilePage'));
const MyLearningPage = lazy(() => import('./pages/MyLearningPage/MyLearningPage'));
const CreateLessonPage = lazy(() => import('./pages/CreateLessonPage/CreateLessonPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage/CertificatePage'));

// Community Pages
const BookReviewsPage = lazy(() => import('./pages/BookReviewsPage/BookReviewsPage'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage/ArticleDetailPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage/AnnouncementsPage'));

// Pages that use horizontal scroll (desktop)
const HORIZONTAL_ROUTES = ['/', '/about', '/leaderboard'];

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div style={{
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#102C26',
    flexShrink: 0,
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(247, 231, 206, 0.1)',
      borderTopColor: '#F7E7Ce',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  </div>
);

// ScrollReset component — scroll to top on navigation
function ScrollReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.querySelector('.main-content');
    if (container) {
      container.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Google OAuth callback handler
function AuthCallbackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'success') {
      apiClient.get(API_ENDPOINTS.PROFILE)
        .then(res => {
          if (res.data.status === 'success') {
            localStorage.setItem('authToken', 'session-active');
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/', { replace: true });
            window.location.reload();
          }
        })
        .catch(err => {
          console.error('Google auth callback - failed to fetch profile:', err);
          navigate('/', { replace: true });
        });
    }
  }, [location.search, navigate]);

  return null;
}

// Page transition — vertical (fade + slide up)
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    style={{ width: '100%', flexShrink: 0 }}
    role="main"
  >
    {children}
  </motion.div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const location = useLocation();

  // Determine if current route uses horizontal scroll
  const isHorizontalRoute = useMemo(() => {
    return HORIZONTAL_ROUTES.includes(location.pathname);
  }, [location.pathname]);

  // Custom cursor — only on desktop (no touch)
  useEffect(() => {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');
    if (!cursor || !follower) return;

    let rafId;
    const moveCursor = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        follower.style.left = `${e.clientX}px`;
        follower.style.top = `${e.clientY}px`;
      });
    };

    window.addEventListener('mousemove', moveCursor, { passive: true });
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Horizontal scroll progress bar + wheel → horizontal scroll (only for horizontal routes)
  useEffect(() => {
    const container = document.querySelector('.main-content');
    if (!container) return;

    let ticking = false;
    let cachedMetrics = {
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight
    };

    const updateMetrics = () => {
      cachedMetrics = {
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight
      };
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const progress = document.querySelector('.scroll-progress');
        if (progress) {
          if (isHorizontalRoute && window.innerWidth > 1024) {
            const scrollPercent = (container.scrollLeft / (cachedMetrics.scrollWidth - cachedMetrics.clientWidth)) * 100;
            progress.style.width = (scrollPercent || 0) + '%';
          } else {
            const scrollPercent = (container.scrollTop / (cachedMetrics.scrollHeight - cachedMetrics.clientHeight)) * 100;
            progress.style.width = (scrollPercent || 0) + '%';
          }
        }
        ticking = false;
      });
    };

    // Convert vertical wheel to horizontal scroll (only for horizontal routes on desktop)
    const handleWheel = (e) => {
      if (isHorizontalRoute && window.innerWidth > 1024) {
        e.preventDefault();
        container.scrollBy({
          left: e.deltaY * 2,
          behavior: 'smooth'
        });
      }
    };

    window.addEventListener('resize', updateMetrics);
    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('resize', updateMetrics);
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isHorizontalRoute]);

  const scrollModeClass = isHorizontalRoute ? 'horizontal-mode' : 'vertical-mode';

  return (
    <HelmetProvider>
      {/* Default SEO for all pages */}
      <Helmet>
        <html lang="uz" />
        <meta name="theme-color" content="#102C26" />
      </Helmet>
      <ScrollReset />
      <AuthCallbackHandler />
      <div className="app" role="application" aria-label="EduShare School ta'lim platformasi">
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <div className="custom-cursor" aria-hidden="true"></div>
        <div className="custom-cursor-follower" aria-hidden="true"></div>
        <div className="scroll-progress" role="progressbar" aria-label="Sahifa scroll progressi" aria-hidden="true"></div>
        <Navbar />
        <Suspense fallback={null}>
          <AIChatBot />
        </Suspense>
        <main className={`main-content ${scrollModeClass}`} id="main-content" aria-label="Asosiy kontent">
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
                <Route path="/courses" element={<PageWrapper><CoursesPage /></PageWrapper>} />
                <Route path="/courses/:id" element={<PageWrapper><CourseDetailPage /></PageWrapper>} />
                <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
                <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
                <Route path="/signup" element={<PageWrapper><SignupPage /></PageWrapper>} />
                <Route path="/leaderboard" element={<PageWrapper><LeaderboardPage /></PageWrapper>} />
                <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
                <Route path="/my-learning" element={<PageWrapper><MyLearningPage /></PageWrapper>} />
                <Route path="/create-lesson" element={<PageWrapper><CreateLessonPage /></PageWrapper>} />
                <Route path="/certificate/:id" element={<PageWrapper><CertificatePage /></PageWrapper>} />
                
                {/* Community Routes */}
                <Route path="/community/books" element={<PageWrapper><BookReviewsPage /></PageWrapper>} />
                <Route path="/community/news" element={<PageWrapper><ArticlesPage /></PageWrapper>} />
                <Route path="/community/articles/:slug" element={<PageWrapper><ArticleDetailPage /></PageWrapper>} />
                <Route path="/community/events" element={<PageWrapper><AnnouncementsPage /></PageWrapper>} />
                
                <Route path="*" element={
                  <PageWrapper>
                    <section className="horizontal-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }} aria-label="404 Sahifa topilmadi">
                      <h1>404</h1>
                      <p>Sahifa topilmadi</p>
                    </section>
                  </PageWrapper>
                } />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </HelmetProvider>
  );
}

export default App;