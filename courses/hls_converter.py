"""
HLS (HTTP Live Streaming) Video Converter
Video faylni turli sifatda HLS formatiga o'tkazadi.
FFmpeg ishlatadi.
"""
import os
import subprocess
import threading
import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)

# HLS sifat profillari
HLS_PROFILES = [
    {
        'name': '1080p',
        'width': 1920,
        'height': 1080,
        'video_bitrate': '8000k',
        'audio_bitrate': '192k',
        'bandwidth': 8500000,
    },
    {
        'name': '720p',
        'width': 1280,
        'height': 720,
        'video_bitrate': '5000k',
        'audio_bitrate': '128k',
        'bandwidth': 5500000,
    },

    {
        'name': '480p',
        'width': 854,
        'height': 480,
        'video_bitrate': '2000k',
        'audio_bitrate': '128k',
        'bandwidth': 2200000,
    },
    {
        'name': '360p',
        'width': 640,
        'height': 360,
        'video_bitrate': '1000k',
        'audio_bitrate': '96k',
        'bandwidth': 1200000,
    },
    {
        'name': '240p',
        'width': 426,
        'height': 240,
        'video_bitrate': '500k',
        'audio_bitrate': '64k',
        'bandwidth': 600000,
    },
]



def get_video_resolution(input_path):
    """Video ning original o'lchamini olish"""
    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'quiet',
                '-print_format', 'json',
                '-show_streams',
                str(input_path)
            ],
            capture_output=True, text=True, timeout=30
        )
        import json
        data = json.loads(result.stdout)
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                return stream.get('width', 0), stream.get('height', 0)
    except Exception as e:
        logger.error(f"ffprobe xatosi: {e}")
    return 0, 0


def convert_to_hls(lesson_id, input_video_path):
    """
    Video faylni HLS formatiga o'tkazish.
    lesson_id - Lesson modeli ID
    input_video_path - original video fayl yo'li
    """
    input_path = Path(input_video_path)
    if not input_path.exists():
        logger.error(f"Video fayl topilmadi: {input_path}")
        return False

    # HLS fayllar saqlanadigan papka
    hls_base_dir = Path(settings.MEDIA_ROOT) / 'hls' / str(lesson_id)
    hls_base_dir.mkdir(parents=True, exist_ok=True)

    # Original video o'lchamini aniqlash
    orig_width, orig_height = get_video_resolution(input_path)
    logger.info(f"Original video o'lchami: {orig_width}x{orig_height}")

    # 720p va undan kichik profillarni har doim qo'shish (user xohishiga ko'ra)
    # 1080p esa faqat original video katta bo'lsa qo'shiladi
    applicable_profiles = []
    for p in HLS_PROFILES:
        if p['height'] <= 720:
            applicable_profiles.append(p)
        elif orig_height >= 1000: # 1080p uchun kamida 1000px balandlik kerak
            applicable_profiles.append(p)


    if not applicable_profiles:
        applicable_profiles = [HLS_PROFILES[-1]]  # Eng kichik profil

    master_playlist_lines = ['#EXTM3U', '#EXT-X-VERSION:3', '']
    success = True

    for profile in applicable_profiles:
        name = profile['name']
        profile_dir = hls_base_dir / name
        profile_dir.mkdir(exist_ok=True)
        playlist_path = profile_dir / 'playlist.m3u8'

        logger.info(f"Konvertatsiya boshlandi: {name}")

        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', str(input_path),
            '-c:v', 'libx264',
            '-preset', 'medium',

            '-profile:v', 'main',
            '-crf', '23',
            '-b:v', profile['video_bitrate'],
            '-maxrate', profile['video_bitrate'],
            '-bufsize', str(int(profile['video_bitrate'][:-1]) * 2) + 'k',
            '-vf', f"scale={profile['width']}:{profile['height']}:force_original_aspect_ratio=decrease,pad={profile['width']}:{profile['height']}:(ow-iw)/2:(oh-ih)/2",
            '-c:a', 'aac',
            '-b:a', profile['audio_bitrate'],
            '-ar', '44100',
            '-hls_time', '6',
            '-hls_list_size', '0',
            '-hls_segment_filename', str(profile_dir / 'seg_%03d.ts'),
            '-hls_flags', 'independent_segments',
            str(playlist_path),
        ]

        try:
            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True, text=True,
                timeout=3600  # 1 soat timeout
            )
            if result.returncode != 0:
                logger.error(f"FFmpeg xatosi ({name}): {result.stderr[-500:]}")
                success = False
                continue

            logger.info(f"✅ {name} tayyor: {playlist_path}")

            # Master playlist ga qo'shish
            master_playlist_lines.append(
                f'#EXT-X-STREAM-INF:BANDWIDTH={profile["bandwidth"]},'
                f'RESOLUTION={profile["width"]}x{profile["height"]},'
                f'NAME="{name}"'
            )
            master_playlist_lines.append(f'{name}/playlist.m3u8')
            master_playlist_lines.append('')

        except subprocess.TimeoutExpired:
            logger.error(f"FFmpeg timeout ({name})")
            success = False
        except Exception as e:
            logger.error(f"FFmpeg xatosi ({name}): {e}")
            success = False

    # Master playlist yozish
    if master_playlist_lines:
        master_path = hls_base_dir / 'master.m3u8'
        with open(master_path, 'w') as f:
            f.write('\n'.join(master_playlist_lines))
        logger.info(f"✅ Master playlist yaratildi: {master_path}")

    # Lesson modelini yangilash
    try:
        from courses.models import Lesson
        lesson = Lesson.objects.get(id=lesson_id)
        hls_relative = f'hls/{lesson_id}/master.m3u8'
        lesson.hls_playlist = hls_relative
        lesson.hls_status = 'ready' if success else 'error'
        lesson.save(update_fields=['hls_playlist', 'hls_status'])
        logger.info(f"✅ Lesson {lesson_id} HLS yangilandi")
    except Exception as e:
        logger.error(f"Lesson yangilash xatosi: {e}")

    return success


def convert_to_hls_async(lesson_id, input_video_path):
    """Background thread da HLS konvertatsiya qilish"""
    def run():
        logger.info(f"🎬 HLS konvertatsiya boshlandi: lesson_id={lesson_id}")
        try:
            # Status ni 'processing' ga o'zgartirish
            from courses.models import Lesson
            Lesson.objects.filter(id=lesson_id).update(hls_status='processing')
        except Exception:
            pass

        result = convert_to_hls(lesson_id, input_video_path)
        logger.info(f"🏁 HLS konvertatsiya tugadi: lesson_id={lesson_id}, success={result}")

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread


def get_hls_url(lesson_id, request=None):
    """Lesson uchun HLS URL qaytarish"""
    hls_path = Path(settings.MEDIA_ROOT) / 'hls' / str(lesson_id) / 'master.m3u8'
    if hls_path.exists():
        if request:
            return request.build_absolute_uri(f'/media/hls/{lesson_id}/master.m3u8')
        return f'/media/hls/{lesson_id}/master.m3u8'
    return None
