# دليل API لتطبيق الموبايل - مصنع الأكياس البلاستيكية (MPBF)

## المصادقة (Authentication)

### تسجيل الدخول
```
POST /api/mobile/login
Content-Type: application/json

Body:
{
  "username": "اسم_المستخدم",
  "password": "كلمة_المرور"
}

Response 200:
{
  "token": "abc123...",
  "user": {
    "id": 5,
    "username": "ahmed",
    "display_name": "Ahmed",
    "display_name_ar": "أحمد",
    "role_id": 3,
    "role_name": "production_manager",
    "role_name_ar": "مدير إنتاج",
    "section_id": 2,
    "permissions": ["manage_orders", "manage_production", "view_attendance"]
  }
}
```

### استخدام التوكن في كل الطلبات
```
Authorization: Bearer <TOKEN>
```
يجب إرسال هذا الـ Header مع **كل طلب API** بعد تسجيل الدخول.

### تسجيل الخروج
```
POST /api/mobile/logout
Authorization: Bearer <TOKEN>
```

### حالة السيرفر
```
GET /api/mobile/status
Response: { "status": "online", "version": "1.0.0" }
```

---

## الصفحة 1: إدارة الطلبات (Orders)

### 1.1 عرض جميع الطلبات
```
GET /api/orders
Authorization: Bearer <TOKEN>

Response 200:
{
  "data": [
    {
      "id": 1,
      "order_number": "ORD001",
      "customer_id": "CID001",
      "delivery_days": 14,
      "delivery_date": "2026-04-01",
      "status": "waiting",        // القيم: waiting | in_production | paused | completed | cancelled
      "notes": "ملاحظات اختيارية",
      "created_by": 5,
      "created_at": "2026-03-12T10:00:00.000Z"
    }
  ],
  "count": 1,
  "success": true
}
```

### 1.2 عرض الطلبات المحسّنة (مع بيانات العميل والمنتجات)
```
GET /api/orders/enhanced
Authorization: Bearer <TOKEN>
```
هذا يرجع الطلبات مع تفاصيل العميل وأوامر الإنتاج المرتبطة.

### 1.3 الحصول على رقم الطلب التالي
```
GET /api/orders/next-number
Authorization: Bearer <TOKEN>

Response 200:
{ "orderNumber": "ORD004" }
```
**مهم:** استدعِ هذا قبل فتح نموذج إنشاء طلب جديد لضمان رقم فريد.

### 1.4 إنشاء طلب جديد
```
POST /api/orders
Authorization: Bearer <TOKEN>
Content-Type: application/json

Body:
{
  "order_number": "ORD004",         // مطلوب - من next-number
  "customer_id": "CID001",          // مطلوب - معرف العميل
  "delivery_days": 14,              // اختياري - عدد أيام التسليم (1-365)
  "delivery_date": "2026-04-01",    // اختياري - تاريخ التسليم (YYYY-MM-DD)
  "notes": "ملاحظات"               // اختياري
}

Response 201:
{
  "data": { ... الطلب المنشأ ... },
  "message": "تم إنشاء الطلب بنجاح",
  "success": true
}
```
**الصلاحية المطلوبة:** `manage_orders`

### 1.5 عرض قائمة العملاء (للقائمة المنسدلة)
```
GET /api/customers?all=true
Authorization: Bearer <TOKEN>

Response 200: [
  {
    "id": "CID001",
    "name": "ABC Company",
    "name_ar": "شركة أ ب ج",
    "code": "C001",
    "phone": "0501234567",
    "city": "الرياض"
  }
]
```

