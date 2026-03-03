import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaTrophy, FaMedal, FaStar, FaUser, FaCrown, FaChevronUp } from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import Footer from '../../components/Footer/Footer';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.LEADERBOARD);
                // Faqat TOP 5 ni olamiz
                const data = res.data.results || [];
                setLeaders(data.slice(0, 5));
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
                setLeaders([
                    { id: 1, full_name: 'Ruslan Xusenov', points: 1250, rank: 1 },
                    { id: 2, full_name: 'Amir Karimov', points: 980, rank: 2 },
                    { id: 3, full_name: 'Dilnoza Rahimova', points: 750, rank: 3 },
                    { id: 4, full_name: 'Jasur Toshmatov', points: 540, rank: 4 },
                    { id: 5, full_name: 'Nodira Aliyeva', points: 320, rank: 5 },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaders();
    }, []);

    const getMedalIcon = (index) => {
        if (index === 0) return <FaCrown className="medal-icon gold" />;
        if (index === 1) return <FaMedal className="medal-icon silver" />;
        if (index === 2) return <FaMedal className="medal-icon bronze" />;
        return <span className="rank-number">{index + 1}</span>;
    };

    const getMedalClass = (index) => {
        if (index === 0) return 'gold';
        if (index === 1) return 'silver';
        if (index === 2) return 'bronze';
        return '';
    };

    // TOP 5 ga qayta tartiblash: [2, 1, 3] + [4, 5] ko'rinishida podium uchun
    const getPodiumOrder = () => {
        if (leaders.length < 3) return leaders;
        return [leaders[1], leaders[0], leaders[2]]; // 2nd, 1st, 3rd
    };

    const getBottomTwo = () => {
        if (leaders.length <= 3) return [];
        return leaders.slice(3, 5); // 4th, 5th
    };

    return (
        <div className="leaderboard-page">
            <Helmet>
                <title>Reyting Jadvali — EduShare School | TOP 5 O'quvchilar</title>
                <meta name="description" content="EduShare School reyting jadvali — eng ko'p ball to'plagan TOP 5 o'quvchilar. O'rganish, test topshirish va sertifikat olish orqali reytingda yuqoriga chiqing!" />
                <meta name="keywords" content="EduShare reyting, eng yaxshi o'quvchilar, ball tizimi, ta'lim reytingi, TOP 5" />
                <link rel="canonical" href="https://edushare.uz/leaderboard" />
            </Helmet>

            {/* Section 1: Hero */}
            <section className="leaderboard-hero-section">
                <div className="hero-glow"></div>
                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <FaTrophy className="hero-trophy" />
                    <h1>TOP 5<br /><span>O'QUVCHILAR</span></h1>
                    <p>Eng ko'p ball to'plagan o'quvchilar reytingi</p>
                </motion.div>
            </section>

            {/* Section 2: Podium (1st, 2nd, 3rd) */}
            <section className="leaderboard-podium-section">
                {loading ? (
                    <div className="loading-state"><h3>YUKLANMOQDA...</h3></div>
                ) : (
                    <div className="podium-container">
                        <h2 className="section-title">🏆 PODIUM</h2>
                        <div className="podium-grid">
                            {getPodiumOrder().map((leader, podiumIdx) => {
                                // podiumIdx: 0=2nd place, 1=1st place, 2=3rd place
                                const actualIndex = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
                                return (
                                    <motion.div
                                        key={leader.id}
                                        className={`podium-card ${getMedalClass(actualIndex)} ${podiumIdx === 1 ? 'champion' : ''}`}
                                        initial={{ opacity: 0, y: 80 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: podiumIdx * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                        viewport={{ once: true }}
                                        whileHover={{ y: -10, transition: { duration: 0.3 } }}
                                    >
                                        {/* Floating rank */}
                                        <div className="podium-rank-badge">
                                            {getMedalIcon(actualIndex)}
                                        </div>

                                        {/* Avatar */}
                                        <div className={`podium-avatar-wrap ${getMedalClass(actualIndex)}`}>
                                            {leader.avatar ? (
                                                <img src={leader.avatar} alt={leader.full_name} className="podium-avatar" />
                                            ) : (
                                                <div className="podium-avatar-fallback">
                                                    <FaUser />
                                                </div>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <h3 className="podium-name">{leader.full_name || leader.username}</h3>

                                        {/* Points */}
                                        <div className="podium-points">
                                            <FaStar className="star-icon" />
                                            <span>{leader.points}</span>
                                            <small>ball</small>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* 4th-5th place list */}
                        {getBottomTwo().length > 0 && (
                            <div className="runners-up">
                                {getBottomTwo().map((leader, idx) => (
                                    <motion.div
                                        key={leader.id}
                                        className="runner-card"
                                        initial={{ opacity: 0, x: -40 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 + 0.3, duration: 0.5 }}
                                        viewport={{ once: true }}
                                    >
                                        <span className="runner-rank">{idx + 4}</span>
                                        <div className="runner-avatar-wrap">
                                            {leader.avatar ? (
                                                <img src={leader.avatar} alt={leader.full_name} className="runner-avatar" />
                                            ) : (
                                                <div className="runner-avatar-fallback">
                                                    <FaUser />
                                                </div>
                                            )}
                                        </div>
                                        <div className="runner-info">
                                            <span className="runner-name">{leader.full_name || leader.username}</span>
                                            <span className="runner-points">
                                                <FaStar /> {leader.points} ball
                                            </span>
                                        </div>
                                        <FaChevronUp className="runner-trend" />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Footer */}
            <section className="horizontal-section" style={{ height: 'auto', minHeight: 'auto', display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <Footer />
            </section>
        </div>
    );
};

export default LeaderboardPage;
