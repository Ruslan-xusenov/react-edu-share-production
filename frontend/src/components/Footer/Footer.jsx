import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FaGraduationCap, FaFacebook, FaInstagram, FaYoutube,
    FaHeart, FaGithub, FaTelegram, FaEnvelope,
    FaMapMarkerAlt, FaStar
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
    };

    return (
        <footer className="footer">
            <div className="footer-glow"></div>
            <motion.div
                className="container"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
            >
                <div className="footer-content">
                    {/* Brand Section */}
                    <motion.div className="footer-brand-section" variants={itemVariants}>
                        <Link to="/" className="footer-brand">
                            <div className="footer-logo-icon">
                                <FaGraduationCap />
                            </div>
                            <div>
                                <span className="footer-logo-name">EduShare</span>
                                <span className="footer-logo-sub">School</span>
                            </div>
                        </Link>
                        <p className="footer-description">
                            O'quvchilar bir-birlariga o'rgatadigan va o'rganadigan
                            inqilobiy ta'lim platformasi. Bilim ulashish — kelajak yaratish!
                        </p>
                        <div className="footer-socials">
                            <a href="https://t.me/edushare" className="social-link" aria-label="Telegram" target="_blank" rel="noopener noreferrer">
                                <FaTelegram />
                            </a>
                            <a href="#" className="social-link" aria-label="Instagram">
                                <FaInstagram />
                            </a>
                            <a href="#" className="social-link" aria-label="YouTube">
                                <FaYoutube />
                            </a>
                            <a href="#" className="social-link" aria-label="Facebook">
                                <FaFacebook />
                            </a>
                            <a href="#" className="social-link" aria-label="GitHub">
                                <FaGithub />
                            </a>
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div className="footer-links-section" variants={itemVariants}>
                        <h4 className="footer-heading">Tezkor Havolalar</h4>
                        <ul className="footer-links">
                            <li><Link to="/">Bosh Sahifa</Link></li>
                            <li><Link to="/courses">Kurslar</Link></li>
                            <li><Link to="/leaderboard">Reyting</Link></li>
                            <li><Link to="/about">Biz Haqimizda</Link></li>
                            <li><Link to="/create-lesson">Dars Yaratish</Link></li>
                        </ul>
                    </motion.div>

                    {/* Categories */}
                    <motion.div className="footer-links-section" variants={itemVariants}>
                        <h4 className="footer-heading">Kategoriyalar</h4>
                        <ul className="footer-links">
                            <li><Link to="/courses?category=programming">Dasturlash</Link></li>
                            <li><Link to="/courses?category=math">Matematika</Link></li>
                            <li><Link to="/courses?category=science">Fan</Link></li>
                            <li><Link to="/courses?category=languages">Tillar</Link></li>
                        </ul>
                    </motion.div>

                    {/* Contact */}
                    <motion.div className="footer-links-section" variants={itemVariants}>
                        <h4 className="footer-heading">Bog'lanish</h4>
                        <ul className="footer-contact">
                            <li>
                                <FaEnvelope className="contact-icon" />
                                <span>support@edushare.uz</span>
                            </li>
                            <li>
                                <FaTelegram className="contact-icon" />
                                <span>@edushare_support</span>
                            </li>
                            <li>
                                <FaMapMarkerAlt className="contact-icon" />
                                <span>O'zbekiston</span>
                            </li>
                        </ul>
                    </motion.div>
                </div>

                {/* Bottom */}
                <motion.div className="footer-bottom" variants={itemVariants}>
                    <p>
                        © {currentYear} EduShare School. Barcha huquqlar himoyalangan.
                    </p>
                    <p className="footer-credit">
                        <FaHeart className="heart-icon" /> bilan <strong>Ruslan Xusenov</strong> tomonidan yaratilgan
                    </p>
                </motion.div>
            </motion.div>
        </footer>
    );
};

export default Footer;