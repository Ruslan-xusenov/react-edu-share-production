import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaBookOpen, FaClock, FaCheckCircle, FaPlayCircle, FaTrophy } from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './MyLearningPage.css';

const MyLearningPage = () => {
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            try {
                // In this architecture, submissions or certificates might represent learning progress
                // Let's check for submissions first as it's the closest to 'enrolled'
                const res = await apiClient.get(`${API_ENDPOINTS.LESSONS}enrolled/`);
                setEnrolledCourses(res.data.results || []);
            } catch (error) {
                console.error("Error fetching enrolled courses:", error);
                // Fallback to empty if not implemented yet or 404
                setEnrolledCourses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrolledCourses();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="learning-loading">
                <div className="spinner"></div>
                <p>O'rganish jarayoningiz yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="my-learning-page">
            <Helmet>
                <title>O'rganishlarim - EduShare | Ruslan Xusenov</title>
                <meta name="description" content="EduShare School - o'rganish jarayoningizni kuzating. Ruslan Xusenov tomonidan yaratilgan ta'lim platformasi." />
                <meta name="author" content="Ruslan Xusenov" />
            </Helmet>

            <div className="container">
                <header className="learning-header">
                    <h1>O'rganishlarim</h1>
                    <p>Jarayoningizni kuzating va sayohatingizni davom ettiring</p>
                </header>

                {enrolledCourses.length > 0 ? (
                    <motion.div
                        className="learning-grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {enrolledCourses.map((course) => (
                            <motion.div
                                key={course.id}
                                className="learning-card glass"
                                variants={itemVariants}
                                whileHover={{ y: -5 }}
                            >
                                <div className="card-image">
                                    <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400'} alt={course.title} />
                                    <div className="progress-badge">
                                        <FaCheckCircle /> {Math.round(course.progress || 0)}% Tugallangan
                                    </div>
                                </div>
                                <div className="card-content">
                                    <span className="category-tag">{course.category?.display_name || 'Umumiy'}</span>
                                    <h3>{course.title}</h3>
                                    <div className="card-meta">
                                        <span><FaClock /> {course.duration || 'N/A'}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${course.progress || 0}%` }}></div>
                                    </div>
                                    <div className="learning-actions">
                                        <Link to={`/courses/${course.id}`} className="btn btn-primary">
                                            <FaPlayCircle /> {course.progress > 0 ? 'Davom ettirish' : 'Boshlash'}
                                        </Link>
                                        {course.certificate_id && (
                                            <Link to={`/certificate/${course.certificate_id}`} className="btn btn-certificate" title="Sertifikatni yuklab olish">
                                                <FaTrophy />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        className="empty-learning glass"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <FaBookOpen className="empty-icon" />
                        <h2>O'rganishga Tayyormisiz?</h2>
                        <p>Siz hali hech qanday kursga yozilmagansiz. Katalogimizni ko'rib chiqing va bugun o'rganishni boshlang!</p>
                        <Link to="/courses" className="btn btn-primary btn-lg">Kurslarni Ko'rish</Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default MyLearningPage;