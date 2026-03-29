import { useState, useEffect, memo } from 'react';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import { FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaArrowRight, FaPlus, FaBullhorn, FaTimes, FaClock, FaUserCircle, FaShareAlt, FaTrash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './AnnouncementsPage.css';

const EventCard = memo(({ event, user, onEventDelete, onSelect }) => (
    <motion.div 
        key={event.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="event-item glass"
    >
        <div className="event-visual">
            {event.image_url ? (
                <img src={event.image_url} alt={event.title} loading="lazy" />
            ) : (
                <div className="event-placeholder"><FaUsers /></div>
            )}
            {user?.is_staff && (
                <button 
                    className="admin-delete-btn-sm" 
                    onClick={(e) => onEventDelete(event.id, e)}
                    title="E'lonni o'chirish"
                >
                    <FaTrash />
                </button>
            )}
        </div>
        <div className="event-details">
            <div className="event-meta">
                {event.event_date && (
                    <span className="event-date">
                        <FaCalendarAlt /> {new Date(event.event_date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                )}
                <span className="event-location">
                    <FaMapMarkerAlt /> {event.location || 'Online'}
                </span>
            </div>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
            <div className="organizer-info">
                <img src={event.organizer_info?.avatar_url || `https://ui-avatars.com/api/?name=${event.organizer_info?.full_name}`} alt="" />
                <div className="org-text">
                    <span className="label">Organizer</span>
                    <span className="name">{event.organizer_info?.full_name}</span>
                </div>
                <button 
                    className="join-btn btn-primary"
                    onClick={() => onSelect(event)}
                >
                    TO'LIQ MA'LUMOT <FaArrowRight />
                </button>
            </div>
        </div>
    </motion.div>
));

const AnnouncementsPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        event_date: '',
        image: null
    });

    useEffect(() => {
        fetchEvents();
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await apiClient.get(API_ENDPOINTS.COMMUNITY_EVENTS);
            setEvents(res.data.results || res.data);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, image: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null) data.append(key, formData[key]);
        });

        try {
            await apiClient.post(API_ENDPOINTS.COMMUNITY_EVENTS, data);
            setShowForm(false);
            fetchEvents();
            setFormData({ title: '', description: '', location: '', event_date: '', image: null });
        } catch (err) {
            alert('E\'lon yaratishda xatolik yuz berdi. Iltimos ruxsatlaringizni tekshiring.');
        }
    };

    const handleEventDelete = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Haqiqatdan ham ushbu e\'lonni o\'chirib tashlamoqchimisiz?')) {
            try {
                await apiClient.delete(`${API_ENDPOINTS.COMMUNITY_EVENTS}${id}/`);
                fetchEvents();
            } catch (err) {
                alert('O\'chirishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
            }
        }
    };

    const canCreate = user?.is_staff || user?.is_volunteer;

    const formatFullDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('uz-UZ', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    };

    const getDaysUntil = (dateStr) => {
        if (!dateStr) return null;
        const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'O\'tib ketgan';
        if (diff === 0) return 'Bugun!';
        if (diff === 1) return 'Ertaga';
        return `${diff} kun qoldi`;
    };

    return (
        <div className="events-container horizontal-page">
            <header className="page-header">
                <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="header-content"
                >
                    <span className="sub-text">VOLUNTEER NETWORK</span>
                    <h1>ANNOUNCEMENTS</h1>
                    <p>O'zbekistonning turli viloyatlaridagi valantyorlarimiz tomonidan tashkil etilayotgan offline tadbirlar va e'lonlar.</p>
                </motion.div>

                {canCreate && (
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="add-event-btn btn-primary"
                        onClick={() => setShowForm(true)}
                    >
                        <FaPlus /> POST ANNOUNCEMENT
                    </motion.button>
                )}
            </header>

            {loading ? (
                <div className="loader-container"><div className="spinner"></div></div>
            ) : events.length > 0 ? (
                <div className="events-list">
                    {events.map((event) => (
                        <EventCard 
                            key={event.id} 
                            event={event} 
                            user={user} 
                            onEventDelete={handleEventDelete} 
                            onSelect={setSelectedEvent} 
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state">Hozircha faol e'lonlar mavjud emas.</div>
            )}

            {/* ═══════════════════════════════════════════
                EVENT DETAIL MODAL — Premium Immersive View
            ═══════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedEvent && (
                    <motion.div
                        className="event-detail-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedEvent(null)}
                    >
                        <motion.div
                            className="event-detail-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button className="detail-close-btn" onClick={() => setSelectedEvent(null)}>
                                <FaTimes />
                            </button>

                            {/* Hero Section */}
                            <div className="detail-hero">
                                {selectedEvent.image_url ? (
                                    <img src={selectedEvent.image_url} alt={selectedEvent.title} className="detail-hero-img" />
                                ) : (
                                    <div className="detail-hero-placeholder">
                                        <FaBullhorn />
                                    </div>
                                )}
                                <div className="detail-hero-overlay">
                                    {selectedEvent.event_date && (
                                        <span className="detail-countdown">
                                            {getDaysUntil(selectedEvent.event_date)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="detail-body">
                                <h1 className="detail-title">{selectedEvent.title}</h1>

                                {/* Timeline-style Metadata */}
                                <div className="detail-timeline">
                                    {selectedEvent.event_date && (
                                        <div className="timeline-item">
                                            <div className="timeline-icon"><FaCalendarAlt /></div>
                                            <div className="timeline-content">
                                                <span className="timeline-label">SANA</span>
                                                <span className="timeline-value">{formatFullDate(selectedEvent.event_date)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {selectedEvent.event_date && (
                                        <div className="timeline-item">
                                            <div className="timeline-icon"><FaClock /></div>
                                            <div className="timeline-content">
                                                <span className="timeline-label">VAQT</span>
                                                <span className="timeline-value">{formatTime(selectedEvent.event_date)}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="timeline-item">
                                        <div className="timeline-icon"><FaMapMarkerAlt /></div>
                                        <div className="timeline-content">
                                            <span className="timeline-label">JOYLASHUV</span>
                                            <span className="timeline-value">{selectedEvent.location || 'Online'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Full Description */}
                                <div className="detail-description">
                                    <h3>BATAFSIL MA'LUMOT</h3>
                                    <p>{selectedEvent.description}</p>
                                </div>

                                {/* Organizer Card */}
                                <div className="detail-organizer-card">
                                    <div className="detail-org-avatar">
                                        <img 
                                            src={selectedEvent.organizer_info?.avatar_url || `https://ui-avatars.com/api/?name=${selectedEvent.organizer_info?.full_name}&background=102C26&color=F7E7Ce`} 
                                            alt="" 
                                        />
                                    </div>
                                    <div className="detail-org-info">
                                        <span className="detail-org-label"><FaUserCircle /> TASHKILOTCHI</span>
                                        <span className="detail-org-name">{selectedEvent.organizer_info?.full_name}</span>
                                    </div>
                                </div>

                                {/* Share / Created At */}
                                <div className="detail-footer">
                                    {selectedEvent.created_at && (
                                        <span className="detail-created">
                                            E'lon qilingan: {new Date(selectedEvent.created_at).toLocaleDateString('uz-UZ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════
                CREATE FORM MODAL
            ═══════════════════════════════════════════ */}
            <AnimatePresence>
                {showForm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-overlay"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="modal-content glass"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2><FaBullhorn /> New Announcement</h2>
                                <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="review-form">
                                <div className="form-group">
                                    <label>Event Title</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Enter title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Location</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="City, Hall, or Online"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        required 
                                        value={formData.event_date}
                                        onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea 
                                        required 
                                        placeholder="Describe the event..."
                                        rows="4"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Poster Image</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                </div>
                                <button type="submit" className="submit-btn btn-primary">POST NOW</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnnouncementsPage;

