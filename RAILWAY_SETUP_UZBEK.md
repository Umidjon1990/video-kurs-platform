# 🚂 Railway Database Setup - To'liq Qo'llanma

Railway'da kurslar yo'q muammosini hal qilish uchun **4 qadam**.

---

## ❗ Muammo Nima?

Railway va Replit - **alohida database'lar!**

- **Replit** = Development database (test uchun)
- **Railway** = Production database (jonli website uchun)

Replit'dagi ma'lumotlar avtomatik Railway'ga o'tmaydi! ❌

---

## ✅ Yechim - 4 Qadam

### **1️⃣ Railway Dashboard'ga Kiring**

1. Railway.app ga kiring
2. Project'ingizni oching
3. **Database service**'ni tanlang
4. **Variables** tab'ni oching
5. `DATABASE_URL` ni nusxalang (copy qiling)

Misol:
```
postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway
```

---

### **2️⃣ Schema Push qiling (Railway CLI orqali)**

Railway CLI o'rnatilgan bo'lsa:

```bash
# Railway'ga login qiling
railway login

# Project'ni bog'lang
railway link

# Schema push qiling
railway run npx drizzle-kit push
```

✅ Bu **barcha table'larni** yaratadi (users, courses, lessons, etc.)

---

### **3️⃣ Test Ma'lumotlar Qo'shing**

**Option A - Avtomatik script (Tavsiya!):**

```bash
# Railway database URL'ni environment variable qilib belgilang
export RAILWAY_DATABASE_URL="postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway"

# Setup script'ni ishga tushiring
node railway-complete-setup.js
```

Bu script:
- ✅ discountPercentage column qo'shadi
- ✅ Admin user yaratadi (admin@lms.uz / admin123)
- ✅ Instructor user yaratadi (instructor@lms.uz / instructor123)
- ✅ 3 ta test kurs yaratadi

**Option B - Replit'dan export:**

```bash
# Replit database'dan backup
pg_dump $DATABASE_URL > backup.sql

# Railway'ga import
psql "postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway" < backup.sql
```

---

### **4️⃣ Deploy qiling va Tekshiring**

```bash
# Git push
git add .
git commit -m "Railway setup complete"
git push railway main

# Railway avtomatik deploy qiladi
```

**Tekshirish:**
1. Railway app URL'ni oching
2. Homepage'da kurslar ko'rinishini tekshiring
3. Admin login: `admin@lms.uz` / `admin123`
4. Instructor login: `instructor@lms.uz` / `instructor123`

---

## 📊 Database Holatini Tekshirish

Railway database'da necha ta kurs borligini tekshirish:

```bash
# psql orqali
psql "postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway" -c "SELECT COUNT(*) FROM courses;"
```

Yoki setup script ishlatganda avtomatik ko'rsatadi.

---

## 🔧 Railway CLI O'rnatish (Agar yo'q bo'lsa)

```bash
# npm orqali
npm install -g @railway/cli

# yoki brew orqali (macOS)
brew install railway
```

---

## 🎯 Qisqa Yo'l (Agar Railway CLI yo'q bo'lsa)

Railway CLI o'rnatmasdan ham setup qilish mumkin:

```bash
# 1. Environment variable belgilang
export RAILWAY_DATABASE_URL="postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway"

# 2. Schema push (local'dan)
DATABASE_URL=$RAILWAY_DATABASE_URL npx drizzle-kit push

# 3. Setup script
node railway-complete-setup.js

# 4. Git push
git push railway main
```

---

## ❓ Ko'p So'raladigan Savollar

**Q: Har safar deploy qilganda setup qilish kerakmi?**
A: Yo'q! Schema push va setup **FAQAT BIR MARTA** qilinadi. Keyin barcha ma'lumotlar saqlanadi.

**Q: Replit'dagi test ma'lumotlarimni Railway'ga ko'chirishim kerakmi?**
A: Yo'q, shart emas. Railway **production** uchun - real foydalanuvchilar o'z ma'lumotlarini kiritishadi. Lekin test uchun `railway-complete-setup.js` script test kurslar yaratadi.

**Q: Schema push xatolik bersa nima qilish kerak?**
A: 
1. `DATABASE_URL` to'g'ri sozlanganligini tekshiring
2. Railway dashboard'da database **Active** holatda ekanligini tekshiring
3. Railway logs'ni o'qing: `railway logs`

**Q: discountPercentage column yo'q xatosi chiqsa?**
A: `node railway-complete-setup.js` ishlatganda avtomatik qo'shiladi.

---

## 🚀 Tayyor!

Setup to'g'ri bajarilgandan keyin:

- ✅ Railway'da barcha table'lar bor
- ✅ Test kurslar ko'rinadi
- ✅ Admin/Instructor login qilish mumkin
- ✅ Har deploy qilganda ma'lumotlar saqlanadi

---

## 📞 Yordam Kerakmi?

Agar muammo davom etsa:
1. Railway logs'ni tekshiring: `railway logs`
2. Browser console'ni oching (F12)
3. Database connection string to'g'ri ekanligini tasdiqlang

**Omad! 🎉**
