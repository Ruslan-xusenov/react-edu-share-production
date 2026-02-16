import { useEffect } from 'react';
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
import apiClient, { API_ENDPOINTS } from './config/api';
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

function App() {
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
      <Router>
        <ScrollReset />
        <AuthCallbackHandler />
        <div className="app">
          <div className="custom-cursor"></div>
          <div className="custom-cursor-follower"></div>
          <div className="scroll-progress"></div>
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-learning" element={<MyLearningPage />} />
              <Route path="/create-lesson" element={<CreateLessonPage />} />
              <Route path="/certificate/:id" element={<CertificatePage />} />
              <Route path="*" element={
                <section className="horizontal-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <h1>404</h1>
                  <p>Sahifa topilmadi</p>
                </section>
              } />
            </Routes>
            <Footer />
          </main>
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;