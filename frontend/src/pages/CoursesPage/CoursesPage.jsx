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
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.CATEGORIES);
                // Handle different response formats
                const cats = res.data.results || res.data || [];
                setCategories(cats);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                let params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (selectedCategory !== 'all') params.append('category__slug', selectedCategory);

                const res = await apiClient.get(`${API_ENDPOINTS.LESSONS}?${params.toString()}`);
                const courseData = res.data.results || res.data || [];
                setCourses(courseData);
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        };
        const timeoutId = setTimeout(fetchCourses, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCategory]);

    return (
        <div className="courses-page">
            <Helmet>
                <title>MODULES — EDUSHARE ENGINE</title>
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

                        <div className="categories-filter">
                            <h3>MODULE TYPE</h3>
                            <div className="filter-grid">
                                <button
                                    className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory('all')}
                                >
                                    ALL MODULES
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id || cat.slug}
                                        className={`category-btn ${selectedCategory === cat.slug ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(cat.slug)}
                                    >
                                        {cat.display_name || cat.name}
                                    </button>
                                ))}
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
                        ) : courses.length > 0 ? (
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
                                            <img src={course.thumbnail_url || `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800`} alt={course.title} />
                                            <div className="category-tag-yt">{course.category?.display_name || 'GENERAL'}</div>
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
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CoursesPage;