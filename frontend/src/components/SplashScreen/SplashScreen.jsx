import { useState, useEffect, useMemo } from 'react';
import { FaAtom } from 'react-icons/fa';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
    const [fadeOut, setFadeOut] = useState(false);
    const [removed, setRemoved] = useState(false);

    // Generate particles once
    const particles = useMemo(() => {
        return Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            size: `${1 + Math.random() * 3}px`,
            duration: `${2 + Math.random() * 3}s`,
            delay: `${Math.random() * 2}s`,
            opacity: 0.3 + Math.random() * 0.7,
        }));
    }, []);

    useEffect(() => {
        // Start fade out at 4 seconds
        const fadeTimer = setTimeout(() => {
            setFadeOut(true);
        }, 4000);

        // Remove from DOM at 5 seconds
        const removeTimer = setTimeout(() => {
            setRemoved(true);
            if (onComplete) onComplete();
        }, 5000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, [onComplete]);

    if (removed) return null;

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            {/* Cosmic Background */}
            <div className="splash-cosmos">
                <div className="splash-grid" />
                <div className="splash-orb splash-orb-1" />
                <div className="splash-orb splash-orb-2" />
                <div className="splash-orb splash-orb-3" />

                {/* Particles */}
                <div className="splash-particles">
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="particle"
                            style={{
                                left: p.left,
                                width: p.size,
                                height: p.size,
                                animationDuration: p.duration,
                                animationDelay: p.delay,
                                opacity: p.opacity,
                            }}
                        />
                    ))}
                </div>

                {/* Scan Line */}
                <div className="splash-scanline" />
            </div>

            {/* Center Content */}
            <div className="splash-content">
                {/* Animated Logo Ring */}
                <div className="splash-logo-ring">
                    <div className="splash-ring-outer" />
                    <div className="splash-ring-inner" />
                    <FaAtom className="splash-logo-icon" />
                </div>

                {/* Title */}
                <h1 className="splash-title">EDUSHARE</h1>

                {/* Subtitle */}
                <p className="splash-subtitle">Futuristic Learning Engine</p>

                {/* Loading Bar */}
                <div className="splash-loader">
                    <div className="splash-loader-fill" />
                </div>
            </div>

            {/* Version */}
            <span className="splash-version">SYSTEM V2.0 — INITIALIZING NEURAL PATHWAYS</span>
        </div>
    );
};

export default SplashScreen;
