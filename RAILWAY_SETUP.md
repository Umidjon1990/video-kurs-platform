# Railway Database Setup Qo'llanmasi

Railway'da kurslar yo'qolib qolgan muammo - Railway database **bo'sh** yoki **schema to'liq emas**.

## ❗ Muhim Tushuncha

- **Replit Database** = Development database (Replit'da)
- **Railway Database** = Production database (Railway'da)
- **Bu ikkalasi alohida database!** Ma'lumotlar avtomatik sync bo'lmaydi.

---

## 🔧 Yechim: Railway Database'ni Sozlash

### **Variant 1: Drizzle-Kit Push (Tavsiya etiladi)**

Railway dashboard'da DATABASE_URL environment variable qo'shilganini tekshiring, keyin:

```bash
# 1. Schema push qilish (barcha table'larni yaratadi)
DATABASE_URL="postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway" npx drizzle-kit push
```

✅ Bu barcha table'larni (courses, users, lessons, etc.) Railway database'ga yaratadi.

---

### **Variant 2: Migration Script Ishlatish**

Agar drizzle-kit push ishlamasa, migration script'larni ishlating:

```bash
# 1. discountPercentage column qo'shish
node railway-discount-migration.js
```

---

## 📊 Database Holatini Tekshirish

Railway database'da necha ta kurs borligini tekshirish:

```bash
# PostgreSQL psql orqali
psql "postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway" -c "SELECT COUNT(*) FROM courses;"
```

Yoki migration script ishlating - u avtomatik hisoblab beradi.

---

## 🔄 Ma'lumotlarni Import Qilish (Agar kerak bo'lsa)

Railway database bo'sh bo'lgani uchun, agar development ma'lumotlarni ko'chirishni istasangiz:

### **Option 1: Replit'dan Export → Railway'ga Import**

```bash
# 1. Replit database'dan export
pg_dump $DATABASE_URL > replit_backup.sql

# 2. Railway'ga import
psql "postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway" < replit_backup.sql
```

⚠️ **Diqqat:** Bu development ma'lumotlarni production'ga ko'chiradi. Odatda production database bo'sh boshlanadi va real foydalanuvchilar o'z ma'lumotlarini kiritishadi.

### **Option 2: Test Ma'lumotlar Qo'shish**

Railway dashboard'da yoki Railway CLI orqali test kurslar qo'shing:

```sql
INSERT INTO users (email, first_name, last_name, role, status)
VALUES ('instructor@test.uz', 'Test', 'Instructor', 'instructor', 'active')
RETURNING id;

INSERT INTO courses (title, description, category, price, instructor_id, status)
VALUES (
  'Test Kurs',
  'Bu test kursi',
  'IT',
  150000,
  '<instructor_id_from_above>',
  'published'
);
```

---

## ✅ Tekshirish

Railway app'ni ochib, kurslar ko'rinishini tekshiring:
- Homepage'da kurslar ko'rinishi kerak
- Agar ko'rinmasa - browser console va server logs'ni tekshiring

---

## 🚀 Railway Environment Variables

Railway dashboard'da quyidagi environment variable'lar to'g'ri sozlanganligini tekshiring:

```env
DATABASE_URL=postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway
NODE_ENV=production
SESSION_SECRET=<random-secret-here>
```

---

## 💡 Savol-Javoblar

**Q: Nega Railway'da kurslar yo'q?**
A: Railway va Replit - bu alohida database'lar. Replit'dagi ma'lumotlar avtomatik Railway'ga o'tmaydi.

**Q: Har safar deploy qilganda ma'lumotlar yo'qoladimi?**
A: Yo'q! Schema push faqat bir marta qilinadi. Keyin barcha ma'lumotlar Railway database'da saqlanadi.

**Q: Development'da test qilish uchun ma'lumot kerakmi?**
A: Ha! Admin akkaunt yaratib, InstructorDashboard orqali kurslar qo'shing.

---

## 📞 Yordam

Agar muammo davom etsa:
1. Railway logs'ni tekshiring
2. Browser console'ni tekshiring  
3. DATABASE_URL to'g'ri sozlanganligini tasdiqlang
