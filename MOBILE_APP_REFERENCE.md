# دليل مرجعي شامل لتطوير تطبيق الجوال
# MPBF - Muassasat Plastic Bag Factory - Mobile App Development Reference

---

## 1. نظرة عامة على النظام (System Overview)

نظام تخطيط موارد التصنيع (MRP) لمصنع أكياس بلاستيكية. يدير:
- الطلبات وأوامر الإنتاج متعددة المراحل (فيلم ← طباعة ← تقطيع)
- المستودعات والمخزون
- الموارد البشرية (حضور، إجازات، تدريب، تقييم أداء)
- الصيانة وقطع الغيار
- الجودة ومراقبة الإنتاج
- الوكيل الذكي (AI) وتسعير آلي
- إشعارات WhatsApp/SMS
- محاكاة ثلاثية الأبعاد للمصنع

**اللغة الأساسية:** عربي (RTL) مع دعم إنجليزي  
**الخادم:** Express.js + Node.js  
**قاعدة البيانات:** PostgreSQL (Neon) عبر Drizzle ORM  
**واجهة الويب:** React + TypeScript + Tailwind CSS + shadcn/ui  
**عنوان الخادم الأساسي (Base URL):** `https://<DOMAIN>`

---

## 2. المصادقة والجلسات (Authentication & Sessions)

### 2.1 تسجيل الدخول للجوال

```
POST /api/mobile/login
Content-Type: application/json

Body:
{
  "username": "string",
  "password": "string",
  "device_id": "string (optional)",
  "device_name": "string (optional)",
  "platform": "ios" | "android" | "web" (optional),
  "app_version": "string (optional)"
}

Response (200):
{
  "token": "string",
  "refresh_token": "string",
  "expires_at": "ISO8601 string",
  "refresh_expires_at": "ISO8601 string",
  "user": {
    "id": number,
    "username": "string",
    "display_name": "string",
    "display_name_ar": "string",
    "full_name": "string",
    "phone": "string",
    "email": "string",
    "profile_image_url": "string",
    "role_id": number,
    "role_name": "string",
    "role_name_ar": "string",
    "section_id": number,
    "permissions": ["string"]
  }
}

Response (401):
{
  "message": "بيانات تسجيل الدخول غير صحيحة"
}

Response (429):  // Rate limited
{
  "message": "تم تجاوز عدد محاولات تسجيل الدخول المسموحة...",
  "retry_after_seconds": number
}
```

### 2.1.1 تجديد الجلسة (Refresh Token)
```
POST /api/mobile/refresh-token
Content-Type: application/json

Body:
{
  "refresh_token": "string"
}

Response (200):
{
  "token": "string",
  "refresh_token": "string",
  "expires_at": "ISO8601 string",
  "refresh_expires_at": "ISO8601 string"
}

Response (401):
{
  "message": "الجلسة منتهية. يرجى تسجيل الدخول مرة أخرى"
}
```

### 2.2 تسجيل الدخول العادي (Session-based)
```
POST /api/login
Content-Type: application/json

Body:
{
  "username": "string",
  "password": "string"
}

Response: Sets session cookie + returns user data
```

### 2.3 جلب بيانات المستخدم الحالي
```
GET /api/me
Headers: Cookie (session) أو Authorization token

Response (200):
{
  "success": true,
  "user": {
    "id": number,
    "username": "string",
    "display_name": "string",
    "display_name_ar": "string",
    "full_name": "string",
    "phone": "string",
    "email": "string",
    "role_id": number,
    "section_id": number,
    "status": "active" | "suspended" | "deleted",
    "profile_image_url": "string",
    "role": {
      "id": number,
      "name": "string",
      "name_ar": "string",
      "permissions": ["string"]   // مصفوفة صلاحيات
    }
  }
}
```

### 2.4 تسجيل الخروج
```
POST /api/logout        // Web
POST /api/mobile/logout  // Mobile
Authorization: Bearer <token>
Body (optional):
{
  "device_token": "string"  // FCM token to unregister on logout
}
```

### 2.5 إدارة الجلسات (Session Management)
```
GET /api/mobile/sessions
Authorization: Bearer <token>

Response:
{
  "data": [{
    "id": number,
    "device_id": "string",
    "device_name": "string",
    "platform": "ios" | "android" | "web",
    "app_version": "string",
    "ip_address": "string",
    "last_active_at": "ISO8601",
    "created_at": "ISO8601",
    "is_active": true
  }]
}

DELETE /api/mobile/sessions/:id  // Terminate specific session
Authorization: Bearer <token>
```

### 2.6 تسجيل جهاز الإشعارات (Push Notification Token)
```
POST /api/mobile/device-token
Authorization: Bearer <token>
Body:
{
  "device_token": "string",     // FCM token
  "platform": "ios" | "android" | "web",
  "device_id": "string (optional)",
  "device_name": "string (optional)",
  "app_version": "string (optional)"
}

DELETE /api/mobile/device-token
Authorization: Bearer <token>
Body:
{
  "device_token": "string"
}
```

### 2.7 ملاحظات المصادقة للجوال
- Access token مدته 24 ساعة، refresh token مدته 90 يوم
- الـ tokens مخزنة كـ SHA-256 hash في قاعدة البيانات
- عند انتهاء access token استخدم `POST /api/mobile/refresh-token`
- تحديد عدد محاولات الدخول: 10 محاولات كل 15 دقيقة
- الجلسات محفوظة في PostgreSQL (تبقى بعد إعادة تشغيل الخادم)
- أرسل `Authorization: Bearer <token>` في كل طلب محمي

---

## 3. نظام الصلاحيات (Permissions System - RBAC)

### 3.1 هيكل الصلاحيات
كل مستخدم له دور (Role)، وكل دور يحتوي على مصفوفة صلاحيات.

### 3.2 جميع الصلاحيات المتاحة

| مفتاح الصلاحية | الوصف بالعربي | الفئة |
|---|---|---|
| `admin` | مدير النظام الكامل | عام |
| `view_home` | عرض الصفحة الرئيسية | عام |
| `view_dashboard` | عرض لوحة التحكم | عام |
| `view_user_dashboard` | عرض لوحة المستخدم | عام |
| `manage_orders` | إدارة الطلبات | الطلبات |
| `update_order_status` | تحديث حالة الطلب | الطلبات |
| `view_orders` | عرض الطلبات | الطلبات |
| `manage_production` | إدارة الإنتاج | الإنتاج |
| `view_production` | عرض الإنتاج | الإنتاج |
| `view_film_dashboard` | لوحة مشغل الفيلم | الإنتاج |
| `view_printing_dashboard` | لوحة مشغل الطباعة | الإنتاج |
| `view_cutting_dashboard` | لوحة مشغل التقطيع | الإنتاج |
| `view_production_monitoring` | مراقبة الإنتاج | الإنتاج |
| `view_production_reports` | تقارير الإنتاج | الإنتاج |
| `view_mixing` | عرض الخلط | الإنتاج |
| `manage_mixing` | إدارة الخلط | الإنتاج |
| `manage_production_hall` | إدارة صالة الإنتاج | الإنتاج |
| `manage_warehouse` | إدارة المستودع | المستودع |
| `view_warehouse` | عرض المستودع | المستودع |
| `manage_inventory` | إدارة المخزون | المستودع |
| `view_inventory` | عرض المخزون | المستودع |
| `view_warehouse_vouchers` | عرض سندات المستودع | المستودع |
| `manage_warehouse_vouchers` | إدارة سندات المستودع | المستودع |
| `view_warehouse_reports` | تقارير المستودع | المستودع |
| `manage_hr` | إدارة الموارد البشرية | HR |
| `view_hr` | عرض الموارد البشرية | HR |
| `view_attendance` | عرض الحضور | HR |
| `manage_attendance` | إدارة الحضور | HR |
| `view_attendance_reports` | تقارير الحضور | HR |
| `manage_leaves` | إدارة الإجازات | HR |
| `view_training` | عرض التدريب | HR |
| `manage_training` | إدارة التدريب | HR |
| `manage_maintenance` | إدارة الصيانة | الصيانة |
| `view_maintenance` | عرض الصيانة | الصيانة |
| `view_maintenance_requests` | عرض طلبات الصيانة | الصيانة |
| `create_maintenance_requests` | إنشاء طلبات صيانة | الصيانة |
| `manage_maintenance_actions` | إدارة إجراءات الصيانة | الصيانة |
| `view_maintenance_reports` | تقارير الصيانة | الصيانة |
| `manage_negligence` | إدارة بلاغات الإهمال | الصيانة |
| `manage_spare_parts` | إدارة قطع الغيار | الصيانة |
| `manage_consumable_parts` | إدارة القطع الاستهلاكية | الصيانة |
| `manage_quality` | إدارة الجودة | الجودة |
| `view_quality` | عرض الجودة | الجودة |
| `create_quality_inspections` | إنشاء فحوصات جودة | الجودة |
| `view_quality_reports` | تقارير الجودة | الجودة |
| `manage_quality_settings` | إعدادات الجودة | الجودة |
| `manage_users` | إدارة المستخدمين | الإدارة |
| `manage_roles` | إدارة الأدوار | الإدارة |
| `manage_settings` | إدارة الإعدادات | الإدارة |
| `manage_definitions` | إدارة التعريفات | الإدارة |
| `view_reports` | عرض التقارير | التقارير |
| `view_financial_reports` | التقارير المالية | التقارير |
| `view_hr_reports` | تقارير HR | التقارير |
| `view_notifications` | عرض الإشعارات | الإشعارات |
| `view_alerts` | عرض التنبيهات | النظام |
| `manage_alerts` | إدارة التنبيهات | النظام |
| `view_system_health` | صحة النظام | النظام |
| `view_system_monitoring` | مراقبة النظام | النظام |
| `manage_analytics` | إدارة التحليلات | النظام |
| `manage_whatsapp` | إدارة واتساب | الإشعارات |
| `view_ai_agent` | عرض الوكيل الذكي | AI |
| `use_ai_agent` | استخدام الوكيل الذكي | AI |
| `manage_ai_agent` | إدارة الوكيل الذكي | AI |
| `manage_customers` | إدارة العملاء | التعريفات |
| `manage_items` | إدارة الأصناف | التعريفات |
| `manage_machines` | إدارة المكائن | التعريفات |
| `manage_sections` | إدارة الأقسام | التعريفات |
| `manage_categories` | إدارة الفئات | التعريفات |
| `manage_master_batch` | إدارة ألوان الماستر باتش | التعريفات |
| `view_factory_simulation` | محاكاة المصنع | المصنع |
| `manage_factory_simulation` | إدارة محاكاة المصنع | المصنع |
| `view_display_screen` | شاشة العرض | العرض |
| `manage_display_screen` | إدارة شاشة العرض | العرض |
| `view_tools` | عرض الأدوات | الإدارة |

