import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import { FaRegNewspaper, FaRegEye, FaRegClock, FaChevronRight, FaPlus, FaPenNib, FaTrash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './ArticlesPage.css';

// 🚀 Memoized Article Card for performance
const ArticleCard = memo(({ article, user, onArticleDelete }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="article-card glass"
    >
        <div className="card-image">
            <Link to={`/community/articles/${article.slug}`}>
                {article.thumbnail_url ? (
                    <img src={article.thumbnail_url} alt={article.title} loading="lazy" />
                ) : (
                    <div className="placeholder-news-sm"><FaRegNewspaper /></div>
                )}
            </Link>
            {user?.is_staff && (
                <button 
                    className="admin-delete-btn-sm" 
                    onClick={(e) => onArticleDelete(article.id, e)}
                    title="Maqolani o'chirish"
                >
                    <FaTrash />
                </button>
            )}
        </div>
        <div className="card-content">
            <div className="meta-sm">
                <span><FaRegClock /> {new Date(article.created_at).toLocaleDateString()}</span>
                <span><FaRegEye /> {article.views}</span>
            </div>
            <Link to={`/community/articles/${article.slug}`}>
                <h3>{article.title}</h3>
            </Link>
            <Link to={`/community/articles/${article.slug}`} className="read-more-link">
                O'QISH <FaChevronRight />
            </Link>
        </div>
    </motion.div>
));

const ArticlesPage = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        thumbnail: null
    });

    useEffect(() => {
        fetchArticles();
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await apiClient.get(API_ENDPOINTS.COMMUNITY_ARTICLES);
            setArticles(res.data.results || res.data);
        } catch (err) {
            console.error('Error fetching articles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, thumbnail: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null) data.append(key, formData[key]);
        });

        try {
            await apiClient.post(API_ENDPOINTS.COMMUNITY_ARTICLES, data);
            setShowForm(false);
            fetchArticles();
            setFormData({ title: '', content: '', thumbnail: null });
        } catch (err) {
            alert('Maqola yaratishda xatolik yuz berdi. Iltimos ruxsatlaringizni tekshiring.');
        }
    };

    const handleArticleDelete = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Haqiqatdan ham ushbu maqolani o\'chirib tashlamoqchimisiz?')) {
            try {
                await apiClient.delete(`${API_ENDPOINTS.COMMUNITY_ARTICLES}${id}/`);
                fetchArticles();
            } catch (err) {
                alert('O\'chirishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
            }
        }
    };

    const featuredArticle = articles[0];
    const otherArticles = articles.slice(1);
    const canCreate = user?.is_staff || user?.is_volunteer;

    return (
        <div className="articles-container horizontal-page">
            <header className="page-header">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="header-content"
                >
                    <span className="sub-text">STUDENT NEWSPAPER</span>
                    <h1>EDUCATIONAL NEWS</h1>
                    <p>Ta'lim sohasidagi eng so'nggi yangiliklar, foydali maqolalar va muvaffaqiyat hikoyalari.</p>
                </motion.div>

                {canCreate && (
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="add-news-btn btn-primary"
                        onClick={() => setShowForm(true)}
                    >
                        <FaPlus /> WRITE ARTICLE
                    </motion.button>
                )}
            </header>

            {loading ? (
                <div className="loader-container"><div className="spinner"></div></div>
            ) : articles.length > 0 ? (
                <div className="newspaper-layout">
                    {/* Featured Article */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="featured-section glass"
                    >
                        <div className="featured-image">
                            {featuredArticle.thumbnail_url ? (
                                <img src={featuredArticle.thumbnail_url} alt={featuredArticle.title} loading="eager" />
                            ) : (
                                <div className="placeholder-news"><FaRegNewspaper /></div>
                            )}
                            <div className="category-badge">FEATURED NEWS</div>
                            {user?.is_staff && (
                                <button 
                                    className="admin-delete-btn" 
                                    onClick={(e) => handleArticleDelete(featuredArticle.id, e)}
                                    title="Maqolani o'chirish"
                                >
                                    <FaTrash />
                                </button>
                            )}
                        </div>
                        <div className="featured-content">
                            <div className="meta">
                                <span><FaRegClock /> {new Date(featuredArticle.created_at).toLocaleDateString()}</span>
                                <span><FaRegEye /> {featuredArticle.views} VIEWS</span>
                            </div>
                            <h2>{featuredArticle.title}</h2>
                            <p className="excerpt">
                                {featuredArticle.content.substring(0, 200).replace(/<[^>]*>/g, '')}...
                            </p>
                            <div className="author-bar">
                                <img src={featuredArticle.author_info?.avatar_url || `https://ui-avatars.com/api/?name=${featuredArticle.author_info?.full_name}`} alt="" />
                                <span>Written by <strong>{featuredArticle.author_info?.full_name}</strong></span>
                            </div>
                            <Link to={`/community/articles/${featuredArticle.slug}`} className="read-more-btn">
                                READ FULL STORY <FaChevronRight />
                            </Link>
                        </div>
                    </motion.section>

                    {/* Secondary Articles Grid */}
                    <div className="articles-subgrid">
                        {otherArticles.map((article) => (
                            <ArticleCard 
                                key={article.id} 
                                article={article} 
                                user={user} 
                                onArticleDelete={handleArticleDelete} 
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">Hali maqolalar yuklanmagan.</div>
            )}

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
                                <h2><FaPenNib /> New Article</h2>
                                <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="review-form">
                                <div className="form-group">
                                    <label>Article Title</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Headline"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Article Body</label>
                                    <textarea 
                                        required 
                                        placeholder="Write your content here..."
                                        rows="8"
                                        value={formData.content}
                                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Thumbnail Image</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                </div>
                                <button type="submit" className="submit-btn btn-primary">PUBLISH ARTICLE</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ArticlesPage;
