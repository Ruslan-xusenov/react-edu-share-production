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
import AIChatBot from './components/AIChatBot/AIChatBot';
import './App.css';

// ScrollReset component — scroll to top on navigation
function ScrollReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.querySelector('.main-content');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'instant' });
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
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const location = useLocation();

  // Custom cursor
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

  // Vertical scroll progress bar
  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.main-content');
      const progress = document.querySelector('.scroll-progress');
      if (container && progress) {
        const scrollPercent = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
        progress.style.width = (scrollPercent || 0) + '%';
      }
    };

    const container = document.querySelector('.main-content');
    container?.addEventListener('scroll', handleScroll, { passive: true });
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
        <AIChatBot />
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