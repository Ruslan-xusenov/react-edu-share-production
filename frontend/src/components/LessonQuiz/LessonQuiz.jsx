import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaQuestionCircle, FaCheckCircle, FaTimesCircle, FaArrowRight, FaTrophy, FaRedo, FaSpinner, FaCertificate } from 'react-icons/fa';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './LessonQuiz.css';

const LessonQuiz = ({ lessonId, onPassed, quizPassed }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [currentStep, setCurrentStep] = useState(quizPassed ? 'already_passed' : 'intro');
    const [userAnswers, setUserAnswers] = useState({}); // {questionId: 'A'}
    const [quizResult, setQuizResult] = useState(null);
    const quizRef = useRef(null);

    // Scroll to quiz container when step changes
    useEffect(() => {
        if (quizRef.current) {
            setTimeout(() => {
                quizRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [currentStep]);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(API_ENDPOINTS.LESSON_QUIZ(lessonId));
                // API returns {questions: [...], quiz_passed: bool, test_file_url: ...}
                const data = res.data;
                setQuestions(data.questions || data.results || (Array.isArray(data) ? data : []));
                setLoading(false);
            } catch (err) {
                console.error('Quiz fetch error:', err);
                setError(err.response?.data?.message || 'Test savollarini yuklashda xatolik yuz berdi.');
                setLoading(false);
            }
        };

        if (lessonId) {
            fetchQuiz();
        }
    }, [lessonId]);

    const handleAnswerSelect = (questionId, option) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: option
        }));
    };

    const handleSubmit = async () => {
        // Check if all questions are answered
        if (Object.keys(userAnswers).length < questions.length) {
            alert('Iltimos, barcha savollarga javob bering.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiClient.post(API_ENDPOINTS.LESSON_QUIZ_SUBMIT(lessonId), {
                answers: userAnswers
            });

            setQuizResult(res.data);
            setCurrentStep('result');

            if (res.data.passed) {
                if (onPassed) onPassed();
            }
        } catch (err) {
            console.error('Quiz submit error:', err);
            const msg = err.response?.data?.message || 'Natijani yuborishda xatolik yuz berdi.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const resetQuiz = () => {
        setUserAnswers({});
        setQuizResult(null);
        setCurrentStep('quiz');
        setError(null);
    };

    if (loading) {
        return (
            <div className="quiz-loading">
                <FaSpinner className="spin" />
                <p>Test yuklanmoqda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="quiz-error-msg">
                {error}
                <button className="btn-retry" onClick={resetQuiz} style={{ marginTop: '1rem' }}>
                    <FaRedo /> Qayta urinish
                </button>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="quiz-empty">
                <FaQuestionCircle className="quiz-empty-icon" />
                <p>Bu darsda hali test savollari mavjud emas.</p>
            </div>
        );
    }

    return (
        <div className="lesson-quiz-container" ref={quizRef}>
            <AnimatePresence mode="wait">
                {/* Already Passed State */}
                {currentStep === 'already_passed' && (
                    <motion.div
                        key="already_passed"
                        className="quiz-result passed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="result-icon">
                            <FaCertificate />
                        </div>
                        <h2>Test topshirilgan! 🎓</h2>
                        <p className="result-msg">
                            Siz bu dars testini muvaffaqiyatli topshirgansiz va sertifikat oldingiz. Tabriklaymiz!
                        </p>
                        <div className="award-bonus">
                            <FaCheckCircle /> Sertifikat berilgan
                        </div>
                    </motion.div>
                )}

                {/* Intro State */}
                {currentStep === 'intro' && (
                    <motion.div
                        key="intro"
                        className="quiz-intro"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="quiz-icon-big"><FaQuestionCircle /></div>
                        <h2>Bilimingizni sinab ko'ring!</h2>
                        <p>Darsni to'liq o'zlashtirganingizni tekshirish uchun ushbu testni topshiring. Sertifikat olish uchun <strong>barcha savollarga to'g'ri</strong> javob berishingiz kerak.</p>
                        <div className="quiz-stats-mini">
                            <span>Savollar soni: <strong>{questions.length} ta</strong></span>
                            <span>Kerakli natija: <strong>100%</strong></span>
                        </div>
                        <div className="quiz-warning">
                            ⚠️ Diqqat: Bitta noto'g'ri javob ham bersa, sertifikat berilmaydi!
                        </div>
                        <button className="btn-start-quiz" onClick={() => setCurrentStep('quiz')}>
                            Testni boshlash <FaArrowRight />
                        </button>
                    </motion.div>
                )}

                {/* Active Quiz State */}
                {currentStep === 'quiz' && (
                    <motion.div
                        key="quiz"
                        className="quiz-active"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="quiz-header-mini">
                            <h3>📝 Dars yuzasidan test</h3>
                            <div className="progress-text">{Object.keys(userAnswers).length} / {questions.length}</div>
                        </div>

                        <div className="questions-scroll">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="quiz-question-card">
                                    <div className="q-text">
                                        <span className="q-num">{idx + 1}.</span> {q.question_text}
                                    </div>
                                    <div className="options-list">
                                        {['A', 'B', 'C', 'D'].map(opt => {
                                            const optKey = `option_${opt.toLowerCase()}`;
                                            const optVal = q[optKey];
                                            if (!optVal) return null;

                                            return (
                                                <button
                                                    key={opt}
                                                    className={`option-btn ${userAnswers[q.id] === opt ? 'selected' : ''}`}
                                                    onClick={() => handleAnswerSelect(q.id, opt)}
                                                >
                                                    <span className="opt-letter">{opt}</span>
                                                    <span className="opt-val">{optVal}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="quiz-footer">
                            <button
                                className="btn-submit-quiz"
                                onClick={handleSubmit}
                                disabled={submitting || Object.keys(userAnswers).length < questions.length}
                            >
                                {submitting ? <FaSpinner className="spin" /> : 'Natijani tekshirish'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Result State */}
                {currentStep === 'result' && quizResult && (
                    <motion.div
                        key="result"
                        className={`quiz-result ${quizResult.passed ? 'passed' : 'failed'}`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        <div className="result-icon">
                            {quizResult.passed ? <FaTrophy /> : <FaTimesCircle />}
                        </div>
                        <h2>{quizResult.passed ? 'Tabriklaymiz! 🎉' : 'Afsus...'}</h2>
                        <p className="result-score">
                            Natija: <strong>{quizResult.score} / {quizResult.total_questions || quizResult.total}</strong>
                        </p>
                        <p className="result-msg">{quizResult.message}</p>

                        {quizResult.passed ? (
                            <div className="award-bonus">
                                <FaCheckCircle /> Sertifikat berildi va 40 bonus ball qo'shildi!
                            </div>
                        ) : (
                            <div className="failed-result-actions">
                                <p className="failed-hint">
                                    Sertifikat olish uchun barcha {quizResult.total_questions || quizResult.total} ta savolga to'g'ri javob berishingiz kerak.
                                </p>
                                <button className="btn-retry" onClick={resetQuiz}>
                                    <FaRedo /> Qayta urinish
                                </button>
                            </div>
                        )}

                        {quizResult.passed && (
                            <p className="success-footer">Siz kursni muvaffaqiyatli yakunladingiz! 🏆</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LessonQuiz;
