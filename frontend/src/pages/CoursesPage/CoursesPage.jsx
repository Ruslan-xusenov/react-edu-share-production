import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    FaSearch, FaFilter
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './CoursesPage.css';

const CoursesPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [view, setView] = useState('categories'); // 'categories', 'subcategories', 'subsubcategories', 'lessons'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [selectedSubSubCategory, setSelectedSubSubCategory] = useState(null);
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
                const cats = res.data.results || res.data || [];
                setCategories(cats);
                
                // Handle pre-selected category from URL if any
                const catSlug = searchParams.get('category');
                if (catSlug && cats.length > 0) {
                    const cat = cats.find(c => c.slug === catSlug);
                    if (cat) {
                        setSelectedCategory(cat);
                        setView('subcategories');
                    }
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Lessons (Default to all, or filtered)
    useEffect(() => {
        // We fetch by default now to avoid blank screen

        const fetchCourses = async () => {
            setLoading(true);
            try {
                let params = new URLSearchParams();
                if (searchQuery) {
                    params.append('search', searchQuery);
                } else if (selectedSubSubCategory) {
                    params.append('sub_sub_category', selectedSubSubCategory.id);
                } else if (selectedSubCategory) {
                    params.append('sub_sub_category__sub_category', selectedSubCategory.id);
                } else if (selectedCategory) {
                    params.append('sub_sub_category__sub_category__category', selectedCategory.id);
                }

                const res = await apiClient.get(`${API_ENDPOINTS.LESSONS}?${params.toString()}`);
                const courseData = res.data.results || res.data || [];
                setCourses(courseData);
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchCourses, searchQuery ? 500 : 0);
        return () => clearTimeout(timeoutId);
    }, [view, selectedSubSubCategory, searchQuery]);

    // Navigation Handlers
    const handleCategoryClick = (cat) => {
        setSelectedCategory(cat);
        setView('subcategories');
        setSearchParams({ category: cat.slug });
    };

    const handleSubCategoryClick = (sub) => {
        setSelectedSubCategory(sub);
        setView('subsubcategories');
    };

    const handleSubSubCategoryClick = (subSub) => {
        setSelectedSubSubCategory(subSub);
        setView('lessons');
    };

    const resetToCategories = () => {
        setView('categories');
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setSelectedSubSubCategory(null);
        setSearchQuery('');
        setSearchParams({});
    };

    const backToSubCategories = () => {
        setView('subcategories');
        setSelectedSubCategory(null);
        setSelectedSubSubCategory(null);
    };

    const backToSubSubCategories = () => {
        setView('subsubcategories');
        setSelectedSubSubCategory(null);
    };

    const isInitial = view === 'categories' && !searchQuery;
    
    return (
        <div className={`courses-page ${isInitial ? 'initial-layout' : ''}`}>
            <Helmet>
                <title>
                    {selectedCategory
                        ? `${selectedCategory.display_name || selectedCategory.name} Kurslari — EduShare`
                        : "Bepul Kurslar — EduShare School | Dasturlash, Matematika, Fan"}
                </title>
                <meta
                    name="description"
                    content={selectedCategory
                        ? `EduShare platformasida ${selectedCategory.display_name || selectedCategory.name} bo'yicha bepul video kurslar va darslar. O'rganing va sertifikat oling!`
                        : "EduShare School bepul kurslar katalogi. Dasturlash, matematika, fan, sport, musiqa va tillar bo'yicha bepul video darslar. Hozir boshlang!"}
                />
                <meta name="keywords" content={`bepul kurslar, onlayn darslar, ${selectedCategory ? (selectedCategory.display_name || selectedCategory.name) + ',' : ''} dasturlash, matematika, EduShare kurslar`} />
                <link rel="canonical" href={`https://edushare.uz/courses${selectedCategory ? '?category=' + selectedCategory.slug : ''}`} />
            </Helmet>

            <section className="courses-exploration-section">
                {/* Left Side: Search & Filters */}
                <div className="search-side">
                    <motion.div
                        className="search-side-content"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="search-box">
                            <h1>INITIALIZE<br />SEARCH</h1>
                            <p className="search-meta">ACCESS HIGH-FIDELITY MODULES.</p>
                            <div className="input-wrapper-yt">
                                <FaSearch className="search-icon-inline" />
                                <input
                                    type="text"
                                    placeholder="INPUT QUERY..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="drill-down-navigation">
                            {/* Breadcrumbs */}
                            <div className="breadcrumbs-yt">
                                <span onClick={resetToCategories}>MODULES</span>
                                {selectedCategory && (
                                    <span onClick={() => setView('subcategories')}>
                                        / {selectedCategory.display_name || selectedCategory.name}
                                    </span>
                                )}
                                {selectedSubCategory && (
                                    <span onClick={() => setView('subsubcategories')}>
                                        / {selectedSubCategory.name}
                                    </span>
                                )}
                                {selectedSubSubCategory && (
                                    <span>/ {selectedSubSubCategory.name}</span>
                                )}
                            </div>

                            <div className="drill-down-content">
                                {view === 'categories' && (
                                    <div className="grid-selection-yt">
                                        <h3>SELECT CATEGORY</h3>
                                        <div className="filter-grid">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    className="category-btn-large"
                                                    onClick={() => handleCategoryClick(cat)}
                                                >
                                                    {cat.display_name || cat.name}
                                                    <span className="count-badge">{cat.lessons_count} MODULES</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {view === 'subcategories' && selectedCategory && (
                                    <div className="grid-selection-yt">
                                        <h3>SELECT SPECIALIZATION</h3>
                                        <div className="filter-grid">
                                            {selectedCategory.subcategories?.map(sub => (
                                                <button
                                                    key={sub.id}
                                                    className="category-btn-large"
                                                    onClick={() => handleSubCategoryClick(sub)}
                                                >
                                                    {sub.name}
                                                </button>
                                            ))}
                                        </div>
                                        <button className="btn-back-yt" onClick={resetToCategories}>BACK TO CATEGORIES</button>
                                    </div>
                                )}

                                {view === 'subsubcategories' && selectedSubCategory && (
                                    <div className="grid-selection-yt">
                                        <h3>SELECT TOPIC</h3>
                                        <div className="filter-grid">
                                            {selectedSubCategory.sub_subcategories?.map(subSub => (
                                                <button
                                                    key={subSub.id}
                                                    className="category-btn-large"
                                                    onClick={() => handleSubSubCategoryClick(subSub)}
                                                >
                                                    {subSub.name}
                                                </button>
                                            ))}
                                        </div>
                                        <button className="btn-back-yt" onClick={backToSubCategories}>BACK TO SPECIALIZATIONS</button>
                                    </div>
                                )}

                                {view === 'lessons' && (
                                    <div className="lessons-header-yt">
                                        <h3>{selectedSubSubCategory?.name} MODULES</h3>
                                        <button className="btn-back-yt" onClick={backToSubSubCategories}>CHANGE TOPIC</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Results */}
                <div className="results-side">
                    <div className="results-container">
                        {loading ? (
                            <div className="loading-state-yt">
                                <div className="loader-line"></div>
                                <h3>SYNCHRONIZING...</h3>
                            </div>
                        ) : searchQuery || view === 'lessons' ? (
                            courses.length > 0 ? (
                                <div className="courses-vertical-list">
                                    {courses.map((course, i) => (
                                        <motion.div
                                            key={course.id}
                                            className="course-card-yt"
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            <div className="course-image-yt">
                                                <img
                                                    src={course.thumbnail_url || `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=600&h=400&fit=crop&q=60`}
                                                    alt={course.title}
                                                    loading="lazy"
                                                    width="600"
                                                    height="400"
                                                />
                                                <div className="category-tag-yt">{course.sub_sub_category?.name || 'GENERAL'}</div>
                                            </div>
                                            <div className="course-info-yt">
                                                <h3>{course.title}</h3>
                                                <Link to={`/courses/${course.id}`} className="btn-load-yt">
                                                    LOAD MODULE <FaFilter />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-results"><h3>NO MODULES FOUND.</h3></div>
                            )
                        ) : (
                            <div className="awaiting-selection-yt">
                                <div className="selection-visual">
                                    <div className="circle-pulsate"></div>
                                </div>
                                <h3>FEATURED<br />MODULES</h3>
                                <p>BROWSE OUR HIGH-FIDELITY LEARNING HIERARCHY.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CoursesPage;