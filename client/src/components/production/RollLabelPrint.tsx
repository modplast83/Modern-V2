import { format } from "date-fns";

interface RollLabelPrintProps {
  roll: {
    id: number;
    roll_number: string;
    roll_seq: number;
    weight_kg: number;
    machine_id?: string;
    film_machine_id?: string;
    printing_machine_id?: string;
    cutting_machine_id?: string;
    film_machine_name?: string;
    printing_machine_name?: string;
    cutting_machine_name?: string;
    qr_code_text?: string;
    qr_png_base64?: string;
    created_at?: string;
    created_by_name?: string;
    printed_by_name?: string;
    printed_at?: string;
    cut_by_name?: string;
    cut_at?: string;
    cut_weight_total_kg?: number;
    status?: string;
  };
  productionOrder?: {
    production_order_number: string;
    item_name?: string;
    item_name_ar?: string;
    category_name?: string;
    size_caption?: string;
    thickness?: number;
    color?: string;
    raw_material?: string;
    punching?: string;
  };
  order?: {
    order_number: string;
    customer_name?: string;
    customer_name_ar?: string;
  };
}

export function printRollLabel({ roll, productionOrder, order }: RollLabelPrintProps) {
  const currentLang = localStorage.getItem('i18nextLng') || 'ar';
  const resolvedName = (nameAr?: string, nameEn?: string) =>
    currentLang === 'en' && nameEn ? nameEn : (nameAr || nameEn || '');
  const printContent = `
    <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>ليبل رول - ${roll.roll_number}</title>
        <style>
          @page {
            size: 4in 6in;
            margin: 0;
          }
          
          body {
            font-family: 'Arial', 'Segoe UI', sans-serif;
            direction: rtl;
            margin: 0;
            padding: 0;
            width: 4in;
            height: 6in;
            font-size: 9pt;
            color: #000;
            background: white;
          }
          
          .label-container {
            width: 100%;
            height: 100%;
            padding: 3mm;
            box-sizing: border-box;
            border: 2px solid #000;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 1mm;
            margin-bottom: 1.5mm;
          }
          
          .company-name {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 0.5mm;
            color: #000;
          }
          
          .roll-number {
            font-size: 13pt;
            font-weight: bold;
            background: #000;
            color: #fff;
            padding: 1mm 2.5mm;
            margin-top: 0.5mm;
            border-radius: 1mm;
            display: inline-block;
          }
          
          .qr-section {
            text-align: center;
            margin: 1mm 0;
            padding: 1mm;
            border: 1px solid #333;
            background: #f9f9f9;
          }
          
          .qr-image {
            max-width: 50px;
            max-height: 50px;
            margin: 0 auto;
          }
          
          .main-info {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr;
            gap: 1mm;
            margin: 1mm 0;
          }
          
          .info-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1mm;
          }
          
          .info-box {
            border: 1px solid #333;
            padding: 1mm;
            background: #fff;
            min-height: 6mm;
          }
          
          .info-box.full {
            grid-column: 1 / -1;
          }
          
          .info-box.highlight {
            background: #ffe6e6;
            border-color: #c00;
            border-width: 2px;
          }
          
          .info-label {
            font-size: 6.5pt;
            color: #666;
            font-weight: 600;
            margin-bottom: 0.3mm;
            text-transform: uppercase;
          }
          
          .info-value {
            font-size: 8.5pt;
            font-weight: bold;
            color: #000;
            line-height: 1.05;
            word-wrap: break-word;
          }
          
          .footer {
            margin-top: auto;
            padding-top: 1mm;
            border-top: 1px solid #333;
            text-align: center;
            font-size: 5.5pt;
            color: #666;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 0;
            }
            .label-container { 
              page-break-after: always;
              border: 3px solid #000;
            }
            @page {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <!-- Header -->
          <div class="header">
            <div class="company-name">نظام إدارة إنتاج الأكياس البلاستيكية</div>
            <div class="roll-number">${roll.roll_number}</div>
          </div>
          
          <!-- QR Code Section -->
          ${roll.qr_png_base64 || roll.qr_code_text ? `
            <div class="qr-section">
              ${roll.qr_png_base64 ? `
                <img src="data:image/png;base64,${roll.qr_png_base64}" class="qr-image" alt="QR Code">
              ` : roll.qr_code_text ? `
                <div style="font-family: monospace; font-size: 9pt; font-weight: bold;">
                  ${roll.qr_code_text}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <!-- Main Information -->
          <div class="main-info">
            <!-- Customer Name -->
            ${order && (order.customer_name_ar || order.customer_name) ? `
              <div class="info-box full">
                <div class="info-label">العميل</div>
                <div class="info-value">${resolvedName(order.customer_name_ar, order.customer_name)}</div>
              </div>
            ` : ''}
            
            <!-- Production Order Number & Roll Sequence -->
            <div class="info-row">
              ${productionOrder ? `
                <div class="info-box">
                  <div class="info-label">أمر الإنتاج</div>
                  <div class="info-value">${productionOrder.production_order_number}</div>
                </div>
              ` : ''}
              
              <div class="info-box">
                <div class="info-label">رقم الرول</div>
                <div class="info-value">#${roll.roll_seq}</div>
              </div>
            </div>
            
            <!-- Category Name -->
            ${productionOrder && productionOrder.category_name ? `
              <div class="info-box full">
                <div class="info-label">الفئة</div>
                <div class="info-value">${productionOrder.category_name}</div>
              </div>
            ` : ''}
            
            <!-- Product Name -->
            ${productionOrder && (productionOrder.item_name_ar || productionOrder.item_name) ? `
              <div class="info-box full">
                <div class="info-label">اسم الصنف</div>
                <div class="info-value">${resolvedName(productionOrder.item_name_ar, productionOrder.item_name)}</div>
              </div>
            ` : ''}
            
            <!-- Size & Thickness -->
            <div class="info-row">
              ${productionOrder && productionOrder.size_caption ? `
                <div class="info-box">
                  <div class="info-label">المقاس</div>
                  <div class="info-value">${productionOrder.size_caption}</div>
                </div>
              ` : ''}
              
              ${productionOrder && productionOrder.thickness ? `
                <div class="info-box">
                  <div class="info-label">السماكة</div>
                  <div class="info-value">${productionOrder.thickness} مم</div>
                </div>
              ` : ''}
            </div>
            
            <!-- Weight (Highlighted) -->
            <div class="info-box highlight full">
              <div class="info-label">الوزن الكلي</div>
              <div class="info-value">${roll.weight_kg != null ? parseFloat(String(roll.weight_kg)).toFixed(2) : '0.00'} كجم</div>
            </div>
            
            <!-- Machine Information - Compact -->
            ${roll.film_machine_name || roll.machine_id ? `
              <div class="info-box full">
                <div class="info-label">ماكينة الفيلم</div>
                <div class="info-value">${roll.film_machine_name || roll.machine_id}</div>
              </div>
            ` : ''}
            
            <!-- Operators Section - Compact Display -->
            ${roll.created_by_name || roll.printed_by_name || roll.cut_by_name ? `
              <div class="info-box full">
                <div class="info-label">العاملين</div>
                <div class="info-value" style="font-size: 7.5pt; line-height: 1.2;">
                  ${roll.created_by_name ? `<div>▪ فيلم: <strong>${roll.created_by_name}</strong></div>` : ''}
                  ${roll.printed_by_name ? `<div>▪ طباعة: <strong>${roll.printed_by_name}</strong></div>` : ''}
                  ${roll.cut_by_name ? `<div>▪ قص: <strong>${roll.cut_by_name}</strong></div>` : ''}
                </div>
              </div>
            ` : ''}
            
            <!-- Creation Date -->
            ${roll.created_at ? `
              <div class="info-box full">
                <div class="info-label">تاريخ الإنتاج</div>
                <div class="info-value">${format(new Date(roll.created_at), 'dd/MM/yyyy - HH:mm')}</div>
              </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div class="footer">
            طُبع في: ${format(new Date(), 'dd/MM/yyyy - HH:mm')}
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    printWindow.onload = () => {
      printWindow.print();
    };
    
    if (printWindow.document.readyState === 'complete') {
      printWindow.print();
    } else {
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
        }
      }, 500);
    }
  }
}

export default function RollLabelButton({ roll, productionOrder, order, children }: RollLabelPrintProps & { children?: React.ReactNode }) {
  return (
    <button
      onClick={() => printRollLabel({ roll, productionOrder, order })}
      className="inline-flex items-center"
    >
      {children}
    </button>
  );
}
