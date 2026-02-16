import { useState, useRef, useEffect } from 'react';
import {
    FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
    FaExpand, FaCompress, FaCog
} from 'react-icons/fa';
import { MdPictureInPictureAlt } from 'react-icons/md';
import './VideoPlayer.css';

const VideoPlayer = ({ src, poster, onProgress, initialTime = 0 }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const lastReportedTime = useRef(0);
    const initialTimeSet = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(initialTime);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [videoError, setVideoError] = useState(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => {
            if (video && !isNaN(video.currentTime)) {
                setCurrentTime(video.currentTime);
            }
        };
        const updateDuration = () => {
            if (video && !isNaN(video.duration)) {
                setDuration(video.duration);
                if (initialTime > 0 && !initialTimeSet.current) {
                    video.currentTime = initialTime;
                    initialTimeSet.current = true;
                    lastReportedTime.current = initialTime;
                }
            }
        };
        const onEnded = () => {
            setIsPlaying(false);
            if (onProgress && video && !isNaN(video.duration)) {
                onProgress(video.duration, video.duration);
            }
        };
        const onError = (e) => {
            console.error('Video error:', video.error);
            setVideoError(video.error?.message || 'Video yuklanmadi');
            setIsPlaying(false);
        };
        const onPlay = () => {
            setIsPlaying(true);
        };
        const onPause = () => {
            setIsPlaying(false);
        };

        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onError);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        // Reset if src changes
        initialTimeSet.current = false;
        setVideoError(null);

        return () => {
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('error', onError);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [src, onProgress, initialTime]);

    useEffect(() => {
        if (onProgress && duration > 0) {
            // Report progress every 10 seconds
            if (Math.abs(currentTime - lastReportedTime.current) >= 10) {
                onProgress(currentTime, duration);
                lastReportedTime.current = currentTime;
            }
        }
    }, [currentTime, duration, onProgress]);

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
        } catch (error) {
            console.error('Playback error:', error);
            setVideoError('Video ijro etishda xatolik: ' + error.message);
        }
    };

    const handleSeek = (e) => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        videoRef.current.muted = !isMuted;
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        videoRef.current.volume = newVolume;
        setIsMuted(newVolume === 0);
    };

    const changeSpeed = (rate) => {
        setPlaybackRate(rate);
        videoRef.current.playbackRate = rate;
        setShowSpeedMenu(false);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('PiP failed:', error);
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div
            className={`video-player-container ${!isPlaying ? 'paused' : ''}`}
            ref={containerRef}
            onMouseLeave={() => setShowSpeedMenu(false)}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                onClick={togglePlay}
                preload="auto"
                playsInline
                tabIndex="-1"
            />

            {videoError && (
                <div className="video-error-overlay">
                    <p>⚠️ {videoError}</p>
                    <button onClick={() => {
                        setVideoError(null);
                        const video = videoRef.current;
                        if (video) {
                            video.load();
                        }
                    }}>Qaytadan urinish</button>
                </div>
            )}

            <div className="video-controls">
                <div className="progress-container" onClick={handleSeek}>
                    <div
                        className="progress-filled"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    >
                        <div className="progress-thumb"></div>
                    </div>
                </div>

                <div className="controls-row">
                    <div className="controls-left">
                        <button className="control-btn" onClick={togglePlay}>
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>

                        <div className="volume-wrapper controls-left">
                            <button className="control-btn" onClick={toggleMute}>
                                {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>
                            <div className="volume-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
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
                        <button className="control-btn" onClick={togglePiP} title="Picture in Picture">
                            <MdPictureInPictureAlt />
                        </button>

                        <div className="speed-control">
                            <button
                                className="control-btn speed-btn"
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                            >
                                {playbackRate}x
                            </button>
                            {showSpeedMenu && (
                                <div className="speed-menu">
                                    {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                                        <button
                                            key={rate}
                                            className={`speed-option ${playbackRate === rate ? 'active' : ''}`}
                                            onClick={() => changeSpeed(rate)}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

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