### 3.3 APIs الأدوار
```
GET    /api/roles                    // جلب كل الأدوار (requirePermission: manage_roles)
POST   /api/roles                    // إنشاء دور جديد
PUT    /api/roles/:id                // تحديث دور
DELETE /api/roles/:id                // حذف دور
```

---

## 4. هيكل قاعدة البيانات (Database Schema)

### 4.1 المستخدمون (users)
```typescript
{
  id: number (PK, auto),
  username: string (unique, max 50),
  password: string (hashed, max 100),
  display_name: string (max 100),
  display_name_ar: string (max 100),
  full_name: string (max 200),
  phone: string (max 20),
  email: string (max 100),
  role_id: number (FK → roles.id),
  section_id: number (FK → sections.id),
  status: "active" | "suspended" | "deleted",
  profile_image_url: string (max 500),
  first_name: string (max 100),
  last_name: string (max 100),
  created_at: timestamp,
  updated_at: timestamp
}
```

### 4.2 الأدوار (roles)
```typescript
{
  id: number (PK, auto),
  name: string (max 50),
  name_ar: string (max 100),
  permissions: string[]   // JSON مصفوفة من مفاتيح الصلاحيات
}
```

### 4.3 الأقسام (sections)
```typescript
{
  id: string (PK, max 20),
  name: string (max 100),
  name_ar: string (max 100),
  description: string
}
```

### 4.4 العملاء (customers)
```typescript
{
  id: string (PK, format: CID001),
  name: string (max 200),
  name_ar: string (max 200),
  code: string (max 20),
  user_id: string (max 10),
  plate_drawer_code: string (max 20),
  city: string (max 50),
  address: string,
  tax_number: string (14 digits),
  commercial_name: string (max 200),
  unified_number: string (10 digits, starts with 7),
  unique_customer_number: string (max 20),
  is_active: boolean,
  phone: string (max 20),
  sales_rep_id: number (FK → users.id),
  created_at: timestamp
}
```

### 4.5 منتجات العملاء (customer_products)
```typescript
{
  id: number (PK, auto),
  customer_id: string (FK → customers.id),
  category_id: string (FK → categories.id),
  item_id: string (FK → items.id),
  size_caption: string (max 50),
  width: decimal(8,2),
  left_facing: decimal(8,2),
  right_facing: decimal(8,2),
  thickness: decimal(6,3),
  printing_cylinder: string,         // "8" to "39"
  cutting_length_cm: number,
  raw_material: "HDPE" | "LDPE" | "Regrind",
  master_batch_id: string,           // CLEAR, WHITE, BLACK, etc.
  is_printed: boolean,
  cutting_unit: "KG" | "ROLL" | "PKT",
  punching: "NON" | "T-Shirt" | "T-shirt\\Hook" | "Banana",
  unit_weight_kg: decimal(8,3),
  unit_quantity: number,
  package_weight_kg: decimal(8,2),
  cliche_front_design: string,       // Base64 image
  cliche_back_design: string,        // Base64 image
  notes: string,
  status: "active" | "inactive",
  created_at: timestamp
}
```

### 4.6 الطلبات (orders)
```typescript
{
  id: number (PK, auto),
  order_number: string (unique, max 50),
  customer_id: string (FK → customers.id),
  delivery_days: number (> 0),
  status: "waiting" | "in_production" | "paused" | "cancelled" | "completed",
  notes: string,
  created_by: number (FK → users.id),
  created_at: timestamp,
  delivery_date: date
}
```

### 4.7 أوامر الإنتاج (production_orders)
```typescript
{
  id: number (PK, auto),
  production_order_number: string (unique),
  order_id: number (FK → orders.id, CASCADE),
  customer_product_id: number (FK → customer_products.id),

  // الكميات
  quantity_kg: decimal(10,2),        // الكمية المطلوبة
  overrun_percentage: decimal(5,2),  // نسبة الزيادة (0-50%)
  final_quantity_kg: decimal(10,2),  // الكمية النهائية

  // تتبع الكميات الفعلية لكل مرحلة
  produced_quantity_kg: decimal(10,2),   // مجموع أوزان الرولات (فيلم)
  printed_quantity_kg: decimal(10,2),    // الكمية المطبوعة
  net_quantity_kg: decimal(10,2),        // الكمية الصافية (بعد التقطيع)
  waste_quantity_kg: decimal(10,2),      // مجموع الهدر

  // نسب الإكمال (0-100)
  film_completion_percentage: decimal(5,2),
  printing_completion_percentage: decimal(5,2),
  cutting_completion_percentage: decimal(5,2),

  // تخصيص الماكينة والعامل
  assigned_machine_id: string (FK → machines.id),
  assigned_operator_id: number (FK → users.id),

  // أوقات الإنتاج
  production_start_time: timestamp,
  production_end_time: timestamp,
  production_time_minutes: number,

  // علامات اكتمال المراحل
  film_completed: boolean,
  printing_completed: boolean,
  cutting_completed: boolean,
  is_final_roll_created: boolean,

  // المستودع
  warehouse_received_kg: decimal(10,2),
  warehouse_delivered_kg: decimal(10,2),

  status: "pending" | "active" | "completed" | "cancelled",
  created_at: timestamp
}
```

### 4.8 الرولات (rolls)
```typescript
{
  id: number (PK, auto),
  roll_seq: number (> 0),             // الرقم التسلسلي داخل أمر الإنتاج
  roll_number: string (unique),        // Format: PO001-R001
  production_order_id: number (FK → production_orders.id),
  qr_code_text: string,               // JSON metadata
  qr_png_base64: string,              // صورة QR مشفرة
  stage: "film" | "printing" | "cutting" | "done",
  weight_kg: decimal(12,3),           // > 0, max 2000
  cut_weight_total_kg: decimal(12,3), // >= 0
  waste_kg: decimal(12,3),            // >= 0
  printed_at: timestamp,
  cut_completed_at: timestamp,
  film_machine_id: string (FK → machines.id),
  printing_machine_id: string (FK → machines.id),
  cutting_machine_id: string (FK → machines.id),
  created_by: number (FK → users.id),
  printed_by: number (FK → users.id),
  cut_by: number (FK → users.id),
  is_last_roll: boolean,
  production_time_minutes: number,
  roll_created_at: timestamp,
  created_at: timestamp,
  completed_at: timestamp
}
```

**مراحل الرول (Stage Transitions):** `film → printing → cutting → done` (تسلسلي فقط)

### 4.9 المكائن (machines)
```typescript
{
  id: string (PK, format: M001),
  name: string (max 100),
  name_ar: string (max 100),
  type: "extruder" | "printer" | "cutter" | "quality_check",
  section_id: string (FK → sections.id),
  status: "active" | "maintenance" | "down",
  capacity_small_kg_per_hour: decimal(8,2),
  capacity_medium_kg_per_hour: decimal(8,2),
  capacity_large_kg_per_hour: decimal(8,2),
  screw_type: "A" | "ABA"
}
```

