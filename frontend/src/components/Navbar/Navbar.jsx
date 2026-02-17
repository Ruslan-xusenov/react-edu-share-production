import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaUser, FaSignOutAlt, FaBookReader, FaChalkboardTeacher, FaBars, FaTimes
} from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './Navbar.css';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
        setShowDropdown(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setIsLoggedIn(!!token);
        if (token) {
            apiClient.get(API_ENDPOINTS.PROFILE)
                .then(res => {
                    if (res.data.status === 'success') {
                        setUser(res.data.user);
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                    }
                })
                .catch(() => { });
        }
    }, []);

    const handleLogout = async () => {
        try {
            await apiClient.post(API_ENDPOINTS.LOGOUT);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setIsLoggedIn(false);
            setUser(null);
            setShowDropdown(false);
            setIsMobileOpen(false);
            navigate('/');
        }
    };

    const navLinks = [
        { to: '/', label: 'HOME' },
        { to: '/courses', label: 'MODULES' },
        { to: '/leaderboard', label: 'RANKINGS' },
        { to: '/about', label: 'ABOUT' },
    ];

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <Link to="/" className="navbar-logo">
                EDUSHARE AI
            </Link>

            <div className={`navbar-nav ${isMobileOpen ? 'mobile-open' : ''}`}>
                {navLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="nav-link"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>

            <div className="navbar-right">
                {isLoggedIn ? (
                    <>
                        {user?.is_staff && (
                            <Link to="/create-lesson" className="nav-create-btn">
                                CREATE MODULE
                            </Link>
                        )}

                        <div className="user-menu-wrapper">
                            <button
                                className="user-menu-btn"
                                onClick={() => setShowDropdown(!showDropdown)}
                            >
                                <img
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.full_name || 'U'}&background=000&color=fff&size=64`}
                                    alt={user?.full_name}
                                    className="user-avatar"
                                />
                                <span className="user-name">{user?.full_name?.split(' ')[0] || 'PROFILE'}</span>
                            </button>

                            <AnimatePresence>
                                {showDropdown && (
                                    <motion.div
                                        className="dropdown-menu"
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    >
                                        <div className="dropdown-header">
                                            <img
                                                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.full_name || 'U'}&background=000&color=fff&size=64`}
                                                alt={user?.full_name}
                                            />
                                            <div>
                                                <strong>{user?.full_name}</strong>
                                                <span>{user?.email}</span>
                                            </div>
                                        </div>
                                        <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                                            <FaUser /> SYSTEM PROFILE
                                        </Link>
                                        <Link to="/my-learning" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                                            <FaBookReader /> ACTIVE MODULES
                                        </Link>
                                        <button className="dropdown-item logout" onClick={handleLogout}>
                                            <FaSignOutAlt /> TERMINATE SESSION
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="auth-buttons">
                        <Link to="/login" className="btn-nav-login">LOGIN</Link>
                        <Link to="/signup" className="btn-nav-signup" style={{ border: '1px solid #fff', padding: '0.5rem 1rem' }}>INITIALIZE</Link>
                    </div>
                )}

                {/* Hamburger Button */}
                <button
                    className="hamburger-btn"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label="Toggle navigation"
                >
                    {isMobileOpen ? <FaTimes /> : <FaBars />}
                </button>
            </div>
        </nav>
    );
};

export default Navbar;