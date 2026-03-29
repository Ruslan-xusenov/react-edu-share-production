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
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [subsubcategories, setSubsubcategories] = useState([]);
    const [videoMode, setVideoMode] = useState('url'); // 'url' or 'file'
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Subcategory creation state
    const [isAddingSub, setIsAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState('');
    const [addingSubLoading, setAddingSubLoading] = useState(false);

    // Sub-Subcategory creation state
    const [isAddingSubSub, setIsAddingSubSub] = useState(false);
    const [newSubSubName, setNewSubSubName] = useState('');
    const [addingSubSubLoading, setAddingSubSubLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sub_sub_category: '', // Matches backend Model
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
            setSelectedSubCategory('');
            setSubsubcategories([]);
            setFormData(prev => ({ ...prev, sub_sub_category: '' }));
        } else {
            setSubcategories([]);
            setSubsubcategories([]);
        }
    }, [selectedCategory, categories]);

    // Update sub-subcategories when subcategory changes
    useEffect(() => {
        if (selectedSubCategory) {
            const sub = subcategories.find(s => String(s.id) === String(selectedSubCategory));
            setSubsubcategories(sub?.sub_subcategories || []);
            setFormData(prev => ({ ...prev, sub_sub_category: '' }));
        } else {
            setSubsubcategories([]);
        }
    }, [selectedSubCategory, subcategories]);

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
                setSelectedSubCategory(newSub.id);
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

    const handleAddSubSubCategory = async () => {
        if (!newSubSubName.trim() || !selectedSubCategory) return;
        setAddingSubSubLoading(true);
        try {
            const res = await apiClient.post(API_ENDPOINTS.SUBSUBCATEGORIES, {
                name: newSubSubName,
                sub_category: selectedSubCategory
            });
            if (res.data) {
                const newSubSub = res.data;
                setSubsubcategories(prev => [...prev, newSubSub]);
                setFormData(prev => ({ ...prev, sub_sub_category: newSubSub.id }));
                setNewSubSubName('');
                setIsAddingSubSub(false);
                const catRes = await apiClient.get(API_ENDPOINTS.CATEGORIES);
                setCategories(catRes.data.results || catRes.data);
            }
        } catch (err) {
            console.error('Failed to create sub-sub-category:', err);
            alert('Sohani yaratishda xatolik yuz berdi.');
        } finally {
            setAddingSubSubLoading(false);
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
            data.append('sub_sub_category', formData.sub_sub_category); 
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

            const lessonRes = await apiClient.post(API_ENDPOINTS.LESSONS, data, {
                timeout: 600000 
            });
            const lessonId = lessonRes.data.id;

            if (quizQuestions.length > 0) {
                for (const q of quizQuestions) {
                    await apiClient.post(API_ENDPOINTS.QUIZ_QUESTIONS, {
                        ...q,
                        lesson: lessonId
                    });
                }
            }

            setSuccess(true);
            setTimeout(() => navigate(`/courses/${lessonId}`), 1500);
        } catch (err) {
            console.error('Create error:', err);
            const detail = err.response?.data;
            if (typeof detail === 'object') {
                const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${v}`);
                setError(msgs.join('\n'));
            } else {
                setError(detail || 'Xatolik yuz berdi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-lesson-page">
            <Helmet><title>Yangi Dars Yaratish — EduShare</title></Helmet>
            <div className="container">
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="create-lesson-header">
                    <FaPlusCircle className="header-icon" />
                    <h1>Yangi Dars Yaratish</h1>
                </motion.div>

                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="create-lesson-card">
                    {success ? (
                        <div className="success-message"><h2>Muvaffaqiyatli yaratildi!</h2></div>
                    ) : (
                        <form onSubmit={handleSubmit} className="create-lesson-form">
                            {error && <div className="form-error">{error}</div>}
                            
                            <div className="form-section">
                                <h3 className="section-title"><FaHeading /> Asosiy ma'lumotlar</h3>
                                <div className="form-group">
                                    <label>Dars nomi</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Tavsif</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} required />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Yo'nalish (Kategoriya)</label>
                                        <select value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)} required>
                                            <option value="">Kategoriyani tanlang</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.display_name || cat.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <div className="label-with-action">
                                            <label>Mutaxassislik</label>
                                            {selectedCategory && !isAddingSub && <button type="button" className="inline-action-btn" onClick={()=>setIsAddingSub(true)}><FaPlusCircle /> Yangi</button>}
                                        </div>
                                        {isAddingSub ? (
                                            <div className="inline-add-form">
                                                <input type="text" value={newSubName} onChange={(e)=>setNewSubName(e.target.value)} autoFocus />
                                                <button type="button" onClick={handleAddSubCategory} disabled={addingSubLoading}><FaCheck /></button>
                                                <button type="button" onClick={()=>setIsAddingSub(false)}>&times;</button>
                                            </div>
                                        ) : (
                                            <select value={selectedSubCategory} onChange={(e)=>setSelectedSubCategory(e.target.value)} disabled={!selectedCategory} required>
                                                <option value="">Tanlang</option>
                                                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <div className="label-with-action">
                                            <label>Soha (Topic)</label>
                                            {selectedSubCategory && !isAddingSubSub && <button type="button" className="inline-action-btn" onClick={()=>setIsAddingSubSub(true)}><FaPlusCircle /> Yangi</button>}
                                        </div>
                                        {isAddingSubSub ? (
                                            <div className="inline-add-form">
                                                <input type="text" value={newSubSubName} onChange={(e)=>setNewSubSubName(e.target.value)} autoFocus />
                                                <button type="button" onClick={handleAddSubSubCategory} disabled={addingSubSubLoading}><FaCheck /></button>
                                                <button type="button" onClick={()=>setIsAddingSubSub(false)}>&times;</button>
                                            </div>
                                        ) : (
                                            <select name="sub_sub_category" value={formData.sub_sub_category} onChange={handleChange} disabled={!selectedSubCategory} required>
                                                <option value="">Tanlang</option>
                                                {subsubcategories.map(ss => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Daraja</label>
                                        <select name="level" value={formData.level} onChange={handleChange}>
                                            <option value="beginner">Boshlang'ich</option>
                                            <option value="intermediate">O'rta</option>
                                            <option value="advanced">Yuqori</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title"><FaLink /> Media</h3>
                                <div className="video-mode-selector">
                                    <button type="button" className={videoMode==='url'?'active':''} onClick={()=>setVideoMode('url')}>YouTube Link</button>
                                    <button type="button" className={videoMode==='file'?'active':''} onClick={()=>setVideoMode('file')}>Video Yuklash</button>
                                </div>
                                {videoMode==='url' ? (
                                    <input type="url" name="video_url" value={formData.video_url} onChange={handleChange} placeholder="YouTube URL..." />
                                ) : (
                                    <div className="file-upload-box">
                                        <input type="file" id="video_file" name="video_file" onChange={handleFileChange} accept="video/*" />
                                        <label htmlFor="video_file"><FaUpload /> {formData.video_file ? formData.video_file.name : 'Video fayl'}</label>
                                    </div>
                                )}
                                <div className="form-group" style={{marginTop:'1.5rem'}}>
                                    <label>Thumbnail</label>
                                    <div className="file-upload-box">
                                        <input type="file" id="thumbnail" name="thumbnail" onChange={handleFileChange} accept="image/*" />
                                        <label htmlFor="thumbnail"><FaImage /> {formData.thumbnail ? formData.thumbnail.name : 'Rasm tanlang'}</label>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? <FaSpinner className="spin" /> : 'Darsni Yaratish'}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default CreateLessonPage;
