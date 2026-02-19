import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient, { API_ENDPOINTS } from '../../config/api';
import './AIChatBot.css';

const REFUSAL_MESSAGE = '📚 Kechirasiz, men faqat ta\'lim fanlari (matematika, fizika, kimyo, tarix, ingliz tili va h.k.) bo\'yicha nazariy savollarga javob beraman. Kod yozish yoki texnik loyihalar bilan yordam bera olmayman. Iltimos, fan bo\'yicha savol bering!';

// Client-side filter: block non-educational topics BEFORE sending to API
const BLOCKED_KEYWORDS = [
    // Programming & code
    'kod', 'code', 'script', 'program', 'dastur', 'bot', 'api', 'server',
    'frontend', 'backend', 'database', 'deploy', 'github', 'terminal',
    'function', 'class', 'import', 'install', 'npm', 'pip', 'framework',
    'react', 'django', 'flask', 'node', 'web sayt', 'websayt', 'website',
    'ilova', 'app', 'mobile', 'android', 'ios', 'telegram', 'discord',
    'hack', 'crack', 'virus',
    // Entertainment
    'film', 'kino', 'serial', 'anime', 'manga', 'o\'yin', 'game', 'gta',
    'minecraft', 'fortnite', 'pubg', 'musiqa', 'qo\'shiq', 'music', 'song',
    'futbol', 'sport', 'basketbol', 'chess',
    // Non-educational
    'ob-havo', 'weather', 'retsept', 'recipe', 'taom', 'ovqat', 'pishir',
    'siyosat', 'politic', 'din', 'religio', 'bitcoin', 'crypto', 'valyuta',
    'pul ishlash', 'million', 'boylik', 'sevgi', 'love', 'qiz', 'yigit',
    'sog\'liq', 'health', 'doctor', 'dori', 'kasallik',
];

const EDUCATION_KEYWORDS = [
    // Math
    'matematika', 'math', 'algebra', 'geometriya', 'formula', 'tenglama',
    'hisobla', 'son', 'kasrlar', 'foiz', 'kvadrat', 'uchburchak', 'doira',
    'logarifm', 'integral', 'differensial', 'vektor', 'matritsa', 'statistika',
    // Physics
    'fizika', 'physics', 'nyuton', 'tezlik', 'tezlanish', 'kuch', 'energiya',
    'elektr', 'magnit', 'yorug\'lik', 'to\'lqin', 'atom', 'yadro', 'gravitatsiya',
    // Chemistry
    'kimyo', 'chemistry', 'element', 'molekula', 'reaksiya', 'kislota', 'asos',
    'davriy jadval', 'oksid', 'tuz', 'ion', 'valentlik',
    // Biology
    'biologiya', 'biology', 'hujayra', 'gen', 'dnk', 'evolyutsiya', 'fotosintez',
    'organ', 'organizm', 'ekologiya', 'hayvon', 'o\'simlik',
    // History
    'tarix', 'history', 'urush', 'davlat', 'imperiya', 'mustaqillik', 'amir temur',
    'jadidlar', 'sovet', 'inqilob',
    // Geography
    'geografiya', 'geography', 'davlat', 'poytaxt', 'iqlim', 'materik',
    'okean', 'daryo', 'tog\'', 'cho\'l',
    // Languages
    'ingliz tili', 'english', 'grammar', 'grammatika', 'so\'z', 'tarjima',
    'translate', 'gap', 'fe\'l', 'sifat', 'ot', 'ravish', 'tense',
    // Literature
    'adabiyot', 'literature', 'she\'r', 'roman', 'hikoya', 'navoiy', 'bobur',
    // EduShare platform
    'edushare', 'kurs', 'dars', 'sertifikat', 'test', 'imtihon', 'modul',
    'o\'qish', 'o\'rganish', 'ta\'lim', 'fan', 'maktab', 'universitet',
];

function isEducationRelated(text) {
    const lower = text.toLowerCase();

    // Check if it contains any education keyword
    const hasEducation = EDUCATION_KEYWORDS.some(kw => lower.includes(kw));
    if (hasEducation) return true;

    // Check if it contains any blocked keyword
    const hasBlocked = BLOCKED_KEYWORDS.some(kw => lower.includes(kw));
    if (hasBlocked) return false;

    // If the message is very short (greeting/salom), allow it
    if (lower.length < 15) return true;

    // Default: block unknown topics
    return false;
}

const AIChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '👋 Salom! Men EduShare AI yordamchisiman. Sizga qanday yordam bera olaman?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const chatBodyRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const typeMessage = useCallback((fullText, msgIndex) => {
        return new Promise((resolve) => {
            let i = 0;
            setIsTyping(true);
            const interval = setInterval(() => {
                i++;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[msgIndex] = {
                        ...updated[msgIndex],
                        content: fullText.slice(0, i),
                    };
                    return updated;
                });
                if (i >= fullText.length) {
                    clearInterval(interval);
                    setIsTyping(false);
                    resolve();
                }
            }, 15);
        });
    }, []);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage = { role: 'user', content: trimmed };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');

        // 🛡️ Client-side filter: block non-educational questions BEFORE API call
        if (!isEducationRelated(trimmed)) {
            const placeholderIndex = updatedMessages.length;
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            await typeMessage(REFUSAL_MESSAGE, placeholderIndex);
            return;
        }

        setIsLoading(true);

        try {
            const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

            const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, {
                messages: apiMessages,
            });

            if (response.data?.status === 'success' && response.data?.content) {
                const aiContent = response.data.content;
                // Add placeholder message
                const placeholderIndex = updatedMessages.length;
                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                setIsLoading(false);
                // Animate typing
                await typeMessage(aiContent, placeholderIndex);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ Kechirasiz, javob olishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
                }]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Tarmoq xatoligi. Iltimos, qayta urinib ko\'ring.'
            }]);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: '👋 Salom! Men EduShare AI yordamchisiman. Sizga qanday yordam bera olaman?'
            }
        ]);
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                className="ai-chat-toggle"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={isOpen ? { rotate: 0 } : { rotate: 0 }}
                aria-label="AI Chat Toggle"
                id="ai-chat-toggle-btn"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.svg
                            key="close"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                            width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </motion.svg>
                    ) : (
                        <motion.svg
                            key="chat"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                            width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                        >
                            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.26 2.94 5.7L4 22l4.73-2.84C9.77 19.7 10.86 20 12 20c5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                            <circle cx="8" cy="10" r="1" fill="currentColor" />
                            <circle cx="12" cy="10" r="1" fill="currentColor" />
                            <circle cx="16" cy="10" r="1" fill="currentColor" />
                        </motion.svg>
                    )}
                </AnimatePresence>

                {/* Pulse ring when closed */}
                {!isOpen && (
                    <span className="ai-chat-pulse" />
                )}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="ai-chat-window"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        id="ai-chat-window"
                    >
                        {/* Header */}
                        <div className="ai-chat-header">
                            <div className="ai-chat-header-left">
                                <div className="ai-chat-avatar">
                                    <div className="ai-avatar-glow" />
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                        <path d="M2 17l10 5 10-5" />
                                        <path d="M2 12l10 5 10-5" />
                                    </svg>
                                </div>
                                <div className="ai-chat-header-info">
                                    <span className="ai-chat-title">EDUSHARE AI</span>
                                    <span className="ai-chat-status">
                                        <span className="status-dot" />
                                        ONLINE
                                    </span>
                                </div>
                            </div>
                            <div className="ai-chat-header-actions">
                                <button
                                    className="ai-chat-action-btn"
                                    onClick={clearChat}
                                    title="Yangi suhbat"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="1 4 1 10 7 10" />
                                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                    </svg>
                                </button>
                                <button
                                    className="ai-chat-action-btn"
                                    onClick={() => setIsOpen(false)}
                                    title="Yopish"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="ai-chat-body" ref={chatBodyRef}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    className={`ai-chat-message ${msg.role}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.05 }}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="ai-msg-avatar">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                <path d="M2 17l10 5 10-5" />
                                                <path d="M2 12l10 5 10-5" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="ai-msg-bubble">
                                        <p>{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <motion.div
                                    className="ai-chat-message assistant"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="ai-msg-avatar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                            <path d="M2 17l10 5 10-5" />
                                            <path d="M2 12l10 5 10-5" />
                                        </svg>
                                    </div>
                                    <div className="ai-msg-bubble">
                                        <div className="ai-typing-indicator">
                                            <span /><span /><span />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="ai-chat-footer">
                            <div className="ai-chat-input-wrapper">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Savolingizni yozing..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading || isTyping}
                                    className="ai-chat-input"
                                    id="ai-chat-input"
                                />
                                <button
                                    className={`ai-chat-send ${(input.trim() && !isLoading && !isTyping) ? 'active' : ''}`}
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading || isTyping}
                                    id="ai-chat-send-btn"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                </button>
                            </div>
                            <span className="ai-chat-powered">
                                POWERED BY GPT · EDUSHARE AI
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIChatBot;