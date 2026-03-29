import { useState, useEffect, memo } from 'react';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import { FaBook, FaStar, FaPlus, FaPenNib, FaTrash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './BookReviewsPage.css';

const ReviewCard = memo(({ review, user, onReviewDelete }) => (
    <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="review-card glass"
    >
        <div className="card-image">
            {review.cover_image_url ? (
                <img src={review.cover_image_url} alt={review.book_title} loading="lazy" />
            ) : (
                <div className="placeholder-image"><FaBook /></div>
            )}
            <div className="card-rating">
                <FaStar /> {review.rating}/5
            </div>
            {user?.is_staff && (
                <button 
                    className="admin-delete-btn-sm" 
                    onClick={(e) => onReviewDelete(review.id, e)}
                    title="Sharhni o'chirish"
                >
                    <FaTrash />
                </button>
            )}
        </div>
        <div className="card-body">
            <h3>{review.book_title}</h3>
            <span className="author-name">by {review.book_author || 'Unknown'}</span>
            <p className="review-text">{review.review_content}</p>
            <div className="card-footer">
                <img 
                    src={review.author?.avatar_url || `https://ui-avatars.com/api/?name=${review.author?.full_name}&background=random`} 
                    alt={review.author?.full_name} 
                    className="user-avatar"
                />
                <div className="user-info">
                    <span className="user-name">{review.author?.full_name}</span>
                    <span className="date">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    </motion.div>
));

const BookReviewsPage = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        book_title: '',
        book_author: '',
        review_content: '',
        rating: 5,
        cover_image: null
    });

    useEffect(() => {
        fetchReviews();
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await apiClient.get(API_ENDPOINTS.COMMUNITY_BOOKS);
            setReviews(res.data.results || res.data);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReviewDelete = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Haqiqatdan ham ushbu sharhni o\'chirib tashlamoqchimisiz?')) {
            try {
                await apiClient.delete(`${API_ENDPOINTS.COMMUNITY_BOOKS}${id}/`);
                fetchReviews();
            } catch (err) {
                alert('O\'chirishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
            }
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, cover_image: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null) data.append(key, formData[key]);
        });

        try {
            await apiClient.post(API_ENDPOINTS.COMMUNITY_BOOKS, data);
            setShowForm(false);
            fetchReviews();
            setFormData({ book_title: '', book_author: '', review_content: '', rating: 5, cover_image: null });
        } catch (err) {
            alert('Review yuborishda xatolik yuz berdi. Iltimos login qilganingizni tekshiring.');
        }
    };

    return (
        <div className="book-reviews-container horizontal-page">
            <header className="page-header">
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="header-content"
                >
                    <span className="sub-text">COMMUNITY LIBRARY</span>
                    <h1>BOOK REVIEWS</h1>
                    <p>O'quvchilar tomonidan o'qilgan eng sara kitoblar va ulardan olingan foydali xulosalar.</p>
                </motion.div>
                
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="add-review-btn btn-primary"
                    onClick={() => setShowForm(true)}
                >
                    <FaPlus /> SHARE REVIEW
                </motion.button>
            </header>

            <div className="reviews-grid">
                {loading ? (
                    <div className="loader-container"><div className="spinner"></div></div>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard 
                            key={review.id} 
                            review={review} 
                            user={user} 
                            onReviewDelete={handleReviewDelete} 
                        />
                    ))
                )}
            </div>

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
                                <h2><FaPenNib /> Share Findings</h2>
                                <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="review-form">
                                <div className="form-group">
                                    <label>Book Title</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Enter book title"
                                        value={formData.book_title}
                                        onChange={(e) => setFormData({...formData, book_title: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Book Author</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter author name"
                                        value={formData.book_author}
                                        onChange={(e) => setFormData({...formData, book_author: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Rating (1-5)</label>
                                    <select 
                                        value={formData.rating} 
                                        onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                                    >
                                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Your Takeaways</label>
                                    <textarea 
                                        required 
                                        placeholder="What did you learn from this book?"
                                        rows="4"
                                        value={formData.review_content}
                                        onChange={(e) => setFormData({...formData, review_content: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Cover Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                </div>
                                <button type="submit" className="submit-btn btn-primary">PUBLISH REVIEW</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BookReviewsPage;
