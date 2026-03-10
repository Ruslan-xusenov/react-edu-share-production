import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    FaHeart, FaRocket, FaUsers, FaGraduationCap,
    FaLightbulb, FaHandshake, FaGlobe,
    FaChartLine, FaAward, FaMedal
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import Footer from '../../components/Footer/Footer';
import './AboutPage.css';

const AboutPage = () => {
    const fadeIn = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: "easeOut" }
    };

    const staggerContainer = {
        animate: { transition: { staggerChildren: 0.1 } }
    };

    const [stats, setStats] = useState({
        students: 2500,
        courses: 120,
        certificates: 85
    });
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, teamRes] = await Promise.all([
                    apiClient.get(API_ENDPOINTS.STATS),
                    apiClient.get(API_ENDPOINTS.TEAM)
                ]);
                if (statsRes.data.status === 'success') {
                    setStats(statsRes.data.stats);
                }
                if (teamRes.data.status === 'success') {
                    setTeam(teamRes.data.team);
                }
            } catch (error) {
                console.error("Error fetching about data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const values = [
        { icon: <FaHeart />, title: 'ARCHITECTS', description: 'Built for students, by students.' },
        { icon: <FaLightbulb />, title: 'INNOVATE', description: 'Leveraging AI and decentralization.' },
        { icon: <FaHandshake />, title: 'SYNERGY', description: 'Collaborative collective intelligence.' },
        { icon: <FaGlobe />, title: 'GLOBAL', description: 'Knowledge without borders.' }
    ];

    const teamScrollRef = useRef(null);

    useEffect(() => {
        const scrollContainer = teamScrollRef.current;
        if (!scrollContainer) return;

        let scrollInterval;
        const startAutoScroll = () => {
            scrollInterval = setInterval(() => {
                requestAnimationFrame(() => {
                    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
                    const maxScroll = scrollWidth - clientWidth;

                    if (scrollLeft >= maxScroll - 5) {
                        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        scrollContainer.scrollBy({ left: clientWidth * 0.8, behavior: 'smooth' });
                    }
                });
            }, 4000);
        };

        if (window.innerWidth <= 1024) {
            startAutoScroll();
        }

        return () => clearInterval(scrollInterval);
    }, [team]);

    return (
        <div className="about-page">
            <Helmet>
                <title>Biz Haqimizda — EduShare School | Missiya va Jamoa</title>
                <meta name="description" content="EduShare School — bepul ta'lim platformasi haqida. Bizning missiyamiz, qadriyatlarimiz va jamoamiz. Ruslan Xusenov va Elbek Sharofov tomonidan yaratilgan." />
                <meta name="keywords" content="EduShare haqida, EduShare missiyasi, Ruslan Xusenov, Elbek Sharofov, bepul ta'lim" />
                <link rel="canonical" href="https://edushare.uz/about" />
            </Helmet>

            <section className="about-hero">
                <motion.div
                    className="hero-content"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeIn}
                >
                    <motion.h1>THE MANIFESTO.</motion.h1>
                    <p className="hero-description">
                        EduShare exists to decentralize knowledge. We believe the best way to learn is to teach,
                        and the best way to grow is to share.
                    </p>
                </motion.div>
            </section>

            <section className="mission-section">
                <div className="mission-grid">
                    <motion.div
                        className="mission-image"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        viewport={{ once: true }}
                    >
                        <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop&q=80" alt="Mission" width="1200" height="800" loading="lazy" />
                    </motion.div>
                    <motion.div
                        className="mission-content"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={fadeIn}
                    >
                        <h2>THE MISSION.</h2>
                        <p className="mission-text">
                            To create a global autonomous network of peer learners.
                            Shared knowledge is accelerated progress.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="values-section">
                <motion.div
                    className="values-grid"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    {values.map((v, i) => (
                        <motion.div key={i} className="value-card" variants={fadeIn}>
                            <div className="value-icon">{v.icon}</div>
                            <h3>{v.title}</h3>
                            <p>{v.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            <section className="achievements-section">
                <motion.div
                    className="achievements-grid"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    <motion.div className="achievement-card" variants={fadeIn}>
                        <div className="achievement-number">{stats.students}</div>
                        <div className="achievement-label">ARCHITECTS</div>
                    </motion.div>
                    <motion.div className="achievement-card" variants={fadeIn}>
                        <div className="achievement-number">{stats.courses}</div>
                        <div className="achievement-label">MODULES</div>
                    </motion.div>
                </motion.div>
            </section>

            {team.length > 0 && (
                <section className="team-section">
                    <motion.div
                        className="team-grid"
                        ref={teamScrollRef}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                    >
                        {team.map((m, i) => (
                            <motion.div key={i} className="team-card" variants={fadeIn}>
                                <div className="team-image">
                                    <img
                                        src={m.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80'}
                                        alt={m.name}
                                        loading="lazy"
                                        width="800"
                                        height="800"
                                    />
                                </div>
                                <div className="team-content">
                                    <h3>{m.name}</h3>
                                    <div className="team-role">{m.role}</div>
                                    <p>{m.bio}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>
            )}
            <section className="about-cta">
                <motion.div
                    className="cta-content"
                    style={{ textAlign: 'center' }}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeIn}
                >
                    <h2>JOIN THE <br /> <span className="cta-highlight">COLLECTIVE.</span></h2>
                    <div className="hero-actions" style={{ marginTop: '4rem' }}>
                        <a href="/signup" className="btn btn-primary">INITIALIZE ACCOUNT</a>
                    </div>
                </motion.div>
            </section>

            {/* FOOTER - Final Section */}
            <section className="horizontal-section" style={{ height: 'auto', minHeight: 'auto', display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <Footer />
            </section>
        </div>
    );
};

export default AboutPage;