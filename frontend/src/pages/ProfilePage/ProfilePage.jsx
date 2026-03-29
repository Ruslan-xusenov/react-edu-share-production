import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    FaUser, FaEnvelope, FaTrophy, FaCertificate,
    FaHeart, FaEdit, FaCamera, FaGithub, FaGlobe, FaTwitter, FaBookOpen,
    FaLock, FaShieldAlt, FaCheckCircle, FaKey, FaPaperPlane, FaRedo
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './ProfilePage.css';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('courses');
    const [showCompleteProfile, setShowCompleteProfile] = useState(false);

    // Courses states
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [savedCourses, setSavedCourses] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [fetchingCourses, setFetchingCourses] = useState(false);

    // Form states
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' });

    // ── OTP Password Change State ─────────────────────────────────────────
    // step: 'form' | 'otp' | 'success'
    const [pwdStep, setPwdStep] = useState('form');
    const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
    const [otpData, setOtpData] = useState({ otp_id: null, email_hint: '', code: '' });
    const [pwdStatus, setPwdStatus] = useState({ type: '', message: '' });
    const [pwdLoading, setPwdLoading] = useState(false);
    // Resend cooldown (60 soniya)
    const [resendCooldown, setResendCooldown] = useState(0);
    const resendTimerRef = useRef(null);
    // OTP input refs (6 ta alohida input)
    const otpRefs = useRef([]);

    const startResendCooldown = () => {
        setResendCooldown(60);
        resendTimerRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(resendTimerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => () => clearInterval(resendTimerRef.current), []);

    // OTP input — har bir harf kiritilganda keyingisiga ko'chirish
    const handleOtpInput = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const chars = otpData.code.split('');
        chars[index] = digit;
        const newCode = chars.join('').slice(0, 6);
        setOtpData(prev => ({ ...prev, code: newCode }));
        if (digit && index < 5) otpRefs.current[index + 1]?.focus();
        if (!digit && index > 0) otpRefs.current[index - 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpData.code[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
    };

    // OTP ni paste qilish
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        setOtpData(prev => ({ ...prev, code: pasted }));
        const nextIndex = Math.min(pasted.length, 5);
        otpRefs.current[nextIndex]?.focus();
    };

    // 1-bosqich: parol so'rovi → OTP yuborish
    const handleRequestPasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setPwdStatus({ type: 'error', message: 'Yangi parollar mos kelmaydi.' });
            return;
        }
        setPwdLoading(true);
        setPwdStatus({ type: '', message: '' });
        try {
            const payload = { new_password: passwordData.new_password };
            const needsOldPassword = user?.has_password && !user?.is_social;

            if (needsOldPassword) {
                payload.old_password = passwordData.old_password;
            }
            const res = await apiClient.post(API_ENDPOINTS.REQUEST_PASSWORD_CHANGE, payload);
            if (res.data.status === 'success') {
                setOtpData({ otp_id: res.data.otp_id, email_hint: res.data.email_hint, code: '' });
                setPwdStep('otp');
                setPwdStatus({ type: 'success', message: res.data.message });
                startResendCooldown();
                setTimeout(() => otpRefs.current[0]?.focus(), 300);
            } else {
                setPwdStatus({ type: 'error', message: res.data.message || 'Xatolik yuz berdi.' });
            }
        } catch (err) {
            setPwdStatus({ type: 'error', message: err.response?.data?.message || 'Xatolik yuz berdi.' });
        } finally {
            setPwdLoading(false);
        }
    };

    // 2-bosqich: OTP tasdiqlash
    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (otpData.code.length !== 6) {
            setPwdStatus({ type: 'error', message: '6 raqamli kodni to\'liq kiriting.' });
            return;
        }
        setPwdLoading(true);
        setPwdStatus({ type: '', message: '' });
        try {
            const res = await apiClient.post(API_ENDPOINTS.VERIFY_PASSWORD_OTP, {
                otp_id: otpData.otp_id,
                code: otpData.code,
            });
            if (res.data.status === 'success') {
                setPwdStep('success');
                setPwdStatus({ type: 'success', message: res.data.message });
                setUser(prev => ({ ...prev, has_password: true }));
            } else {
                setPwdStatus({ type: 'error', message: res.data.message });
                if (res.data.expired) {
                    setTimeout(() => { setPwdStep('form'); setPasswordData({ old_password: '', new_password: '', confirm_password: '' }); }, 2500);
                }
            }
        } catch (err) {
            setPwdStatus({ type: 'error', message: err.response?.data?.message || 'Xatolik yuz berdi.' });
        } finally {
            setPwdLoading(false);
        }
    };

    // Qayta yuborish
    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setPwdLoading(true);
        setPwdStatus({ type: '', message: '' });
        try {
            const res = await apiClient.post(API_ENDPOINTS.RESEND_PASSWORD_OTP, { otp_id: otpData.otp_id });
            if (res.data.status === 'success') {
                setOtpData(prev => ({ ...prev, otp_id: res.data.otp_id, code: '' }));
                setPwdStatus({ type: 'success', message: 'Yangi kod emailingizga yuborildi.' });
                startResendCooldown();
                otpRefs.current[0]?.focus();
            } else {
                setPwdStatus({ type: 'error', message: res.data.message });
            }
        } catch (err) {
            setPwdStatus({ type: 'error', message: err.response?.data?.message || 'Xatolik.' });
        } finally {
            setPwdLoading(false);
        }
    };

    const resetPwdFlow = () => {
        setPwdStep('form');
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        setOtpData({ otp_id: null, email_hint: '', code: '' });
        setPwdStatus({ type: '', message: '' });
        clearInterval(resendTimerRef.current);
        setResendCooldown(0);
    };


    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.PROFILE);
                if (res.data.status === 'success') {
                    setUser(res.data.user);
                    // Check if profile is complete
                    if (!res.data.user.phone_number || !res.data.user.school || !res.data.user.grade) {
                        setShowCompleteProfile(true);
                        setFormData({
                            phone_number: res.data.user.phone_number || '',
                            school: res.data.user.school || '',
                            grade: res.data.user.grade || '',
                            full_name: res.data.user.full_name || '',
                            bio: res.data.user.bio || ''
                        });
                    } else {
                        setFormData({
                            phone_number: res.data.user.phone_number || '',
                            school: res.data.user.school || '',
                            grade: res.data.user.grade || '',
                            full_name: res.data.user.full_name || '',
                            bio: res.data.user.bio || ''
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchCourses = async () => {
            setFetchingCourses(true);
            try {
                if (activeTab === 'courses') {
                    const res = await apiClient.get(API_ENDPOINTS.LESSON_ENROLLED);
                    setEnrolledCourses(res.data.results || res.data || []);
                } else if (activeTab === 'favorites') {
                    const res = await apiClient.get(API_ENDPOINTS.LESSON_SAVED);
                    setSavedCourses(res.data.results || res.data || []);
                } else if (activeTab === 'certificates') {
                    const res = await apiClient.get(API_ENDPOINTS.CERTIFICATES);
                    setCertificates(res.data.results || res.data || []);
                }
            } catch (error) {
                console.error(`Error fetching ${activeTab} data:`, error);
            } finally {
                setFetchingCourses(false);
            }
        };

        if (activeTab === 'courses' || activeTab === 'favorites' || activeTab === 'certificates') {
            fetchCourses();
        }
    }, [activeTab, user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdateStatus({ type: 'info', message: 'Yangilanmoqda...' });
        try {
            const res = await apiClient.post(API_ENDPOINTS.PROFILE_UPDATE, formData);
            if (res.data.status === 'success') {
                setUpdateStatus({ type: 'success', message: 'Profil muvaffaqiyatli yangilandi!' });
                setUser(prev => ({ ...prev, ...formData }));
                setShowCompleteProfile(false);
                setEditMode(false);
            } else {
                setUpdateStatus({ type: 'error', message: res.data.message || 'Yangilash muvaffaqiyatsiz' });
            }
        } catch (error) {
            setUpdateStatus({ type: 'error', message: 'Xatolik yuz berdi.' });
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setUpdateStatus({ type: 'error', message: 'Yangi parollar mos kelmaydi' });
            return;
        }
        setUpdateStatus({ type: 'info', message: 'Parol o\'zgartirilmoqda...' });
        try {
            const res = await apiClient.post(API_ENDPOINTS.CHANGE_PASSWORD, {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            if (res.data.status === 'success') {
                setUpdateStatus({ type: 'success', message: 'Parol muvaffaqiyatli o\'zgartirildi!' });
                setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
            } else {
                setUpdateStatus({ type: 'error', message: res.data.message || 'O\'zgartirish muvaffaqiyatsiz' });
            }
        } catch (error) {
            setUpdateStatus({ type: 'error', message: 'Xatolik yuz berdi.' });
        }
    };
    const avatarInputRef = useRef(null);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        setUpdateStatus({ type: 'info', message: 'Rasm yuklanmoqda...' });
        try {
            const res = await apiClient.post(API_ENDPOINTS.PROFILE_UPDATE, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (res.data.status === 'success') {
                setUpdateStatus({ type: 'success', message: 'Profil rasmi yangilandi!' });
                setUser(prev => ({ ...prev, avatar: res.data.avatar_url }));
            }
        } catch (error) {
            console.error("Avatar upload error:", error);
            setUpdateStatus({ type: 'error', message: 'Rasm yuklashda xatolik.' });
        }
    };
    const handleDownloadCertificate = (id) => {
        navigate(`/certificate/${id}`);
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="spinner"></div>
                <p>Profilingiz yuklanmoqda...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="profile-error container">
                <h2>Kirish Taqiqlangan</h2>
                <p>Profilingizni ko'rish uchun tizimga kiring.</p>
                <a href="/login" className="btn btn-primary">Kirish</a>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <Helmet>
                <title>{user.full_name || 'Profil'} — EduShare School</title>
                <meta name="description" content="EduShare School — profil sahifangiz. Kurslaringiz, sertifikatlaringiz va ball statistikangizni kuzating." />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            {showCompleteProfile && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content glass" style={{ padding: '3rem', maxWidth: '500px', width: '90%', borderRadius: '1rem', background: '#050505', border: '1px solid var(--border)' }}>
                        <h2 style={{ letterSpacing: '2px' }}>PROFILNI TO'LDIRING</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ACCESS GRANTED. INITIALIZE PROFILE COMPLETION.</p>

                        {updateStatus.message && (
                            <div style={{
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                borderRadius: '8px',
                                background: updateStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 242, 254, 0.1)',
                                border: `1px solid ${updateStatus.type === 'error' ? '#ef4444' : '#00f2fe'}`,
                                color: updateStatus.type === 'error' ? '#f87171' : '#00f2fe',
                                fontSize: '0.85rem'
                            }}>
                                {updateStatus.message}
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>MAKTAB NOMI</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff' }}
                                    value={formData.school}
                                    onChange={e => setFormData({ ...formData, school: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>SINF</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff' }}
                                    value={formData.grade}
                                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                    placeholder="masalan, 10-sinf"
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>TELEFON RAQAM</label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff' }}
                                    value={formData.phone_number}
                                    onChange={e => setFormData({ ...formData, phone_number: e.target.value.replace(/[^\d+]/g, '') })}
                                    placeholder="+998901234567"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={updateStatus.type === 'info'}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    marginTop: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                {updateStatus.type === 'info' ? (
                                    <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '1rem', height: '1rem' }}></span> Saqlanmoqda...</>
                                ) : 'PROFILNI SAQLASH'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <motion.div
                className="profile-header glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="profile-cover"></div>
                <div className="profile-info-main">
                    <div className="profile-avatar-wrapper">
                        <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.full_name}&background=f3f4f6&color=6366f1`}
                            alt={user.full_name}
                            className="profile-avatar"
                        />
                        <button
                            className="edit-avatar-btn"
                            onClick={() => avatarInputRef.current.click()}
                        >
                            <FaCamera />
                        </button>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                        />
                    </div>

                    <div className="profile-text">
                        <div className="profile-name-row">
                            <h1>{user.full_name}</h1>
                            <button className="btn btn-outline btn-sm" onClick={() => { setActiveTab('settings'); setEditMode(true); }}><FaEdit /> Profilni Tahrirlash</button>
                        </div>
                        <p className="profile-email"><FaEnvelope /> {user.email}</p>
                        <div className="profile-stats">
                            <div className="stat">
                                <FaTrophy className="icon-gold" />
                                <span><strong>{user.points || 0}</strong> Ball</span>
                            </div>
                            <div className="stat">
                                <FaCertificate className="icon-blue" />
                                <span><strong>{user.certificates_count || 0}</strong> Sertifikat</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-tabs">
                    <button
                        className={`tab ${activeTab === 'courses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('courses')}
                    >
                        Kurslarim
                    </button>
                    <button
                        className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
                        onClick={() => setActiveTab('favorites')}
                    >
                        Sevimlilar
                    </button>
                    <button
                        className={`tab ${activeTab === 'certificates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('certificates')}
                    >
                        Sertifikatlar
                    </button>
                    <button
                        className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Hisob Sozlamalari
                    </button>
                </div>
            </motion.div>

            <div className="profile-content">
                <div className="content-grid">
                    <motion.div
                        className="content-side"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="glass side-card">
                            <h3>Men Haqimda</h3>
                            <p className="bio-text">
                                {user.bio || "INITIALIZE BIO DATA..."}
                            </p>
                            <div className="profile-detail-items" style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <div style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#fff' }}>MAKTAB:</strong> {user.school || "UNDEFINED"}</div>
                                <div style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#fff' }}>SINF:</strong> {user.grade || "UNDEFINED"}</div>
                                <div style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#fff' }}>TELEFON:</strong> {user.phone_number || "UNDEFINED"}</div>
                            </div>
                            <div className="social-links">
                                <a href="#"><FaGithub /></a>
                                <a href="#"><FaTwitter /></a>
                                <a href="#"><FaGlobe /></a>
                            </div>
                        </div>

                        <div className="glass side-card">
                            <h3>Nishonlar</h3>
                            <div className="badges-grid">
                                <div className="badge-item locked" title="Complete 1st course">
                                    <FaTrophy />
                                </div>
                                <div className="badge-item active" title="EduShare Member">
                                    <FaUser />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="content-main"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {activeTab === 'courses' && (
                            <div className="courses-tab">
                                <h2>ACTIVE MODULES ({enrolledCourses.length})</h2>
                                {fetchingCourses ? (
                                    <div className="tab-loading">Yuklanmoqda...</div>
                                ) : enrolledCourses.length > 0 ? (
                                    <div className="courses-profile-grid">
                                        {enrolledCourses.map(course => (
                                            <Link to={`/courses/${course.id}`} key={course.id} className="course-profile-card glass">
                                                <div className="card-thumb">
                                                    <img src={course.thumbnail_url || 'https://via.placeholder.com/300x160'} alt={course.title} />
                                                    <span className="badge">{course.level}</span>
                                                </div>
                                                <div className="card-content">
                                                    <h3>{course.title}</h3>
                                                    <div className="card-meta">
                                                        <span><FaBookOpen /> {course.duration || '10:00'}</span>
                                                        <span><FaUser /> {course.author?.full_name}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <FaBookOpen />
                                        <p>Siz hali hech qanday kursga yozilmagansiz.</p>
                                        <Link to="/courses" className="btn btn-primary">Kurslarni Ko'rish</Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'favorites' && (
                            <div className="favorites-tab">
                                <h2>FAVORITE MODULES ({savedCourses.length})</h2>
                                {fetchingCourses ? (
                                    <div className="tab-loading">Yuklanmoqda...</div>
                                ) : savedCourses.length > 0 ? (
                                    <div className="courses-profile-grid">
                                        {savedCourses.map(course => (
                                            <Link to={`/courses/${course.id}`} key={course.id} className="course-profile-card glass">
                                                <div className="card-thumb">
                                                    <img src={course.thumbnail_url || 'https://via.placeholder.com/300x160'} alt={course.title} />
                                                    <span className="badge">{course.level}</span>
                                                </div>
                                                <div className="card-content">
                                                    <h3>{course.title}</h3>
                                                    <div className="card-meta">
                                                        <span><FaBookOpen /> {course.duration || '10:00'}</span>
                                                        <span><FaUser /> {course.author?.full_name}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <FaHeart />
                                        <p>Sevimlilar ro'yxati bo'sh.</p>
                                        <Link to="/courses" className="btn btn-primary">Darslarni Ko'rish</Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'certificates' && (
                            <div className="certificates-tab">
                                <h2>CERTIFICATES ({certificates.length})</h2>
                                {fetchingCourses ? (
                                    <div className="tab-loading">Yuklanmoqda...</div>
                                ) : certificates.length > 0 ? (
                                    <div className="certificates-grid">
                                        {certificates.map(cert => (
                                            <div key={cert.id} className="certificate-card glass">
                                                <div className="cert-icon">
                                                    <FaCertificate />
                                                </div>
                                                <div className="cert-info">
                                                    <h3>{cert.lesson_title}</h3>
                                                    <p className="cert-id">ID: {cert.certificate_id}</p>
                                                    <p className="cert-date">Berilgan sana: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => handleDownloadCertificate(cert.id)}
                                                    >
                                                        Yuklab olish (PDF)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <FaCertificate />
                                        <p>Sizda hali sertifikatlar mavjud emas.</p>
                                        <p className="sub-text">Kursning 70% dan ortig'ini ko'ring va sertifikat oling!</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="settings-tab glass" style={{ padding: '2rem', borderRadius: '1rem' }}>
                                <h2>Hisob Sozlamalari</h2>
                                {updateStatus.message && (
                                    <div className={`alert alert-${updateStatus.type}`} style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '0.5rem', background: updateStatus.type === 'error' ? '#fee2e2' : '#dcfce7', color: updateStatus.type === 'error' ? '#991b1b' : '#166534' }}>
                                        {updateStatus.message}
                                    </div>
                                )}

                                <div className="settings-section" style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Profilni Tahrirlash</h3>
                                    <form onSubmit={handleUpdateProfile}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>To'liq Ism</label>
                                                <input type="text" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Telefon Raqam</label>
                                                <input type="text" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={formData.phone_number || ''} onChange={e => setFormData({ ...formData, phone_number: e.target.value.replace(/[^\d+]/g, '') })} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Maktab</label>
                                                <input type="text" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={formData.school || ''} onChange={e => setFormData({ ...formData, school: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Sinf</label>
                                                <input type="text" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={formData.grade || ''} onChange={e => setFormData({ ...formData, grade: e.target.value })} />
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Bio</label>
                                            <textarea className="form-control" style={{ width: '100%', padding: '0.5rem', minHeight: '80px' }} value={formData.bio || ''} onChange={e => setFormData({ ...formData, bio: e.target.value })}></textarea>
                                        </div>
                                        <button type="submit" className="btn btn-primary">O'zgarishlarni Saqlash</button>
                                    </form>
                                </div>

                                <div className="settings-section" style={{ borderTop: '1px solid rgba(0,242,254,0.1)', paddingTop: '2rem' }}>

                                    {/* ── Header ── */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'linear-gradient(135deg,rgba(0,242,254,0.15),rgba(79,172,254,0.15))',
                                            border: '1px solid rgba(0,242,254,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#00f2fe', fontSize: '1rem'
                                        }}>
                                            <FaShieldAlt />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#e2e8f0' }}>{user?.is_social ? "Parol O'rnatish" : "Parolni O'zgartirish"}</h3>
                                            <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>{user?.is_social ? "Hisobingiz uchun yangi parol o'rnating" : "Email tasdiqi orqali xavfsiz o'zgartirish"}</p>
                                        </div>
                                    </div>

                                    {/* ── Progress Steps ── */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem', maxWidth: '360px' }}>
                                        {[
                                            { num: 1, label: user?.is_social ? 'Yangi Parol' : 'Parol', icon: <FaLock /> },
                                            { num: 2, label: 'Tasdiqlash', icon: <FaKey /> },
                                            { num: 3, label: 'Tayyor', icon: <FaCheckCircle /> },
                                        ].map((step, idx) => {
                                            const currentNum = pwdStep === 'form' ? 1 : pwdStep === 'otp' ? 2 : 3;
                                            const isActive = currentNum === step.num;
                                            const isDone = currentNum > step.num;
                                            return (
                                                <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                    <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                                                        <div style={{
                                                            width: '34px', height: '34px', borderRadius: '50%',
                                                            background: isDone ? 'linear-gradient(135deg,#00f2fe,#4facfe)' : isActive ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.05)',
                                                            border: isDone ? 'none' : isActive ? '2px solid #00f2fe' : '2px solid rgba(255,255,255,0.1)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: isDone ? '#030308' : isActive ? '#00f2fe' : '#475569',
                                                            fontSize: '0.8rem', fontWeight: 700,
                                                            transition: 'all 0.3s ease',
                                                            margin: '0 auto'
                                                        }}>
                                                            {isDone ? <FaCheckCircle /> : step.icon}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', marginTop: '4px', color: isActive ? '#00f2fe' : isDone ? '#4facfe' : '#475569', letterSpacing: '0.05em' }}>
                                                            {step.label}
                                                        </div>
                                                    </div>
                                                    {idx < 2 && (
                                                        <div style={{
                                                            flex: 1, height: '2px',
                                                            background: isDone ? 'linear-gradient(90deg,#00f2fe,#4facfe)' : 'rgba(255,255,255,0.07)',
                                                            margin: '0 6px', marginBottom: '18px',
                                                            transition: 'background 0.4s ease'
                                                        }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── Status Message ── */}
                                    <AnimatePresence>
                                        {pwdStatus.message && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                style={{
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    marginBottom: '1.25rem',
                                                    fontSize: '0.85rem',
                                                    background: pwdStatus.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    border: `1px solid ${pwdStatus.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                                    color: pwdStatus.type === 'error' ? '#f87171' : '#34d399',
                                                }}
                                            >
                                                {pwdStatus.message}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* ════════════════════════════════════════
                                        STEP 1 — Parol shakli
                                    ════════════════════════════════════════ */}
                                    <AnimatePresence mode="wait">
                                        {pwdStep === 'form' && (
                                            <motion.form
                                                key="pwd-form"
                                                initial={{ opacity: 0, x: 30 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -30 }}
                                                transition={{ duration: 0.25 }}
                                                onSubmit={handleRequestPasswordChange}
                                                style={{ maxWidth: '420px' }}
                                            >
                                                {[
                                                    { key: 'old_password', label: 'Joriy Parol', showKey: 'old', placeholder: 'Hozirgi parolingiz', hide: (!user?.has_password || user?.is_social) },
                                                    { key: 'new_password', label: 'Yangi Parol', showKey: 'new', placeholder: 'Kamida 8 belgi, 1 raqam' },
                                                    { key: 'confirm_password', label: 'Yangi Parolni Tasdiqlash', showKey: 'confirm', placeholder: 'Yangi parolni qayta kiriting' },
                                                ].filter(f => !f.hide).map(field => (
                                                    <div key={field.key} style={{ marginBottom: '1.1rem' }}>
                                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                            {field.label}
                                                        </label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type={showPasswords[field.showKey] ? 'text' : 'password'}
                                                                style={{
                                                                    width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.9rem',
                                                                    background: 'rgba(255,255,255,0.04)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '8px', color: '#e2e8f0',
                                                                    fontSize: '0.9rem', outline: 'none',
                                                                    transition: 'border-color 0.2s',
                                                                    boxSizing: 'border-box',
                                                                }}
                                                                onFocus={e => e.target.style.borderColor = 'rgba(0,242,254,0.5)'}
                                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                                                value={passwordData[field.key]}
                                                                onChange={e => setPasswordData({ ...passwordData, [field.key]: e.target.value })}
                                                                placeholder={field.placeholder}
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPasswords(p => ({ ...p, [field.showKey]: !p[field.showKey] }))}
                                                                style={{
                                                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                                    background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', fontSize: '0.85rem'
                                                                }}
                                                            >
                                                                {showPasswords[field.showKey] ? '🙈' : '👁'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem', padding: '10px 14px', background: 'rgba(0,242,254,0.05)', borderRadius: '8px', border: '1px solid rgba(0,242,254,0.1)' }}>
                                                    <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
                                                        🔐 Muvaffaqiyatli bo'lgandan so'ng <strong style={{ color: '#00f2fe' }}>emailingizga</strong> 6 raqamli tasdiqlash kodi yuboriladi.
                                                        Kod <strong style={{ color: '#00f2fe' }}>30 daqiqa</strong> ichida faol bo'ladi.
                                                    </p>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={pwdLoading}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '0.8rem 2rem',
                                                        background: pwdLoading ? 'rgba(0,242,254,0.2)' : 'linear-gradient(135deg,#00f2fe,#4facfe)',
                                                        border: 'none', borderRadius: '8px',
                                                        color: pwdLoading ? '#00f2fe' : '#030308',
                                                        fontWeight: 700, fontSize: '0.88rem', cursor: pwdLoading ? 'not-allowed' : 'pointer',
                                                        letterSpacing: '0.05em',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {pwdLoading ? (
                                                        <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,242,254,0.3)', borderTopColor: '#00f2fe', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Yuborilmoqda...</>
                                                    ) : (
                                                        <><FaPaperPlane /> Email ga Kod Yuborish</>
                                                    )}
                                                </button>
                                            </motion.form>
                                        )}

                                        {/* ════════════════════════════════════════
                                            STEP 2 — OTP tasdiqlash
                                        ════════════════════════════════════════ */}
                                        {pwdStep === 'otp' && (
                                            <motion.div
                                                key="otp-form"
                                                initial={{ opacity: 0, x: 30 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -30 }}
                                                transition={{ duration: 0.25 }}
                                                style={{ maxWidth: '420px' }}
                                            >
                                                {/* Email hint */}
                                                <div style={{ marginBottom: '1.5rem', padding: '14px 16px', background: 'rgba(0,242,254,0.05)', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.15)' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>KOD YUBORILDI</div>
                                                    <div style={{ color: '#00f2fe', fontWeight: 600, fontSize: '0.95rem' }}>
                                                        📧 {otpData.email_hint}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>⏱ 30 daqiqa ichida faol</div>
                                                </div>

                                                {/* 6-xonali OTP inputlar */}
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                        Tasdiqlash Kodi
                                                    </label>
                                                    <div className="otp-input-container" style={{ display: 'flex', gap: '10px' }} onPaste={handleOtpPaste}>
                                                        {Array.from({ length: 6 }).map((_, i) => (
                                                            <input
                                                                key={i}
                                                                ref={el => otpRefs.current[i] = el}
                                                                type="text"
                                                                inputMode="numeric"
                                                                maxLength={1}
                                                                value={otpData.code[i] || ''}
                                                                onChange={e => handleOtpInput(i, e.target.value)}
                                                                onKeyDown={e => handleOtpKeyDown(i, e)}
                                                                style={{
                                                                    width: '52px', height: '60px',
                                                                    textAlign: 'center', fontSize: '1.6rem', fontWeight: 800,
                                                                    background: otpData.code[i] ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.04)',
                                                                    border: `2px solid ${otpData.code[i] ? '#00f2fe' : 'rgba(255,255,255,0.1)'}`,
                                                                    borderRadius: '10px', color: '#00f2fe',
                                                                    outline: 'none', letterSpacing: '0', caretColor: '#00f2fe',
                                                                    fontFamily: "'Courier New', monospace",
                                                                    transition: 'all 0.15s ease',
                                                                }}
                                                                onFocus={e => e.target.style.borderColor = '#00f2fe'}
                                                                onBlur={e => e.target.style.borderColor = otpData.code[i] ? '#00f2fe' : 'rgba(255,255,255,0.1)'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Tasdiqlash tugmasi */}
                                                <button
                                                    onClick={handleVerifyOtp}
                                                    disabled={pwdLoading || otpData.code.length < 6}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '0.8rem 2rem', width: '100%', justifyContent: 'center',
                                                        background: (pwdLoading || otpData.code.length < 6) ? 'rgba(0,242,254,0.1)' : 'linear-gradient(135deg,#00f2fe,#4facfe)',
                                                        border: 'none', borderRadius: '8px',
                                                        color: (pwdLoading || otpData.code.length < 6) ? '#00f2fe' : '#030308',
                                                        fontWeight: 700, fontSize: '0.9rem',
                                                        cursor: (pwdLoading || otpData.code.length < 6) ? 'not-allowed' : 'pointer',
                                                        letterSpacing: '0.05em', marginBottom: '1rem',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {pwdLoading ? (
                                                        <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,242,254,0.3)', borderTopColor: '#00f2fe', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Tekshirilmoqda...</>
                                                    ) : (
                                                        <><FaCheckCircle /> Parolni Tasdiqlash</>
                                                    )}
                                                </button>

                                                {/* Qayta yuborish */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={handleResendOtp}
                                                        disabled={resendCooldown > 0 || pwdLoading}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            background: 'none', border: 'none',
                                                            color: resendCooldown > 0 ? '#475569' : '#00f2fe',
                                                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.82rem', padding: '4px',
                                                        }}
                                                    >
                                                        <FaRedo style={{ fontSize: '0.75rem' }} />
                                                        {resendCooldown > 0 ? `Qayta yuborish (${resendCooldown}s)` : 'Kodni qayta yuborish'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={resetPwdFlow}
                                                        style={{
                                                            background: 'none', border: 'none',
                                                            color: '#475569', cursor: 'pointer',
                                                            fontSize: '0.78rem', padding: '4px',
                                                        }}
                                                    >
                                                        ← Orqaga qaytish
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* ════════════════════════════════════════
                                            STEP 3 — Muvaffaqiyat
                                        ════════════════════════════════════════ */}
                                        {pwdStep === 'success' && (
                                            <motion.div
                                                key="pwd-success"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem 1rem' }}
                                            >
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                                                    style={{
                                                        width: '72px', height: '72px', borderRadius: '50%',
                                                        background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.05))',
                                                        border: '2px solid rgba(16,185,129,0.4)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        margin: '0 auto 1.25rem',
                                                        fontSize: '2rem', color: '#10b981'
                                                    }}
                                                >
                                                    <FaCheckCircle />
                                                </motion.div>
                                                <h4 style={{ color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Parol Muvaffaqiyatli O'zgartirildi!</h4>
                                                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                                    Hisobingiz xavfsizligi yangilandi. Endi yangi parol bilan kiring.
                                                </p>
                                                <button
                                                    onClick={resetPwdFlow}
                                                    style={{
                                                        padding: '0.65rem 1.5rem',
                                                        background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.3)',
                                                        borderRadius: '8px', color: '#00f2fe',
                                                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                                    }}
                                                >
                                                    Yopish
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
