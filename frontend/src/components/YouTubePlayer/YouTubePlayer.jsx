import { useEffect, useRef, memo } from 'react';

/**
 * YouTubePlayer - React-safe YouTube IFrame API wrapper
 * 
 * Key design: The target div for YT.Player is created manually via DOM APIs
 * inside useEffect, NOT via JSX. This prevents React's reconciliation from
 * destroying the YouTube iframe on parent re-renders.
 */
const YouTubePlayer = memo(({ videoId, onProgress, initialTime = 0 }) => {
    const wrapperRef = useRef(null);
    const playerRef = useRef(null);
    const checkIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    // Use refs for callback props to avoid re-init on prop changes
    const onProgressRef = useRef(onProgress);
    useEffect(() => {
        onProgressRef.current = onProgress;
    }, [onProgress]);

    const initialTimeRef = useRef(initialTime);
    useEffect(() => {
        initialTimeRef.current = initialTime;
    }, [initialTime]);

    useEffect(() => {
        isMountedRef.current = true;

        const stopTracking = () => { };
        const startTracking = () => { };

        const destroyPlayer = () => {
            stopTracking();
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) { /* ignore */ }
                playerRef.current = null;
            }
        };

        // Load YouTube IFrame API script if not already present
        if (!window.YT) {
            const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
            if (!existing) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
        }

        const initPlayer = () => {
            if (!isMountedRef.current || !wrapperRef.current) return;
            if (!window.YT || !window.YT.Player) return;

            // Destroy any previous player
            destroyPlayer();

            // Clear the wrapper and create a fresh target div
            // This div is NOT managed by React's virtual DOM
            wrapperRef.current.innerHTML = '';
            const targetDiv = document.createElement('div');
            targetDiv.style.width = '100%';
            targetDiv.style.height = '100%';
            wrapperRef.current.appendChild(targetDiv);

            try {
                playerRef.current = new window.YT.Player(targetDiv, {
                    width: '100%',
                    height: '100%',
                    videoId: videoId,
                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        rel: 0,
                        modestbranding: 1,
                        playsinline: 1,
                        origin: window.location.origin,
                        enablejsapi: 1
                    },
                    events: {
                        onReady: (event) => {
                            if (!isMountedRef.current) return;
                            const p = event.target;
                            if (initialTimeRef.current > 0) {
                                p.seekTo(initialTimeRef.current, true);
                            }
                        },
                        onStateChange: (event) => {
                            if (!isMountedRef.current) return;
                            if (event.data === window.YT.PlayerState.ENDED) {
                                if (onProgressRef.current && playerRef.current && typeof playerRef.current.getDuration === 'function') {
                                    try {
                                        const dur = playerRef.current.getDuration();
                                        onProgressRef.current(dur, dur);
                                    } catch (e) { /* ignore */ }
                                }
                            }
                        },
                        onError: (e) => {
                            console.error('YouTube Player Error:', e.data);
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing YouTube player:', error);
            }
        };

        // Poll until YouTube API is ready, then init
        const waitAndInit = () => {
            if (window.YT && window.YT.Player) {
                initPlayer();
            } else {
                checkIntervalRef.current = setInterval(() => {
                    if (window.YT && window.YT.Player) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                        initPlayer();
                    }
                }, 200);

                // Safety timeout
                setTimeout(() => {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                }, 15000);
            }
        };

        // Small delay to let the wrapper ref attach
        const initTimeout = setTimeout(waitAndInit, 50);

        return () => {
            isMountedRef.current = false;
            clearTimeout(initTimeout);
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            destroyPlayer();
        };
    }, [videoId]); // Only re-init when videoId changes

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
            <div
                ref={wrapperRef}
                className="video-player-youtube"
                style={{ width: '100%', height: '100%' }}
            />
            {(!window.YT || !window.YT.Player) && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', color: '#fff', fontSize: '0.9rem',
                    opacity: 0.8
                }}>
                    YouTube yuklanmoqda...
                </div>
            )}
        </div>
    );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;