### 4.10 الحضور (attendance)
```typescript
{
  id: number (PK, auto),
  user_id: number (FK → users.id),
  status: "حاضر" | "غائب" | "استراحة غداء" | "مغادر" | "إجازة",
  check_in_time: timestamp,
  check_out_time: timestamp,
  lunch_start_time: timestamp,
  lunch_end_time: timestamp,
  break_start_time: timestamp,
  break_end_time: timestamp,
  work_hours: double,
  overtime_hours: double,
  shift_type: "صباحي" | "مسائي" | "ليلي",
  late_minutes: number,
  early_leave_minutes: number,
  location_accuracy: double,         // GPS
  distance_from_factory: double,     // بالأمتار
  device_info: string,
  notes: string,
  date: date,
  created_at: timestamp
}
```

### 4.11 طلبات الإجازات (leave_requests)
```typescript
{
  id: number (PK),
  employee_id: string (FK → users.id),
  leave_type_id: number (FK → leave_types.id),
  start_date: date,
  end_date: date,
  days_count: number,
  reason: string,
  medical_certificate_url: string,
  emergency_contact: string,
  work_handover: string,
  replacement_employee_id: string,
  
  // سلسلة الموافقات
  direct_manager_id: string,
  direct_manager_status: "pending" | "approved" | "rejected",
  direct_manager_comments: string,
  direct_manager_action_date: timestamp,
  
  hr_status: "pending" | "approved" | "rejected",
  hr_comments: string,
  hr_action_date: timestamp,
  
  final_status: "pending" | "approved" | "rejected" | "cancelled",
  created_at: timestamp
}
```

### 4.12 طلبات الصيانة (maintenance_requests)
```typescript
{
  id: number (PK),
  request_number: string (unique, format: MO001),
  machine_id: string (FK → machines.id),
  reported_by: number (FK → users.id),
  issue_type: "mechanical" | "electrical" | "other",
  description: string,
  urgency_level: "normal" | "medium" | "urgent",
  status: "open" | "in_progress" | "resolved",
  assigned_to: number (FK → users.id),
  action_taken: string,
  date_reported: timestamp,
  date_resolved: timestamp
}
```

### 4.13 إجراءات الصيانة (maintenance_actions)
```typescript
{
  id: number (PK),
  action_number: string (unique, format: MA001),
  maintenance_request_id: number (FK),
  action_type: string,   // فحص مبدئي / تغيير قطعة غيار / إصلاح...
  description: string,
  text_report: string,
  spare_parts_request: string,
  machining_request: string,
  operator_negligence_report: string,
  performed_by: number (FK → users.id),
  requires_management_action: boolean,
  management_notified: boolean,
  action_date: timestamp
}
```

### 4.14 المخزون (inventory)
```typescript
{
  id: number (PK),
  item_id: string (FK → items.id),
  location_id: string (FK → locations.id),
  current_stock: decimal(10,2),   // >= 0 دائماً
  min_stock: decimal(10,2),
  max_stock: decimal(10,2),       // >= min_stock
  unit: "كيلو" | "قطعة" | "رول" | "علبة",
  cost_per_unit: decimal(10,4),
  last_updated: timestamp
}
```

### 4.15 حركات المخزون (inventory_movements)
```typescript
{
  id: number (PK),
  inventory_id: number (FK → inventory.id),
  movement_type: "in" | "out" | "transfer" | "adjustment",
  quantity: decimal(10,2),    // > 0
  unit_cost: decimal(10,4),
  total_cost: decimal(10,4),
  reference_number: string,
  reference_type: "purchase" | "sale" | "production" | "adjustment" | "transfer",
  notes: string,
  created_by: number (FK → users.id),
  created_at: timestamp
}
```

### 4.16 قطع الغيار الاستهلاكية (consumable_parts)
```typescript
{
  id: number (PK),
  part_id: string (unique, format: CP001),
  type: string,
  code: string,
  current_quantity: number (>= 0),
  min_quantity: number,
  max_quantity: number,
  unit: string,
  barcode: string,
  location: string,
  notes: string,
  status: "active" | "inactive"
}
```

### 4.17 الإشعارات (notifications)
```typescript
{
  id: number (PK),
  title: string,
  title_ar: string,
  message: string,
  message_ar: string,
  type: "whatsapp" | "sms" | "email" | "push" | "system",
  priority: "low" | "normal" | "high" | "urgent",
  recipient_type: "user" | "group" | "role" | "all",
  recipient_id: string,
  phone_number: string,
  status: "pending" | "sent" | "delivered" | "failed" | "read",
  context_type: "attendance" | "order" | "maintenance" | "hr",
  context_id: string,
  created_at: timestamp
}
```

### 4.18 جداول إضافية

| اسم الجدول | الوصف |
|---|---|
| `cuts` | عمليات التقطيع لكل رول |
| `warehouse_receipts` | إيصالات استلام المستودع |
| `machine_queues` | طوابير المكائن وجدولة الإنتاج |
| `production_settings` | إعدادات الإنتاج العامة |
| `waste` | سجل الهدر |
| `quality_checks` | فحوصات الجودة |
| `spare_parts` | قطع الغيار |
| `consumable_parts_transactions` | حركات القطع الاستهلاكية |
| `maintenance_reports` | بلاغات الصيانة للإدارة |
| `operator_negligence_reports` | بلاغات إهمال المشغلين |
| `violations` | المخالفات |
| `items` | الأصناف والمواد |
| `categories` | المجموعات/الفئات |
| `locations` | المواقع الجغرافية |
| `suppliers` | الموردين |
| `warehouse_transactions` | حركات المستودع |
| `training_records` | سجلات التدريب |
| `training_programs` | البرامج التدريبية |
| `training_materials` | المواد التدريبية |
| `training_enrollments` | تسجيل الموظفين في التدريب |
| `training_evaluations` | تقييمات التدريب |
| `training_certificates` | شهادات التدريب |
| `performance_reviews` | تقييمات الأداء |
| `performance_criteria` | معايير التقييم |
| `performance_ratings` | درجات التقييم التفصيلية |
| `leave_types` | أنواع الإجازات |
| `leave_balances` | أرصدة الإجازات |
| `admin_decisions` | القرارات الإدارية |
| `company_profile` | بيانات المصنع |
| `notification_templates` | قوالب الإشعارات |
| `notification_event_settings` | إعدادات أحداث الإشعارات |
| `notification_event_logs` | سجل الإشعارات المرسلة |
| `face_registrations` | تسجيل بصمة الوجه |
| `quality_issues` | مشاكل الجودة |
| `quality_issue_responsibles` | المسؤولون عن مشاكل الجودة |
| `quality_issue_actions` | إجراءات مشاكل الجودة |
| `mixing_recipes` | وصفات الخلط |
| `master_batch_colors` | ألوان الماستر باتش |
| `alert_rules` | قواعد التنبيهات |
| `system_settings` | إعدادات النظام |
| `user_settings` | إعدادات المستخدم |
| `factory_locations` | مواقع المصنع GPS |
| `display_slides` | شرائح شاشة العرض |
| `quotes` | عروض الأسعار |
| `quote_templates` | قوالب عروض الأسعار |
| `ai_agent_settings` | إعدادات الوكيل الذكي |
| `ai_agent_knowledge` | قاعدة معرفة الوكيل الذكي |
| `quick_notes` | الملاحظات السريعة |
| `user_requests` | طلبات المستخدمين |

---

## 5. واجهات API الكاملة (Complete API Reference)

### ملاحظات عامة على الاستجابات:
- معظم الـ GET endpoints تُرجع `{ data: [...] }` أو مصفوفة مباشرة
- تعامل مع كلا الحالتين في الجوال: `response.data || response`
- الأخطاء تُرجع `{ message: "..." }` مع HTTP status مناسب
- جميع الطلبات المحمية تتطلب مصادقة ما لم يُذكر خلاف ذلك

---

### 5.1 لوحة التحكم (Dashboard)

```
GET /api/dashboard/stats
Auth: requireAuth
Response: {
  totalOrders: number,
  totalProductionOrders: number,
  activeProductionOrders: number,
  completedOrders: number,
  totalRolls: number,
  totalUsers: number,
  totalMachines: number,
  activeMachines: number,
  ...
}

GET /api/dashboard/config
Auth: requireAuth
Response: { widgets: [...] }   // تكوين widgets لكل مستخدم

PUT /api/dashboard/config
Auth: requireAuth
Body: { widgets: [...] }
```

---

### 5.2 الطلبات (Orders)

