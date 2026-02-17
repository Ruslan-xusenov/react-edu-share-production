import axios from 'axios';

// API Base URL - Django backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Helper to get cookie by name
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

// Request interceptor - add auth token and CSRF token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        // Only attach token if it's not the placeholder 'session-active'
        if (token && token !== 'session-active') {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for Session Authentication
        const csrfToken = getCookie('csrftoken');
        if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
        }

        // When sending FormData (file uploads), let axios set Content-Type
        // automatically to multipart/form-data with the correct boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const path = window.location.pathname;
        // Pages that should be publicly accessible without redirect
        const publicPaths = ['/login', '/signup', '/courses', '/', '/about', '/leaderboard'];
        const isPublicPage = publicPaths.some(p => path === p || path.startsWith('/courses/'));

        if (error.response?.status === 401 && !isPublicPage) {
            // Redirect to login if unauthorized on protected pages
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
    // Auth
    LOGIN: '/accounts/login/',
    SIGNUP: '/accounts/signup/',
    LOGOUT: '/accounts/logout/',
    PROFILE: '/accounts/profile/',
    PROFILE_UPDATE: '/accounts/update/',
    CHANGE_PASSWORD: '/accounts/change-password/',
    LEADERBOARD: '/accounts/leaderboard/',

    // Categories
    CATEGORIES: '/categories/',
    SUBCATEGORIES: '/subcategories/',

    // Courses (mapped to Lessons in backend)
    COURSES: '/lessons/',
    COURSE_DETAIL: (id) => `/lessons/${id}/`,
    COURSE_ENROLL: (id) => `/lessons/${id}/enroll/`,

    // Lessons
    LESSONS: '/lessons/',
    LESSON_DETAIL: (id) => `/lessons/${id}/`,
    LESSON_ENROLLED: '/lessons/enrolled/',
    LESSON_SAVED: '/lessons/saved/',
    LESSON_COMPLETE: (id) => `/lessons/${id}/complete/`,
    LESSON_UPDATE_PROGRESS: (id) => `/lessons/${id}/update_progress/`,
    LESSON_COMMENTS: (id) => `/lessons/${id}/comments/`,
    LESSON_ADD_COMMENT: (id) => `/lessons/${id}/add_comment/`,
    LESSON_LIKE: (id) => `/lessons/${id}/like/`,
    LESSON_SAVE: (id) => `/lessons/${id}/save_lesson/`,

    // Assignments
    ASSIGNMENTS: '/assignments/',
    ASSIGNMENT_SUBMIT: (id) => `/assignments/${id}/submit/`,

    // Reviews & Comments
    REVIEWS: '/reviews/',
    COMMENTS: '/comments/',
    COMMENT_LIKE: (id) => `/comments/${id}/like/`,
    COMMENT_DISLIKE: (id) => `/comments/${id}/dislike/`,

    // Leaderboard
    // Removed duplicate LEADERBOARD entry to consolidate above

    // Certificates
    CERTIFICATES: '/certificates/',
    CERTIFICATE_DETAIL: (id) => `/certificates/${id}/`,
    CERTIFICATE_DOWNLOAD: (id) => `/certificates/${id}/download/`,

    // Stats
    STATS: '/stats/',

    // Quiz
    QUIZ_QUESTIONS: '/quiz-questions/',
    LESSON_QUIZ: (id) => `/lessons/${id}/quiz/`,
    LESSON_QUIZ_SUBMIT: (id) => `/lessons/${id}/submit_quiz/`,
};
