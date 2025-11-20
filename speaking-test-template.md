# Speaking Test Excel Template

Bu fayl speaking testlarni Excel fayldan import qilish uchun template ko'rsatadi.

## Excel Fayl Strukturasi

Excel faylda 3 ta sheet bo'lishi kerak:
1. **Test Info** - Test haqida asosiy ma'lumot
2. **Sections** - Test bo'limlari
3. **Questions** - Savollar

---

## Sheet 1: Test Info

| Test Name | Course ID | Duration (daqiqa) | Pass Score | Total Score | Instructions | Is Published | Is Demo | Description |
|-----------|-----------|-------------------|------------|-------------|--------------|--------------|---------|-------------|
| Ingliz tili Speaking Test | course-uuid-here | 45 | 60 | 100 | Testni boshlashdan oldin mikrofoningiz ishonchli ekanligiga ishonch hosil qiling. Har bir savolga berilgan vaqt ichida javob bering. | true | false | IELTS Speaking test namunasi |

**Maydonlar:**
- **Test Name** (majburiy): Test nomi
- **Course ID** (majburiy): Kurs ID'si (UUID)
- **Duration (daqiqa)**: Test davomiyligi (daqiqalarda)
- **Pass Score**: O'tish bali
- **Total Score**: Maksimal ball
- **Instructions**: Test ko'rsatmalari
- **Is Published**: Nashr qilinganmi (true/false)
- **Is Demo**: Demo testmi (true/false)
- **Description**: Test tavsifi

---

## Sheet 2: Sections

| Section Number | Section Title | Description | Time Limit (soniya) |
|----------------|---------------|-------------|---------------------|
| 1 | Part 1: Introduction | O'zingiz haqingizda gapiring | 240 |
| 2 | Part 2: Individual Talk | Berilgan mavzu bo'yicha gapiring | 300 |
| 3 | Part 3: Discussion | Chuqur muhokama | 300 |

**Maydonlar:**
- **Section Number** (majburiy): Bo'lim raqami (1, 2, 3, ...)
- **Section Title** (majburiy): Bo'lim nomi
- **Description**: Bo'lim tavsifi
- **Time Limit (soniya)**: Bo'lim uchun vaqt chegarasi (soniyalarda, ixtiyoriy)

---

## Sheet 3: Questions

| Section Number | Question Number | Question Text | Prompt/Instructions | Time Limit (soniya) | Expected Duration (soniya) | Sample Answer | Evaluation Criteria |
|----------------|-----------------|---------------|---------------------|---------------------|----------------------------|---------------|---------------------|
| 1 | 1 | Ismingiz nima? O'zingiz haqingizda qisqacha ma'lumot bering. | Ismingiz, yoshingiz, qayerda yashashingiz haqida gapiring | 60 | 30 | Mening ismim Alisher. Men 25 yoshdaman va Toshkentda yashayman. | ["Grammatika", "Talaffuz", "So'z boyligi", "Javob aniqaligi"] |
| 1 | 2 | Sevimli mashg'ulotingiz nima? | Nima qilishni yoqtirasiz va nima uchun? | 90 | 60 | Men futbolni juda yaxshi ko'raman. Har hafta do'stlarim bilan o'ynayman. | ["Grammatika", "So'z boyligi", "Javobning mantiqiyligi"] |
| 2 | 1 | Hayotingizda muhim bo'lgan odamni tasvirlang. | Kim, qanday odamligini, nima uchun muhimligini aytib bering. | 180 | 120 | Mening onam menga eng muhim odam... | ["Grammatika", "Talaffuz", "So'z boyligi", "Javob strukturasi", "Vaqt boshqaruvi"] |
| 3 | 1 | Yoshlarning ta'lim olishi nechun muhim? | Fikrlaringiz va dalillaringizni keltiring. | 180 | 120 | Ta'lim juda muhim chunki... | ["Fikr mustaqilligi", "Dalillar", "Grammatika", "So'z boyligi"] |

**Maydonlar:**
- **Section Number** (majburiy): Bu savol qaysi bo'limga tegishli (1, 2, 3, ...)
- **Question Number** (majburiy): Savol raqami bo'lim ichida
- **Question Text** (majburiy): Savol matni
- **Prompt/Instructions**: Qo'shimcha ko'rsatmalar
- **Time Limit (soniya)**: Javob uchun vaqt chegarasi
- **Expected Duration (soniya)**: Kutilayotgan javob davomiyligi
- **Sample Answer**: Namuna javob (ixtiyoriy)
- **Evaluation Criteria**: Baholash mezonlari (JSON array yoki text)

**Evaluation Criteria Format:**
1. JSON array: `["Grammatika", "Talaffuz", "So'z boyligi"]`
2. Oddiy text: `Grammatika, talaffuz, so'z boyligi`

---

## Ishlatish

1. Excel faylni yuqoridagi formatda tayyorlang
2. Scriptni ishga tushiring:

```bash
node import-speaking-test.js speaking-test.xlsx instructor-user-id
```

**Misol:**
```bash
node import-speaking-test.js ielts-speaking.xlsx cm3abc123def456
```

---

## Muhim Eslatmalar

1. **Sheet nomlari** to'g'ri bo'lishi kerak: `Test Info`, `Sections`, `Questions`
2. **Section Number** va **Question Number** ketma-ket bo'lishi shart emas, lekin takrorlanmasligi kerak
3. **Course ID** mavjud va instructor'ga tegishli bo'lishi kerak
4. **Time Limit** va **Expected Duration** soniyalarda ko'rsatiladi
5. **Evaluation Criteria** JSON formatida yoki oddiy textda bo'lishi mumkin
6. **Sample Answer** ixtiyoriy, lekin yaxshi example berish uchun tavsiya etiladi
