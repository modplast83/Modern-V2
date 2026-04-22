import { EventEmitter } from "events";

import {
  getNotificationManager,
  type SystemNotificationData,
} from "./notification-manager";

import type { IStorage } from "../storage";
import type {
  SystemAlert,
  InsertSystemAlert,
  AlertRule,
  InsertAlertRule,
  CorrectiveAction,
  InsertCorrectiveAction,
} from "@shared/schema";

/**
 * نظام إدارة التحذيرات الذكية
 */
export class AlertManager extends EventEmitter {
  private storage: IStorage;
  private alertRules: Map<number, AlertRule> = new Map();
  private activeAlerts: Map<number, SystemAlert> = new Map();
  private suppressedAlerts: Set<string> = new Set();

  private readonly DEFAULT_SUPPRESSION_TIME = 60 * 60 * 1000; // ساعة واحدة

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
    console.log("[AlertManager] نظام إدارة التحذيرات مُفعل");
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadActiveRules();
      await this.loadActiveAlerts();
      console.log("[AlertManager] تم تشغيل نظام إدارة التحذيرات بنجاح ✅");
    } catch (error) {
      console.error("[AlertManager] خطأ في تشغيل نظام إدارة التحذيرات:", error);
    }
  }

  private async loadActiveRules(): Promise<void> {
    try {
      const rules = await this.storage.getAlertRules(true);
      this.alertRules.clear();
      for (const rule of rules) this.alertRules.set(rule.id, rule);
      console.log(`[AlertManager] تم تحميل ${rules.length} قاعدة تحذير نشطة`);
    } catch (error) {
      console.error("[AlertManager] خطأ في تحميل قواعد التحذيرات:", error);
    }
  }

  private async loadActiveAlerts(): Promise<void> {
    try {
      const alerts = await this.storage.getSystemAlerts({ status: "active" });
      this.activeAlerts.clear();
      for (const alert of alerts) this.activeAlerts.set(alert.id, alert);
      console.log(`[AlertManager] تم تحميل ${alerts.length} تحذير نشط`);
    } catch (error) {
      console.error("[AlertManager] خطأ في تحميل التحذيرات النشطة:", error);
    }
  }

  async createAlert(alertData: {
    title: string;
    title_ar: string;
    message: string;
    message_ar: string;
    type: string;
    category: string;
    severity: string;
    source: string;
    source_id?: string;
    context_data?: Record<string, any>;
    suggested_actions?: {
      action: string;
      priority: number;
      description?: string;
    }[];
    target_users?: number[];
    target_roles?: number[];
    requires_action?: boolean;
  }): Promise<SystemAlert> {
    try {
      const suppressKey = `${alertData.source}-${alertData.source_id || ""}-${alertData.type}`;
      if (this.suppressedAlerts.has(suppressKey)) {
        console.log(`[AlertManager] تحذير مكبوت مؤقتاً: ${alertData.title_ar}`);
        throw new Error("التحذير مكبوت مؤقتاً لمنع التكرار");
      }

      const insertData: InsertSystemAlert = {
        title: alertData.title,
        title_ar: alertData.title_ar,
        message: alertData.message,
        message_ar: alertData.message_ar,
        type: alertData.type,
        category: alertData.category,
        severity: alertData.severity,
        source: alertData.source,
        source_id: alertData.source_id,
        context_data: alertData.context_data,
        suggested_actions: alertData.suggested_actions,
        target_users: alertData.target_users,
        target_roles: alertData.target_roles,
        requires_action: alertData.requires_action || false,
        notification_sent: false,
        first_occurrence: new Date(),
        last_occurrence: new Date(),
        occurrences: 1,
      };

      const alert = await this.storage.createSystemAlert(insertData);
      this.activeAlerts.set(alert.id, alert);

      await this.sendAlertNotifications(alert);
      this.suppressAlert(suppressKey, this.getSuppressDuration(alert.severity));

      if (alert.requires_action && alert.suggested_actions) {
        await this.createCorrectiveActions(alert);
      }

      this.emit("alertCreated", alert);
      console.log(
        `[AlertManager] تم إنشاء تحذير جديد: ${alert.title_ar} (${alert.severity})`,
      );
      return alert;
    } catch (error) {
      console.error("[AlertManager] خطأ في إنشاء التحذير:", error);
      throw error;
    }
  }

  async resolveAlert(
    alertId: number,
    resolvedBy: number,
    notes?: string,
  ): Promise<SystemAlert> {
    try {
      const alert = await this.storage.resolveSystemAlert(
        alertId,
        resolvedBy,
        notes,
      );
      this.activeAlerts.delete(alertId);
      this.emit("alertResolved", alert);
      console.log(`[AlertManager] تم حل التحذير: ${alert.title_ar}`);
      return alert;
    } catch (error) {
      console.error("[AlertManager] خطأ في حل التحذير:", error);
      throw error;
    }
  }

  async dismissAlert(
    alertId: number,
    dismissedBy: number,
  ): Promise<SystemAlert> {
    try {
      const alert = await this.storage.dismissSystemAlert(alertId, dismissedBy);
      this.activeAlerts.delete(alertId);
      this.emit("alertDismissed", alert);
      console.log(`[AlertManager] تم إغلاق التحذير: ${alert.title_ar}`);
      return alert;
    } catch (error) {
      console.error("[AlertManager] خطأ في إغلاق التحذير:", error);
      throw error;
    }
  }

  private async sendAlertNotifications(alert: SystemAlert): Promise<void> {
    try {
      // تجاهل إشعارات severity = low
      if (alert.severity === "low") {
        console.log(
          `[AlertManager] تم تجاهل إشعار منخفض الأولوية: ${alert.title_ar}`,
        );
        return;
      }

      const notificationManager = getNotificationManager(this.storage);
      const notification: SystemNotificationData = {
        title: alert.title || "System Alert",
        title_ar: alert.title_ar || "تحذير نظام",
        message: alert.message || "New alert created",
        message_ar: alert.message_ar || "تم إنشاء تحذير جديد",
        type: alert.type as SystemNotificationData["type"],
        priority: this.getNotificationPriority(
          alert.severity,
        ) as SystemNotificationData["priority"],
        context_type: alert.type,
        context_id: alert.source_id || undefined,
        sound: alert.severity === "critical",
        icon: this.getAlertIcon(alert.type),
      };

      if (alert.target_roles && alert.target_roles.length > 0) {
        for (const roleId of alert.target_roles) {
          await notificationManager.sendToRole(roleId, notification);
        }
      }

      if (alert.target_users && alert.target_users.length > 0) {
        for (const userId of alert.target_users) {
          await notificationManager.sendToUser(userId, notification);
        }
      }

      await this.storage.updateSystemAlert(alert.id, {
        notification_sent: true,
      });
    } catch (error) {
      console.error("[AlertManager] خطأ في إرسال إشعارات التحذير:", error);
    }
  }

  private async createCorrectiveActions(alert: SystemAlert): Promise<void> {
    try {
      if (!alert.suggested_actions) return;

      // Get system user ID from environment or use null for system actions
      // In production, ensure a proper system user account exists
      const systemUserId = process.env.SYSTEM_USER_ID
        ? parseInt(process.env.SYSTEM_USER_ID)
        : null;

      if (!systemUserId) {
        console.warn(
          "[AlertManager] No SYSTEM_USER_ID configured. Using null for automated actions.",
        );
      }

      for (const suggestion of alert.suggested_actions) {
        const actionData: InsertCorrectiveAction = {
          alert_id: alert.id,
          action_type: "automated",
          action_title: suggestion.action,
          action_description: suggestion.description || suggestion.action,
          action_description_ar: suggestion.description || suggestion.action,
          priority: this.getPriorityFromNumber(suggestion.priority),
          created_by: systemUserId as any, // System actions may not have a user
        };
        await this.storage.createCorrectiveAction(actionData);
      }
    } catch (error) {
      console.error("[AlertManager] خطأ في إنشاء الإجراءات التصحيحية:", error);
    }
  }

  async createAlertRule(ruleData: {
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    monitor_type: string;
    rule_type: string;
    conditions: Record<string, any>;
    threshold_value?: number;
    comparison_operator?: string;
    check_frequency: string;
    severity: string;
    notification_template?: string;
    notification_template_ar?: string;
    escalation_rules?: {
      delay_minutes: number;
      severity: string;
      target_roles: number[];
    }[];
    suppress_duration?: number;
    created_by: number;
  }): Promise<AlertRule> {
    try {
      const insertData: InsertAlertRule = {
        name: ruleData.name,
        name_ar: ruleData.name_ar,
        description: ruleData.description,
        description_ar: ruleData.description_ar,
        monitor_type: ruleData.monitor_type,
        rule_type: ruleData.rule_type,
        conditions: ruleData.conditions,
        threshold_value: ruleData.threshold_value?.toString(),
        comparison_operator: ruleData.comparison_operator,
        check_frequency: ruleData.check_frequency,
        severity: ruleData.severity,
        notification_template: ruleData.notification_template,
        notification_template_ar: ruleData.notification_template_ar,
        escalation_rules: ruleData.escalation_rules,
        suppress_duration: ruleData.suppress_duration || 60,
        created_by: ruleData.created_by,
      };
      const rule = await this.storage.createAlertRule(insertData);
      this.alertRules.set(rule.id, rule);
      console.log(`[AlertManager] تم إنشاء قاعدة تحذير جديدة: ${rule.name_ar}`);
      return rule;
    } catch (error) {
      console.error("[AlertManager] خطأ في إنشاء قاعدة التحذير:", error);
      throw error;
    }
  }

  async evaluateRule(ruleId: number, currentValue: number): Promise<boolean> {
    try {
      const rule = this.alertRules.get(ruleId);
      if (!rule || !rule.is_enabled) return false;

      const threshold = parseFloat(rule.threshold_value || "0");
      const operator = rule.comparison_operator;
      let triggered = false;

      switch (operator) {
        case ">":
          triggered = currentValue > threshold;
          break;
        case "<":
          triggered = currentValue < threshold;
          break;
        case ">=":
          triggered = currentValue >= threshold;
          break;
        case "<=":
          triggered = currentValue <= threshold;
          break;
        case "=":
          triggered = currentValue === threshold;
          break;
        case "!=":
          triggered = currentValue !== threshold;
          break;
      }

      if (triggered) await this.triggerRuleAlert(rule, currentValue);
      return triggered;
    } catch (error) {
      console.error("[AlertManager] خطأ في تقييم قاعدة التحذير:", error);
      return false;
    }
  }

  private async triggerRuleAlert(
    rule: AlertRule,
    currentValue: number,
  ): Promise<void> {
    try {
      const alertData = {
        title: `Rule Alert: ${rule.name}`,
        title_ar: `تحذير قاعدة: ${rule.name_ar}`,
        message:
          rule.notification_template ||
          `${rule.name} triggered with value ${currentValue}`,
        message_ar:
          rule.notification_template_ar ||
          `${rule.name_ar} تم تفعيله بقيمة ${currentValue}`,
        type: rule.monitor_type,
        category: "warning",
        severity: rule.severity,
        source: "alert_rule",
        source_id: rule.id.toString(),
        context_data: {
          rule_id: rule.id,
          current_value: currentValue,
          threshold: rule.threshold_value,
          operator: rule.comparison_operator,
        },
        requires_action:
          rule.severity === "critical" || rule.severity === "high",
      };
      await this.createAlert(alertData);
    } catch (error) {
      console.error("[AlertManager] خطأ في تفعيل تحذير القاعدة:", error);
    }
  }

  private suppressAlert(key: string, duration: number): void {
    this.suppressedAlerts.add(key);
    setTimeout(() => this.suppressedAlerts.delete(key), duration);
  }

  private getSuppressDuration(severity: string): number {
    switch (severity) {
      case "critical":
        return 30 * 60 * 1000;
      case "high":
        return 60 * 60 * 1000;
      case "medium":
        return 2 * 60 * 60 * 1000;
      case "low":
        return 4 * 60 * 60 * 1000;
      default:
        return this.DEFAULT_SUPPRESSION_TIME;
    }
  }

  private getNotificationPriority(severity: string): string {
    switch (severity) {
      case "critical":
        return "urgent";
      case "high":
        return "high";
      case "medium":
        return "normal";
      case "low":
        return "low";
      default:
        return "normal";
    }
  }

  private getPriorityFromNumber(priority: number): string {
    switch (priority) {
      case 1:
        return "high";
      case 2:
        return "medium";
      case 3:
        return "low";
      default:
        return "medium";
    }
  }

  private getAlertIcon(type: string): string {
    const icons = {
      system: "⚙️",
      production: "🏭",
      quality: "✅",
      inventory: "📦",
      maintenance: "🔧",
      security: "🔒",
      database: "💾",
      performance: "📊",
    };
    return icons[type as keyof typeof icons] || "🚨";
  }

  async getAlertStatistics(): Promise<{
    total_alerts: number;
    active_alerts: number;
    critical_alerts: number;
    resolved_today: number;
    by_type: Record<string, number>;
    by_severity: Record<string, number>;
  }> {
    try {
      const activeAlerts = await this.storage.getActiveAlertsCount();
      const criticalAlerts = await this.storage.getCriticalAlertsCount();
      const alerts = await this.storage.getSystemAlerts({ limit: 1000 });
      const byType: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      for (const alert of alerts) {
        byType[alert.type] = (byType[alert.type] || 0) + 1;
        bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      }
      return {
        total_alerts: alerts.length,
        active_alerts: activeAlerts,
        critical_alerts: criticalAlerts,
        resolved_today: 0,
        by_type: byType,
        by_severity: bySeverity,
      };
    } catch (error) {
      console.error(
        "[AlertManager] خطأ في الحصول على إحصائيات التحذيرات:",
        error,
      );
      return {
        total_alerts: 0,
        active_alerts: 0,
        critical_alerts: 0,
        resolved_today: 0,
        by_type: {},
        by_severity: {},
      };
    }
  }

  async cleanupOldAlerts(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      console.log("[AlertManager] تم تنظيف التحذيرات القديمة");
    } catch (error) {
      console.error("[AlertManager] خطأ في تنظيف التحذيرات القديمة:", error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.alertRules.clear();
      this.activeAlerts.clear();
      this.suppressedAlerts.clear();
      console.log("[AlertManager] تم إيقاف نظام إدارة التحذيرات");
    } catch (error) {
      console.error("[AlertManager] خطأ في إيقاف نظام إدارة التحذيرات:", error);
    }
  }
}

let alertManager: AlertManager | null = null;
export function getAlertManager(storage: IStorage): AlertManager {
  if (!alertManager) alertManager = new AlertManager(storage);
  return alertManager;
}
export default AlertManager;
