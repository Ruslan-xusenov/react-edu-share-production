import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaTrophy, FaMedal, FaStar, FaUser } from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import Footer from '../../components/Footer/Footer';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                // Assuming there's an endpoint for leaderboard or top users
                // If not, we use mock or fetch all users sorted by points
                const res = await apiClient.get(API_ENDPOINTS.LEADERBOARD);
                setLeaders(res.data.results || []);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
                // Fallback mock data
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

    const getRankIcon = (rank) => {
        if (rank === 0) return <FaMedal style={{ color: '#ffd700' }} />;
        if (rank === 1) return <FaMedal style={{ color: '#c0c0c0' }} />;
        if (rank === 2) return <FaMedal style={{ color: '#cd7f32' }} />;
        return rank + 1;
    };

    return (
        <div className="leaderboard-page">
            <Helmet>
                <title>REYTING — ENG KO'P BALL TOPLAGANLAR</title>
                <meta name="description" content="EduShare School reytingi - eng ko'p ball to'plagan o'quvchilar." />
            </Helmet>

            <section className="leaderboard-header-section">
                <FaTrophy className="header-icon" />
                <h1>REYTING <br /> JADVALI.</h1>
                <p>O'rganish sayohatida eng ko'p ball to'plagan o'quvchilar</p>
            </section>

            <section className="leaderboard-content-section">
                {loading ? (
                    <div className="loading-state"><h3>SYNCHRONIZING...</h3></div>
                ) : (
                    <div className="leaderboard-list">
                        {leaders.map((leader, index) => (
                            <motion.div
                                key={leader.id}
                                className={`leader-item ${index < 3 ? 'top-three' : ''}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <span className="rank">0{index + 1}</span>
                                <div className="user">
                                    {leader.avatar ? (
                                        <img src={leader.avatar} alt={leader.full_name} className="leader-avatar" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            <FaUser />
                                        </div>
                                    )}
                                    <span className="leader-name">{leader.full_name || leader.username}</span>
                                </div>
                                <div className="points">
                                    <FaStar /> {leader.points}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* FOOTER - Final Section */}
            <section className="horizontal-section" style={{ height: 'auto', minHeight: '100vh', display: 'flex', alignItems: 'flex-end', width: '100vw' }}>
                <Footer />
            </section>
        </div>
    );
};

export default LeaderboardPage;
