import type { IStorage } from "../storage";

export interface TaqnyatConfig {
  apiKey: string;
  senderName: string;
  baseUrl: string;
}

export interface TaqnyatSendResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  cost?: number;
  totalCount?: number;
  accepted?: string;
  rejected?: string;
  error?: string;
}

export interface TaqnyatBalanceResult {
  success: boolean;
  balance?: string;
  currency?: string;
  error?: string;
}

export interface TaqnyatSender {
  name: string;
  status?: string;
}

export class TaqnyatSMSService {
  private config: TaqnyatConfig;
  private storage: IStorage;

  constructor(storage: IStorage, config?: Partial<TaqnyatConfig>) {
    this.storage = storage;
    this.config = {
      apiKey: process.env.TAQNYAT_API_KEY || "",
      senderName: process.env.TAQNYAT_SENDER_NAME || "MPBF",
      baseUrl: "https://api.taqnyat.sa",
      ...config,
    };

    if (!this.config.apiKey) {
      console.warn("⚠️ Taqnyat SMS API key not configured. SMS messaging will be disabled.");
    } else {
      console.log("✅ Taqnyat SMS service initialized successfully");
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.startsWith("00")) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith("05") && cleaned.length === 10) {
      cleaned = "966" + cleaned.substring(1);
    }
    if (cleaned.startsWith("5") && cleaned.length === 9) {
      cleaned = "966" + cleaned;
    }
    return cleaned;
  }

  async sendSMS(
    recipients: string | string[],
    message: string,
    options?: {
      title?: string;
      priority?: string;
      context_type?: string;
      context_id?: string;
      scheduled?: string;
      senderName?: string;
    }
  ): Promise<TaqnyatSendResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error("خدمة تقنيات للرسائل النصية غير مُعدة - يرجى إضافة مفتاح API");
      }

      const recipientList = Array.isArray(recipients) ? recipients : [recipients];
      const formattedRecipients = recipientList.map((r) => this.formatPhoneNumber(r));

      const requestBody: any = {
        body: message,
        recipients: formattedRecipients,
        sender: options?.senderName || this.config.senderName,
      };

      if (options?.scheduled) {
        requestBody.scheduled = options.scheduled;
      }

      const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok || data.statusCode === 200 || data.statusCode === 201) {
        const notificationData = {
          title: options?.title || "رسالة نصية SMS",
          message: message,
          type: "sms" as const,
          priority: options?.priority || "normal",
          recipient_type: "user" as const,
          phone_number: formattedRecipients[0],
          status: "sent" as const,
          twilio_sid: data.messageId ? String(data.messageId) : null,
          external_status: "sent",
          sent_at: new Date(),
          context_type: options?.context_type,
          context_id: options?.context_id,
        };

        try {
          await this.storage.createNotification(notificationData);
        } catch (dbError) {
          console.error("Failed to save SMS notification to database:", dbError);
        }

        console.log(
          `📱 تم إرسال رسالة نصية إلى ${formattedRecipients.join(", ")} عبر تقنيات`
        );

        return {
          success: true,
          messageId: String(data.messageId || data.msgId || ""),
          statusCode: data.statusCode,
          cost: data.cost,
          totalCount: data.totalCount,
          accepted: data.accepted,
          rejected: data.rejected,
        };
      } else {
        const errorMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;

        const notificationData = {
          title: options?.title || "رسالة نصية SMS",
          message: `فشل الإرسال: ${errorMsg}`,
          type: "sms" as const,
          priority: options?.priority || "normal",
          recipient_type: "user" as const,
          phone_number: formattedRecipients[0],
          status: "failed" as const,
          error_message: errorMsg,
          context_type: options?.context_type,
          context_id: options?.context_id,
        };

        try {
          await this.storage.createNotification(notificationData);
        } catch (dbError) {
          console.error("Failed to save failed SMS notification:", dbError);
        }

        return {
          success: false,
          statusCode: data.statusCode || response.status,
          error: errorMsg,
        };
      }
    } catch (error: any) {
      console.error("خطأ في إرسال رسالة نصية عبر تقنيات:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBalance(): Promise<TaqnyatBalanceResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error("خدمة تقنيات غير مُعدة");
      }

      const response = await fetch(`${this.config.baseUrl}/account/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          balance: data.balance,
          currency: data.currency || "SAR",
        };
      } else {
        return {
          success: false,
          error: data.message || "فشل في جلب الرصيد",
        };
      }
    } catch (error: any) {
      console.error("خطأ في جلب رصيد تقنيات:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getSenders(): Promise<{ success: boolean; senders?: any[]; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error("خدمة تقنيات غير مُعدة");
      }

      const response = await fetch(`${this.config.baseUrl}/v1/messages/senders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          senders: Array.isArray(data) ? data : data.senders || [],
        };
      } else {
        return {
          success: false,
          error: data.message || "فشل في جلب أسماء المرسلين",
        };
      }
    } catch (error: any) {
      console.error("خطأ في جلب أسماء المرسلين:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async checkStatus(): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/system/status`, {
        method: "GET",
      });

      const data = await response.json();

      return {
        success: response.ok,
        status: data.status || (response.ok ? "operational" : "unavailable"),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
