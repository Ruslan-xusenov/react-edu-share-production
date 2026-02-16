import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    FaPlusCircle, FaHeading, FaAlignLeft,
    FaClock, FaLink, FaUpload, FaImage, FaCheck, FaSpinner,
    FaQuestionCircle, FaTrash, FaCheckCircle
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './CreateLessonPage.css';

const CreateLessonPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [videoMode, setVideoMode] = useState('url'); // 'url' or 'file'
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Subcategory creation state
    const [isAddingSub, setIsAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState('');
    const [addingSubLoading, setAddingSubLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sub_category: '',
        level: 'beginner',
        duration: '',
        video_url: '',
        video_file: null,
        thumbnail: null,
    });

    // Quiz questions state
    const [quizQuestions, setQuizQuestions] = useState([]);

    const addQuestion = () => {
        setQuizQuestions([...quizQuestions, {
            question_text: '',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_answer: 'A',
            order: quizQuestions.length + 1
        }]);
    };

    const removeQuestion = (index) => {
        const newQuestions = quizQuestions.filter((_, i) => i !== index);
        // Re-order
        const updatedQuestions = newQuestions.map((q, i) => ({ ...q, order: i + 1 }));
        setQuizQuestions(updatedQuestions);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[index][field] = value;
        setQuizQuestions(newQuestions);
    };

    // Check auth and admin status
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        if (!token) {
            navigate('/login');
            return;
        }
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (!user.is_staff) {
                    navigate('/');
                }
            } catch {
                navigate('/');
            }
        }
    }, [navigate]);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
                setCategories(res.data.results || res.data);
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Update subcategories when category changes
    useEffect(() => {
        if (selectedCategory) {
            const cat = categories.find(c => String(c.id) === String(selectedCategory));
            setSubcategories(cat?.subcategories || []);
            setFormData(prev => ({ ...prev, sub_category: '' }));
        } else {
            setSubcategories([]);
        }
    }, [selectedCategory, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFormData(prev => ({ ...prev, [name]: files[0] || null }));
    };

    const handleAddSubCategory = async () => {
        if (!newSubName.trim() || !selectedCategory) return;

        setAddingSubLoading(true);
        try {
            const res = await apiClient.post(API_ENDPOINTS.SUBCATEGORIES, {
                name: newSubName,
                category: selectedCategory
            });

            if (res.data) {
                const newSub = res.data;
                setSubcategories(prev => [...prev, newSub]);
                setFormData(prev => ({ ...prev, sub_category: newSub.id }));
                setNewSubName('');
                setIsAddingSub(false);

                const catRes = await apiClient.get(API_ENDPOINTS.CATEGORIES);
                setCategories(catRes.data.results || catRes.data);
            }
        } catch (err) {
            console.error('Failed to create subcategory:', err);
            alert('Sub-kategoriyani yaratishda xatolik yuz berdi.');
        } finally {
            setAddingSubLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('sub_category', formData.sub_category);
            data.append('level', formData.level);
            data.append('duration', formData.duration);

            if (videoMode === 'url' && formData.video_url) {
                data.append('video_url', formData.video_url);
            } else if (videoMode === 'file' && formData.video_file) {
                data.append('video_file', formData.video_file);
            }

            if (formData.thumbnail) {
                data.append('thumbnail', formData.thumbnail);
            }

            // 1. Create Lesson
            const lessonRes = await apiClient.post(API_ENDPOINTS.LESSONS, data);
            const lessonId = lessonRes.data.id;

            // 2. Create Quiz Questions if any
            if (quizQuestions.length > 0) {
                for (const q of quizQuestions) {
                    await apiClient.post(API_ENDPOINTS.QUIZ_QUESTIONS, {
                        ...q,
                        lesson: lessonId
                    });
                }
            }

            setSuccess(true);
            setTimeout(() => {
                navigate(`/courses/${lessonId}`);
            }, 1500);
        } catch (err) {
            console.error('Create lesson error:', err);
            const detail = err.response?.data;
            if (typeof detail === 'object') {
                const messages = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
                setError(messages.join('\n'));
            } else if (typeof detail === 'string' && detail.includes('<!DOCTYPE')) {
                // API returned HTML (e.g., Django 404/500 error page) — show friendly message
                setError(`Server xatoligi (${err.response?.status || 'noma\'lum'}). Iltimos qaytadan urinib ko'ring.`);
            } else {
                setError(detail || 'Darsni yaratishda xatolik yuz berdi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Dars Yaratish - EduShare School | Ruslan Xusenov</title>
                <meta name="description" content="Yangi dars yarating va bilimingizni EduShare platformasidagi tengdoshlarsingiz bilan ulashing. Ruslan Xusenov tomonidan yaratilgan." />
                <meta name="author" content="Ruslan Xusenov" />
            </Helmet>

            <div className="create-lesson-page">
                <div className="create-lesson-bg">
                    <div className="bg-orb bg-orb-1"></div>
                    <div className="bg-orb bg-orb-2"></div>
                    <div className="bg-orb bg-orb-3"></div>
                </div>

                <div className="container">
                    <motion.div
                        className="create-lesson-header"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <FaPlusCircle className="header-icon" />
                        <h1>Yangi Dars Yaratish</h1>
                        <p>Bilimingizni boshqalar bilan ulashing</p>
                    </motion.div>

                    <motion.div
                        className="create-lesson-card"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
                        {success ? (
                            <div className="success-message">
                                <div className="success-icon"><FaCheck /></div>
                                <h2>Dars muvaffaqiyatli yaratildi!</h2>
                                <p>Siz tez orada dars sahifasiga yo'naltirilasiz...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="create-lesson-form">
                                {error && (
                                    <div className="form-error">
                                        {error}
                                    </div>
                                )}

                                {/* Main Details Section */}
                                <div className="form-section">
                                    <h3 className="section-title"><FaHeading /> Asosiy ma'lumotlar</h3>

                                    <div className="form-group">
                                        <label htmlFor="title">Dars nomi</label>
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="Masalan: Python dasturlash asoslari"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="description">Tavsif</label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Dars haqida batafsil ma'lumot yozing..."
                                            rows={5}
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="category">Kategoriya</label>
                                            <select
                                                id="category"
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                required
                                            >
                                                <option value="">Kategoriyani tanlang</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.display_name || cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group sub-category-group">
                                            <div className="label-with-action">
                                                <label htmlFor="sub_category">Sub-kategoriya</label>
                                                {selectedCategory && !isAddingSub && (
                                                    <button
                                                        type="button"
                                                        className="inline-action-btn"
                                                        onClick={() => setIsAddingSub(true)}
                                                    >
                                                        <FaPlusCircle /> Yangi
                                                    </button>
                                                )}
                                            </div>

                                            {isAddingSub ? (
                                                <div className="inline-add-form">
                                                    <input
                                                        type="text"
                                                        placeholder="Nomi"
                                                        value={newSubName}
                                                        onChange={(e) => setNewSubName(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="inline-add-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-save-inline"
                                                            onClick={handleAddSubCategory}
                                                            disabled={addingSubLoading || !newSubName.trim()}
                                                        >
                                                            {addingSubLoading ? <FaSpinner className="spin" /> : <FaCheck />}
                                                        </button>
                                                        <button type="button" className="btn-cancel-inline" onClick={() => setIsAddingSub(false)}>&times;</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <select
                                                    id="sub_category"
                                                    name="sub_category"
                                                    value={formData.sub_category}
                                                    onChange={handleChange}
                                                    required
                                                    disabled={!selectedCategory}
                                                >
                                                    <option value="">Sub-kategoriyani tanlang</option>
                                                    {subcategories.map(sub => (
                                                        <option key={sub.id} value={sub.id}>
                                                            {sub.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="level">Daraja</label>
                                            <select id="level" name="level" value={formData.level} onChange={handleChange}>
                                                <option value="beginner">Boshlang'ich</option>
                                                <option value="intermediate">O'rta</option>
                                                <option value="advanced">Yuqori</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="duration">Davomiylik</label>
                                            <input
                                                type="text"
                                                id="duration"
                                                name="duration"
                                                value={formData.duration}
                                                onChange={handleChange}
                                                placeholder="Masalan: 15 daqiqa"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Video & Media Section */}
                                <div className="form-section">
                                    <h3 className="section-title"><FaLink /> Media fayllar</h3>

                                    <div className="video-mode-selector">
                                        <button
                                            type="button"
                                            className={videoMode === 'url' ? 'active' : ''}
                                            onClick={() => setVideoMode('url')}
                                        >
                                            YouTube Link
                                        </button>
                                        <button
                                            type="button"
                                            className={videoMode === 'file' ? 'active' : ''}
                                            onClick={() => setVideoMode('file')}
                                        >
                                            Video Yuklash
                                        </button>
                                    </div>

                                    {videoMode === 'url' ? (
                                        <div className="form-group">
                                            <input
                                                type="url"
                                                id="video_url"
                                                name="video_url"
                                                value={formData.video_url}
                                                onChange={handleChange}
                                                placeholder="https://www.youtube.com/watch?v=..."
                                            />
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <div className="file-upload-box">
                                                <input
                                                    type="file"
                                                    id="video_file"
                                                    name="video_file"
                                                    onChange={handleFileChange}
                                                    accept="video/*"
                                                />
                                                <label htmlFor="video_file">
                                                    <FaUpload /> {formData.video_file ? formData.video_file.name : 'Video faylni tanlang'}
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Thumbnail (Muqova rasmi)</label>
                                        <div className="file-upload-box">
                                            <input
                                                type="file"
                                                id="thumbnail"
                                                name="thumbnail"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                            />
                                            <label htmlFor="thumbnail">
                                                <FaImage /> {formData.thumbnail ? formData.thumbnail.name : 'Rasm tanlang'}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Quiz Section */}
                                <div className="form-section quiz-section">
                                    <div className="section-header">
                                        <h3 className="section-title"><FaQuestionCircle /> Test Savollari (ixtiyoriy)</h3>
                                        <button type="button" className="btn-add-question" onClick={addQuestion}>
                                            <FaPlusCircle /> Savol qo'shish
                                        </button>
                                    </div>

                                    <div className="questions-list">
                                        {quizQuestions.map((q, index) => (
                                            <div key={index} className="question-item-card">
                                                <div className="q-header">
                                                    <span>Savol #{index + 1}</span>
                                                    <button type="button" className="btn-remove-q" onClick={() => removeQuestion(index)}>
                                                        <FaTrash />
                                                    </button>
                                                </div>

                                                <div className="form-group">
                                                    <input
                                                        type="text"
                                                        placeholder="Savol matni..."
                                                        value={q.question_text}
                                                        onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <div className="options-grid">
                                                    <div className={`option-input-wrap ${q.correct_answer === 'A' ? 'is-correct' : ''}`}>
                                                        <span>A</span>
                                                        <input
                                                            type="text"
                                                            value={q.option_a}
                                                            onChange={(e) => updateQuestion(index, 'option_a', e.target.value)}
                                                            placeholder="A variant matni"
                                                            required
                                                        />
                                                        <button type="button" onClick={() => updateQuestion(index, 'correct_answer', 'A')}>
                                                            <FaCheckCircle />
                                                        </button>
                                                    </div>
                                                    <div className={`option-input-wrap ${q.correct_answer === 'B' ? 'is-correct' : ''}`}>
                                                        <span>B</span>
                                                        <input
                                                            type="text"
                                                            value={q.option_b}
                                                            onChange={(e) => updateQuestion(index, 'option_b', e.target.value)}
                                                            placeholder="B variant matni"
                                                            required
                                                        />
                                                        <button type="button" onClick={() => updateQuestion(index, 'correct_answer', 'B')}>
                                                            <FaCheckCircle />
                                                        </button>
                                                    </div>
                                                    <div className={`option-input-wrap ${q.correct_answer === 'C' ? 'is-correct' : ''}`}>
                                                        <span>C</span>
                                                        <input
                                                            type="text"
                                                            value={q.option_c}
                                                            onChange={(e) => updateQuestion(index, 'option_c', e.target.value)}
                                                            placeholder="C variant (ixtiyoriy)"
                                                        />
                                                        <button type="button" onClick={() => updateQuestion(index, 'correct_answer', 'C')}>
                                                            <FaCheckCircle />
                                                        </button>
                                                    </div>
                                                    <div className={`option-input-wrap ${q.correct_answer === 'D' ? 'is-correct' : ''}`}>
                                                        <span>D</span>
                                                        <input
                                                            type="text"
                                                            value={q.option_d}
                                                            onChange={(e) => updateQuestion(index, 'option_d', e.target.value)}
                                                            placeholder="D variant (ixtiyoriy)"
                                                        />
                                                        <button type="button" onClick={() => updateQuestion(index, 'correct_answer', 'D')}>
                                                            <FaCheckCircle />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? <><FaSpinner className="spin" /> Saqlanmoqda...</> : <><FaCheck /> Darsni Yaratish</>}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default CreateLessonPage;
