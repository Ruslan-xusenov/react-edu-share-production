import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import HomePage from './pages/HomePage/HomePage';
import CoursesPage from './pages/CoursesPage/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage/CourseDetailPage';
import AboutPage from './pages/AboutPage/AboutPage';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import LeaderboardPage from './pages/LeaderboardPage/LeaderboardPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import MyLearningPage from './pages/MyLearningPage/MyLearningPage';
import CreateLessonPage from './pages/CreateLessonPage/CreateLessonPage';
import CertificatePage from './pages/CertificatePage/CertificatePage';
import { AnimatePresence, motion } from 'framer-motion';
import apiClient, { API_ENDPOINTS } from './config/api';
import SplashScreen from './components/SplashScreen/SplashScreen';
import './App.css';

// Google OAuth callback handler component
// ScrollReset component to reset horizontal scroll on navigation
function ScrollReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.querySelector('.main-content');
    if (container) {
      container.scrollLeft = 0;
    }
  }, [pathname]);

  return null;
}

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

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const location = useLocation();

  useEffect(() => {
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');

    const moveCursor = (e) => {
      if (cursor && follower) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        follower.style.left = `${e.clientX}px`;
        follower.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  useEffect(() => {
    let isScrolling = false;
    const handleWheel = (e) => {
      // Disable horizontal scroll conversion on mobile/tablet
      if (window.innerWidth <= 1024) return;

      const container = document.querySelector('.main-content');
      if (!container || isScrolling) return;

      // Check if we are inside a vertically scrollable element that hasn't reached its limits
      const isVerticallyScrollable = (el) => {
        if (!el || el === document.body || el === document.documentElement) return false;
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
        const canScrollMore = el.scrollHeight > el.clientHeight;

        if (isScrollable && canScrollMore) {
          const isAtTop = el.scrollTop === 0;
          const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 1;
          if (e.deltaY < 0 && !isAtTop) return true;
          if (e.deltaY > 0 && !isAtBottom) return true;
        }
        return isVerticallyScrollable(el.parentElement);
      };

      if (isVerticallyScrollable(e.target)) {
        return; // Allow native vertical scroll
      }

      if (e.deltaY !== 0) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        const scrollAmount = window.innerWidth;

        isScrolling = true;
        container.scrollBy({
          left: direction * scrollAmount,
          behavior: 'smooth'
        });

        setTimeout(() => {
          isScrolling = false;
        }, 800);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.main-content');
      const progress = document.querySelector('.scroll-progress');
      if (container && progress) {
        const scrollPercent = (container.scrollLeft / (container.scrollWidth - container.clientWidth)) * 100;
        progress.style.width = scrollPercent + '%';
      }
    };

    const container = document.querySelector('.main-content');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HelmetProvider>
      <ScrollReset />
      <AuthCallbackHandler />
      <div className="app">
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <div className="custom-cursor"></div>
        <div className="custom-cursor-follower"></div>
        <div className="scroll-progress"></div>
        <Navbar />
        <main className="main-content">
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
              <Route path="*" element={
                <PageWrapper>
                  <section className="horizontal-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <h1>404</h1>
                    <p>Sahifa topilmadi</p>
                  </section>
                </PageWrapper>
              } />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </HelmetProvider>
  );
}

export default App;