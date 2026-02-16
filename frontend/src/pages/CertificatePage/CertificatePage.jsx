import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCertificate, FaDownload, FaPrint, FaArrowLeft, FaCheckCircle, FaUserGraduate, FaAward } from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './CertificatePage.css';

const CertificatePage = () => {
    const { id } = useParams();
    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCertificate = async () => {
            try {
                const res = await apiClient.get(API_ENDPOINTS.CERTIFICATE_DETAIL(id));
                setCertificate(res.data);
            } catch (err) {
                console.error("Error fetching certificate:", err);
                setError("Sertifikat topilmadi yoki yuklashda xatolik yuz berdi.");
            } finally {
                setLoading(false);
            }
        };

        fetchCertificate();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="certificate-page-container">
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem' }}>Sertifikat tayyorlanmoqda...</p>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="certificate-page-container">
                <FaCertificate style={{ fontSize: '3rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
                <h2>Xatolik!</h2>
                <p>{error || "Ma'lumot topilmadi."}</p>
                <Link to="/profile" className="btn btn-primary" style={{ marginTop: '2rem' }}>Profilga qaytish</Link>
            </div>
        );
    }

    return (
        <div className="certificate-page-container">
            <div className="cert-actions no-print">
                <Link to="/profile" className="back-link">
                    <FaArrowLeft /> Profilga qaytish
                </Link>
                <div className="action-buttons">
                    <button onClick={handlePrint} className="btn btn-primary">
                        <FaPrint /> Chop etish / PDF saqlash
                    </button>
                </div>
            </div>

            <div className="certificate-paper" id="certificate">
                <div className="cert-border">
                    <div className="cert-inner-border">
                        <div className="cert-header">
                            <div className="cert-logo">
                                <FaAward className="award-icon" />
                                <span>EDUSHARE</span>
                            </div>
                            <div className="cert-id">Sertifikat ID: {certificate.certificate_id}</div>
                        </div>

                        <div className="cert-content">
                            <h1 className="cert-title">MUVAFFARIYAT SERTIFIKATI</h1>
                            <p className="cert-intro">Ushbu sertifikat bilan taqdirlanadi:</p>

                            <h2 className="recipient-name">{certificate.student_name || "Talaba"}</h2>

                            <p className="cert-description">
                                <strong>"{certificate.lesson_title}"</strong> onlayn kursini
                                muvaffaqiyatli yakunlagani uchun taqdirlanadi.
                            </p>

                            <div className="cert-category-path">
                                {certificate.category_name} &rarr; {certificate.subcategory_name}
                            </div>

                            <div className="cert-details">
                                <div className="detail-item">
                                    <span className="label">Berilgan sana:</span>
                                    <span className="value">{new Date(certificate.issued_at).toLocaleDateString('uz-UZ')}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">O'quv platformasi:</span>
                                    <span className="value">EduShare Online Learning</span>
                                </div>
                            </div>

                            <div className="cert-footer">
                                <div className="signature">
                                    <div className="sig-line"></div>
                                    <p>EduShare Admin</p>
                                </div>
                                <div className="cert-stamp">
                                    <FaCheckCircle />
                                    <span>VERIFIED</span>
                                </div>
                                <div className="signature">
                                    <div className="sig-line"></div>
                                    <p>Kurs Muallifi</p>
                                    <p className="author-sub">{certificate.author_name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cert-footer-info no-print">
                <p>EduShare sertifikati rasmiy bilim darajasini tasdiqlaydi.</p>
            </div>
        </div>
    );
};

export default CertificatePage;