### 1.6 عرض منتجات العميل (لربطها بأوامر الإنتاج)
```
GET /api/customer-products
Authorization: Bearer <TOKEN>

Response 200:
{
  "data": [
    {
      "id": 1,
      "customer_id": "CID001",
      "size_caption": "30×40",
      "width": "30.00",
      "thickness": "0.018",
      "printing_cylinder": "18\"",
      "raw_material": "HDPE",
      "master_batch_id": "CLEAR",
      "is_printed": true,
      "punching": "T-Shirt",           // NON | T-Shirt | T-shirt\Hook | Banana
      "cutting_unit": "KG",            // KG | ROLL | PKT
      "unit_weight_kg": "0.005",
      "notes": "ملاحظات المنتج"
    }
  ]
}
```

### 1.7 تحديث حالة الطلب
```
PATCH /api/orders/:id/status
Authorization: Bearer <TOKEN>
Content-Type: application/json

Body:
{ "status": "in_production" }

الحالات المسموحة: waiting | in_production | paused | completed | cancelled

انتقالات الحالة المسموحة:
  waiting       → in_production, cancelled
  in_production → paused, completed, cancelled
  paused        → in_production, cancelled
  completed     → (لا يمكن التغيير)
  cancelled     → (لا يمكن التغيير)
```
**الصلاحية المطلوبة:** `admin`

### 1.8 حذف طلب
```
DELETE /api/orders/:id
Authorization: Bearer <TOKEN>
```
**الصلاحية المطلوبة:** `admin`

---

## الصفحة 2: لوحة الإنتاج (Production Dashboard)

### 2.1 إحصائيات لوحة المعلومات
```
GET /api/dashboard/stats
Authorization: Bearer <TOKEN>

Response 200:
{
  "totalOrders": 15,
  "totalProductionOrders": 30,
  "activeProductionOrders": 12,
  "completedToday": 3,
  ...
}
```

### 2.2 جميع أوامر الإنتاج
```
GET /api/production-orders
Authorization: Bearer <TOKEN>

Response 200:
{
  "data": [
    {
      "id": 1,
      "production_order_number": "PO001",
      "order_id": 1,
      "customer_product_id": 5,
      "quantity_kg": "500.00",
      "overrun_percentage": "5.00",
      "final_quantity_kg": "525.00",
      "produced_quantity_kg": "300.00",
      "printed_quantity_kg": "250.00",
      "net_quantity_kg": "240.00",
      "waste_quantity_kg": "10.00",
      "film_completion_percentage": "57.14",
      "printing_completion_percentage": "47.62",
      "cutting_completion_percentage": "45.71",
      "film_completed": false,
      "printing_completed": false,
      "cutting_completed": false,
      "status": "active",            // pending | active | completed | cancelled
      "assigned_machine_id": "M001",
      "assigned_operator_id": 10,
      "created_at": "2026-03-12T10:00:00.000Z"
    }
  ]
}
```

### 2.3 إنشاء أمر إنتاج
```
POST /api/production-orders
Authorization: Bearer <TOKEN>
Content-Type: application/json

Body:
{
  "order_id": 1,                    // مطلوب - معرف الطلب الأب
  "customer_product_id": 5,         // مطلوب - معرف منتج العميل
  "quantity_kg": 500                // مطلوب - الكمية بالكيلو
}

ملاحظة: السيرفر يحسب overrun_percentage و final_quantity_kg تلقائياً بناءً على نوع التثقيب:
  - منتج عادي (NON/T-Shirt): 5%
  - بنانة (Banana): 10%
  - علاقي (Hook): 20%
```
**الصلاحية المطلوبة:** `manage_production`

### 2.4 إنشاء أوامر إنتاج دفعة واحدة
```
POST /api/production-orders/batch
Authorization: Bearer <TOKEN>
Content-Type: application/json

Body:
{
  "orders": [
    { "order_id": 1, "customer_product_id": 5, "quantity_kg": 500 },
    { "order_id": 1, "customer_product_id": 6, "quantity_kg": 300 }
  ]
}
```

### 2.5 تتبع تقدم أمر إنتاج
```
GET /api/production/order-progress/:jobOrderId
Authorization: Bearer <TOKEN>

Response 200:
{
  "productionOrder": { ... },
  "rolls": [ ... ],
  "filmProgress": 57.14,
  "printingProgress": 47.62,
  "cuttingProgress": 45.71
}
```

