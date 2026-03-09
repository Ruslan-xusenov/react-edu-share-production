import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import {
    FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
    FaExpand, FaCompress
} from 'react-icons/fa';
import { MdPictureInPictureAlt, MdHd, MdSettings } from 'react-icons/md';
import './VideoPlayer.css';

const VideoPlayer = ({ src, hlsSrc, hlsStatus, poster, onProgress, initialTime = 0 }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const hlsRef = useRef(null);
    const lastReportedTime = useRef(0);
    const initialTimeSet = useRef(false);
    const hideControlsTimer = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(initialTime);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [videoError, setVideoError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [buffered, setBuffered] = useState(0);

    // HLS Quality
    const [levels, setLevels] = useState([]); // [{name, index}]
    const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
    const [activeSettingsTab, setActiveSettingsTab] = useState('quality'); // 'quality' | 'speed'

    // --- HLS Setup ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        setVideoError(null);
        setIsLoading(true);
        setLevels([]);
        setCurrentLevel(-1);
        initialTimeSet.current = false;

        const useHls = hlsSrc && hlsStatus === 'ready';

        if (useHls && Hls.isSupported()) {
            // HLS.js ishlatish
            const hls = new Hls({
                autoStartLoad: true,
                startLevel: -1, // auto
                capLevelToPlayerSize: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
            });

            hlsRef.current = hls;
            hls.loadSource(hlsSrc);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const qualityLevels = data.levels.map((l, i) => ({
                    index: i,
                    name: l.height ? `${l.height}p` : `Level ${i}`,
                    height: l.height || 0,
                    bitrate: l.bitrate,
                }));
                // Kattadan kichikka tartiblash
                qualityLevels.sort((a, b) => b.height - a.height);
                setLevels(qualityLevels);
                setCurrentLevel(-1); // auto
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    setVideoError('Video yuklanmadi. Qaytadan urinib ko\'ring.');
                    setIsLoading(false);
                }
            });

        } else if (useHls && video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari - native HLS support
            video.src = hlsSrc;
        } else if (src) {
            // Fallback: oddiy video
            video.src = src;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, hlsSrc, hlsStatus]);

    // --- Video events ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            if (!isNaN(video.currentTime)) setCurrentTime(video.currentTime);
            // Buffered
            if (video.buffered.length > 0) {
                setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
            }
        };
        const onLoadedMetadata = () => {
            if (!isNaN(video.duration)) {
                setDuration(video.duration);
                if (initialTime > 0 && !initialTimeSet.current) {
                    video.currentTime = initialTime;
                    initialTimeSet.current = true;
                    lastReportedTime.current = initialTime;
                }
            }
            setIsLoading(false);
        };
        const onEnded = () => {
            setIsPlaying(false);
            if (onProgress && !isNaN(video.duration)) {
                onProgress(video.duration, video.duration);
            }
        };
        const onError = () => {
            setVideoError('Video yuklanmadi');
            setIsLoading(false);
            setIsPlaying(false);
        };
        const onPlay = () => { setIsPlaying(true); setIsLoading(false); };
        const onPause = () => setIsPlaying(false);
        const onWaiting = () => setIsLoading(true);
        const onCanPlay = () => setIsLoading(false);
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onError);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('canplay', onCanPlay);
        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('error', onError);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('canplay', onCanPlay);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, [initialTime, onProgress]);

    // Progress reporting
    useEffect(() => {
        if (onProgress && duration > 0) {
            if (Math.abs(currentTime - lastReportedTime.current) >= 10) {
                onProgress(currentTime, duration);
                lastReportedTime.current = currentTime;
            }
        }
    }, [currentTime, duration, onProgress]);

    // Auto-hide controls
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        clearTimeout(hideControlsTimer.current);
        if (isPlaying) {
            hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [isPlaying]);

    useEffect(() => {
        return () => clearTimeout(hideControlsTimer.current);
    }, []);

    const togglePlay = async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (video.paused) {
                await video.play();
            } else {
                video.pause();
                if (onProgress && duration > 0) {
                    onProgress(video.currentTime, duration);
                    lastReportedTime.current = video.currentTime;
                }
            }
        } catch (err) {
            setVideoError('Video ijro etishda xatolik: ' + err.message);
        }
    };

    const handleSeek = (e) => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = Math.max(0, Math.min(percent * video.duration, video.duration));
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e) => {
        const video = videoRef.current;
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (video) video.volume = v;
        setIsMuted(v === 0);
    };

    const changeSpeed = (rate) => {
        const video = videoRef.current;
        setPlaybackRate(rate);
        if (video) video.playbackRate = rate;
        setShowSettings(false);
    };

    const changeQuality = (levelIndex) => {
        const hls = hlsRef.current;
        if (!hls) return;
        if (levelIndex === -1) {
            hls.currentLevel = -1; // auto
            hls.autoLevelEnabled = true;
        } else {
            hls.currentLevel = levelIndex;
            hls.autoLevelEnabled = false;
        }
        setCurrentLevel(levelIndex);
        setShowSettings(false);
    };

    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!document.fullscreenElement) {
            container?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current?.requestPictureInPicture();
            }
        } catch (e) { /* PiP unsupported */ }
    };

    const formatTime = (t) => {
        if (!t || isNaN(t)) return '0:00';
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);
        return h > 0
            ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
            : `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentQualityLabel = () => {
        if (currentLevel === -1) return 'Auto';
        const lv = levels.find(l => l.index === currentLevel);
        return lv ? lv.name : 'Auto';
    };

    const isHls = hlsSrc && hlsStatus === 'ready';

    return (
        <div
            className={`video-player-container ${!isPlaying ? 'paused' : ''} ${showControls ? 'show-controls' : ''}`}
            ref={containerRef}
            onMouseMove={resetHideTimer}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onClick={() => { togglePlay(); resetHideTimer(); }}
        >
            <video
                ref={videoRef}
                poster={poster}
                preload="metadata"
                playsInline
                tabIndex="-1"
            />

            {/* Loading Spinner */}
            {isLoading && !videoError && (
                <div className="vp-loading">
                    <div className="vp-spinner" />
                </div>
            )}

            {/* Error Overlay */}
            {videoError && (
                <div className="video-error-overlay" onClick={e => e.stopPropagation()}>
                    <p>⚠️ {videoError}</p>
                    <button onClick={() => {
                        setVideoError(null);
                        videoRef.current?.load();
                    }}>Qaytadan urinish</button>
                </div>
            )}

            {/* HLS Processing Banner */}
            {hlsStatus === 'processing' && (
                <div className="vp-hls-banner">
                    <div className="vp-spinner-sm" />
                    <span>Video sifatlarga ajratilmoqda... Hozircha asl nusxasini tomosha qiling.</span>
                </div>
            )}

            {/* Controls */}
            <div className="video-controls" onClick={e => e.stopPropagation()}>
                {/* Progress bar */}
                <div className="progress-container" onClick={handleSeek}>
                    <div className="progress-buffered" style={{ width: `${buffered}%` }} />
                    <div
                        className="progress-filled"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    >
                        <div className="progress-thumb" />
                    </div>
                </div>

                <div className="controls-row">
                    <div className="controls-left">
                        <button className="control-btn" onClick={togglePlay}>
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>

                        <div className="volume-wrapper">
                            <button className="control-btn" onClick={toggleMute}>
                                {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>
                            <div className="volume-container">
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="volume-slider"
                                />
                            </div>
                        </div>

                        <span className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="controls-right">
                        {/* Settings: Quality + Speed */}
                        <div className="settings-wrapper" onClick={e => e.stopPropagation()}>
                            <button
                                className="control-btn settings-btn"
                                onClick={() => setShowSettings(!showSettings)}
                                title="Sozlamalar"
                            >
                                <MdSettings />
                                {isHls && (
                                    <span className="quality-badge">
                                        {currentQualityLabel()}
                                    </span>
                                )}
                            </button>

                            {showSettings && (
                                <div className="settings-panel">
                                    {/* Tabs */}
                                    <div className="settings-tabs">
                                        <button
                                            className={`settings-tab ${activeSettingsTab === 'quality' ? 'active' : ''}`}
                                            onClick={() => setActiveSettingsTab('quality')}
                                        >
                                            <MdHd /> Sifat
                                        </button>
                                        <button
                                            className={`settings-tab ${activeSettingsTab === 'speed' ? 'active' : ''}`}
                                            onClick={() => setActiveSettingsTab('speed')}
                                        >
                                            Tezlik
                                        </button>
                                    </div>

                                    {/* Quality Options */}
                                    {activeSettingsTab === 'quality' && (
                                        <div className="settings-options">
                                            {isHls ? (
                                                <>
                                                    <button
                                                        className={`settings-option ${currentLevel === -1 ? 'active' : ''}`}
                                                        onClick={() => changeQuality(-1)}
                                                    >
                                                        <span>Avto</span>
                                                        {currentLevel === -1 && <span className="check">✓</span>}
                                                    </button>
                                                    {levels.map(lv => (
                                                        <button
                                                            key={lv.index}
                                                            className={`settings-option ${currentLevel === lv.index ? 'active' : ''}`}
                                                            onClick={() => changeQuality(lv.index)}
                                                        >
                                                            <span>
                                                                {lv.name}
                                                                {lv.height >= 720 && <span className="hd-badge">HD</span>}
                                                            </span>
                                                            {currentLevel === lv.index && <span className="check">✓</span>}
                                                        </button>
                                                    ))}
                                                </>
                                            ) : (
                                                <div className="settings-info">
                                                    {hlsStatus === 'processing'
                                                        ? '⏳ Sifatlar tayyorlanmoqda...'
                                                        : 'Sifat tanlash mavjud emas'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Speed Options */}
                                    {activeSettingsTab === 'speed' && (
                                        <div className="settings-options">
                                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                                                <button
                                                    key={rate}
                                                    className={`settings-option ${playbackRate === rate ? 'active' : ''}`}
                                                    onClick={() => changeSpeed(rate)}
                                                >
                                                    <span>{rate === 1 ? 'Oddiy' : `${rate}x`}</span>
                                                    {playbackRate === rate && <span className="check">✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button className="control-btn" onClick={togglePiP} title="Picture in Picture">
                            <MdPictureInPictureAlt />
                        </button>

                        <button className="control-btn" onClick={toggleFullscreen}>
                            {isFullscreen ? <FaCompress /> : <FaExpand />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
