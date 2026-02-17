import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaUser, FaLock, FaEnvelope, FaGraduationCap, FaGoogle } from 'react-icons/fa';
import './AuthPage.css';

import apiClient, { API_ENDPOINTS, BACKEND_URL } from '../../config/api';

const SignupPage = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        password2: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.password2) {
            alert('Parollar mos kelmaydi!');
            return;
        }

        setLoading(true);
        try {
            const res = await apiClient.post(API_ENDPOINTS.SIGNUP, {
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                password2: formData.password2
            });

            if (res.data.status === 'success') {
                setSuccess(true);
                localStorage.setItem('authToken', 'session-active');
                localStorage.setItem('user', JSON.stringify(res.data.user));

                // Success message already in state, redirect after delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        } catch (error) {
            console.error('Signup error:', error);
            const msg = error.response?.data?.message || "Ro'yxatdan o'tish muvaffaqiyatsiz tugadi. Iltimos, qayta urinib ko'ring.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Ro'yxatdan O'tish - EduShare School | Ruslan Xusenov</title>
                <meta name="description" content="EduShare School platformasida bepul ro'yxatdan o'ting. Ruslan Xusenov tomonidan yaratilgan O'zbekistonning eng yaxshi ta'lim platformasi." />
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
                        transition={{ duration: 0.5 }}
                    >
                        <div className="auth-header">
                            <div className="auth-logo">
                                <FaGraduationCap />
                            </div>
                            <h1>Hisob Yarating</h1>
                            <p>O'rganish sayohatingizni bugundan boshlang</p>
                        </div>

                        <div className="social-login">
                            <button
                                onClick={() => window.location.href = `${BACKEND_URL}/accounts/google/login/`}
                                className="social-btn google"
                                style={{ width: '100%', justifyContent: 'center', gap: '15px', fontSize: '1.1rem', padding: '14px' }}
                            >
                                <FaGoogle /> Google orqali ro'yxatdan o'tish
                            </button>
                        </div>

                        <div className="divider">
                            <span>yoki email orqali</span>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="full_name">
                                    <FaUser /> To'liq Ism
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Ismingizni kiriting"
                                    required
                                />
                            </div>

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
                                    placeholder="Parol yarating"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password2">
                                    <FaLock /> Parolni Tasdiqlang
                                </label>
                                <input
                                    type="password"
                                    id="password2"
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleChange}
                                    placeholder="Parolni qayta kiriting"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className={`btn btn-primary btn-lg btn-block ${success ? 'btn-success' : ''}`}
                                disabled={loading || success}
                            >
                                {loading ? 'Kutilmoqda...' : success ? 'Muvaffaqiyatli! ✓' : "Ro'yxatdan O'tish"}
                            </button>
                        </form>

                        <div className="auth-footer" style={{ marginTop: '20px' }}>
                            <p>
                                Hisobingiz bormi? <Link to="/login" className="auth-link">Kirish</Link>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        className="auth-side"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="side-content">
                            <h2>EduSharega Qo'shiling</h2>
                            <p>Minglab o'quvchilar allaqachon bu platformada bilim olmoqda va ulashmoqda.</p>
                            <div className="side-features">
                                <div className="feature-item">
                                    <div className="feature-icon">✓</div>
                                    <span>Butunlay bepul platforma</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon">✓</div>
                                    <span>O'z darslaringizni yarating</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon">✓</div>
                                    <span>Sertifikatlar oling</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon">✓</div>
                                    <span>Hamjamiyatda o'sib boring</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default SignupPage;
