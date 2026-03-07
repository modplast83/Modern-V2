import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
  PageOrientation,
  Header,
  Footer,
  TabStopPosition,
  TabStopType,
} from "docx";
import * as fs from "fs";
import * as path from "path";

const COLORS = {
  primary: "1B5E20",
  primaryLight: "E8F5E9",
  secondary: "1A237E",
  headerBg: "1B5E20",
  headerText: "FFFFFF",
  altRowBg: "F1F8E9",
  borderColor: "C8E6C9",
  textDark: "212121",
  textMedium: "424242",
  textLight: "757575",
  accent: "2E7D32",
};

function createStyledCell(
  text: string,
  options: {
    bold?: boolean;
    fontSize?: number;
    color?: string;
    shading?: string;
    alignment?: AlignmentType;
    width?: number;
    borderColor?: string;
    verticalAlign?: VerticalAlign;
    bidi?: boolean;
    font?: string;
  } = {}
): TableCell {
  const {
    bold = false,
    fontSize = 20,
    color = COLORS.textDark,
    shading,
    alignment = AlignmentType.RIGHT,
    width,
    borderColor = COLORS.borderColor,
    verticalAlign = VerticalAlign.CENTER,
    bidi = true,
    font = "Arial",
  } = options;

  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: borderColor,
  };

  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size: fontSize,
            color,
            font,
            rightToLeft: bidi,
          }),
        ],
        alignment,
        bidirectional: bidi,
        spacing: { before: 40, after: 40 },
      }),
    ],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading
      ? { type: ShadingType.CLEAR, fill: shading }
      : undefined,
    verticalAlign,
    borders: {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    },
  });
}

function createMergeField(fieldName: string, options: {
  bold?: boolean;
  fontSize?: number;
  color?: string;
  font?: string;
} = {}): TextRun {
  return new TextRun({
    text: `{{${fieldName}}}`,
    bold: options.bold ?? false,
    size: options.fontSize ?? 20,
    color: options.color ?? COLORS.textDark,
    font: options.font ?? "Arial",
    rightToLeft: true,
  });
}

function createMergeFieldCell(
  fieldName: string,
  options: {
    bold?: boolean;
    fontSize?: number;
    color?: string;
    shading?: string;
    alignment?: AlignmentType;
    width?: number;
  } = {}
): TableCell {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: COLORS.borderColor,
  };

  return new TableCell({
    children: [
      new Paragraph({
        children: [createMergeField(fieldName, {
          bold: options.bold,
          fontSize: options.fontSize,
          color: options.color,
        })],
        alignment: options.alignment ?? AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 40, after: 40 },
      }),
    ],
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.shading
      ? { type: ShadingType.CLEAR, fill: options.shading }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    },
  });
}

