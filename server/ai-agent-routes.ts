import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import { db } from "./db";
import { ai_agent_settings, ai_agent_knowledge, quote_templates } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "./middleware/auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function registerAiAgentRoutes(app: Express): void {
  app.post("/api/ai-agent/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const settings = await db.select().from(ai_agent_settings);
      const knowledge = await db.select().from(ai_agent_knowledge).where(eq(ai_agent_knowledge.is_active, true));

      const systemPromptSetting = settings.find(s => s.key === "system_prompt");
      let systemPrompt = systemPromptSetting?.value || "أنت مساعد ذكي لمصنع الأكياس البلاستيكية الحديثة. تساعد في الإجابة على الأسئلة المتعلقة بالإنتاج والطلبات والمخزون والجودة. أجب باللغة العربية.";

      if (knowledge.length > 0) {
        systemPrompt += "\n\nمعلومات إضافية متاحة:\n" + knowledge.map(k => `- ${k.title}: ${k.content}`).join("\n");
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20),
        ],
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("AI Agent chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "حدث خطأ أثناء المعالجة" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "فشل في معالجة الرسالة" });
      }
    }
  });

  app.post("/api/ai-agent/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let content = "";
      const mimetype = file.mimetype;

      if (mimetype.startsWith("text/") || mimetype === "application/json") {
        content = file.buffer.toString("utf-8");
      } else if (mimetype.includes("spreadsheet") || mimetype.includes("excel") || mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        try {
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          const sheetNames = workbook.SheetNames;
          content = sheetNames.map(name => {
            const sheet = workbook.Sheets[name];
            return `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
          }).join("\n\n");
        } catch {
          content = "[Could not parse spreadsheet file]";
        }
      } else {
        content = `[Binary file: ${file.originalname}, size: ${file.size} bytes]`;
      }

      if (content.length > 50000) {
        content = content.substring(0, 50000) + "\n...[truncated]";
      }

      res.json({
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content,
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "فشل في رفع الملف" });
    }
  });

  app.post("/api/ai-agent/transcribe", requireAuth, upload.single("audio"), async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      const transcription = await openai.audio.transcriptions.create({
        file: new File([file.buffer], file.originalname || "recording.webm", { type: file.mimetype }),
        model: "whisper-1",
        language: "ar",
      });

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "فشل في تحويل الصوت إلى نص" });
    }
  });

  app.get("/api/ai-agent/settings", requireAuth, async (_req: Request, res: Response) => {
    try {
      const settings = await db.select().from(ai_agent_settings);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ error: "فشل في جلب الإعدادات" });
    }
  });

  app.put("/api/ai-agent/settings/:key", requireAuth, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      const existing = await db.select().from(ai_agent_settings).where(eq(ai_agent_settings.key, key));

      if (existing.length > 0) {
        const [updated] = await db.update(ai_agent_settings)
          .set({ value, description, updated_at: new Date() })
          .where(eq(ai_agent_settings.key, key))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(ai_agent_settings)
          .values({ key, value, description })
          .returning();
        res.json(created);
      }
    } catch (error) {
      console.error("Error updating AI setting:", error);
      res.status(500).json({ error: "فشل في تحديث الإعداد" });
    }
  });

  app.get("/api/ai-agent/knowledge", requireAuth, async (_req: Request, res: Response) => {
    try {
      const items = await db.select().from(ai_agent_knowledge);
      res.json(items);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
      res.status(500).json({ error: "فشل في جلب قاعدة المعرفة" });
    }
  });

  app.post("/api/ai-agent/knowledge", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, content, category } = req.body;
      const [item] = await db.insert(ai_agent_knowledge)
        .values({ title, content, category: category || "general" })
        .returning();
      res.json(item);
    } catch (error) {
      console.error("Error creating knowledge:", error);
      res.status(500).json({ error: "فشل في إضافة المعرفة" });
    }
  });

  app.put("/api/ai-agent/knowledge/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

      const { title, content, category, is_active } = req.body;
      const [updated] = await db.update(ai_agent_knowledge)
        .set({ title, content, category, is_active, updated_at: new Date() })
        .where(eq(ai_agent_knowledge.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating knowledge:", error);
      res.status(500).json({ error: "فشل في تحديث المعرفة" });
    }
  });

  app.delete("/api/ai-agent/knowledge/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

      await db.delete(ai_agent_knowledge).where(eq(ai_agent_knowledge.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledge:", error);
      res.status(500).json({ error: "فشل في حذف المعرفة" });
    }
  });

  app.get("/api/quote-templates", requireAuth, async (_req: Request, res: Response) => {
    try {
      const templates = await db.select().from(quote_templates);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates:", error);
      res.status(500).json({ error: "فشل في جلب النماذج" });
    }
  });

  app.post("/api/quote-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const [template] = await db.insert(quote_templates).values(req.body).returning();
      res.json(template);
    } catch (error) {
      console.error("Error creating quote template:", error);
      res.status(500).json({ error: "فشل في إنشاء النموذج" });
    }
  });

  app.put("/api/quote-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

      const [updated] = await db.update(quote_templates)
        .set({ ...req.body, updated_at: new Date() })
        .where(eq(quote_templates.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote template:", error);
      res.status(500).json({ error: "فشل في تحديث النموذج" });
    }
  });

  app.delete("/api/quote-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

      await db.delete(quote_templates).where(eq(quote_templates.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quote template:", error);
      res.status(500).json({ error: "فشل في حذف النموذج" });
    }
  });
}