```
GET /api/orders
Auth: requireAuth
Query: ?status=waiting&customer_id=CID001
Response: { data: [Order] }

GET /api/orders/next-number
Auth: requireAuth
Response: { order_number: "ORD-0045" }

POST /api/orders
Auth: requireAuth + manage_orders
Body: {
  order_number: string,
  customer_id: string,
  delivery_days: number,
  delivery_date: string,
  notes: string,
  items: [{
    customer_product_id: number,
    quantity_kg: number,
    overrun_percentage: number
  }]
}

PUT /api/orders/:id
Auth: requireAuth + manage_orders
Body: { ...partial Order fields }

DELETE /api/orders/:id
Auth: requireAuth + manage_orders

GET /api/orders/enhanced
Auth: requireAuth
// طلبات مع بيانات مدمجة (عميل + أوامر إنتاج + رولات)
```

---

### 5.3 أوامر الإنتاج (Production Orders)

```
GET /api/production-orders
Auth: requireAuth
Query: ?status=active&order_id=1
Response: { data: [ProductionOrder] }

GET /api/production-orders/:id
Auth: requireAuth
Response: ProductionOrder (مع relations)

POST /api/production-orders
Auth: requireAuth + manage_production
Body: {
  order_id: number,
  customer_product_id: number,
  quantity_kg: number,
  overrun_percentage: number,
  assigned_machine_id: string,
  assigned_operator_id: number
}

POST /api/production-orders/batch
Auth: requireAuth + manage_production
// إنشاء عدة أوامر إنتاج دفعة واحدة

GET /api/production-orders/active-for-operator
Auth: requireAuth
// أوامر الإنتاج النشطة للمشغل الحالي

GET /api/production-orders/:id/printing-progress
Auth: requireAuth
// تقدم الطباعة لأمر إنتاج محدد
```

---

### 5.4 الرولات (Rolls)

```
GET /api/rolls
Auth: requireAuth
Query: ?production_order_id=1&stage=film
Response: { data: [Roll] }

GET /api/rolls/:id
Auth: requireAuth

PATCH /api/rolls/:id
Auth: requireAuth + (manage_production|view_film_dashboard|view_printing_dashboard|view_cutting_dashboard)
Body: {
  stage: string,
  weight_kg: number,
  waste_kg: number,
  printing_machine_id: string,
  cutting_machine_id: string,
  ...
}

POST /api/rolls/create-with-timing
Auth: requireAuth + (manage_production|view_film_dashboard)
Body: {
  production_order_id: number,
  weight_kg: number,
  film_machine_id: string,
  production_time_minutes: number,
  is_last_roll: boolean
}

POST /api/rolls/create-final
Auth: requireAuth + (manage_production|view_film_dashboard)
// إنشاء الرول الأخير مع إغلاق أمر الإنتاج

POST /api/rolls/:id/mark-printed
Auth: requireAuth + (manage_production|view_printing_dashboard)
Body: {
  printing_machine_id: string,
  printed_by: number
}

GET /api/rolls/active-for-printing
Auth: requireAuth
// رولات جاهزة للطباعة

GET /api/rolls/active-for-cutting
Auth: requireAuth
// رولات جاهزة للتقطيع

GET /api/rolls/printing-queue-by-section
Auth: requireAuth
// طابور الطباعة مصنف حسب القسم
```

---

### 5.5 المكائن (Machines)

```
GET /api/machines
Auth: requireAuth
Response: { data: [Machine] }

POST /api/machines
Auth: requireAuth + (manage_machines|manage_definitions)
Body: { id, name, name_ar, type, section_id, status, screw_type, capacities... }

PUT /api/machines/:id
Auth: requireAuth + (manage_machines|manage_definitions)

DELETE /api/machines/:id
Auth: requireAuth + (manage_machines|manage_definitions)

GET /api/machines/capacity-stats
Auth: requireAuth
// إحصائيات سعة المكائن
```

---

### 5.6 طوابير المكائن (Machine Queues)

```
GET /api/machine-queues
Auth: requireAuth
Query: ?machine_id=M001

POST /api/machine-queues/assign
Auth: requireAuth
Body: {
  machine_id: string,
  production_order_id: number,
  queue_position: number
}

PUT /api/machine-queues/reorder
Auth: requireAuth + manage_production
Body: { machine_id: string, order: [id1, id2, ...] }

DELETE /api/machine-queues/:id
Auth: requireAuth + manage_production

GET /api/machine-queues/suggest
Auth: requireAuth
// اقتراح أفضل ماكينة لأمر إنتاج

POST /api/machine-queues/smart-distribute
Auth: requireAuth
// توزيع ذكي للأوامر على المكائن

POST /api/machine-queues/optimize/:machineId
Auth: requireAuth
// تحسين ترتيب الطابور
```

---

### 5.7 العملاء (Customers)

```
GET /api/customers
Auth: requireAuth
Response: { data: [Customer] }

POST /api/customers
Auth: requireAuth + (manage_customers|manage_definitions)

PUT /api/customers/:id
Auth: requireAuth + (manage_customers|manage_definitions)

DELETE /api/customers/:id
Auth: requireAuth + (manage_customers|manage_definitions)
```

---

### 5.8 منتجات العملاء (Customer Products)

```
GET /api/customer-products
Auth: requireAuth
Query: ?customer_id=CID001

POST /api/customer-products
Auth: requireAuth + (manage_customers|manage_definitions)

PUT /api/customer-products/:id
Auth: requireAuth + (manage_customers|manage_definitions)

DELETE /api/customer-products/:id
Auth: requireAuth + (manage_customers|manage_definitions)
```

---

### 5.9 المستخدمون (Users)

```
GET /api/users
Auth: requireAuth
Response: { data: [User] }

GET /api/users/:id
Auth: requireAuth

GET /api/users/sales-reps
Auth: requireAuth
// مندوبي المبيعات فقط

POST /api/users
Auth: requireAuth + manage_users
Body: {
  username: string,
  password: string,
  display_name: string,
  display_name_ar: string,
  full_name: string,
  phone: string,
  email: string,
  role_id: number,
  section_id: number
}

PUT /api/users/:id
Auth: requireAuth + manage_users

DELETE /api/users/:id
Auth: requireAuth + manage_users
```

---

### 5.10 الحضور والانصراف (Attendance)

```
GET /api/attendance
Auth: requireAuth
Query: ?user_id=1&date=2026-04-01&from_date=...&to_date=...
Response: { data: [Attendance] }

GET /api/attendance/daily-status/:userId
Auth: requireAuth
// حالة حضور اليوم لمستخدم محدد

POST /api/attendance/manual
Auth: requireAuth + manage_attendance
Body: {
  user_id: number,
  date: string,
  status: string,
  check_in_time: string,
  check_out_time: string,
  shift_type: string,
  notes: string
}

PUT /api/attendance/:id
Auth: requireAuth + manage_attendance

DELETE /api/attendance/:id
Auth: requireAuth + manage_attendance

GET /api/attendance/summary/:userId
Auth: requireAuth
// ملخص حضور شهري

GET /api/attendance/report/:userId
Auth: requireAuth
Query: ?month=4&year=2026
// تقرير حضور تفصيلي

GET /api/attendance/report/:userId/export
Auth: requireAuth
// تصدير تقرير الحضور (Excel/PDF)

GET /api/attendance/report
Auth: requireAuth + view_attendance_reports
// تقرير حضور شامل لجميع الموظفين

POST /api/attendance/import
Auth: requireAuth + manage_attendance
Content-Type: multipart/form-data
Body: file (Excel)
// استيراد حضور من ملف Excel

GET /api/attendance/template/:userId
Auth: requireAuth
// قالب Excel للحضور
```

---

### 5.11 الموارد البشرية - الإجازات (HR - Leaves)

```
GET /api/hr/leave-types
Auth: requireAuth

POST /api/hr/leave-types
Auth: requireAuth + manage_hr

GET /api/hr/leave-requests
Auth: requireAuth
Query: ?employee_id=1&status=pending

POST /api/hr/leave-requests
Auth: requireAuth + manage_hr
Body: {
  employee_id: string,
  leave_type_id: number,
  start_date: string,
  end_date: string,
  days_count: number,
  reason: string
}

PUT /api/hr/leave-requests/:id
Auth: requireAuth + manage_hr
// تحديث حالة الطلب (موافقة/رفض)

GET /api/hr/leave-requests/pending
Auth: requireAuth
// الطلبات المعلقة

GET /api/hr/leave-balances/:employeeId
Auth: requireAuth
// أرصدة الإجازات

POST /api/hr/leave-balances
Auth: requireAuth + manage_hr
// تخصيص رصيد إجازة
```

---

### 5.12 الموارد البشرية - التدريب (HR - Training)

