from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.db.models import Q
from .models import Category, SubCategory, Lesson, Assignment, Submission, LessonLike, Certificate, Comment
from .forms import LessonForm, AssignmentForm, SubmissionForm, CommentForm
from core.utils import create_notification
from django.urls import reverse


def course_list(request):
    lessons = Lesson.objects.filter(is_published=True).order_by('-created_at')
    categories = Category.objects.all()
    
    category_id = request.GET.get('category')
    if category_id:
        lessons = lessons.filter(sub_category__category_id=category_id)
    
    level = request.GET.get('level')
    if level:
        lessons = lessons.filter(level=level)
    
    query = request.GET.get('q')
    if query:
        lessons = lessons.filter(
            Q(title__icontains=query) | 
            Q(description__icontains=query) |
            Q(sub_category__name__icontains=query)
        )
    
    context = {
        'lessons': lessons,
        'categories': categories,
        'selected_category': category_id,
        'selected_level': level,
        'query': query,
    }
    return render(request, 'courses/course_list.html', context)


def category_detail(request, category_id):
    category = get_object_or_404(Category, id=category_id)
    lessons = Lesson.objects.filter(
        sub_category__category=category,
        is_published=True
    ).order_by('-created_at')
    
    context = {
        'category': category,
        'lessons': lessons,
    }
    return render(request, 'courses/category_detail.html', context)


def lesson_detail(request, lesson_id):
    lesson = get_object_or_404(Lesson, id=lesson_id, is_published=True)
    
    viewed_lessons = request.session.get('viewed_lessons', [])
    if lesson_id not in viewed_lessons:
        lesson.views += 1
        lesson.save(update_fields=['views'])
        viewed_lessons.append(lesson_id)
        request.session['viewed_lessons'] = viewed_lessons
    
    has_liked = False
    user_submission = None
    
    if request.user.is_authenticated:
        has_liked = LessonLike.objects.filter(user=request.user, lesson=lesson).exists()
        
        if hasattr(lesson, 'assignment'):
            try:
                user_submission = Submission.objects.get(
                    assignment=lesson.assignment,
                    user=request.user
                )
            except Submission.DoesNotExist:
                pass
    
    comment_form = CommentForm()
    if request.method == 'POST' and request.user.is_authenticated:
        comment_form = CommentForm(request.POST)
        if comment_form.is_valid():
            comment = comment_form.save(commit=False)
            comment.lesson = lesson
            comment.user = request.user
            
            parent_id = request.POST.get('parent_id')
            if parent_id:
                try:
                    parent_comment = Comment.objects.get(id=parent_id)
                    comment.parent = parent_comment
                except Comment.DoesNotExist:
                    pass
                    
            comment.save()
            
            # Notify lesson author or parent comment author
            notification_recipient = lesson.author
            if comment.parent:
                notification_recipient = comment.parent.user
            
            if comment.user != notification_recipient:
                create_notification(
                    user=notification_recipient,
                    notification_type='comment',
                    title=f"Yangi {'javob' if comment.parent else 'izoh'}: {lesson.title}",
                    message=f"{comment.user.full_name} {'izohingizga javob berdi' if comment.parent else 'darsingizga izoh qoldirdi'}: \"{comment.content[:50]}...\"",
                    link=reverse('courses:lesson_detail', kwargs={'lesson_id': lesson.id})
                )
            
            messages.success(request, "Izohingiz qo'shildi!" if not comment.parent else "Javobingiz yuborildi!")
            return redirect('courses:lesson_detail', lesson_id=lesson.id)

    context = {
        'lesson': lesson,
        'has_liked': has_liked,
        'user_submission': user_submission,
        'comment_form': comment_form,
        'comments': lesson.comments.filter(parent__isnull=True),
    }
    return render(request, 'courses/lesson_detail.html', context)



@login_required
@require_POST
def like_lesson(request, lesson_id):
    lesson = get_object_or_404(Lesson, id=lesson_id)
    
    like, created = LessonLike.objects.get_or_create(user=request.user, lesson=lesson)
    
    if created:
        lesson.likes += 1
        lesson.save(update_fields=['likes'])
        messages.success(request, 'Liked!')
    else:
        like.delete()
        lesson.likes -= 1
        lesson.save(update_fields=['likes'])
        messages.info(request, 'Unliked')
    
    return redirect('courses:lesson_detail', lesson_id=lesson_id)


