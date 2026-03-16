from django.core.management.base import BaseCommand
from courses.models import Lesson
from courses.hls_converter import convert_to_hls
import os

class Command(BaseCommand):
    help = 'Barcha videolarni HLS formatiga (sifatlarga) o\'tkazadi'

    def add_arguments(self, parser):
        parser.add_argument('--lesson_id', type=int, help='Faqat bitta darsni qayta ishlash uchun ID')
        parser.add_argument('--force', action='store_true', help='Tayyor bo\'lgan darslarni ham qayta ishlash')

    def handle(self, *args, **options):
        lesson_id = options.get('lesson_id')
        force = options.get('force')

        if lesson_id:
            lessons = Lesson.objects.filter(id=lesson_id)
        else:
            if force:
                lessons = Lesson.objects.all()
            else:
                lessons = Lesson.objects.filter(hls_status='none') | Lesson.objects.filter(hls_status='error')

        count = lessons.count()
        self.stdout.write(self.style.SUCCESS(f"{count} ta dars aniqlandi."))

        for lesson in lessons:
            if not lesson.video_file:
                self.stdout.write(self.style.WARNING(f"Dars {lesson.id} da video fayl yo'q, o'tkazib yuborildi."))
                continue

            video_path = lesson.video_file.path
            if not os.path.exists(video_path):
                self.stdout.write(self.style.ERROR(f"Dars {lesson.id} video fayli yo'q (serverda topilmadi): {video_path}"))
                continue

            self.stdout.write(self.style.NOTICE(f"Dars {lesson.id} ishlanmoqda: {lesson.title}..."))
            
            # Konvertatsiya (blocking mode for management command)
            success = convert_to_hls(lesson.id, video_path)
            
            if success:
                self.stdout.write(self.style.SUCCESS(f"✅ Dars {lesson.id} tayyor!"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ Dars {lesson.id} da xatolik yuz berdi."))