```
GET /api/hr/training-programs
Auth: requireAuth

POST /api/hr/training-programs
Auth: requireAuth + manage_hr

PUT /api/hr/training-programs/:id
Auth: requireAuth + manage_hr

GET /api/hr/training-programs/:id
Auth: requireAuth
// تفاصيل برنامج مع المواد والتسجيلات

GET /api/hr/training-materials
Auth: requireAuth
Query: ?program_id=1

POST /api/hr/training-materials
Auth: requireAuth + manage_hr

GET /api/hr/training-enrollments
Auth: requireAuth
Query: ?program_id=1&employee_id=1

POST /api/hr/training-enrollments
Auth: requireAuth + manage_hr

PUT /api/hr/training-enrollments/:id
Auth: requireAuth + manage_hr

GET /api/hr/training-evaluations
Auth: requireAuth

POST /api/hr/training-evaluations
Auth: requireAuth + manage_hr
Body: {
  enrollment_id: number,
  theoretical_understanding: 1-5,
  practical_skills: 1-5,
  safety_compliance: 1-5,
  teamwork: 1-5,
  communication: 1-5,
  overall_rating: 1-5,
  recommendation: "pass" | "fail" | "needs_retraining"
}

GET /api/hr/training-certificates
Auth: requireAuth

POST /api/hr/training-certificates
Auth: requireAuth + manage_hr

GET /api/hr/training-certificates/:id/generate
Auth: requireAuth
// توليد ملف PDF للشهادة
```

---

### 5.13 الموارد البشرية - تقييم الأداء (HR - Performance)

```
GET /api/hr/performance-reviews
Auth: requireAuth

POST /api/hr/performance-reviews
Auth: requireAuth + manage_hr
Body: {
  employee_id: string,
  reviewer_id: string,
  review_period_start: string,
  review_period_end: string,
  review_type: "annual" | "semi_annual" | "quarterly" | "probation",
  overall_rating: 1-5,
  ...
}

PUT /api/hr/performance-reviews/:id
Auth: requireAuth + manage_hr

GET /api/hr/performance-criteria
Auth: requireAuth

POST /api/hr/performance-criteria
Auth: requireAuth + manage_hr
```

---

### 5.14 الصيانة (Maintenance)

```
GET /api/maintenance-requests
Auth: requireAuth
Response: { data: [MaintenanceRequest] }

POST /api/maintenance-requests
Auth: requireAuth + manage_maintenance
Body: {
  machine_id: string,
  issue_type: "mechanical" | "electrical" | "other",
  description: string,
  urgency_level: "normal" | "medium" | "urgent"
}

GET /api/maintenance-actions
Auth: requireAuth

GET /api/maintenance-actions/request/:requestId
Auth: requireAuth
// إجراءات مرتبطة بطلب صيانة محدد

POST /api/maintenance-actions
Auth: requireAuth + manage_maintenance
Body: {
  maintenance_request_id: number,
  action_type: string,
  description: string,
  text_report: string,
  spare_parts_request: string,
  requires_management_action: boolean
}

PUT /api/maintenance-actions/:id
Auth: requireAuth + manage_maintenance

DELETE /api/maintenance-actions/:id
Auth: requireAuth + manage_maintenance

GET /api/maintenance-reports
Auth: requireAuth

POST /api/maintenance-reports
Auth: requireAuth + manage_maintenance

PUT /api/maintenance-reports/:id
Auth: requireAuth + manage_maintenance

DELETE /api/maintenance-reports/:id
Auth: requireAuth + manage_maintenance
```

---

### 5.15 بلاغات إهمال المشغلين (Operator Negligence)

```
GET /api/operator-negligence-reports
Auth: requireAuth

POST /api/operator-negligence-reports
Auth: requireAuth
Body: {
  operator_id: number,
  machine_id: string,
  negligence_type: string,
  description: string,
  damage_cost: number,
  downtime_hours: number
}

PUT /api/operator-negligence-reports/:id
Auth: requireAuth

DELETE /api/operator-negligence-reports/:id
Auth: requireAuth + (manage_production|manage_maintenance)
```

---

### 5.16 قطع الغيار (Spare Parts)

```
GET /api/spare-parts
Auth: requireAuth

POST /api/spare-parts
Auth: requireAuth + manage_maintenance

PUT /api/spare-parts/:id
Auth: requireAuth + manage_maintenance

DELETE /api/spare-parts/:id
Auth: requireAuth + manage_maintenance
```

---

### 5.17 القطع الاستهلاكية (Consumable Parts)

```
GET /api/consumable-parts
Auth: requireAuth

POST /api/consumable-parts
Auth: requireAuth + manage_maintenance

PUT /api/consumable-parts/:id
Auth: requireAuth + manage_maintenance

DELETE /api/consumable-parts/:id
Auth: requireAuth + manage_maintenance

GET /api/consumable-parts-transactions
Auth: requireAuth
Query: ?consumable_part_id=1

POST /api/consumable-parts-transactions
Auth: requireAuth
Body: {
  consumable_part_id: number,
  transaction_type: "in" | "out",
  quantity: number,
  transaction_reason: string
}

POST /api/consumable-parts/scan-barcode
Auth: requireAuth
Body: { barcode: string }
// مسح باركود قطعة استهلاكية

POST /api/consumable-parts/barcode-transaction
Auth: requireAuth
Body: {
  barcode: string,
  transaction_type: "in" | "out",
  quantity: number
}
```

---

### 5.18 الجودة (Quality)

```
GET /api/quality-checks
Auth: requireAuth

GET /api/quality-issues
Auth: requireAuth
Query: ?status=open&severity=high

GET /api/quality-issues/stats
Auth: requireAuth

GET /api/quality-issues/:id
Auth: requireAuth

POST /api/quality-issues
Auth: requireAuth + manage_quality
Body: {
  title: string,
  description: string,
  severity: string,
  category: string,
  production_order_id: number,
  machine_id: string
}

PATCH /api/quality-issues/:id
Auth: requireAuth + manage_quality

DELETE /api/quality-issues/:id
Auth: requireAuth + manage_quality

POST /api/quality-issues/:id/responsibles
Auth: requireAuth + manage_quality
Body: { user_id: number, responsibility: string }

PATCH /api/quality-issues/responsibles/:id
Auth: requireAuth + manage_quality

DELETE /api/quality-issues/responsibles/:id
Auth: requireAuth + manage_quality

POST /api/quality-issues/:id/actions
Auth: requireAuth + manage_quality
Body: { action_type: string, description: string }

PATCH /api/quality-issues/actions/:id
Auth: requireAuth + manage_quality
```

---

### 5.19 المستودع (Warehouse)

```
GET /api/inventory
Auth: requireAuth

GET /api/inventory/stats
Auth: requireAuth
// إحصائيات المخزون

POST /api/inventory
Auth: requireAuth + manage_warehouse

PUT /api/inventory/:id
Auth: requireAuth + manage_warehouse

DELETE /api/inventory/:id
Auth: requireAuth + manage_warehouse

GET /api/inventory-movements
Auth: requireAuth

POST /api/inventory-movements
Auth: requireAuth + manage_warehouse

DELETE /api/inventory-movements/:id
Auth: requireAuth + manage_warehouse

GET /api/warehouse-items
Auth: requireAuth

GET /api/warehouse-transactions
Auth: requireAuth

POST /api/warehouse-transactions
Auth: requireAuth + manage_warehouse

// سندات المستودع
GET /api/warehouse/vouchers
Auth: requireAuth

POST /api/warehouse/vouchers
Auth: requireAuth + manage_warehouse_vouchers

GET /api/warehouse/vouchers/:id
Auth: requireAuth

// الإرساليات
GET /api/warehouse/shipments
Auth: requireAuth

POST /api/warehouse/shipments
Auth: requireAuth + manage_warehouse

// عد المخزون
GET /api/warehouse/inventory-counts
Auth: requireAuth

POST /api/warehouse/inventory-counts
Auth: requireAuth + manage_warehouse

// الاستيراد
POST /api/warehouse/import/opening-balance
Auth: requireAuth, Content-Type: multipart/form-data

POST /api/warehouse/import/suppliers
Auth: requireAuth, Content-Type: multipart/form-data

GET /api/warehouse/template/:type
Auth: requireAuth
// قوالب Excel (opening-balance, suppliers)

// التقارير
GET /api/warehouse/reports/movements
GET /api/warehouse/reports/stock-levels
GET /api/warehouse/reports/alerts
GET /api/warehouse/reports/summary
```

---

### 5.20 التعريفات (Definitions)

```
// الأقسام
GET /api/sections
POST /api/sections              (manage_sections|manage_definitions)
PUT /api/sections/:id           (manage_sections|manage_definitions)
DELETE /api/sections/:id        (manage_sections|manage_definitions)

// الفئات
GET /api/categories
POST /api/categories            (manage_categories|manage_definitions)
PUT /api/categories/:id         (manage_categories|manage_definitions)
DELETE /api/categories/:id      (manage_categories|manage_definitions)

// الأصناف
GET /api/items
POST /api/items                 (manage_items|manage_definitions)
PUT /api/items/:id              (manage_items|manage_definitions)
DELETE /api/items/:id           (manage_items|manage_definitions)

// المواقع
GET /api/locations
POST /api/locations
PUT /api/locations/:id
DELETE /api/locations/:id       (manage_warehouse|manage_definitions)

// ألوان الماستر باتش
GET /api/master-batch-colors
GET /api/master-batch-colors/:id
POST /api/master-batch-colors   (manage_master_batch|manage_definitions)
PUT /api/master-batch-colors/:id
DELETE /api/master-batch-colors/:id

// الموردين
GET /api/suppliers
POST /api/suppliers
PUT /api/suppliers/:id
DELETE /api/suppliers/:id
```

