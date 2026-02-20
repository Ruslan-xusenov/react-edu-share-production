import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaLock, FaEnvelope, FaGoogle } from 'react-icons/fa';
import { HiOutlineAcademicCap } from 'react-icons/hi2';
import { BsStars, BsShieldCheck, BsLightningCharge, BsGlobe2 } from 'react-icons/bs';
import './AuthPage.css';

import apiClient, { API_ENDPOINTS, BACKEND_URL } from '../../config/api';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({
            ...formData,
            [e.target.name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.post(API_ENDPOINTS.LOGIN, {
                email: formData.email,
                password: formData.password
            });
            if (res.data.status === 'success') {
                localStorage.setItem('authToken', 'session-active');
                localStorage.setItem('user', JSON.stringify(res.data.user));
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Login error:', error);
            alert(error.response?.data?.message || 'Kirish muvaffaqiyatsiz tugadi. Iltimos, ma\'lumotlarni tekshiring.');
        }
    };

    return (
        <>
            <Helmet>
                <title>Kirish - EduShare School | Ruslan Xusenov</title>
                <meta name="description" content="EduShare hisobingizga kiring. Kurslar, darslar va tengdoshlaringizdan o'rganishga kirish uchun tizimga kiring. Ruslan Xusenov tomonidan yaratilgan." />
                <meta name="author" content="Ruslan Xusenov" />
            </Helmet>

            <div className="auth-page">
                <div className="auth-background">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                    <div className="gradient-orb orb-3"></div>
                </div>

                <div className="auth-container">
                    <motion.div
                        className="auth-card"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="auth-header">
                            <div className="auth-logo">
                                <HiOutlineAcademicCap />
                            </div>
                            <h1>Xush Kelibsiz</h1>
                            <p>O'rganish sayohatingizni davom ettirish uchun kiring</p>
                        </div>

                        <div className="social-login">
                            <button
                                onClick={() => window.location.href = `${BACKEND_URL}/accounts/google/login/`}
                                className="social-btn google"
                                style={{ width: '100%', justifyContent: 'center', gap: '12px', fontSize: '0.9rem', padding: '0.85rem' }}
                            >
                                <FaGoogle /> Google orqali kirish
                            </button>
                        </div>

                        <div className="divider">
                            <span>yoki email orqali</span>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="email">
                                    <FaEnvelope /> Email Manzil
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="sizning.email@misol.com"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">
                                    <FaLock /> Parol
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Parolingizni kiriting"
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg btn-block">
                                Kirish
                            </button>
                        </form>

                        <div className="auth-footer" style={{ marginTop: '20px' }}>
                            <p>
                                Hisobingiz yo'qmi? <Link to="/signup" className="auth-link">Ro'yxatdan o'ting</Link>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        className="auth-side"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="side-content">
                            <h2>Bilim Olamiga Xush Kelibsiz</h2>
                            <p>EduShareda allaqachon o'rganayotgan va o'qitayotgan minglab o'quvchilarga qo'shiling.</p>
                            <div className="side-features">
                                <motion.div className="feature-item" whileHover={{ x: 5 }}>
                                    <div className="feature-icon"><BsStars /></div>
                                    <span>150+ bepul kurslarga kirish</span>
                                </motion.div>
                                <motion.div className="feature-item" whileHover={{ x: 5 }}>
                                    <div className="feature-icon"><BsGlobe2 /></div>
                                    <span>Tengdosh o'quvchilardan o'rganing</span>
                                </motion.div>
                                <motion.div className="feature-item" whileHover={{ x: 5 }}>
                                    <div className="feature-icon"><BsLightningCharge /></div>
                                    <span>Ball va nishonlar yutib oling</span>
                                </motion.div>
                                <motion.div className="feature-item" whileHover={{ x: 5 }}>
                                    <div className="feature-icon"><BsShieldCheck /></div>
                                    <span>24/7 o'rganish imkoniyati</span>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