### 2.6 الإحصائيات الفورية
```
GET /api/production/real-time-stats
Authorization: Bearer <TOKEN>

Response 200:
{
  "activeOrders": 12,
  "totalProducedToday": "1500.00",
  "machineUtilization": 75,
  "updateInterval": 30000
  ...
}
```

### 2.7 الأوامر الهرمية (طلب ← أوامر إنتاج ← رولات)
```
GET /api/production/hierarchical-orders
Authorization: Bearer <TOKEN>
```

---

## الصفحة 2.1: لوحة الفيلم (Film Queue)

### عرض قائمة انتظار الفيلم
```
GET /api/production/film-queue
Authorization: Bearer <TOKEN>

Response 200: [
  {
    "id": 1,
    "production_order_number": "PO001",
    "customer_name": "شركة أ ب ج",
    "product_info": "30×40 HDPE",
    "quantity_kg": "500.00",
    "produced_quantity_kg": "300.00",
    "film_completion_percentage": "57.14",
    "assigned_machine_id": "M001",
    "status": "active"
  }
]
```

### عرض الرولات (للماكينة / للعامل)
```
GET /api/rolls
Authorization: Bearer <TOKEN>

Response 200: [
  {
    "id": 1,
    "roll_number": "PO001-R001",
    "roll_seq": 1,
    "production_order_id": 1,
    "stage": "film",              // film | printing | cutting | done
    "weight_kg": "50.000",
    "film_machine_id": "M001",
    "created_by": 10,
    "created_at": "2026-03-12T10:00:00.000Z"
  }
]
```

### إنشاء رول جديد (مرحلة الفيلم)
```
POST /api/rolls/create-with-timing
Authorization: Bearer <TOKEN>
Content-Type: application/json

Body:
{
  "production_order_id": 1,
  "weight_kg": 50,
  "film_machine_id": "M001",
  "is_last_roll": false,
  "production_time_minutes": 45
}
```

### إنشاء رول نهائي (آخر رول في أمر الإنتاج)
```
POST /api/rolls/create-final
Authorization: Bearer <TOKEN>

Body:
{
  "production_order_id": 1,
  "weight_kg": 25,
  "film_machine_id": "M001",
  "production_time_minutes": 30
}
```

---

## الصفحة 2.2: لوحة الطباعة (Printing Queue)

### عرض قائمة انتظار الطباعة
```
GET /api/production/printing-queue
Authorization: Bearer <TOKEN>
```

### عرض الرولات الجاهزة للطباعة
```
GET /api/rolls/active-for-printing
Authorization: Bearer <TOKEN>
```

### عرض قائمة الطباعة حسب القسم
```
GET /api/rolls/printing-queue-by-section
Authorization: Bearer <TOKEN>
```

### تسجيل طباعة رول
```
PATCH /api/rolls/:id/print
Authorization: Bearer <TOKEN>
Content-Type: application/json

Body:
{
  "printing_machine_id": "M005",
  "printed_by": 12
}
```

### تعليم رول كمطبوع
```
POST /api/rolls/:id/mark-printed
Authorization: Bearer <TOKEN>

Body:
{
  "printing_machine_id": "M005"
}
```

---

## الصفحة 2.3: لوحة التقطيع (Cutting Queue)

### عرض قائمة انتظار التقطيع
```
GET /api/production/cutting-queue
Authorization: Bearer <TOKEN>
```

### عرض قائمة التقطيع المجمّعة
```
GET /api/production/grouped-cutting-queue
Authorization: Bearer <TOKEN>
```

### عرض الرولات الجاهزة للتقطيع
```
GET /api/rolls/active-for-cutting
Authorization: Bearer <TOKEN>
```

### عرض قائمة التقطيع حسب القسم
```
GET /api/rolls/cutting-queue-by-section
Authorization: Bearer <TOKEN>
```