@login_required
def create_lesson(request):
    if not request.user.is_staff:
        messages.error(request, "Faqatgina adminlar yangi dars yarata oladi!")
        return redirect('courses:course_list')

    if request.method == 'POST':
        lesson_form = LessonForm(request.POST, request.FILES)
        assignment_form = AssignmentForm(request.POST)
        
        if lesson_form.is_valid() and assignment_form.is_valid():
            lesson = lesson_form.save(commit=False)
            lesson.author = request.user
            lesson.save()
            
            assignment = assignment_form.save(commit=False)
            assignment.lesson = lesson
            assignment.save()
            
            request.user.points += 100
            request.user.save()
            
            messages.success(request, 'Lesson created successfully! You earned 100 points!')
            return redirect('courses:lesson_detail', lesson_id=lesson.id)
    else:
        lesson_form = LessonForm()
        assignment_form = AssignmentForm()
    
    context = {
        'lesson_form': lesson_form,
        'assignment_form': assignment_form,
    }
    return render(request, 'courses/create_lesson.html', context)


@login_required
def edit_lesson(request, lesson_id):
    if not (request.user == Lesson.objects.get(id=lesson_id).author or request.user.is_staff):
        messages.error(request, "Sizda ushbu darsni tahrirlash huquqi yo'q!")
        return redirect('courses:lesson_detail', lesson_id=lesson_id)

    lesson = get_object_or_404(Lesson, id=lesson_id)
    
    if request.method == 'POST':
        lesson_form = LessonForm(request.POST, request.FILES, instance=lesson)
        
        if lesson_form.is_valid():
            lesson_form.save()
            messages.success(request, 'Lesson updated successfully!')
            return redirect('courses:lesson_detail', lesson_id=lesson.id)
    else:
        lesson_form = LessonForm(instance=lesson)
    
    context = {
        'lesson_form': lesson_form,
        'lesson': lesson,
    }
    return render(request, 'courses/edit_lesson.html', context)


@login_required
def submit_assignment(request, assignment_id):
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    submission, created = Submission.objects.get_or_create(
        assignment=assignment,
        user=request.user
    )
    
    if request.method == 'POST':
        form = SubmissionForm(request.POST, request.FILES, instance=submission)
        
        if form.is_valid():
            submission = form.save(commit=False)
            submission.completed = True
            
            # Automatic scoring logic
            if assignment.correct_answer and submission.answer_text:
                if submission.answer_text.strip().lower() == assignment.correct_answer.strip().lower():
                    submission.score = assignment.max_score
                    messages.success(request, f"To'g'ri javob! Sizga {assignment.max_score} ball berildi.")
            
            submission.save()

            
            create_notification(
                user=assignment.lesson.author,
                notification_type='submission',
                title=f"Yangi topshiriq: {assignment.lesson.title}",
                message=f"{submission.user.full_name} darsingiz uchun topshiriq topshirdi.",
                link=reverse('courses:lesson_detail', kwargs={'lesson_id': assignment.lesson.id})
            )
            
            messages.success(request, 'Assignment submitted successfully! Check your profile for the certificate.')
            return redirect('courses:lesson_detail', lesson_id=assignment.lesson.id)
    else:
        form = SubmissionForm(instance=submission)
    
    context = {
        'form': form,
        'assignment': assignment,
        'submission': submission,
    }
    return render(request, 'courses/submit_assignment.html', context)


@login_required
def my_lessons(request):
    lessons = Lesson.objects.filter(author=request.user).order_by('-created_at')
    
    context = {
        'lessons': lessons,
    }
    return render(request, 'courses/my_lessons.html', context)


@login_required
def my_learning(request):
    submissions = Submission.objects.filter(user=request.user).order_by('-submitted_at')
    certificates = Certificate.objects.filter(user=request.user).order_by('-issued_at')
    
    context = {
        'submissions': submissions,
        'certificates': certificates,
    }
    return render(request, 'courses/my_learning.html', context)


@login_required
@require_POST
def delete_lesson(request, lesson_id):
    if not request.user.is_staff:
        messages.error(request, "Faqatgina adminlar darslarni o'chira oladi!")
        return redirect('courses:lesson_detail', lesson_id=lesson_id)
        
    lesson = get_object_or_404(Lesson, id=lesson_id)
    lesson.delete()
    messages.success(request, "Dars muvaffaqiyatli o'chirildi.")
    return redirect('courses:course_list')