---

### 5.21 التقارير (Reports)

```
GET /api/reports/orders
Auth: requireAuth

GET /api/reports/hr
Auth: requireAuth

GET /api/reports/advanced-metrics
Auth: requireAuth

GET /api/reports/production-by-date
Auth: requireAuth
Query: ?from_date=...&to_date=...

GET /api/reports/production-by-product
Auth: requireAuth

GET /api/reports/waste-analysis
Auth: requireAuth

GET /api/reports/machine-performance
Auth: requireAuth

GET /api/reports/operator-performance
Auth: requireAuth

POST /api/reports/export
Auth: requireAuth
Body: { report_type: string, format: "excel" | "pdf", filters: {...} }
```

---

### 5.22 الإشعارات (Notifications)

```
GET /api/notifications
Auth: requireAuth
Response: { data: [Notification] }

GET /api/notifications/user
Auth: requireAuth
// إشعارات المستخدم الحالي

DELETE /api/notifications/delete/:id
Auth: requireAuth

GET /api/notifications/stream
Auth: requireAuth
// Server-Sent Events (SSE) للإشعارات الفورية
// Content-Type: text/event-stream
// في الجوال: استخدم EventSource أو polling بديلاً

// إعدادات أحداث الإشعارات
GET /api/notification-event-settings
GET /api/notification-event-settings/:id
POST /api/notification-event-settings         (requireAdmin)
PATCH /api/notification-event-settings/:id    (requireAdmin)
DELETE /api/notification-event-settings/:id   (requireAdmin)

GET /api/notification-event-logs
Auth: requireAuth
```

---

### 5.23 SMS (Taqnyat)

```
POST /api/sms/test
Auth: requireAuth
Body: { phone: string, message: string }

GET /api/sms/balance
Auth: requireAuth

GET /api/sms/senders
Auth: requireAuth

GET /api/sms/status
Auth: requireAuth
```

---

### 5.24 الوكيل الذكي (AI Agent)

```
POST /api/ai-agent/chat
Auth: requireAuth
Body: {
  message: string,
  context: object     // سياق اختياري
}
Response: {
  response: string,
  suggestions: string[]
}

POST /api/ai-agent/upload
Auth: requireAuth
Content-Type: multipart/form-data
Body: file

POST /api/ai-agent/transcribe
Auth: requireAuth
Content-Type: multipart/form-data
Body: audio file
// تحويل صوت إلى نص

GET /api/ai-agent/settings
Auth: requireAuth

PUT /api/ai-agent/settings/:key
Auth: requireAuth

GET /api/ai-agent/knowledge
Auth: requireAuth
// قاعدة المعرفة

POST /api/ai-agent/knowledge
Auth: requireAuth

PUT /api/ai-agent/knowledge/:id
Auth: requireAuth

DELETE /api/ai-agent/knowledge/:id
Auth: requireAuth

GET /api/ai-agent/download/:filename
Auth: requireAuth
```

---

### 5.25 عروض الأسعار (Quotes)

```
GET /api/quotes
Auth: requireAuth

GET /api/quotes/:id
Auth: requireAuth

GET /api/quotes/:id/pdf
// تحميل PDF لعرض السعر (بدون مصادقة)

GET /api/pdf/quotes/:documentNumber
// تحميل PDF برقم المستند

GET /api/quote-templates
Auth: requireAuth

GET /api/quote-templates/active
Auth: requireAuth

POST /api/quote-templates
Auth: requireAuth

PUT /api/quote-templates/:id
Auth: requireAuth

DELETE /api/quote-templates/:id
Auth: requireAuth
```

---

### 5.26 وصفات الخلط (Mixing Recipes)

```
GET /api/mixing-recipes
Auth: requireAuth

POST /api/mixing-recipes
Auth: requireAuth + (manage_mixing|manage_production)
Body: {
  name: string,
  raw_materials: [{
    item_id: string,
    percentage: number
  }]
}
```

---

### 5.27 التحقق من الوجه (Face Verification)

```
GET /api/face-verification/status/:userId
Auth: requireAuth
Response: { registered: boolean, updated_at: string }

POST /api/face-verification/register
Auth: requireAuth
Body: {
  userId: number,
  faceImage: string    // Base64 encoded image
}
// ملاحظة: المستخدم يمكنه تسجيل وجهه فقط (المدير يمكنه تسجيل أي وجه)

POST /api/face-verification/verify
Auth: requireAuth
Body: {
  userId: number,
  faceImage: string    // Base64 encoded image
}
Response: {
  verified: boolean,
  confidence: number
}

GET /api/face-verification/logs/:userId
Auth: requireAuth
```

---

### 5.28 محاكاة المصنع ثلاثية الأبعاد (Factory 3D)

```
GET /api/factory-3d/active-rolls
Auth: requireAuth

GET /api/factory-3d/machine-stats/:machineId
Auth: requireAuth

GET /api/factory-3d/layout
Auth: requireAuth

POST /api/factory-3d/layout
Auth: requireAuth
Body: { ...layout data }

GET /api/factory-3d/machines
Auth: requireAuth

GET /api/factory-3d/machine-orders/:machineId
Auth: requireAuth

GET /api/factory-3d/production-users
Auth: requireAuth

// لقطات المصنع
GET /api/factory-3d/snapshots
POST /api/factory-3d/snapshots
GET /api/factory-3d/snapshots/:id
DELETE /api/factory-3d/snapshots/:id
GET /api/factory-3d/snapshots/share/:token    // بدون مصادقة
```

---

### 5.29 شاشة العرض (Display Screen)

```
GET /api/display/slides
Auth: requireAuth

GET /api/display/slides/active
// بدون مصادقة - للشاشات العامة

POST /api/display/slides
Auth: requireAuth

PUT /api/display/slides/:id
Auth: requireAuth

PUT /api/display/slides/reorder
Auth: requireAuth + manage_display_screen

DELETE /api/display/slides/:id
Auth: requireAuth

POST /api/display/upload-image
Auth: requireAuth
Content-Type: multipart/form-data

// بيانات حية للشاشة (بدون مصادقة)
GET /api/display/live/recent-production
GET /api/display/live/latest-rolls
GET /api/display/live/production-stats
GET /api/display/live/attendance
GET /api/display/live/top-producers
```

---

### 5.30 الإعدادات والنظام (Settings & System)

```
GET /api/settings/system
Auth: requireAuth + manage_settings

POST /api/settings/system
Auth: requireAuth + manage_settings

GET /api/settings/user/:userId
Auth: requireAuth

POST /api/settings/user/:userId
Auth: requireAuth

// قاعدة البيانات (Admin فقط)
GET /api/database/stats
POST /api/database/backup
POST /api/database/restore
GET /api/database/export/:tableName
GET /api/database/table-schema/:tableName
POST /api/database/optimize
POST /api/database/integrity-check
POST /api/database/cleanup

// الإعداد الأولي
GET /api/setup/status
POST /api/setup/initialize
Body: {
  companyName: string,
  adminUsername: string,
  adminPassword: string,
  ...
}

// صحة الخادم
GET /api/health
// بدون مصادقة
Response: { status: "ok", timestamp: string }

// حالة الجوال
GET /api/mobile/status
// بدون مصادقة
Response: {
  status: "online",
  version: "2.0.0",
  api_version: "v2",
  features: [...],
  auth: { token_expiry_hours, refresh_token_expiry_days, ... }
}
```

---

### 5.32 واجهات الجوال المحسّنة (Mobile-Optimized APIs)