### إتمام تقطيع رول
```
POST /api/rolls/:id/complete-cutting
Authorization: Bearer <TOKEN>

Body:
{
  "cutting_machine_id": "M010",
  "cut_weight_total_kg": 48.5,
  "waste_kg": 1.5,
  "cut_by": 15
}
```

---

## الصفحة 2.4: نقاط إضافية للإنتاج

### الماكينات المتاحة
```
GET /api/machines
Authorization: Bearer <TOKEN>

Response 200:
{
  "data": [
    {
      "id": "M001",
      "name": "ماكينة فيلم 1",
      "type": "film",              // film | printing | cutting
      "status": "active",          // active | maintenance | inactive
      "capacity": 100
    }
  ]
}
```

### إحصائيات القسم
```
GET /api/production/stats-by-section/:section
Authorization: Bearer <TOKEN>
// section = film | printing | cutting
```

### أداء العمال حسب القسم
```
GET /api/production/users-performance/:section
Authorization: Bearer <TOKEN>
```

### إنتاج الماكينات حسب القسم
```
GET /api/production/machines-production/:section
Authorization: Bearer <TOKEN>
```

### تتبع الرولات حسب القسم
```
GET /api/production/rolls-tracking/:section
Authorization: Bearer <TOKEN>
```

### بحث رول بالباركود
```
GET /api/rolls/search-by-barcode/:barcode
Authorization: Bearer <TOKEN>
```

### تفاصيل رول كاملة
```
GET /api/rolls/:id/full-details
Authorization: Bearer <TOKEN>
```

### سجل رول
```
GET /api/rolls/:id/history
Authorization: Bearer <TOKEN>
```

### بيانات QR Code لرول
```
GET /api/rolls/:id/qr
Authorization: Bearer <TOKEN>
```

---

## الصفحة 3: الأدوات (Tools)

### 3.1 ألوان الطباعة (Master Batch Colors)

#### عرض جميع الألوان
```
GET /api/master-batch-colors
Authorization: Bearer <TOKEN>

Response 200: [
  {
    "id": "PT-111111",
    "name": "Super White",
    "name_ar": "أبيض فائق",
    "color_hex": "#FFFFFF",
    "text_color": "#000000",
    "brand": "PolyTEC",
    "aliases": "225,KT331",
    "is_active": true,
    "sort_order": 1
  }
]
```

#### عرض لون بالمعرف
```
GET /api/master-batch-colors/:id
Authorization: Bearer <TOKEN>
```

### 3.2 حاسبة وزن الكيس (حساب محلي في الموبايل - لا يحتاج API)

المعادلة موجودة في التطبيق الحالي وهي حساب محلي بالكامل:

```
المعادلة الأساسية:
  وزن الكيس (جرام) = العرض(سم) × الطول(سم) × عدد الطبقات × السماكة(سم) × الكثافة

تحويل السماكة:
  السماكة بالسنتيمتر = السماكة بالميكرون × 0.0001

أنواع الأكياس:
  1. كيس مسطح (flat):
     العرض الفعال = العرض
  
  2. كيس بطية جانبية (side-gusset):
     العرض الفعال = العرض + (2 × عمق الطية الجانبية)
  
  3. مفرش طاولة (table-cover):
     العرض الفعال = العرض

عدد الأكياس في الكيلو = 1000 / وزن الكيس بالجرام
المساحة (م²) = (العرض_الفعال / 100) × (الطول / 100)

القيم الافتراضية:
  - العرض: 30 سم
  - الطول: 40 سم
  - السماكة: 18 ميكرون
  - عدد الطبقات: 2
  - الكثافة: 0.95 (LDPE)
  
كثافات المواد الخام:
  - HDPE: 0.95
  - LDPE: 0.92
  - Regrind: 0.93
```

### 3.3 حاسبة كمية الإنتاج (Overrun) - حساب محلي

