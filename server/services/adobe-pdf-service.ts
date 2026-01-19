import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  CreatePDFJob,
  CreatePDFResult,
} from "@adobe/pdfservices-node-sdk";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

const OUTPUT_DIR = "/tmp/adobe-pdfs";
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface QuoteData {
  document_number: string;
  quote_date: string;
  customer_name: string;
  tax_number: string | null;
  items: Array<{
    line_number: number;
    item_name: string;
    unit: string;
    quantity: string | number;
    unit_price: string | number;
    line_total: string | number;
  }>;
  total_before_tax: string | number;
  tax_amount: string | number;
  total_with_tax: string | number;
  notes?: string | null;
  created_by_name?: string | null;
  created_by_phone?: string | null;
}

export class AdobePdfService {
  private pdfServices: PDFServices | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const clientId = process.env.ADOBE_CLIENT_ID;
      const clientSecret = process.env.ADOBE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.warn("Adobe PDF Services credentials not configured");
        return;
      }

      const credentials = new ServicePrincipalCredentials({
        clientId,
        clientSecret,
      });

      this.pdfServices = new PDFServices({ credentials });
      console.log("✅ Adobe PDF Services initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Adobe PDF Services:", error);
    }
  }

  isConfigured(): boolean {
    return this.pdfServices !== null;
  }

  async generateQuotePdf(quoteData: QuoteData): Promise<Buffer> {
    if (!this.isConfigured() || !this.pdfServices) {
      throw new Error("Adobe PDF Services not configured");
    }

    const formatCurrency = (amount: string | number) => {
      return new Intl.NumberFormat("en-US", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }).format(Number(amount));
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-GB");
    };

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Cairo', 'Noto Naskh Arabic', 'Tahoma', 'Arial', sans-serif; 
      padding: 40px; 
      color: #333;
      direction: rtl;
      text-align: right;
      unicode-bidi: bidi-override;
      background: white;
    }
    
    .ltr-text {
      direction: ltr;
      unicode-bidi: embed;
      text-align: left;
    }
    
    .rtl-text {
      direction: rtl;
      unicode-bidi: embed;
      text-align: right;
    }
    
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2563eb; font-size: 24px; margin-bottom: 5px; }
    .header .tagline { color: #666; font-size: 12px; }
    .header .company-ar { color: #666; font-size: 16px; margin-top: 5px; }
    .header-line { border-top: 3px solid #2563eb; margin: 20px 0; }
    
    .title { text-align: center; margin-bottom: 20px; }
    .title h2 { color: #2563eb; font-size: 20px; }
    .title .title-ar { color: #2563eb; font-size: 18px; }
    .title .doc-info { color: #333; font-size: 14px; margin-top: 10px; }
    
    .customer-box { 
      background: #f8fafc; 
      padding: 15px; 
      border-radius: 5px; 
      margin-bottom: 20px; 
    }
    .customer-box h3 { font-size: 14px; margin-bottom: 10px; text-decoration: underline; }
    .customer-box p { font-size: 12px; margin: 5px 0; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { 
      background: #2563eb; 
      color: white; 
      padding: 10px; 
      font-size: 11px; 
      text-align: center;
    }
    td { 
      padding: 8px; 
      font-size: 11px; 
      text-align: center; 
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) { background: #f8fafc; }
    
    .totals-box { 
      background: #f8fafc; 
      padding: 15px; 
      width: 250px; 
      margin-right: auto;
    }
    .totals-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
    .totals-row.total { 
      border-top: 1px solid #e2e8f0; 
      padding-top: 10px; 
      margin-top: 10px;
      color: #2563eb; 
      font-weight: bold; 
      font-size: 14px; 
    }
    
    .notes-box { 
      background: #fffbeb; 
      border: 1px solid #fcd34d; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 5px;
    }
    .notes-box h4 { color: #b45309; font-size: 11px; margin-bottom: 5px; }
    .notes-box p { color: #78350f; font-size: 11px; }
    
    .footer { 
      text-align: center; 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #e2e8f0; 
    }
    .footer p { font-size: 10px; color: #666; margin: 3px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Modern Plastic Bags Factory</h1>
    <p class="tagline">Quality and Excellence in Every Product</p>
    <p class="company-ar">مصنع الأكياس البلاستيكية الحديثة</p>
    <div class="header-line"></div>
  </div>
  
  <div class="title">
    <h2>PRICE QUOTATION</h2>
    <p class="title-ar">عرض سعر</p>
    <p class="doc-info">Document: ${quoteData.document_number}</p>
    <p class="doc-info">Date: ${formatDate(quoteData.quote_date)}</p>
  </div>
  
  <div class="customer-box">
    <h3>Customer Information / معلومات العميل</h3>
    <p><strong>Customer:</strong> ${quoteData.customer_name}</p>
    <p><strong>Tax Number:</strong> ${quoteData.tax_number || "N/A"}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Name / اسم الصنف</th>
        <th>Unit / الوحدة</th>
        <th>Qty / الكمية</th>
        <th>Unit Price / السعر</th>
        <th>Total / الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${quoteData.items.map(item => `
        <tr>
          <td>${item.line_number}</td>
          <td>${item.item_name}</td>
          <td>${item.unit}</td>
          <td>${formatCurrency(item.quantity)}</td>
          <td>${formatCurrency(item.unit_price)} SAR</td>
          <td>${formatCurrency(item.line_total)} SAR</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals-box">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${formatCurrency(quoteData.total_before_tax)} SAR</span>
    </div>
    <div class="totals-row">
      <span>VAT (15%):</span>
      <span>${formatCurrency(quoteData.tax_amount)} SAR</span>
    </div>
    <div class="totals-row total">
      <span>Total:</span>
      <span>${formatCurrency(quoteData.total_with_tax)} SAR</span>
    </div>
  </div>
  
  ${quoteData.notes ? `
  <div class="notes-box">
    <h4>Notes / ملاحظات:</h4>
    <p>${quoteData.notes}</p>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>This quotation is valid for 15 days from the issue date.</p>
    <p>هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار</p>
    ${quoteData.created_by_name ? `<p>Prepared by: ${quoteData.created_by_name}${quoteData.created_by_phone ? ` - ${quoteData.created_by_phone}` : ''}</p>` : ''}
  </div>
</body>
</html>`;

    try {
      const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
      const readStream = Readable.from(htmlBuffer);
      
      const inputAsset = await this.pdfServices.upload({
        readStream,
        mimeType: MimeType.HTML,
      });

      const job = new CreatePDFJob({ inputAsset });
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: CreatePDFResult,
      });

      const resultAsset = pdfServicesResponse.result?.asset;
      if (!resultAsset) {
        throw new Error("No result asset from Adobe PDF Services");
      }

      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });
      
      const chunks: Buffer[] = [];
      for await (const chunk of streamAsset.readStream) {
        chunks.push(Buffer.from(chunk));
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Adobe PDF generation error:", error);
      throw error;
    }
  }
}

export const adobePdfService = new AdobePdfService();
