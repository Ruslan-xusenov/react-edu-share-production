from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Submission, Certificate
from core.utils import create_notification
from django.urls import reverse

@receiver(post_save, sender=Submission)
def notify_grading(sender, instance, created, **kwargs):
    if not created:
        if instance.score is not None:
            create_notification(
                user=instance.user,
                notification_type='grade',
                title=f"Topshiriq baholandi: {instance.assignment.lesson.title}",
                message=f"Sizning topshirig'ingiz {instance.score} ballga baholandi.",
                link=reverse('courses:lesson_detail', kwargs={'lesson_id': instance.assignment.lesson.id})
            )

@receiver(post_save, sender=Certificate)
def notify_certificate(sender, instance, created, **kwargs):
    if created:
        create_notification(
            user=instance.user,
            notification_type='system',
            title=f"Yangi sertifikat: {instance.lesson.title}",
            message=f"Tabriklaymiz! Siz '{instance.lesson.title}' darsini muvaffaqiyatli yakunlab sertifikat oldingiz.",
            link=reverse('courses:my_learning')
        )