```
المعادلة:
  الكمية_النهائية = الكمية_المطلوبة × (1 + نسبة_الزيادة / 100)

نسب الزيادة حسب نوع التثقيب (punching):
  - بدون / تي شيرت (NON / T-Shirt): 5%
  - بنانة (Banana): 10%
  - علاقي (Hook): 20%

مثال:
  كمية مطلوبة: 500 كجم
  نوع التثقيب: T-Shirt
  نسبة الزيادة: 5%
  الكمية النهائية: 500 × 1.05 = 525 كجم
```

---

## ملاحظات مهمة للمطوّر

### 1. معالجة الأخطاء
كل طلبات API ترجع رسائل خطأ بالعربية:
```json
{ "message": "رسالة الخطأ بالعربية" }
```
أكواد الحالة:
- `200` - نجاح
- `201` - تم الإنشاء بنجاح  
- `400` - بيانات غير صحيحة
- `401` - غير مصرح (التوكن منتهي أو غير موجود)
- `403` - لا توجد صلاحية
- `404` - غير موجود
- `500` - خطأ في السيرفر

### 2. التعامل مع انتهاء التوكن
التوكن صالح لمدة **30 يوم**. عند استقبال `401`:
```
أعِد توجيه المستخدم لصفحة تسجيل الدخول
```

### 3. الأرقام العشرية
كل الأرقام العشرية ترجع كـ **string** من السيرفر (مثل `"500.00"`). يجب تحويلها لأرقام عند العرض:
```javascript
parseFloat(item.quantity_kg)
```

### 4. الصلاحيات
تحقق من `user.permissions` بعد تسجيل الدخول لإظهار/إخفاء الأزرار:
- `manage_orders` - إنشاء وتعديل الطلبات
- `manage_production` - إنشاء أوامر إنتاج
- `manage_attendance` - إدارة الحضور
- `view_production` - عرض لوحة الإنتاج فقط
- `admin` - كل الصلاحيات

### 5. Base URL
استخدم نفس الـ URL الحالي للسيرفر:
```
https://<REPLIT_DOMAIN>
```

### 6. تسجيل الحضور (الموجود مسبقاً)
```
POST /api/attendance/check-in   (أو POST /api/attendance)
Authorization: Bearer <TOKEN>

Body:
{
  "user_id": 5,
  "status": "حاضر",
  "location": {
    "lat": 24.7136,
    "lng": 46.6753,
    "accuracy": 15,
    "isMocked": false
  }
}
```

### 7. هيكل الصفحات المقترح

```
📱 تطبيق الموبايل
├── 🔐 تسجيل الدخول
├── 🏠 الرئيسية (Dashboard Stats)
├── 📋 الطلبات
│   ├── قائمة الطلبات (GET /api/orders)
│   ├── إنشاء طلب جديد (POST /api/orders)
│   └── تفاصيل الطلب (GET /api/orders/enhanced)
├── 🏭 لوحة الإنتاج
│   ├── نظرة عامة (GET /api/production/real-time-stats)
│   ├── 🎞️ لوحة الفيلم
│   │   ├── قائمة الانتظار (GET /api/production/film-queue)
│   │   └── إنشاء رولات (POST /api/rolls/create-with-timing)
│   ├── 🖨️ لوحة الطباعة
│   │   ├── قائمة الانتظار (GET /api/production/printing-queue)
│   │   └── تسجيل طباعة (PATCH /api/rolls/:id/print)
│   └── ✂️ لوحة التقطيع
│       ├── قائمة الانتظار (GET /api/production/cutting-queue)
│       └── إتمام تقطيع (POST /api/rolls/:id/complete-cutting)
├── 🔧 الأدوات
│   ├── ألوان الطباعة (GET /api/master-batch-colors)
│   └── حاسبة وزن الكيس (حساب محلي)
├── ✅ تسجيل الحضور (POST /api/attendance/check-in)
└── 🚪 تسجيل الخروج (POST /api/mobile/logout)
```