export async function createOrderTemplate(): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "server", "fonts", "factory-logo.png");
  const logoBuffer = fs.readFileSync(logoPath);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
            color: COLORS.textDark,
          },
          paragraph: {
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "مصنع الأكياس البلاستيكية الحديثة",
                    font: "Arial",
                    size: 14,
                    color: COLORS.textLight,
                    rightToLeft: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Modern Plastic Bag Factory | ",
                    font: "Arial",
                    size: 14,
                    color: COLORS.textLight,
                  }),
                  new TextRun({
                    text: "هاتف: {{company_phone}} | ",
                    font: "Arial",
                    size: 14,
                    color: COLORS.textLight,
                    rightToLeft: true,
                  }),
                  new TextRun({
                    text: "بريد: {{company_email}}",
                    font: "Arial",
                    size: 14,
                    color: COLORS.textLight,
                    rightToLeft: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
              }),
            ],
          }),
        },
        children: [
          // ===== HEADER WITH LOGO =====
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
              insideHorizontal: { style: BorderStyle.NONE, size: 0 },
              insideVertical: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  // Company info - right side
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "مصنع الأكياس البلاستيكية الحديثة",
                            bold: true,
                            size: 28,
                            color: COLORS.primary,
                            font: "Arial",
                            rightToLeft: true,
                          }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        bidirectional: true,
                        spacing: { after: 40 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Modern Plastic Bag Factory",
                            bold: true,
                            size: 20,
                            color: COLORS.secondary,
                            font: "Arial",
                          }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 40 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "{{company_address}}",
                            size: 18,
                            color: COLORS.textMedium,
                            font: "Arial",
                            rightToLeft: true,
                          }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        bidirectional: true,
                        spacing: { after: 20 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "سجل تجاري: {{company_cr}} | رقم ضريبي: {{company_vat}}",
                            size: 16,
                            color: COLORS.textLight,
                            font: "Arial",
                            rightToLeft: true,
                          }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        bidirectional: true,
                      }),
                    ],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                  // Logo - left side
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: logoBuffer,
                            transformation: { width: 120, height: 120 },
                            type: "png",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),

          // Green separator line
          new Paragraph({
            children: [],
            spacing: { before: 100, after: 100 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary },
            },
          }),

          // ===== DOCUMENT TITLE =====
          new Paragraph({
            children: [
              new TextRun({
                text: "أمـر تـوريـد",
                bold: true,
                size: 36,
                color: COLORS.primary,
                font: "Arial",
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 200, after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "PURCHASE ORDER",
                bold: true,
                size: 22,
                color: COLORS.secondary,
                font: "Arial",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // ===== ORDER INFO TABLE =====
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  createStyledCell("رقم الطلب:", { bold: true, shading: COLORS.primaryLight, width: 15, color: COLORS.primary }),
                  createMergeFieldCell("order_number", { bold: true, width: 20, color: COLORS.secondary }),
                  createStyledCell("", { width: 15 }),
                  createStyledCell("التاريخ:", { bold: true, shading: COLORS.primaryLight, width: 15, color: COLORS.primary }),
                  createMergeFieldCell("order_date", { width: 35 }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell("مندوب المبيعات:", { bold: true, shading: COLORS.primaryLight, width: 15, color: COLORS.primary }),
                  createMergeFieldCell("sales_rep", { width: 20 }),
                  createStyledCell("", { width: 15 }),
                  createStyledCell("تاريخ التسليم:", { bold: true, shading: COLORS.primaryLight, width: 15, color: COLORS.primary }),
                  createMergeFieldCell("delivery_date", { width: 35 }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [], spacing: { before: 200, after: 100 } }),

          // ===== CUSTOMER INFO =====
          new Paragraph({
            children: [
              new TextRun({
                text: "  بيانات العميل",
                bold: true,
                size: 24,
                color: COLORS.headerText,
                font: "Arial",
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            spacing: { before: 0, after: 0 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  createStyledCell("اسم العميل:", { bold: true, shading: COLORS.primaryLight, width: 20, color: COLORS.primary }),
                  createMergeFieldCell("customer_name", { width: 30 }),
                  createStyledCell("رقم الهاتف:", { bold: true, shading: COLORS.primaryLight, width: 20, color: COLORS.primary }),
                  createMergeFieldCell("customer_phone", { width: 30 }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell("العنوان:", { bold: true, shading: COLORS.primaryLight, width: 20, color: COLORS.primary }),
                  createMergeFieldCell("customer_address", { width: 30 }),
                  createStyledCell("الرقم الضريبي:", { bold: true, shading: COLORS.primaryLight, width: 20, color: COLORS.primary }),
                  createMergeFieldCell("customer_vat", { width: 30 }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [], spacing: { before: 200, after: 100 } }),

          // ===== ITEMS TABLE HEADER =====
          new Paragraph({
            children: [
              new TextRun({
                text: "  تفاصيل المنتجات",
                bold: true,
                size: 24,
                color: COLORS.headerText,
                font: "Arial",
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            spacing: { before: 0, after: 0 },
          }),

          // Items table header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              // Header row
              new TableRow({
                children: [
                  createStyledCell("م", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 5, alignment: AlignmentType.CENTER }),
                  createStyledCell("اسم المنتج", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 25 }),
                  createStyledCell("المقاس", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 15, alignment: AlignmentType.CENTER }),
                  createStyledCell("السُمك", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 10, alignment: AlignmentType.CENTER }),
                  createStyledCell("الكمية (كجم)", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 12, alignment: AlignmentType.CENTER }),
                  createStyledCell("سعر الوحدة", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 13, alignment: AlignmentType.CENTER }),
                  createStyledCell("الإجمالي", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 13, alignment: AlignmentType.CENTER }),
                  createStyledCell("ملاحظات", { bold: true, shading: COLORS.primary, color: COLORS.headerText, width: 7, alignment: AlignmentType.CENTER }),
                ],
              }),
              // Template row with loop tags
              new TableRow({
                children: [
                  createMergeFieldCell("item_number", { width: 5, alignment: AlignmentType.CENTER }),
                  createMergeFieldCell("item_name", { width: 25, bold: true }),
                  createMergeFieldCell("item_size", { width: 15, alignment: AlignmentType.CENTER }),
                  createMergeFieldCell("item_thickness", { width: 10, alignment: AlignmentType.CENTER }),
                  createMergeFieldCell("item_quantity", { width: 12, alignment: AlignmentType.CENTER }),
                  createMergeFieldCell("item_unit_price", { width: 13, alignment: AlignmentType.CENTER }),
                  createMergeFieldCell("item_total", { width: 13, alignment: AlignmentType.CENTER, bold: true, color: COLORS.primary }),
                  createMergeFieldCell("item_notes", { width: 7, alignment: AlignmentType.CENTER }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [], spacing: { before: 200, after: 100 } }),

          // ===== TOTALS TABLE =====
          new Table({
            width: { size: 45, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  createStyledCell("المجموع الفرعي:", { bold: true, shading: COLORS.primaryLight, width: 50, color: COLORS.primary }),
                  createMergeFieldCell("subtotal", { width: 50, alignment: AlignmentType.CENTER, bold: true }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell("ضريبة القيمة المضافة ({{vat_rate}}%):", { bold: true, shading: COLORS.primaryLight, width: 50, color: COLORS.primary }),
                  createMergeFieldCell("vat_amount", { width: 50, alignment: AlignmentType.CENTER }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell("الإجمالي الكلي:", { bold: true, shading: COLORS.primary, width: 50, color: COLORS.headerText, fontSize: 24 }),
                  createMergeFieldCell("grand_total", { width: 50, alignment: AlignmentType.CENTER, bold: true, fontSize: 24, color: COLORS.primary, shading: COLORS.primaryLight }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [], spacing: { before: 200, after: 100 } }),

          // ===== NOTES & CONDITIONS =====
          new Paragraph({
            children: [
              new TextRun({
                text: "  الشروط والأحكام",
                bold: true,
                size: 24,
                color: COLORS.headerText,
                font: "Arial",
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            spacing: { before: 0, after: 80 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "{{terms_and_conditions}}",
                size: 18,
                color: COLORS.textMedium,
                font: "Arial",
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { before: 60, after: 40 },
          }),

          // Notes
          new Paragraph({
            children: [
              new TextRun({
                text: "ملاحظات: ",
                bold: true,
                size: 20,
                color: COLORS.primary,
                font: "Arial",
                rightToLeft: true,
              }),
              createMergeField("notes", { size: 18, color: COLORS.textMedium }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { before: 100, after: 200 },
          }),

          // ===== SIGNATURES =====
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
              insideHorizontal: { style: BorderStyle.NONE, size: 0 },
              insideVertical: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "توقيع العميل",
                            bold: true,
                            size: 20,
                            color: COLORS.primary,
                            font: "Arial",
                            rightToLeft: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        bidirectional: true,
                        spacing: { after: 20 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "____________________", size: 20, color: COLORS.textLight }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400 },
                      }),
                    ],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [] })],
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "توقيع المصنع",
                            bold: true,
                            size: 20,
                            color: COLORS.primary,
                            font: "Arial",
                            rightToLeft: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        bidirectional: true,
                        spacing: { after: 20 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "____________________", size: 20, color: COLORS.textLight }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400 },
                      }),
                    ],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

async function main() {
  const templateBuffer = await createOrderTemplate();
  const outputPath = path.join(
    process.cwd(),
    "server",
    "services",
    "adobe-pdf",
    "templates",
    "order-template-ar.docx"
  );
  fs.writeFileSync(outputPath, templateBuffer);
  console.log(`Template saved to: ${outputPath}`);
  console.log(`File size: ${(templateBuffer.length / 1024).toFixed(1)} KB`);

  // Also create sample data JSON
  const sampleData = {
    company_address: "المنطقة الصناعية - المدينة المنورة - المملكة العربية السعودية",
    company_phone: "+966 XX XXX XXXX",
    company_email: "info@mpbf.com",
    company_cr: "XXXXXXXXXX",
    company_vat: "3XXXXXXXXXXXXXXX",
    order_number: "ORD-2026-001",
    order_date: "2026/03/07",
    delivery_date: "2026/03/20",
    sales_rep: "أحمد محمد",
    customer_name: "شركة التعبئة والتغليف المتقدمة",
    customer_phone: "+966 5X XXX XXXX",
    customer_address: "الرياض - حي الصناعية",
    customer_vat: "3XXXXXXXXXXXXXXX",
    item_number: "1",
    item_name: "أكياس تسوق HDPE",
    item_size: "30 × 40 سم",
    item_thickness: "25 ميكرون",
    item_quantity: "500",
    item_unit_price: "12.50",
    item_total: "6,250.00",
    item_notes: "-",
    subtotal: "6,250.00 ر.س",
    vat_rate: "15",
    vat_amount: "937.50 ر.س",
    grand_total: "7,187.50 ر.س",
    terms_and_conditions: "1. الأسعار لا تشمل ضريبة القيمة المضافة\n2. مدة الصلاحية: 15 يوم من تاريخ العرض\n3. شروط الدفع: 50% مقدم و 50% عند التسليم\n4. مدة التوريد: 10-15 يوم عمل من تاريخ تأكيد الطلب",
    notes: "يرجى التأكد من المقاسات قبل البدء في الإنتاج",
  };

  const samplePath = path.join(
    process.cwd(),
    "server",
    "services",
    "adobe-pdf",
    "templates",
    "order-template-sample-data.json"
  );
  fs.writeFileSync(samplePath, JSON.stringify(sampleData, null, 2));
  console.log(`Sample data saved to: ${samplePath}`);
}

main().catch(console.error);