```
// لوحة التحكم المختصرة
GET /api/mobile/dashboard
Auth: requireAuth
Response: {
  orders: { total, waiting, in_production, completed },
  production: { total, active, completed },
  machines: { total, active, maintenance, down },
  today_attendance: { status, check_in_time, check_out_time } | null,
  unread_notifications: number
}

// بيانات المزامنة
GET /api/mobile/sync/metadata
Auth: requireAuth
Response: {
  data: {
    "orders": { count: number, last_updated: "ISO8601" | null },
    "production_orders": { ... },
    "rolls": { ... },
    ...
  },
  server_time: "ISO8601"
}

// مزامنة الحضور (دفعة واحدة)
POST /api/mobile/sync/attendance
Auth: requireAuth
Body: {
  records: [{
    date: "YYYY-MM-DD",
    status: "string",
    check_in_time: "string",
    check_out_time: "string",
    location_accuracy: "string",
    distance_from_factory: "string",
    device_info: "string",
    notes: "string",
    shift_type: "string",
    client_id: "string"
  }]
}
Response: {
  data: [{ client_id, status: "created"|"updated"|"error", server_id?, error? }],
  synced: number,
  errors: number
}
// ملاحظة: user_id يُجبر على المستخدم الحالي، فقط Admin يمكنه تحديد user_id مختلف

// قائمة الانتظار للإجراءات
POST /api/mobile/sync/actions
Auth: requireAuth
Body: {
  actions: [{
    action_type: "create"|"update"|"delete",
    entity_type: "string",
    entity_data: { ... },
    client_timestamp: "ISO8601",
    client_id: "string"
  }]
}
Response: { data: [...], queued: number, errors: number }

// رفع صورة
POST /api/mobile/upload/image
Auth: requireAuth
Content-Type: multipart/form-data
Fields: image (file), purpose?, entity_type?, entity_id?
Limits: 10MB max, JPEG/PNG/WebP/HEIC only
Response: {
  success: true,
  image: { data_url, mimetype, size, original_name, purpose, entity_type, entity_id }
}

// التنبيهات
GET /api/alerts
POST /api/alerts/:id/resolve
GET /api/system/health/overview
GET /api/system/performance

// الملاحظات السريعة
GET /api/quick-notes
POST /api/quick-notes
PUT /api/quick-notes/:id
DELETE /api/quick-notes/:id

// طلبات المستخدمين
GET /api/user-requests
POST /api/user-requests
PUT /api/user-requests/:id

// بيانات الشركة
GET /api/company-profile
POST /api/company-profile

// PDF
POST /api/pdf/generate
GET /api/pdf/status
GET /api/pdf/templates

// ترجمة الأسماء
POST /api/translate-name
Body: { name: string, from: "ar"|"en", to: "ar"|"en" }
```

---

## 6. صفحات التطبيق والتنقل (App Pages & Navigation)

### 6.1 هيكل التنقل الرئيسي

#### المجموعة الأساسية (Primary)
| الصفحة | المسار | الوصف |
|---|---|---|
| الرئيسية | `/` | لوحة تحكم بويدجتات قابلة للتخصيص |
| لوحة المستخدم | `/user-dashboard` | لوحة شخصية (حضور، طلبات) |
| الطلبات والإنتاج | `/orders` | إدارة طلبات البيع وأوامر الإنتاج والرولات |
| لوحة الإنتاج | `/production-dashboard` | لوحة موحدة للمشغلين (فيلم/طباعة/تقطيع) |
| مراقبة الإنتاج | `/production-monitoring` | مراقبة حية لخطوط الإنتاج |
| المستودع | `/warehouse` | إدارة المخزون والسندات |
| الوكيل الذكي | `/ai-agent` | مساعد ذكي بالذكاء الاصطناعي |
| محاكاة المصنع | `/factory-simulation` | خريطة ثلاثية الأبعاد للمصنع |
| شاشة العرض | `/display-control` | التحكم بشاشة العرض |

#### المجموعة المساندة (Support)
| الصفحة | المسار | الوصف |
|---|---|---|
| الجودة | `/quality` | إدارة الجودة والفحوصات |
| الصيانة | `/maintenance` | طلبات وإجراءات الصيانة |
| الموارد البشرية | `/hr` | حضور، إجازات، تدريب، أداء |

#### مجموعة الإدارة (Admin)
| الصفحة | المسار | الوصف |
|---|---|---|
| التعريفات | `/definitions` | فئات، وحدات، مجموعات مواد |
| التقارير | `/reports` | تقارير شاملة |
| الأدوات | `/tools` | أدوات إدارية |
| إعدادات الوكيل | `/ai-agent-settings` | تكوين الوكيل الذكي |
| الإعدادات | `/settings` | إعدادات النظام والنسخ الاحتياطي |
| مراقبة النظام | `/system-monitoring` | أداء النظام والخادم |

#### صفحات الجوال المحسنة (Mobile-Optimized)
| الصفحة | المسار | النسخة الأصلية |
|---|---|---|
| الطلبات-جوال | `/orders-mobile` | `/orders` |
| المستودع-جوال | `/warehouse-mobile` | `/warehouse` |
| الإنتاج-جوال | `/production-mobile` | `/production` |
| لوحة المستخدم-جوال | `/user-dashboard-mobile` | `/user-dashboard` |
| لوحة الإنتاج-جوال | `/production-dashboard-mobile` | `/production-dashboard` |

---

### 6.2 تفاصيل كل صفحة

#### الرئيسية (Dashboard) `/`
- **ويدجتات قابلة للتخصيص:**
  - إحصائيات سريعة (طلبات، إنتاج، مكائن)
  - حالة المكائن الحية
  - اختصارات الوصول السريع
  - ملاحظات سريعة
  - ويدجت الحضور
  - ويدجت الصيانة
  - ويدجت المخزون
- **APIs:** `/api/dashboard/config`, `/api/dashboard/stats`, `/api/quick-notes`

#### لوحة المستخدم (User Dashboard) `/user-dashboard`
- حالة الحضور اليومية (تسجيل دخول/خروج)
- طلبات المستخدم الشخصية
- رصيد الإجازات
- **APIs:** `/api/attendance/daily-status/:userId`, `/api/user-requests`, `/api/hr/leave-balances/:id`

#### الطلبات والإنتاج (Orders) `/orders`
- **تبويبات:**
  1. طلبات البيع - إنشاء/تعديل/بحث
  2. أوامر الإنتاج - إدارة وتتبع
  3. طوابير الإنتاج - جدولة المكائن
  4. بحث الرولات - بحث بالرقم أو QR
  5. تقارير الإنتاج
- **APIs:** `/api/orders`, `/api/production-orders`, `/api/rolls`, `/api/customer-products`

#### لوحة الإنتاج (Production Dashboard) `/production-dashboard`
- **ثلاثة أوضاع حسب القسم:**
  1. **الفيلم (Film):** إنشاء رولات، تسجيل الوزن، وقت الإنتاج
  2. **الطباعة (Printing):** استلام رولات للطباعة، تسجيل اكتمال الطباعة
  3. **التقطيع (Cutting):** تقطيع الرولات، تسجيل الأوزان والهدر
- **الشاشة الرئيسية:** عرض هرمي للطلبات → أوامر إنتاج → رولات
- **APIs:** `/api/production-orders/active-for-operator`, `/api/rolls/create-with-timing`, `/api/rolls/:id/mark-printed`

#### المستودع (Warehouse) `/warehouse`
- **تبويبات:**
  1. المخزون الحالي - مستويات المخزون
  2. سندات الإدخال/الإخراج
  3. حركات المخزون
  4. الإرساليات
  5. عد المخزون (Inventory Count)
  6. تقارير المستودع
- **APIs:** `/api/inventory`, `/api/warehouse/vouchers`, `/api/warehouse/shipments`

#### الموارد البشرية (HR) `/hr`
- **تبويبات:**
  1. الحضور والانصراف
  2. الإجازات
  3. التدريب (برامج، تسجيلات، تقييمات، شهادات)
  4. تقييم الأداء
  5. القرارات الإدارية
  6. المخالفات

#### الصيانة (Maintenance) `/maintenance`
- **تبويبات:**
  1. طلبات الصيانة
  2. إجراءات الصيانة
  3. قطع الغيار
  4. القطع الاستهلاكية (مع باركود)
  5. بلاغات الإهمال
  6. تقارير الصيانة

#### الجودة (Quality) `/quality`
- مشاكل الجودة
- المسؤولون والإجراءات التصحيحية
- فحوصات الجودة
- إحصائيات

#### التعريفات (Definitions) `/definitions`
- العملاء ومنتجاتهم
- الأقسام
- الفئات
- الأصناف والمواد
- المكائن
- ألوان الماستر باتش
- المواقع الجغرافية
- الموردين

---

## 7. سير العمل الرئيسي (Core Business Workflows)

### 7.1 سير عمل الإنتاج الكامل

```
1. إنشاء طلب بيع (Order)
   POST /api/orders
   ↓
2. إنشاء أوامر إنتاج (Production Orders) لكل منتج في الطلب
   POST /api/production-orders
   ↓
3. تخصيص أمر إنتاج لماكينة فيلم
   POST /api/machine-queues/assign
   ↓
4. مشغل الفيلم ينتج رولات
   POST /api/rolls/create-with-timing
   (كل رول يسجل: الوزن، وقت الإنتاج، ماكينة الفيلم)
   ↓
5. آخر رول → إغلاق مرحلة الفيلم
   POST /api/rolls/create-final (is_last_roll: true)
   ↓
6. مشغل الطباعة يطبع الرولات (إذا المنتج مطبوع)
   POST /api/rolls/:id/mark-printed
   (الرول ينتقل من stage: film → printing)
   ↓
7. مشغل التقطيع يقطع الرولات
   PATCH /api/rolls/:id
   (stage: printing → cutting → done)
   (تسجيل: cut_weight_total_kg, waste_kg)
   ↓
8. استلام المستودع
   POST /api/warehouse/vouchers (type: "in")
   ↓
9. تسليم العميل
   POST /api/warehouse/shipments
```

