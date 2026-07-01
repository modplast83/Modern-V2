// تحديث routes/index.ts لإضافة routes التحذيرات الذكية

import { Router } from "express";

import {
  createAlertsRouter,
  createSystemHealthRouter,
  createPerformanceRouter,
  createCorrectiveActionsRouter,
  createDataValidationRouter,
} from "./alerts";

import type { IStorage } from "../storage";

// في النهاية، أضيف routes الجديدة
export function setupAlertsRoutes(app: any, storage: IStorage) {
  // إعداد routes التحذيرات الذكية
  app.use("/api/alerts", createAlertsRouter(storage));
  app.use("/api/system/health", createSystemHealthRouter(storage));
  app.use("/api/system/performance", createPerformanceRouter(storage));
  app.use("/api/corrective-actions", createCorrectiveActionsRouter(storage));
  app.use("/api/data-validation", createDataValidationRouter(storage));

  console.log("[Routes] تم إعداد routes نظام التحذيرات الذكية ✅");
}
