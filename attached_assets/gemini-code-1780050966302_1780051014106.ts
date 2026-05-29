// server/routes.ts - تحديث مسار الماكينات لتفعيل موازنة الأحمال الديناميكية
app.put(
  "/api/machines/:id",
  requireAuth,
  requirePermission("edit_machines", "manage_machines", "manage_definitions"),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { status, ...otherFields } = req.body;

      // 1. جلب حالة الماكينة الحالية قبل التحديث لمعرفة ما إذا كانت ستتعطل
      const machineResult = await db.execute(sql`SELECT status, name_ar FROM machines WHERE id = ${id} LIMIT 1`);
      const oldStatus = machineResult.rows[0]?.status;
      const machineNameAr = machineResult.rows[0]?.name_ar || id;

      // 2. تحديث الماكينة في قاعدة البيانات
      const cleanedData = {
        ...otherFields,
        status: status === "" || status === null ? undefined : status,
      };
      const machine = await storage.updateMachine(id, cleanedData);

      // 3. إذا تغيرت الحالة إلى 'down' أو 'maintenance' وكان هناك أوامر في طابورها
      if ((status === "down" || status === "maintenance") && oldStatus === "active") {
        
        // جلب الأوامر المتأثرة في طابور هذه الماكينة
        const affectedQueue = await db.execute(sql`
          SELECT mq.id, mq.production_order_id, po.production_order_number 
          FROM machine_queues mq
          JOIN production_orders po ON mq.production_order_id = po.id
          WHERE mq.machine_id = ${id}
          ORDER BY mq.queue_position
        `);

        if (affectedQueue.rows.length > 0) {
          // جلب الماكينات البديلة النشطة من نفس القسم
          const backupMachines = await db.execute(sql`
            SELECT id, name_ar FROM machines 
            WHERE type = (SELECT type FROM machines WHERE id = ${id}) 
              AND status = 'active' AND id != ${id}
          `);

          // صياغة مقترح التوزيع الذكي للمشرف
          const suggestions = affectedQueue.rows.map((row: any, index: number) => {
            // توزيع الأوامر بالتناوب (Round-Robin) على الماكينات البديلة المتاحة
            const backupMachine = backupMachines.rows[index % backupMachines.rows.length];
            return {
              productionOrderId: row.production_order_id,
              orderNumber: row.production_order_number,
              fromMachine: id,
              toMachine: backupMachine ? backupMachine.id : "لا توجد ماكينة بديلة نشطة",
              toMachineName: backupMachine ? backupMachine.name_ar : "—"
            };
          });

          // 4. بث التنبيه الفوري الديناميكي عبر نظام الـ SSE للمشرفين متضمناً المقترح لقَبوله بضغطة زر واحدة
          if (notificationManager) {
            await notificationManager.sendToAll({
              title: "تنبيه موازنة الأحمال الديناميكية",
              title_ar: "⚠️ تعطل ماكينة وإعادة جدولة ذكية",
              message: `الماكينة ${machineNameAr} تعطلت ويوجد ${affectedQueue.rows.length} أوامر إنتاج تتطلب إعادة توزيع.`,
              message_ar: `الماكينة ${machineNameAr} تعطلت ويوجد ${affectedQueue.rows.length} أوامر إنتاج تتطلب إعادة توزيع.`,
              type: "production",
              priority: "high",
              context_type: "load_balancing_suggestion",
              context_id: id,
              sound: true,
              context_data: {
                machineId: id,
                machineName: machineNameAr,
                faultType: status,
                suggestions: suggestions
              }
            } as any);
          }
        }
      }

      res.json(machine);
    } catch (error) {
      console.error("Machine update error:", error);
      res.status(500).json({ message: "خطأ في تحديث الماكينة" });
    }
  }
);