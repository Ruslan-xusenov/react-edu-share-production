import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaStar, FaClock, FaTrophy, FaHeart, FaShare, FaArrowRight,
    FaCheckCircle, FaLock, FaYoutube, FaQuestionCircle,
    FaThumbsUp, FaThumbsDown, FaReply, FaAward
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import VideoPlayer from '../../components/VideoPlayer/VideoPlayer';
import YouTubePlayer from '../../components/YouTubePlayer/YouTubePlayer';
import LessonQuiz from '../../components/LessonQuiz/LessonQuiz';
import './CourseDetailPage.css';

const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
        /(?:v=|\/v\/|embed\/|youtu\.be\/|shorts\/|\/e\/|watch\?v=|\?v=)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

const CommentItem = ({ comment, depth = 0, rootId = null, onLike, onDislike, onReply, lessonId }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const effectiveRootId = rootId || comment.id;

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        const success = await onReply(replyContent, effectiveRootId);
        if (success) {
            setReplyContent('');
            setShowReplyForm(false);
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'hozir';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} daqiqa oldin`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} soat oldin`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className={`comment-branch ${depth > 0 ? 'reply-branch' : ''}`}>
            <div className="comment-item-yt">
                <div className="comment-avatar">
                    <img
                        src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${comment.author?.full_name}&background=random`}
                        alt={comment.author?.full_name}
                    />
                    {comment.replies && comment.replies.length > 0 && <div className="reply-line-connector"></div>}
                </div>
                <div className="comment-content-yt">
                    <div className="comment-meta">
                        <span className="author-name">@{comment.author?.username || comment.author?.full_name?.replace(' ', '').toLowerCase()}</span>
                        <span className="comment-date">{timeAgo(comment.created_at)}</span>
                    </div>
                    <div className="comment-text">
                        {comment.content}
                    </div>
                    <div className="comment-actions-yt">
                        <button
                            className={`action-btn-yt ${comment.user_liked ? 'active' : ''}`}
                            onClick={() => onLike(comment.id)}
                        >
                            <FaThumbsUp /> <span>{comment.likes_count || 0}</span>
                        </button>
                        <button
                            className={`action-btn-yt ${comment.user_disliked ? 'active' : ''}`}
                            onClick={() => onDislike(comment.id)}
                        >
                            <FaThumbsDown /> <span>{comment.dislikes_count || 0}</span>
                        </button>
                        <button
                            className="action-btn-yt reply-btn"
                            onClick={() => setShowReplyForm(!showReplyForm)}
                        >
                            <FaReply /> Javob berish
                        </button>
                    </div>

                    {showReplyForm && (
                        <form onSubmit={handleReplySubmit} className="mini-reply-form">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Javob yozing..."
                                autoFocus
                            />
                            <div className="form-btns">
                                <button type="button" onClick={() => setShowReplyForm(false)} className="cancel-reply">Bekor qilish</button>
                                <button type="submit" className="submit-reply">Javob berish</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            {comment.replies && comment.replies.length > 0 && (
                <div className="replies-container">
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            rootId={effectiveRootId}
                            onLike={onLike}
                            onDislike={onDislike}
                            onReply={onReply}
                            lessonId={lessonId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CourseDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [relatedLessons, setRelatedLessons] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showQuizUnlock, setShowQuizUnlock] = useState(false);
    const [quizAutoOpened, setQuizAutoOpened] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));

    useEffect(() => {
        const checkAuth = () => {
            setIsAuthenticated(!!localStorage.getItem('authToken'));
        };
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    const fetchCourseDetail = useCallback(async () => {
        try {
            const res = await apiClient.get(API_ENDPOINTS.LESSON_DETAIL(id));
            setCourse(res.data);

            // Fetch related lessons (Curriculum)
            if (res.data.sub_category_id) {
                try {
                    const relatedRes = await apiClient.get(`${API_ENDPOINTS.LESSONS}?sub_category=${res.data.sub_category_id}`);
                    const others = relatedRes.data.results.filter(l => l.id !== parseInt(id));
                    setRelatedLessons(others);
                } catch (err) {
                    console.error("Error fetching related lessons:", err);
                }
            }
        } catch (error) {
            console.error("Error fetching course detail:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCourseDetail();
    }, [fetchCourseDetail]);

    const handleEnroll = async () => {
        if (!localStorage.getItem('authToken')) {
            window.location.href = '/login';
            return;
        }

        setEnrolling(true);
        try {
            const res = await apiClient.post(API_ENDPOINTS.COURSE_ENROLL(id));
            if (res.data.status === 'success' || res.data.status === 'info') {
                setCourse(prev => ({ ...prev, is_enrolled: true }));
                alert(res.data.message);
            }
        } catch (error) {
            console.error("Enrollment error:", error);
            alert("Kursga yozilishda xatolik yuz berdi.");
        } finally {
            setEnrolling(false);
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        if (!localStorage.getItem('authToken')) {
            alert("Izoh qoldirish uchun tizimga kiring.");
            navigate('/login');
            return;
        }

        setSubmittingComment(true);
        try {
            const res = await apiClient.post(API_ENDPOINTS.LESSON_ADD_COMMENT(id), {
                content: newComment
            });
            setCourse(prev => ({
                ...prev,
                comments: [res.data, ...(prev.comments || [])]
            }));
            setNewComment('');
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("Izoh yuborish muvaffaqiyatsiz. Iltimos, qayta urinib ko'ring.");
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleVideoProgress = useCallback(async (currentTime, duration) => {
        // Use a ref-like approach to get current enrollment status without triggering re-renders
        // or re-creating this callback. id is already in closure.

        try {
            const res = await apiClient.post(API_ENDPOINTS.LESSON_UPDATE_PROGRESS(id), {
                current_time: currentTime,
                duration: duration
            });

            if (res.data.status === 'success') {
                const newProgress = res.data.progress;

                setCourse(prev => {
                    const prevProgress = prev?.progress || 0;
                    // Only update state if meaningful changes occurred to prevent re-renders
                    if (newProgress !== prevProgress ||
                        res.data.quiz_available !== prev.quiz_available ||
                        res.data.certificate_id !== prev.certificate_id) {

                        // Check for quiz auto-unlock inside setCourse to have access to latest state
                        if (newProgress >= 99.5 && prevProgress < 99.5 && !quizAutoOpened) {
                            setQuizAutoOpened(true);
                            if (prev?.has_quiz) {
                                setShowQuizUnlock(true);
                            }
                        }

                        return {
                            ...prev,
                            progress: newProgress,
                            quiz_available: res.data.quiz_available || prev.quiz_available,
                            certificate_id: res.data.certificate_id || prev.certificate_id,
                            is_enrolled: true // Ensure it stays true
                        };
                    }
                    return prev;
                });
            }

            if (res.data.reward_message) {
                setNotification(res.data.reward_message);
                setTimeout(() => setNotification(null), 7000);
            }
        } catch (error) {
            console.error("Error updating progress:", error);
        }
    }, [id, quizAutoOpened]); // quizAutoOpened is needed here

    const handleQuizPassed = useCallback(() => {
        fetchCourseDetail();
    }, [fetchCourseDetail]);

    const handleQuizUnlockStart = useCallback(() => {
        setShowQuizUnlock(false);
        setActiveTab('quiz');
    }, []);



    const videoPlayer = useMemo(() => {
        if (!course) return null;

        // If user is not logged in, show lock overlay
        if (!isAuthenticated) {
            return (
                <div className="video-locked-overlay" style={{
                    backgroundImage: course.thumbnail_url
                        ? `linear-gradient(135deg, rgba(15,15,35,0.85), rgba(30,30,60,0.9)), url(${course.thumbnail_url})`
                        : 'linear-gradient(135deg, #0f0f23, #1e1e3c)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}>
                    <div className="locked-content">
                        <div className="lock-icon-wrapper">
                            <FaLock className="lock-icon" />
                        </div>
                        <h3>Bu videoni ko'rish uchun tizimga kiring</h3>
                        <p>Videolarni ko'rish, progress saqlash va sertifikat olish uchun ro'yxatdan o'ting yoki tizimga kiring.</p>
                        <div className="locked-actions">
                            <Link to="/login" className="btn btn-primary btn-lg locked-btn">
                                🔑 Kirish
                            </Link>
                            <Link to="/signup" className="btn btn-outline btn-lg locked-btn">
                                📝 Ro'yxatdan o'tish
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        const youtubeVideoId = extractYouTubeVideoId(course.video_url);
        const hasVideoFile = course.video_file_url && course.video_file_url.trim() !== '';
        const hasGenericLink = course.video_url && course.video_url.trim() !== '' && !youtubeVideoId;

        // CRITICAL: We pass handleVideoProgress which is stable due to useCallback [id].
        // This prevents VideoPlayer/YouTubePlayer from re-mounting on every state update.
        if (youtubeVideoId) {
            return (
                <YouTubePlayer
                    key={`yt-${youtubeVideoId}`}
                    videoId={youtubeVideoId}
                    onProgress={handleVideoProgress}
                    initialTime={course.last_watched_time || 0}
                />
            );
        }

        if (hasVideoFile) {
            return (
                <VideoPlayer
                    key={`file-${course.id}`}
                    src={course.video_file_url}
                    poster={course.thumbnail_url}
                    onProgress={handleVideoProgress}
                    initialTime={course.last_watched_time || 0}
                />
            );
        }

        if (hasGenericLink) {
            return (
                <div className="external-link-placeholder" style={{
                    backgroundImage: course.thumbnail_url ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${course.thumbnail_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}>
                    <div className="external-link-content">
                        <FaYoutube className="link-icon" style={{ color: '#fff' }} />
                        <h3>Video tashqi havola orqali</h3>
                        <p>Ushbu dars videosi tashqi platformada joylashgan. Ko'rish uchun quyidagi tugmani bosing.</p>
                        <a href={course.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                            Videoga o'tish <FaArrowRight />
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div className="no-video" style={{
                backgroundImage: course.thumbnail_url ? `url(${course.thumbnail_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}>
                <div className="no-video-overlay">
                    <FaLock />
                    <span>Dars uchun video mavjud emas</span>
                </div>
            </div>
        );
    }, [course?.id, course?.video_url, course?.video_file_url, course?.thumbnail_url, handleVideoProgress, isAuthenticated]);

    if (loading) {
        return <div className="loading">Kurs ma'lumotlari yuklanmoqda...</div>;
    }

    if (!course) {
        return <div className="error">Kurs topilmadi.</div>;
    }

    // Helper to organize comments into threads

    const handleCommentLike = async (commentId) => {
        if (!localStorage.getItem('authToken')) {
            window.location.href = '/login';
            return;
        }
        try {
            const res = await apiClient.post(API_ENDPOINTS.COMMENT_LIKE(commentId));
            updateCommentInState(commentId, res.data.likes_count, res.data.dislikes_count, res.data.active, null);
        } catch (error) {
            console.error("Error liking comment:", error);
        }
    };

    const handleSave = async () => {
        if (!localStorage.getItem('authToken')) {
            window.location.href = '/login';
            return;
        }
        try {
            const res = await apiClient.post(API_ENDPOINTS.LESSON_SAVE(id));
            setCourse(prev => ({
                ...prev,
                is_saved: res.data.is_saved
            }));
        } catch (error) {
            console.error("Error saving lesson:", error);
        }
    };

    const handleCommentDislike = async (commentId) => {
        if (!localStorage.getItem('authToken')) {
            window.location.href = '/login';
            return;
        }
        try {
            const res = await apiClient.post(API_ENDPOINTS.COMMENT_DISLIKE(commentId));
            updateCommentInState(commentId, res.data.likes_count, res.data.dislikes_count, null, res.data.active);
        } catch (error) {
            console.error("Error disliking comment:", error);
        }
    };

    const updateCommentInState = (commentId, likes, dislikes, userLiked, userDisliked) => {
        const updateRecursive = (comments) => {
            return comments.map(c => {
                if (c.id === commentId) {
                    return {
                        ...c,
                        likes_count: likes,
                        dislikes_count: dislikes,
                        user_liked: userLiked !== null ? userLiked : (userLiked === false ? false : c.user_liked),
                        user_disliked: userDisliked !== null ? userDisliked : (userDisliked === false ? false : c.user_disliked)
                    };
                }
                if (c.replies && c.replies.length > 0) {
                    return { ...c, replies: updateRecursive(c.replies) };
                }
                return c;
            });
        };

        setCourse(prev => ({
            ...prev,
            comments: updateRecursive(prev.comments)
        }));
    };

    const handleReply = async (content, rootId) => {
        try {
            const res = await apiClient.post(API_ENDPOINTS.LESSON_ADD_COMMENT(id), {
                content: content,
                parent: rootId
            });

            setCourse(prev => ({
                ...prev,
                comments: prev.comments.map(c => {
                    if (c.id === rootId) {
                        return { ...c, replies: [...(c.replies || []), res.data] };
                    }
                    return c;
                })
            }));
            return true;
        } catch (error) {
            console.error("Error replying:", error);
            alert("Javob yuborish muvaffaqiyatsiz. Iltimos, qayta urinib ko'ring.");
            return false;
        }
    };


    if (loading) {
        return (
            <div className="horizontal-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginLeft: '1rem' }}>Kurs tafsilotlari yuklanmoqda...</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="horizontal-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <h2>Kurs topilmadi</h2>
                <p>Kechirasiz, so'ralgan kurs mavjud emas yoki o'chirib tashlangan.</p>
                <Link to="/courses" className="btn btn-primary" style={{ marginTop: '2rem' }}>Kurslarga qaytish</Link>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{course.title || 'Kurs Tafsilotlari'} - EduShare School | Ruslan Xusenov</title>
                <meta name="description" content={course.description} />
                <meta name="author" content="Ruslan Xusenov" />
            </Helmet>

            <div className="course-detail-page">
                {notification && (
                    <div className="reward-notification">
                        {notification}
                    </div>
                )}

                {/* Quiz Unlock Celebration Modal */}
                <AnimatePresence>
                    {showQuizUnlock && (
                        <motion.div
                            className="quiz-unlock-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQuizUnlock(false)}
                        >
                            <motion.div
                                className="quiz-unlock-modal"
                                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.5, opacity: 0, y: 50 }}
                                transition={{ type: 'spring', damping: 15 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="quiz-unlock-icon">🎉</div>
                                <h2>Tabriklaymiz!</h2>
                                <p>Siz videoni 100% ko'rib tugatdingiz!</p>
                                <p className="quiz-unlock-desc">
                                    Endi test topshirib, bilimingizni sinab ko'ring.
                                    Barcha savollarga to'g'ri javob bering va <strong>sertifikat</strong> oling!
                                </p>
                                <div className="quiz-unlock-info">
                                    <span>📝 {course.quiz_questions_count || '?'} ta savol</span>
                                    <span>🎯 100% to'g'ri javob kerak</span>
                                    <span>🏆 Sertifikat + 40 ball</span>
                                </div>
                                <button className="quiz-unlock-btn" onClick={handleQuizUnlockStart}>
                                    <FaQuestionCircle /> Testni boshlash
                                </button>
                                <button className="quiz-unlock-later" onClick={() => setShowQuizUnlock(false)}>
                                    Keyinroq topshiraman
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="course-watch-container">
                    {/* Left Column: Video & Main Content */}
                    <div className="watch-main">
                        {/* Video Player Section */}
                        <div className="video-section">
                            <div className="video-player-wrapper">
                                {videoPlayer ? (
                                    videoPlayer
                                ) : (
                                    <div className="no-video" style={{ backgroundImage: `url(${course?.thumbnail_url})` }}>
                                        <div className="no-video-overlay">
                                            <FaLock />
                                            <span>Bu darsni ko'rish uchun ro'yxatdan o'ting</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Header & Meta - Simplified */}
                        <div className="watch-header">
                            <h1 className="watch-title">{course.title}</h1>

                            <div className="watch-meta-row">
                                <div className="watch-stats">
                                    <div className="watch-views-count">
                                        <FaClock /> <span>{course.views} views</span>
                                    </div>
                                    <div className="watch-rating">
                                        <FaStar className="text-yellow" /> <span>{course.rating || 4.5}</span>
                                    </div>
                                </div>

                                <div className="watch-actions">
                                    <button className="btn-action" onClick={handleSave}>
                                        <FaHeart style={{ color: course.is_saved ? 'var(--primary)' : 'inherit' }} />
                                        <span>{course.is_saved ? 'Saved' : 'Save'}</span>
                                    </button>
                                    <button className="btn-action">
                                        <FaShare /> <span>Share</span>
                                    </button>
                                    {course.certificate_id && (
                                        <Link
                                            to={`/certificate/${course.certificate_id}`}
                                            className="btn-action btn-certificate-highlight"
                                        >
                                            <FaAward /> <span>ID: {course.certificate_id}</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs & Content */}
                        <div className="watch-content">
                            <div className="content-tabs">
                                {['overview', 'comments', (course.has_quiz && (course.progress >= 99.5 || course.quiz_available)) ? 'quiz' : null].filter(Boolean).map(tab => (
                                    <button
                                        key={tab}
                                        className={`tab ${activeTab === tab ? 'active' : ''} ${tab === 'quiz' && !course.quiz_passed ? 'quiz-available' : ''}`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab === 'overview' ? "Umumiy ko'rish" : tab === 'comments' ? 'Izohlar' : (
                                            course.quiz_passed ? '✅ Test (topshirilgan)' : '📝 Test'
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="tab-content">
                                {activeTab === 'overview' && (
                                    <div className="overview-content">
                                        <div className="description-box">
                                            <p>{course.views} ko'rishlar • {new Date(course.created_at).toLocaleDateString()}</p>
                                            <div className="description-text">
                                                {course.description}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'quiz' && (
                                    <div className="quiz-tab-content">
                                        <LessonQuiz
                                            lessonId={id}
                                            onPassed={handleQuizPassed}
                                            quizPassed={course.quiz_passed}
                                        />
                                    </div>
                                )}

                                {activeTab === 'comments' && (
                                    <div className="comments-section">
                                        <h3>{course.comments?.length || 0} Izohlar</h3>

                                        {localStorage.getItem('authToken') ? (
                                            <form onSubmit={handlePostComment} className="comment-form">
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=User&background=random`}
                                                    alt="User"
                                                    className="user-avatar"
                                                />
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Izoh qo'shing..."
                                                    />
                                                    {newComment.trim() && (
                                                        <button type="submit" disabled={submittingComment}>
                                                            Izoh
                                                        </button>
                                                    )}
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="login-prompt">
                                                Izoh qoldirish uchun <Link to="/login">tizimga kiring</Link>.
                                            </div>
                                        )}

                                        <div className="comments-list">
                                            {course.comments && course.comments.length > 0 ? (
                                                course.comments.map(comment => (
                                                    <CommentItem
                                                        key={comment.id}
                                                        comment={comment}
                                                        onLike={handleCommentLike}
                                                        onDislike={handleCommentDislike}
                                                        onReply={handleReply}
                                                        lessonId={id}
                                                    />
                                                ))
                                            ) : (
                                                <p className="no-comments">Hali izohlar yo'q.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="watch-sidebar">
                        {/* Author Card - New Compact Design */}
                        <div className="instructor-card glass">
                            <div className="instructor-header">
                                <div className="instructor-avatar-container">
                                    <img
                                        src={course.author?.avatar_url || `https://ui-avatars.com/api/?name=${course.author?.full_name}&background=random`}
                                        alt={course.author?.full_name}
                                        className="instructor-avatar"
                                    />
                                    <div className="avatar-status"></div>
                                </div>
                                <div className="instructor-details">
                                    <h4>{course.author?.full_name}</h4>
                                    <span className="badge-mini">{course.author?.school || 'Verified Author'}</span>
                                </div>
                            </div>
                            <div className="instructor-stats-mini">
                                <div className="stat">
                                    <span className="label">LEVEL</span>
                                    <span className="val">{course.author?.grade || 'Pro'}</span>
                                </div>
                                <div className="stat">
                                    <span className="label">POINTS</span>
                                    <span className="val">{course.author?.points || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Enroll Card (Sticky) */}
                        <div className="enroll-card glass">
                            <div className="price-section">
                                <span className="price">FREE ACCESS</span>
                                <div className="price-glow"></div>
                            </div>
                            <button
                                onClick={handleEnroll}
                                className="btn btn-primary btn-block btn-shimmer"
                                disabled={enrolling || course.is_enrolled}
                            >
                                {enrolling ? 'INITIALIZING...' : course.is_enrolled ? 'ACCESS GRANTED' : 'ENROLL NOW'}
                            </button>
                            <ul className="course-features">
                                <li><FaClock /> {course.duration || 'Flexible'}</li>
                                <li><FaTrophy /> Official Certificate</li>
                                <li><FaCheckCircle /> Lifetime Updates</li>
                            </ul>
                        </div>

                        {/* Related Lessons (Curriculum) */}
                        <div className="related-lessons">
                            <h3>Kurs Tarkibi</h3>
                            <div className="lessons-list">
                                {relatedLessons.map(lesson => (
                                    <Link to={`/courses/${lesson.id}`} key={lesson.id} className="lesson-card-mini">
                                        <div className="lesson-thumb">
                                            <img src={lesson.thumbnail_url || 'https://via.placeholder.com/150'} alt={lesson.title} />
                                            <span className="duration">{lesson.duration || '10:00'}</span>
                                        </div>
                                        <div className="lesson-info">
                                            <h5>{lesson.title}</h5>
                                            <span className="author">{lesson.author?.full_name}</span>
                                        </div>
                                    </Link>
                                ))}
                                {relatedLessons.length === 0 && (
                                    <p className="text-muted">Bu kursda boshqa darslar yo'q.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CourseDetailPage;