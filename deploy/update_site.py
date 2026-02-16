import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edushare_project.settings')
django.setup()

from django.contrib.sites.models import Site

def update_site():
    domain = "edushare.uz"
    name = "EduShare"
    
    site, created = Site.objects.get_or_create(id=1)
    site.domain = domain
    site.name = name
    site.save()
    print(f"✅ Site updated to: {domain} ({name})")

if __name__ == "__main__":
    update_site()
