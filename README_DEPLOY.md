# 🚀 EduShare Serverga O'rnatish Qo'llanmasi

Siz uchun serverga o'rnatishga tayyorlangan barcha fayllar va scriptlar yangilandi.
Domen: `edushare.uz`
Server IP: `46.224.133.140`

### 1-qadam: Domenni IPga bog'lash
`edushare.uz` va `www.edushare.uz` domenlarini `46.224.133.140` IP manziliga (A record) bog'langanligiga ishonch hosil qiling.

### 2-qadam: Fayllarni serverga yuklash
Loyiha fayllarini serveringizdagi `/var/www/edushare` direktoriyaiga yuklang. 
(Masalan: `scp` yoki `git clone` yordamida)

### 3-qadam: O'rnatish scriptini ishga tushirish
Serverga SSH orqali kiring va quyidagi buyruqlarni bajaring:

```bash
cd /var/www/edushare
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

### Script nimalarni bajaradi?
1.  Sistemani yangilaydi (apt update).
2.  PostgreSQL, Nginx, Redis va Python kutubxonalarini o'rnatadi.
3.  Ma'lumotlar bazasini (`edushare_db`) yaratadi.
4.  Frontendni (`npm build`) yig'adi.
5.  Django static fayllarini yig'adi va bazani migrate qiladi.
6.  Nginx va Systemd (Gunicorn) xizmatlarini sozlaydi.
7.  SSL sertifikat (Let's Encrypt) bepul o'rnatadi.
8.  Firewallni (UFW) sozlaydi.

### Muhim eslatmalar:
*   `.env.production` faylini oching va ma'lumotlar bazasi parolini (`DB_PASSWORD`) o'zgartiring.
*   Agar serveringizda boshqa foydalanuvchi ishlatilsa (masalan `ubuntu`), `deploy.sh` ichidagi `PROJECT_DIR`ni shunga moslab oling (hozir `/var/www/edushare` qilingan).
*   SSL sertifikat ishlashi uchun domen IPga to'g'ri bog'langan bo'lishi shart.

### Xizmatlarni tekshirish:
```bash
sudo systemctl status edushare  # Gunicorn holati
sudo systemctl status nginx     # Nginx holati
```

Sizning saytingiz tez orada **https://edushare.uz** manzilida ishga tushadi! 🚀
