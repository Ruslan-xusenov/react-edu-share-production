from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    path('', views.course_list, name='course_list'),
    path('category/<int:category_id>/', views.category_detail, name='category_detail'),
    path('lesson/<int:lesson_id>/', views.lesson_detail, name='lesson_detail'),
    path('lesson/<int:lesson_id>/like/', views.like_lesson, name='like_lesson'),
    path('lesson/create/', views.create_lesson, name='create_lesson'),
    path('lesson/<int:lesson_id>/edit/', views.edit_lesson, name='edit_lesson'),
    path('lesson/<int:lesson_id>/delete/', views.delete_lesson, name='delete_lesson'),
    path('assignment/<int:assignment_id>/submit/', views.submit_assignment, name='submit_assignment'),
    path('my-lessons/', views.my_lessons, name='my_lessons'),
    path('my-learning/', views.my_learning, name='my_learning'),
]
