# ⚔ Darkknight Studio v2 — Complete Rebuild

پلتفرم رسمی **Darkknight Studio (دارک‌نایت استودیو)**  
HTML5 + CSS3 + Vanilla JS + Supabase — بدون Build، سازگار با GitHub Pages.

---

## وضعیت فعلی (مرحله پیاده‌سازی)

### انجام‌شده
- اتصال به **همان Supabase Project** موجود (`exaryvtjayuwgyqnioem`)
- حفظ Auth کاربران فعلی (email/password)
- ساختار پوشه `darkknight/` طبق مشخصات
- Config، Supabase client، Auth، Permissions، Utils، Analytics
- تم تیره حرفه‌ای + Responsive + RTL
- صفحه اصلی (Hero، آمار واقعی، محصولات، پروژه‌ها، تیم، CTA عضویت)
- فروشگاه (لیست + دسته‌بندی + جست‌وجو) — وابسته به migration
- فرم درخواست عضویت با **شماره موبایل الزامی** و توضیح حریم خصوصی
- صفحه ورود / ثبت‌نام
- Migration افزایشی `004` (shop, orders, cart, notifications, analytics…)
- RLS `005` برای جداول جدید
- SEO keywords فارسی و انگلیسی

### باقی‌مانده (اولویت بعدی)
1. اجرای migrationهای `004` و `005` در Supabase SQL Editor
2. `product.html` — جزئیات محصول + سبد خرید
3. `cart.js` / `orders.js` — ثبت سفارش واقعی + تأیید قیمت سمت سرور
4. `profile.html` — پنل کاربری
5. `admin.html` — پنل مدیریت کامل (کاربران، محصولات، سفارش‌ها، تیکت‌ها)
6. `owner.html` — پنل مالک + مدیریت نقش‌ها
7. `support.html` — تیکت (می‌تواند از نسخه قبلی منتقل شود)
8. PWA (`manifest.webmanifest` + `sw.js`)
9. Storage policies برای فایل‌های محصول

---

## راه‌اندازی

### ۱. Migrationها
در **Supabase → SQL Editor** به ترتیب:

```
supabase/migrations/001_schema.sql   (قبلاً اجرا شده)
supabase/migrations/002_rls.sql
supabase/migrations/003_storage.sql
database/migrations/004_shop_and_extensions.sql   ← جدید
database/migrations/005_shop_rls.sql              ← جدید
```

### ۲. GitHub Pages
- محتویات پوشه `darkknight/` را در ریپو قرار دهید.
- Settings → Pages → Deploy from branch `main` / folder `/darkknight` **یا** ریشه اگر فقط این پوشه را deploy می‌کنید.
- در `js/config.js` مقدار `BASE_PATH` را در صورت نیاز تنظیم کنید:
  - ریشه ریپو: `''`
  - زیرمسیر: `'/darkknightstudio-website/darkknight'`

### ۳. کلیدها
همان کلیدهای فعلی در `js/config.js` قرار گرفته‌اند.  
**هرگز service_role را در فرانت نگذارید.**

### ۴. Owner اولیه
اگر هنوز Owner ندارید:

```sql
-- user_id از Authentication → Users
INSERT INTO admins (user_id, role_id, display_name, is_active)
SELECT 'USER_UUID', id, 'Owner', true FROM roles WHERE name = 'OWNER';
```

---

## ساختار

```
darkknight/
├── index.html, shop.html, login.html, membership.html, …
├── css/          themes, main, responsive, …
├── js/           config, supabase, auth, permissions, shop, …
├── database/migrations/
│   ├── 004_shop_and_extensions.sql
│   └── 005_shop_rls.sql
└── README.md
```

---

## امنیت

- فقط `anon` key در مرورگر
- RLS روی تمام جداول حساس
- قیمت سفارش در زمان ثبت از دیتابیس خوانده می‌شود (نه از کلاینت)
- فایل‌های محصول خصوصی + دسترسی بر اساس مالکیت سفارش
- Audit log برای عملیات مهم
- شماره موبایل عضویت فقط برای نقش‌های مجاز

---

## SEO

Meta description/keywords فارسی و انگلیسی + بلوک کلمات کلیدی مخفی برای جست‌وجوهای:
Darkknight Studio، دارک‌نایت استودیو، فروش ربات، سورس کد، …

---

ساخته‌شده برای **Darkknight Studio** — حفظ سازگاری کامل با کاربران و دیتابیس فعلی.
