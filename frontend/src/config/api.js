import axios from 'axios';

// Production'da domen nomini aniqlash
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const DOMAIN = isProduction ? 'https://edushare.uz' : 'http://localhost:8000';

// API Base URL
const API_BASE_URL = '/api';
export const BACKEND_URL = DOMAIN;

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,   // 30s — upload requests use separate config
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Helper to get cookie
const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token && token !== 'session-active') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const csrfToken = getCookie('edu_csrf');
        if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const path = window.location.pathname;
        const publicPaths = ['/login', '/signup', '/courses', '/', '/about', '/leaderboard', '/community/books', '/community/news', '/community/events'];
        const isPublicPage = publicPaths.some(p => path === p || path.startsWith('/courses/') || path.startsWith('/community/'));

        if (error.response?.status === 401 && !isPublicPage) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;

// API Endpoints
export const API_ENDPOINTS = {
    LOGIN: '/accounts/login/',
    SIGNUP: '/accounts/signup/',
    LOGOUT: '/accounts/logout/',
    PROFILE: '/accounts/profile/',
    PROFILE_UPDATE: '/accounts/update/',
    CHANGE_PASSWORD: '/accounts/change-password/',
    LEADERBOARD: '/accounts/leaderboard/',
    CATEGORIES: '/categories/',
    SUBCATEGORIES: '/subcategories/',
    SUBSUBCATEGORIES: '/sub-sub-categories/',
    // Lessons (canonical)
    LESSONS: '/lessons/',
    LESSON_DETAIL: (id) => `/lessons/${id}/`,
    LESSON_ENROLLED: '/lessons/enrolled/',
    LESSON_SAVED: '/lessons/saved/',
    LESSON_UPDATE_PROGRESS: (id) => `/lessons/${id}/update_progress/`,
    LESSON_COMMENTS: (id) => `/lessons/${id}/comments/`,
    LESSON_ADD_COMMENT: (id) => `/lessons/${id}/add_comment/`,
    LESSON_LIKE: (id) => `/lessons/${id}/like/`,
    LESSON_SAVE: (id) => `/lessons/${id}/save_lesson/`,
    LESSON_ENROLL: (id) => `/lessons/${id}/enroll/`,
    ASSIGNMENTS: '/assignments/',
    ASSIGNMENT_SUBMIT: (id) => `/assignments/${id}/submit/`,
    REVIEWS: '/reviews/',
    COMMENTS: '/comments/',
    COMMENT_LIKE: (id) => `/comments/${id}/like/`,
    COMMENT_DISLIKE: (id) => `/comments/${id}/dislike/`,
    CERTIFICATES: '/certificates/',
    CERTIFICATE_DETAIL: (id) => `/certificates/${id}/`,
    CERTIFICATE_DOWNLOAD: (id) => `/certificates/${id}/download/`,
    STATS: '/stats/',
    QUIZ_QUESTIONS: '/quiz-questions/',
    LESSON_QUIZ: (id) => `/lessons/${id}/quiz/`,
    LESSON_QUIZ_SUBMIT: (id) => `/lessons/${id}/submit_quiz/`,
    AI_CHAT: '/ai-chat/',
    TEAM: '/team/',
    // Community
    COMMUNITY_BOOKS: '/community/book-reviews/',
    COMMUNITY_ARTICLES: '/community/articles/',
    COMMUNITY_EVENTS: '/community/announcements/',
    ARTICLE_DETAIL: (slug) => `/community/articles/${slug}/`,
    ARTICLE_VIEW: (slug) => `/community/articles/${slug}/increment_views/`,
    // ── Email OTP parol almashtirish ──────────────────────────
    REQUEST_PASSWORD_CHANGE: '/accounts/request-password-change/',
    VERIFY_PASSWORD_OTP: '/accounts/verify-password-otp/',
    RESEND_PASSWORD_OTP: '/accounts/resend-password-otp/',
};