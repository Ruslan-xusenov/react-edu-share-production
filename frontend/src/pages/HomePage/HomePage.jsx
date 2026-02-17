import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaCode, FaCalculator, FaFlask, FaLanguage } from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import Footer from '../../components/Footer/Footer';
import './HomePage.css';

const HomePage = () => {
    const [featuredCourses, setFeaturedCourses] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: 2500,
        totalCourses: 120,
        totalTeachers: 15,
    });

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.LESSONS);
                const courses = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setFeaturedCourses(courses.slice(0, 4));
                if (res.data.count) setStats(s => ({ ...s, totalCourses: res.data.count }));
            } catch (error) {
                console.error("Error fetching homepage data:", error);
            }
        };
        fetchHomeData();
    }, []);

    const coursesScrollRef = useRef(null);

    useEffect(() => {
        const scrollContainer = coursesScrollRef.current;
        if (!scrollContainer) return;

        let scrollInterval;
        const startAutoScroll = () => {
            scrollInterval = setInterval(() => {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
                const maxScroll = scrollWidth - clientWidth;

                if (scrollLeft >= maxScroll - 5) {
                    scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollContainer.scrollBy({ left: clientWidth * 0.8, behavior: 'smooth' });
                }
            }, 5000); // 5 seconds for courses
        };

        if (window.innerWidth <= 1024) {
            startAutoScroll();
        }

        return () => clearInterval(scrollInterval);
    }, [featuredCourses]);

    const categories = [
        { name: 'Develop', icon: <FaCode />, color: 'var(--accent-cyan)' },
        { name: 'Analyze', icon: <FaCalculator />, color: 'var(--accent-pink)' },
        { name: 'Discover', icon: <FaFlask />, color: 'var(--accent-purple)' },
        { name: 'Connect', icon: <FaLanguage />, color: '#fff' },
    ];

    return (
        <div className="homepage-horizontal">
            <Helmet>
                <title>EDUSHARE — FUTURISTIC LEARNING ENGINE</title>
                <meta name="description" content="AI-driven peer-to-peer education platform." />
            </Helmet>

            {/* HERO SECTION */}
            <section className="hero-section">
                <div className="hero-orb hero-orb-1"></div>
                <div className="hero-orb hero-orb-2"></div>
                <div className="hero-content">
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        THE FUTURE <br />
                        <span className="hero-gradient-text">OF KNOWLEDGE.</span>
                    </motion.h1>
                    <motion.p
                        className="hero-description"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                    >
                        Empowering the next generation of digital architects and creators through decentralized education.
                    </motion.p>
                    <div className="hero-actions">
                        <Link to="/courses" className="btn btn-primary">ENTER PLATFORM</Link>
                        <Link to="/about" className="btn">MANIFESTO</Link>
                    </div>
                </div>
            </section>

            {/* STATS SECTION */}
            <section className="stats-section">
                <div className="stats-grid">
                    <motion.div
                        className="stat-item"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                    >
                        <span className="stat-number">{stats.totalStudents}</span>
                        <span className="stat-label">ARCHITECTS</span>
                    </motion.div>
                    <motion.div
                        className="stat-item"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <span className="stat-number">{stats.totalCourses}</span>
                        <span className="stat-label">MODULES</span>
                    </motion.div>
                </div>
            </section>

            {/* CATEGORIES SECTION */}
            <section className="categories-section">
                <div className="categories-container">
                    <motion.h2
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                    >
                        CHOOSE YOUR <br /> OPERATING SYSTEM.
                    </motion.h2>
                    <div className="categories-grid">
                        {categories.map((cat, i) => (
                            <motion.div
                                key={i}
                                className="category-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="category-icon" style={{ color: cat.color }}>{cat.icon}</div>
                                <h3>{cat.name}</h3>
                                <Link to={`/courses?category=${cat.name.toLowerCase()}`} className="nav-link">INITIALIZE</Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* COURSES SECTION */}
            <section className="courses-section">
                <div className="courses-container">
                    <h2>SELECTED <br /> MODULES.</h2>
                    <div className="courses-grid-horizontal" ref={coursesScrollRef}>
                        {featuredCourses.length > 0 ? featuredCourses.map((course, i) => (
                            <motion.div
                                key={course.id}
                                className="course-card"
                                whileHover={{ scale: 1.02 }}
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="course-image-wrapper">
                                    <img
                                        src={course.thumbnail_url || `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800`}
                                        alt={course.title}
                                        className="course-image"
                                    />
                                </div>
                                <div className="course-info">
                                    <h3 className="course-title">{course.title}</h3>
                                    <Link to={`/courses/${course.id}`} className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', fontSize: '0.6rem' }}>LOAD MODULE</Link>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="loading-state">SYNCHRONIZING...</div>
                        )}
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="cta-section">
                <div className="cta-content">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                    >
                        READY TO <br /> <span className="cta-highlight">UPGRADE?</span>
                    </motion.h2>
                    <div className="hero-actions" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
                        <Link to="/signup" className="btn btn-primary">CREATE CORE ACCOUNT</Link>
                    </div>
                </div>
            </section>

            {/* FOOTER - Final Section */}
            <section className="horizontal-section" style={{ height: 'auto', minHeight: '100vh', display: 'flex', alignItems: 'flex-end', width: '100vw' }}>
                <Footer />
            </section>
        </div>
    );
};

export default HomePage;
