import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    FaRegClock, FaRegEye, FaArrowLeft, FaUserCircle, FaRegNewspaper
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './ArticleDetailPage.css';

const ArticleDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const res = await apiClient.get(`${API_ENDPOINTS.COMMUNITY_ARTICLES}${slug}/`);
                setArticle(res.data);
            } catch (err) {
                setError('Maqola topilmadi yoki xatolik yuz berdi.');
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [slug]);

    if (loading) {
        return (
            <div className="article-detail-page">
                <div className="ad-loader">
                    <div className="ad-loader-bar"></div>
                    <p>LOADING ARTICLE...</p>
                </div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="article-detail-page">
                <div className="ad-error">
                    <FaRegNewspaper />
                    <h2>Maqola topilmadi</h2>
                    <p>{error}</p>
                    <Link to="/community/news" className="ad-back-btn">
                        <FaArrowLeft /> Yangiliklarга qaytish
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="article-detail-page">
            <Helmet>
                <title>{article.title} — EduShare Yangiliklar</title>
                <meta name="description" content={article.content?.replace(/<[^>]*>/g, '').slice(0, 160)} />
            </Helmet>

            {/* Back */}
            <motion.div
                className="ad-back"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <button className="ad-back-btn" onClick={() => navigate('/community/news')}>
                    <FaArrowLeft /> BACK TO NEWSROOM
                </button>
            </motion.div>

            {/* Hero Banner */}
            <motion.div
                className="ad-hero"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {article.thumbnail_url ? (
                    <img src={article.thumbnail_url} alt={article.title} className="ad-hero-img" />
                ) : (
                    <div className="ad-hero-placeholder">
                        <FaRegNewspaper />
                    </div>
                )}
                <div className="ad-hero-overlay">
                    <span className="ad-category-badge">EDUCATIONAL NEWS</span>
                </div>
            </motion.div>

            {/* Article container — 2 column on desktop */}
            <div className="ad-layout">
                {/* Main content */}
                <motion.main
                    className="ad-main"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="ad-title">{article.title}</h1>

                    <div className="ad-meta">
                        <span><FaRegClock /> {new Date(article.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span><FaRegEye /> {article.views} ko'rildi</span>
                    </div>

                    <div className="ad-divider"></div>

                    {/* Rendered content */}
                    <div
                        className="ad-content"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                </motion.main>

                {/* Sidebar */}
                <motion.aside
                    className="ad-sidebar"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {/* Author Card */}
                    <div className="ad-author-card glass">
                        <h4 className="ad-sidebar-label">MUALLIF</h4>
                        <div className="ad-author-row">
                            <img
                                src={
                                    article.author_info?.avatar_url ||
                                    `https://ui-avatars.com/api/?name=${article.author_info?.full_name}&background=102C26&color=F7E7Ce`
                                }
                                alt=""
                                className="ad-author-avatar"
                            />
                            <div>
                                <span className="ad-author-name">{article.author_info?.full_name}</span>
                                <span className="ad-author-sub">EduShare Tahririyati</span>
                            </div>
                        </div>
                    </div>

                    {/* Date Card */}
                    <div className="ad-date-card glass">
                        <h4 className="ad-sidebar-label">NASHR SANASI</h4>
                        <p className="ad-date-value">
                            {new Date(article.created_at).toLocaleDateString('uz-UZ', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Back link */}
                    <Link to="/community/news" className="ad-back-full-btn">
                        <FaArrowLeft /> Barcha maqolalar
                    </Link>
                </motion.aside>
            </div>
        </div>
    );
};

export default ArticleDetailPage;
