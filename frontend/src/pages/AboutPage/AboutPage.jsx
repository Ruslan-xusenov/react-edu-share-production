import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    FaHeart, FaRocket, FaUsers, FaGraduationCap,
    FaLightbulb, FaHandshake, FaGlobe,
    FaChartLine, FaAward, FaMedal
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './AboutPage.css';

const AboutPage = () => {
    const [stats, setStats] = useState({
        students: 2500,
        courses: 120,
        lessons: 450,
        certificates: 85
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.STATS);
                if (res.data.status === 'success') {
                    setStats(res.data.stats);
                }
            } catch (error) {
                console.error("Error fetching about stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const values = [
        { icon: <FaHeart />, title: 'ARCHITECTS', description: 'Built for students, by students.' },
        { icon: <FaLightbulb />, title: 'INNOVATE', description: 'Leveraging AI and decentralization.' },
        { icon: <FaHandshake />, title: 'SYNERGY', description: 'Collaborative collective intelligence.' },
        { icon: <FaGlobe />, title: 'GLOBAL', description: 'Knowledge without borders.' }
    ];

    const team = [
        { name: 'Ruslan Xusenov', role: 'CORE ARCHITECT', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop', bio: 'Founder of the EduShare engine.' },
        { name: 'Amir Karimov', role: 'SYSTEMS LEAD', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&fit=crop', bio: 'Specialist in scalable knowledge systems.' },
        { name: 'Dilnoza Rahimova', role: 'COMMUNITY NODE', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&fit=crop', bio: 'Growing the decentralized learner network.' }
    ];

    return (
        <div className="about-page">
            <Helmet>
                <title>MANIFESTO — EDUSHARE ENGINE</title>
            </Helmet>

            <section className="about-hero">
                <div className="hero-content">
                    <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>THE MANIFESTO.</motion.h1>
                    <p className="hero-description">
                        EduShare exists to decentralize knowledge. We believe the best way to learn is to teach,
                        and the best way to grow is to share.
                    </p>
                </div>
            </section>

            <section className="mission-section">
                <div className="mission-grid">
                    <div className="mission-image">
                        <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800" alt="Mission" />
                    </div>
                    <div className="mission-content">
                        <h2>THE MISSION.</h2>
                        <p className="mission-text">
                            To create a global autonomous network of peer learners.
                            Shared knowledge is accelerated progress.
                        </p>
                    </div>
                </div>
            </section>

            <section className="values-section">
                <div className="values-grid">
                    {values.map((v, i) => (
                        <div key={i} className="value-card">
                            <div className="value-icon">{v.icon}</div>
                            <h3>{v.title}</h3>
                            <p>{v.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="achievements-section">
                <div className="achievements-grid">
                    <div className="achievement-card">
                        <div className="achievement-number">{stats.students}</div>
                        <div className="achievement-label">ARCHITECTS</div>
                    </div>
                    <div className="achievement-card">
                        <div className="achievement-number">{stats.courses}</div>
                        <div className="achievement-label">MODULES</div>
                    </div>
                </div>
            </section>

            <section className="team-section">
                <div className="team-grid">
                    {team.map((m, i) => (
                        <div key={i} className="team-card">
                            <div className="team-image"><img src={m.image} alt={m.name} /></div>
                            <div className="team-content">
                                <h3>{m.name}</h3>
                                <div className="team-role">{m.role}</div>
                                <p>{m.bio}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="about-cta">
                <div className="cta-content" style={{ textAlign: 'center' }}>
                    <h2>JOIN THE <br /> <span className="cta-highlight">COLLECTIVE.</span></h2>
                    <div className="hero-actions" style={{ marginTop: '4rem' }}>
                        <a href="/signup" className="btn btn-primary">INITIALIZE ACCOUNT</a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;