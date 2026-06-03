import fs from "fs";
import os from "os";
import path from "path";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import {
  isArabicText,
  processArabicText,
  bidiReorderArabic,
} from "../services/arabic-text-service";

export const MODERN_DOCS_DIR = path.join(os.tmpdir(), "modern-agent-docs");

if (!fs.existsSync(MODERN_DOCS_DIR)) {
  fs.mkdirSync(MODERN_DOCS_DIR, { recursive: true });
}

const ARABIC_FONT_PATH = (() => {
  const candidates = [
    path.join(process.cwd(), "server", "fonts", "Amiri-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "Amiri-Regular.ttf"),
    path.join(process.cwd(), "server", "fonts", "NotoSansArabic-Regular.ttf"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || "";
})();

export interface AgentDocSection {
  heading?: string;
  body?: string;
}

export interface AgentDocSpec {
  title: string;
  language?: "ar" | "en";
  intro?: string;
  sections?: AgentDocSection[];
  table?: { headers: string[]; rows: string[][] };
  footer?: string;
  ownerId?: number;
}

function sanitizeFileName(name: string): string {
  return (
    (name || "document")
      .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "document"
  );
}

function uniqueBase(title: string, ownerId?: number): string {
  const prefix = ownerId != null ? `u${ownerId}-` : "";
  return `${prefix}${sanitizeFileName(title)}-${Date.now()}-${Math.floor(
    Math.random() * 1e6,
  )}`;
}

// Parse the owner user id encoded into a generated document file name.
export function getDocOwnerId(fileName: string): number | null {
  const m = path.basename(fileName || "").match(/^u(\d+)-/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}

// ----------------------- PDF -----------------------
export async function generateAgentPdf(spec: AgentDocSpec): Promise<{
  fileName: string;
  filePath: string;
}> {
  const base = uniqueBase(spec.title, spec.ownerId);
  const fileName = `${base}.pdf`;
  const filePath = path.join(MODERN_DOCS_DIR, fileName);
  const isAr = spec.language === "ar";
  const hasArabicFont = !!ARABIC_FONT_PATH;
  const align: "right" | "left" = isAr ? "right" : "left";

  const safe = (text: string): string => {
    if (!text) return "";
    if (!isArabicText(text)) return text;
    if (hasArabicFont) return bidiReorderArabic(text);
    return processArabicText(text);
  };

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      if (hasArabicFont) doc.font(ARABIC_FONT_PATH);

      doc
        .fontSize(20)
        .fillColor("#1a365d")
        .text(safe(spec.title), { align: "center" });
      doc.moveDown(1);

      if (spec.intro) {
        doc
          .fontSize(12)
          .fillColor("#2d3748")
          .text(safe(spec.intro), { align });
        doc.moveDown(0.8);
      }

      for (const section of spec.sections || []) {
        if (section.heading) {
          doc
            .fontSize(14)
            .fillColor("#2b6cb0")
            .text(safe(section.heading), { align });
          doc.moveDown(0.3);
        }
        if (section.body) {
          doc
            .fontSize(12)
            .fillColor("#1a202c")
            .text(safe(section.body), { align });
          doc.moveDown(0.6);
        }
      }

      if (spec.table && spec.table.headers?.length) {
        doc.moveDown(0.4);
        const headerLine = spec.table.headers.join("   |   ");
        doc
          .fontSize(12)
          .fillColor("#2b6cb0")
          .text(safe(headerLine), { align });
        doc.moveDown(0.2);
        for (const row of spec.table.rows || []) {
          doc
            .fontSize(11)
            .fillColor("#1a202c")
            .text(safe(row.join("   |   ")), { align });
        }
        doc.moveDown(0.6);
      }

      if (spec.footer) {
        doc.moveDown(1);
        doc
          .fontSize(10)
          .fillColor("#718096")
          .text(safe(spec.footer), { align });
      }

      doc.end();
      stream.on("finish", () => resolve({ fileName, filePath }));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------------- Word -----------------------
export async function generateAgentWord(spec: AgentDocSpec): Promise<{
  fileName: string;
  filePath: string;
}> {
  const base = uniqueBase(spec.title, spec.ownerId);
  const fileName = `${base}.docx`;
  const filePath = path.join(MODERN_DOCS_DIR, fileName);
  const isAr = spec.language === "ar";
  const alignment = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const bidi = isAr;

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      bidirectional: bidi,
      children: [new TextRun({ text: spec.title, bold: true, rightToLeft: bidi })],
    }),
  );

  if (spec.intro) {
    children.push(
      new Paragraph({
        alignment,
        bidirectional: bidi,
        children: [new TextRun({ text: spec.intro, rightToLeft: bidi })],
      }),
    );
  }

  for (const section of spec.sections || []) {
    if (section.heading) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment,
          bidirectional: bidi,
          children: [
            new TextRun({ text: section.heading, bold: true, rightToLeft: bidi }),
          ],
        }),
      );
    }
    if (section.body) {
      children.push(
        new Paragraph({
          alignment,
          bidirectional: bidi,
          children: [new TextRun({ text: section.body, rightToLeft: bidi })],
        }),
      );
    }
  }

  if (spec.table && spec.table.headers?.length) {
    const headerRow = new TableRow({
      children: spec.table.headers.map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                alignment,
                bidirectional: bidi,
                children: [new TextRun({ text: h, bold: true, rightToLeft: bidi })],
              }),
            ],
          }),
      ),
    });
    const bodyRows = (spec.table.rows || []).map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment,
                    bidirectional: bidi,
                    children: [new TextRun({ text: cell, rightToLeft: bidi })],
                  }),
                ],
              }),
          ),
        }),
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows],
      }),
    );
  }

  if (spec.footer) {
    children.push(
      new Paragraph({
        alignment,
        bidirectional: bidi,
        children: [new TextRun({ text: spec.footer, italics: true, rightToLeft: bidi })],
      }),
    );
  }

  const docx = new Document({
    sections: [{ properties: {}, children }],
  });
  const buffer = await Packer.toBuffer(docx);
  fs.writeFileSync(filePath, buffer);
  return { fileName, filePath };
}

export function getDocPath(fileName: string): string | null {
  const resolved = path.join(MODERN_DOCS_DIR, path.basename(fileName));
  if (!resolved.startsWith(MODERN_DOCS_DIR)) return null;
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}
