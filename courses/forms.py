from django import forms
from .models import Lesson, Assignment, Submission, Comment
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Row, Column


class LessonForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = ['title', 'description', 'video_url', 'video_file', 'resource_file', 'thumbnail', 'sub_category', 'level', 'duration']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'title': forms.TextInput(attrs={'placeholder': 'Enter lesson title'}),
            'video_url': forms.URLInput(attrs={'placeholder': 'YouTube URL'}),
            'duration': forms.TextInput(attrs={'placeholder': 'e.g., 15 minutes'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.add_input(Submit('submit', 'Save Lesson', css_class='btn btn-primary'))


class AssignmentForm(forms.ModelForm):
    class Meta:
        model = Assignment
        fields = ['question_text', 'correct_answer', 'max_score', 'allow_file_upload', 'allow_text_answer']
        widgets = {
            'question_text': forms.Textarea(attrs={'rows': 4, 'placeholder': 'Describe the assignment task'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'


class SubmissionForm(forms.ModelForm):
    class Meta:
        model = Submission
        fields = ['answer_text', 'answer_file']
        widgets = {
            'answer_text': forms.Textarea(attrs={'rows': 6, 'placeholder': 'Enter your answer here'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.add_input(Submit('submit', 'Topshirish', css_class='btn btn-success w-100'))


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['content']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 2, 'placeholder': 'Izoh qoldiring...'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_show_labels = False
