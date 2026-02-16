import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    FaUser, FaEnvelope, FaTrophy, FaCertificate,
    FaHeart, FaEdit, FaCamera, FaGithub, FaGlobe, FaTwitter, FaBookOpen
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
    const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' });

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
                <title>{user.full_name || 'PROFIL'} — EDUSHARE ENGINE</title>
                <meta name="description" content="Access your high-fidelity learning modules and performance statistics." />
            </Helmet>

            {showCompleteProfile && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content glass" style={{ padding: '3rem', maxWidth: '500px', width: '90%', borderRadius: '1rem', background: '#050505', border: '1px solid var(--border)' }}>
                        <h2>PROFILNI TO'LDIRING</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>ACCESS GRANTED. INITIALIZE PROFILE COMPLETION.</p>
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
                                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block">
                                Profilni Saqlash
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
                                                <input type="text" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={formData.phone_number || ''} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
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

                                <div className="settings-section" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Parolni O'zgartirish</h3>
                                    <form onSubmit={handleChangePassword}>
                                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem', maxWidth: '400px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Joriy Parol</label>
                                                <input type="password" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={passwordData.old_password} onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Yangi Parol</label>
                                                <input type="password" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Yangi Parolni Tasdiqlash</label>
                                                <input type="password" className="form-control" style={{ width: '100%', padding: '0.5rem' }} value={passwordData.confirm_password} onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })} required />
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-outline">Parolni Yangilash</button>
                                    </form>
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