### 7.2 سير عمل الحضور

```
1. تسجيل دخول الموظف
   POST /api/attendance/manual
   (status: "حاضر", check_in_time, GPS data)
   ↓
2. استراحة الغداء
   PUT /api/attendance/:id
   (lunch_start_time, lunch_end_time)
   ↓
3. تسجيل الخروج
   PUT /api/attendance/:id
   (check_out_time, work_hours محسوبة تلقائياً)
```

### 7.3 سير عمل الصيانة

```
1. إنشاء طلب صيانة
   POST /api/maintenance-requests
   ↓
2. إضافة إجراء صيانة
   POST /api/maintenance-actions
   ↓
3. إذا يحتاج قطع غيار
   POST /api/maintenance-reports (type: "spare_parts")
   ↓
4. إذا إهمال مشغل
   POST /api/operator-negligence-reports
   ↓
5. إغلاق الطلب
   PUT /api/maintenance-requests/:id (status: "resolved")
```

### 7.4 سير عمل الإجازات

```
1. تقديم طلب إجازة
   POST /api/hr/leave-requests
   ↓
2. موافقة المدير المباشر
   PUT /api/hr/leave-requests/:id
   (direct_manager_status: "approved")
   ↓
3. موافقة HR
   PUT /api/hr/leave-requests/:id
   (hr_status: "approved", final_status: "approved")
   ↓
4. تحديث رصيد الإجازات تلقائياً
```

---

## 8. ملاحظات مهمة لمطور الجوال

### 8.1 التعامل مع الاستجابات
```javascript
// بعض الـ APIs ترجع مصفوفة مباشرة وبعضها { data: [...] }
const response = await fetch('/api/users');
const json = await response.json();
const data = json.data || json;  // تعامل مع كلا الحالتين
```

### 8.2 اللغة والاتجاه
- التطبيق يدعم العربية (RTL) كلغة أساسية
- معظم الحقول لها نسخة عربية (`name_ar`, `title_ar`, `description_ar`)
- بعض حالات الحضور باللغة العربية: "حاضر"، "غائب"، "إجازة"

### 8.3 ميزات خاصة بالجوال يجب تنفيذها
1. **GPS للحضور:** إرسال `location_accuracy` و `distance_from_factory` مع الحضور
2. **مسح QR Code:** لبحث الرولات ومسح باركود القطع الاستهلاكية
3. **كاميرا:** لتسجيل/التحقق من الوجه (`/api/face-verification/*`)
4. **إشعارات Push:** بديل لـ SSE (`/api/notifications/stream`)
5. **وضع Offline:** تخزين مؤقت للبيانات الأساسية
6. **تسجيل صوتي:** لتحويل الصوت إلى نص في الوكيل الذكي

### 8.4 الأمان
- كلمات المرور مشفرة بـ bcrypt
- الجلسات محفوظة في PostgreSQL
- التحقق من الوجه بالهاش (مؤقت - يمكن استبداله بـ AWS Rekognition)
- Webhooks محمية بـ HMAC signatures
- صلاحيات RBAC على كل endpoint

### 8.5 الملفات المرفقة (File Uploads)
- استخدم `multipart/form-data` للملفات
- الأحجام المقبولة: صور (Base64 لتصاميم الكليشيه)، Excel (للاستيراد)، PDF
- endpoints الرفع: `/api/ai-agent/upload`, `/api/display/upload-image`, `/api/warehouse/import/*`

### 8.6 الوقت والتواريخ
- التواريخ بصيغة ISO 8601: `"2026-04-03"` أو `"2026-04-03T00:00:00.000Z"`
- المنطقة الزمنية: توقيت الخادم (يُفضل إرسال UTC)

### 8.7 أرقام تسلسلية تلقائية
- أرقام الطلبات: `GET /api/orders/next-number`
- أرقام الرولات: تُنشأ تلقائياً بصيغة `PO001-R001`
- أرقام الصيانة: `MO001`, `MA001`, `MR001`
- أرقام القطع: `CP001`, `CT001`

### 8.8 حدود وقيود البيانات
| القيد | القيمة |
|---|---|
| الحد الأقصى لوزن الرول | 2000 كجم |
| نسبة الزيادة (overrun) | 0-50% |
| المخزون | لا يقل عن 0 أبداً |
| تقييمات الأداء | مقياس 1-5 |
| أنواع المكائن | extruder, printer, cutter, quality_check |
| مراحل الرول | film → printing → cutting → done |
| حالات الطلب | waiting → in_production → completed/cancelled |
| حالات أمر الإنتاج | pending → active → completed/cancelled |

---

## 9. الرسم التخطيطي لعلاقات البيانات (Entity Relationships)

```
customers ──1:M──→ orders ──1:M──→ production_orders ──1:M──→ rolls
    │                                      │                      │
    │                                      │                      ├── cuts
    │                                      │                      └── waste
    │                                      │
    │                                      ├── warehouse_receipts
    │                                      └── machine_queues
    │
    └──1:M──→ customer_products ←── production_orders

users ──M:1──→ roles (permissions[])
  │
  ├──1:M──→ attendance
  ├──1:M──→ leave_requests ──→ leave_types
  ├──1:M──→ leave_balances
  ├──1:M──→ training_enrollments ──→ training_programs
  ├──1:M──→ performance_reviews
  ├──1:M──→ notifications
  └──M:1──→ sections

machines ──1:M──→ maintenance_requests ──1:M──→ maintenance_actions
    │                                              │
    │                                              ├── maintenance_reports
    │                                              └── operator_negligence_reports
    │
    └── machine_queues

items ──1:M──→ inventory ──1:M──→ inventory_movements
  │
  └── warehouse_transactions

consumable_parts ──1:M──→ consumable_parts_transactions
```

---

## 10. متغيرات البيئة المطلوبة (Environment Variables)

| المتغير | الوصف | مطلوب |
|---|---|---|
| `DATABASE_URL` | رابط PostgreSQL | نعم |
| `SESSION_SECRET` | مفتاح تشفير الجلسات | نعم |
| `OPENAI_API_KEY` | مفتاح OpenAI للوكيل الذكي | للـ AI |
| `TAQNYAT_API_KEY` | مفتاح خدمة Taqnyat SMS | للـ SMS |
| `TAQNYAT_SENDER_NAME` | اسم المرسل | للـ SMS |
| `META_WHATSAPP_TOKEN` | توكن Meta WhatsApp API | للواتساب |
| `META_WHATSAPP_PHONE_ID` | رقم هاتف Meta | للواتساب |
| `META_APP_SECRET` | سر تطبيق Meta (Webhook HMAC) | اختياري |
| `TWILIO_ACCOUNT_SID` | حساب Twilio | للواتساب/SMS |
| `TWILIO_AUTH_TOKEN` | توكن Twilio | للواتساب/SMS |
| `TWILIO_WHATSAPP_FROM` | رقم واتساب Twilio | للواتساب |
| `TAQNYAT_WEBHOOK_SECRET` | سر Webhook Taqnyat | اختياري |

---

## 11. توصيات لتطبيق الجوال

### 11.1 الهيكل المقترح
```
/screens
  /auth         → Login, ForgotPassword
  /dashboard    → MainDashboard, UserDashboard
  /orders       → OrdersList, OrderDetail, CreateOrder
  /production   → ProductionDashboard, FilmOperator, PrintOperator, CutOperator
  /warehouse    → Inventory, Vouchers, StockCount
  /hr           → Attendance, Leaves, Training, Performance
  /maintenance  → Requests, Actions, SpareParts, Consumables
  /quality      → Issues, Inspections
  /settings     → Profile, AppSettings
  /ai           → ChatBot, VoiceInput
/components
  /ui           → Button, Card, Input, Modal, Table
  /shared       → Header, Sidebar, QRScanner, GPSTracker
/services
  /api          → apiClient, authService, orderService, ...
/store          → AuthStore, AppStore (state management)
/utils          → formatDate, formatCurrency, permissions
/i18n           → ar.json, en.json
```

### 11.2 الأولويات للتنفيذ
1. **المرحلة 1:** المصادقة + لوحة المستخدم + الحضور (مع GPS)
2. **المرحلة 2:** الطلبات + أوامر الإنتاج + لوحة المشغلين
3. **المرحلة 3:** المستودع + المخزون
4. **المرحلة 4:** الموارد البشرية (إجازات + تدريب)
5. **المرحلة 5:** الصيانة + الجودة
6. **المرحلة 6:** الوكيل الذكي + التقارير + الميزات المتقدمة

---

*آخر تحديث: أبريل 2026*
*إجمالي جداول قاعدة البيانات: 92*
*إجمالي نقاط API: ~385 endpoint*
