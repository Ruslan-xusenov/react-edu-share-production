from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.http import HttpResponse
import openpyxl
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'full_name', 'school', 'grade', 'points', 'created_at']
    list_filter = ['school', 'grade', 'created_at']
    search_fields = ['email', 'full_name', 'school']
    ordering = ['-points', '-created_at']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('full_name', 'school', 'grade', 'interests', 'points', 'avatar', 'bio')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('email', 'full_name', 'school', 'grade', 'interests', 'points', 'avatar', 'bio')
        }),
    )

    actions = ['export_to_excel']

    def export_to_excel(self, request, queryset):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Foydalanuvchilar"

        headers = ['ID', 'To\'liq ism', 'Email', 'Telefon raqam', 'Maktab', 'Sinf', 'Ballar', 'Ro\'yxatdan o\'tgan']
        ws.append(headers)

        for user in queryset:
            ws.append([
                user.id,
                user.full_name,
                user.email,
                user.phone_number or '-',
                user.school or '-',
                user.grade or '-',
                user.points,
                user.created_at.strftime('%Y-%m-%d %H:%M') if user.created_at else '-'
            ])

        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = (max_length + 2)
            ws.column_dimensions[column].width = adjusted_width

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename=foydalanuvchilar.xlsx'
        wb.save(response)
        return response

    export_to_excel.short_description = "Excelga yuklash (XLSX)"