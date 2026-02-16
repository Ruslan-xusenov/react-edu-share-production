import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from django.core.files.base import ContentFile
from django.conf import settings

def generate_certificate_pdf(certificate):
    """
    Generates a PDF certificate for a user and saves it to the certificate model.
    """
    buffer = BytesIO()
    # Use landscape A4
    p = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Draw border
    p.setStrokeColor(colors.gold)
    p.setLineWidth(5)
    p.rect(0.2*inch, 0.2*inch, width - 0.4*inch, height - 0.4*inch)
    
    p.setStrokeColor(colors.blue)
    p.setLineWidth(1)
    p.rect(0.3*inch, 0.3*inch, width - 0.6*inch, height - 0.6*inch)

    # Logo/Header
    p.setFont("Helvetica-Bold", 36)
    p.setFillColor(colors.darkblue)
    p.drawCentredString(width / 2.0, height - 1.5*inch, "EduShare School")
    
    p.setFont("Helvetica", 18)
    p.setFillColor(colors.black)
    p.drawCentredString(width / 2.0, height - 2*inch, "BILIM ULASHISH PLATFORMASI")

    # Main Title
    p.setFont("Helvetica-Bold", 48)
    p.setFillColor(colors.goldenrod)
    p.drawCentredString(width / 2.0, height - 3.5*inch, "SERTIFIKAT")

    # Body
    p.setFont("Helvetica", 20)
    p.setFillColor(colors.black)
    p.drawCentredString(width / 2.0, height - 4.2*inch, "Ushbu sertifikat egasi")

    # User Name
    user_display = certificate.user.full_name or certificate.user.username
    p.setFont("Helvetica-Bold", 32)
    p.setFillColor(colors.blue)
    p.drawCentredString(width / 2.0, height - 4.8*inch, user_display.upper())


    # Lesson Info
    p.setFont("Helvetica", 20)
    p.setFillColor(colors.black)
    p.drawCentredString(width / 2.0, height - 5.5*inch, f"'{certificate.lesson.title}'")
    p.drawCentredString(width / 2.0, height - 5.9*inch, "kursini muvaffaqiyatli tamomlagani uchun berildi.")

    # Date and Signature line
    p.setFont("Helvetica", 14)
    p.drawCentredString(width / 4.0, 1.5*inch, f"Sana: {certificate.issued_at.strftime('%d.%m.%Y')}")
    
    p.line(width * 0.6, 1.6*inch, width * 0.9, 1.6*inch)
    p.drawCentredString(width * 0.75, 1.4*inch, "EduShare Ma'muriyati")

    # Verification ID
    p.setFont("Helvetica-Oblique", 10)
    p.setFillColor(colors.grey)
    p.drawCentredString(width / 2.0, 0.5*inch, f"Sertifikat ID: {certificate.certificate_id}")

    p.showPage()
    p.save()

    # Save to model
    filename = f"cert_{certificate.certificate_id}.pdf"
    certificate.pdf_file.save(filename, ContentFile(buffer.getvalue()), save=False)
    certificate.save()
    buffer.close()
