export const toastMessages = {
  // Production Orders
  productionOrders: {
    activated: (orderNumber: string) => ({
      title: "✅ تم التفعيل بنجاح",
      description: `تم تفعيل أمر الإنتاج ${orderNumber} وإضافته لطابور المكائن`,
    }),
    assigned: (orderNumber: string) => ({
      title: "✅ تم التخصيص بنجاح",
      description: `تم تحديث تخصيص أمر الإنتاج ${orderNumber}`,
    }),
    cancelled: (orderNumber: string) => ({
      title: "✅ تم الإلغاء",
      description: `تم إلغاء أمر الإنتاج ${orderNumber}`,
    }),
    completed: (orderNumber: string) => ({
      title: "🎉 اكتمل الإنتاج",
      description: `تم إكمال أمر الإنتاج ${orderNumber} بنجاح`,
    }),
    errors: {
      activation:
        "فشل في تفعيل أمر الإنتاج. يرجى التحقق من البيانات والمحاولة مرة أخرى",
      assignment: "فشل في تحديث التخصيص. يرجى المحاولة مرة أخرى",
      fetch: "فشل في جلب أوامر الإنتاج. يرجى تحديث الصفحة",
      notFound: "أمر الإنتاج غير موجود",
    },
  },

  // Rolls
  rolls: {
    created: (rollNumber: string) => ({
      title: "✅ تم إنشاء الرول بنجاح",
      description: `تم إنشاء الرول ${rollNumber} وإضافته لقائمة الإنتاج`,
    }),
    printed: (rollNumber: string) => ({
      title: "✅ تمت الطباعة",
      description: `تم تأكيد طباعة الرول ${rollNumber} بنجاح`,
    }),
    cut: (rollNumber: string, netWeight: string) => ({
      title: "✅ اكتمل التقطيع",
      description: `تم تقطيع الرول ${rollNumber} بوزن صافي ${netWeight} كجم`,
    }),
    finalRollCreated: (rollNumber: string) => ({
      title: "🎉 تم إنشاء الرول النهائي",
      description: `تم إنشاء الرول النهائي ${rollNumber} وإكمال مرحلة الفيلم`,
    }),
    errors: {
      creation: "فشل في إنشاء الرول. يرجى التحقق من البيانات",
      printing: "فشل في تأكيد الطباعة. يرجى المحاولة مرة أخرى",
      cutting: "فشل في إدخال بيانات التقطيع. يرجى التحقق من الوزن المدخل",
      invalidWeight: "يرجى إدخال وزن صافي صحيح",
      search: "فشل في البحث عن الرولات. يرجى المحاولة مرة أخرى",
    },
  },

  // Queue Management
  queue: {
    updated: () => ({
      title: "✅ تم تحديث الطابور",
      description: "تم حفظ ترتيب الطابور بنجاح",
    }),
    assigned: (orderNumber: string, machineName: string) => ({
      title: "✅ تم التخصيص",
      description: `تم تخصيص أمر ${orderNumber} للماكينة ${machineName}`,
    }),
    removed: (orderNumber: string) => ({
      title: "✅ تم الإزالة",
      description: `تم إزالة أمر ${orderNumber} من الطابور`,
    }),
    smartDistribution: (count: number) => ({
      title: "🎯 تم التوزيع الذكي",
      description: `تم توزيع ${count} أمر على المكائن بكفاءة عالية`,
    }),
    errors: {
      update: "فشل في تحديث ترتيب الطابور. يرجى المحاولة مرة أخرى",
      assignment: "فشل في تخصيص الأمر. يرجى التحقق من توفر الماكينة",
      distribution: "فشل في التوزيع الذكي. يرجى المحاولة مرة أخرى",
    },
  },

  // Orders
  orders: {
    created: (orderNumber: string) => ({
      title: "✅ تم إنشاء الطلب",
      description: `تم إنشاء الطلب ${orderNumber} بنجاح`,
    }),
    updated: (orderNumber: string) => ({
      title: "✅ تم التحديث",
      description: `تم تحديث الطلب ${orderNumber} بنجاح`,
    }),
    converted: (orderNumber: string, count: number) => ({
      title: "🎉 تم التحويل لأوامر إنتاج",
      description: `تم تحويل الطلب ${orderNumber} إلى ${count} أمر إنتاج`,
    }),
    cancelled: (orderNumber: string) => ({
      title: "✅ تم الإلغاء",
      description: `تم إلغاء الطلب ${orderNumber}`,
    }),
    errors: {
      creation: "فشل في إنشاء الطلب. يرجى التحقق من البيانات",
      update: "فشل في تحديث الطلب. يرجى المحاولة مرة أخرى",
      conversion: "فشل في التحويل لأوامر إنتاج. يرجى المحاولة مرة أخرى",
      fetch: "فشل في جلب الطلبات. يرجى تحديث الصفحة",
    },
  },

  // Generic
  generic: {
    success: "تمت العملية بنجاح",
    error: "حدث خطأ. يرجى المحاولة مرة أخرى",
    saved: "تم الحفظ بنجاح",
    deleted: "تم الحذف بنجاح",
    loading: "جاري التحميل...",
    noData: "لا توجد بيانات",
    invalidData: "بيانات غير صحيحة. يرجى المراجعة",
    networkError: "خطأ في الاتصال. يرجى التحقق من الإنترنت",
    permissionDenied: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  },
};

export type ToastMessage = {
  title: string;
  description: string;
};
