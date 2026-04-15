import { useRef, useCallback, useState } from "react";
import { type BagConfiguration, type ValidationResult, getBagTypeRules, getHangerHeight } from "../../lib/bag-rules-engine";
import { MATERIALS, BAG_COLORS, HANDLES, PRINT_COLORS_PALETTE } from "../../lib/bag-rules";
import { BagPreview } from "./BagPreview";
import { Button } from "../ui/button";
import { Download, FileJson, Image, RotateCcw, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ResultsStepProps {
  config: BagConfiguration;
  validation: ValidationResult;
  onRestart: () => void;
}

async function inlineBlobImages(svgClone: SVGSVGElement): Promise<void> {
  const images = svgClone.querySelectorAll("image");
  const promises = Array.from(images).map(async (imgEl) => {
    const href = imgEl.getAttribute("href") || imgEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!href || !href.startsWith("blob:")) return;
    try {
      const resp = await fetch(href);
      const blob = await resp.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      imgEl.setAttribute("href", dataUrl);
      imgEl.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
    } catch {
      imgEl.removeAttribute("href");
      imgEl.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
    }
  });
  await Promise.all(promises);
}

function svgToDataUrl(svgEl: SVGSVGElement): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      await inlineBlobImages(clone);

      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        resolve(canvas.toDataURL("image/png"));
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { reject(new Error("Image load failed")); URL.revokeObjectURL(url); };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

export function ResultsStep({ config, validation, onRestart }: ResultsStepProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const rules = getBagTypeRules(config.bagType);
  const material = MATERIALS[config.material];
  const bagColor = BAG_COLORS[config.bagColor];
  const handle = HANDLES[config.handle];

  const printColorNames = config.isPrinted
    ? config.printColors.map(id => {
        const c = PRINT_COLORS_PALETTE.find(p => p.id === id);
        return c?.label_ar || id;
      }).join("، ")
    : "";

  const specs = [
    { label: "نوع الكيس", value: rules?.label_ar || "-" },
    { label: "المادة", value: material ? `${material.label_ar} (${material.label_en})` : "-" },
    { label: "العرض", value: `${config.width} سم` },
    { label: "الطول", value: `${config.length} سم` },
    { label: "السماكة", value: `${config.thickness} ميكرون` },
    { label: "الدخلة الجانبية", value: config.sideGusset > 0 ? `${config.sideGusset} سم` : "لا يوجد" },
    { label: "المقبض", value: config.handle === "hanger" ? `${handle?.label_ar} (ارتفاع ${getHangerHeight(config)} سم)` : (handle?.label_ar || "بدون") },
    { label: "لون الكيس", value: bagColor?.label_ar || "-" },
    { label: "الطباعة", value: config.isPrinted ? "مطبوع" : "سادة" },
    ...(config.isPrinted ? [
      { label: "جهة الطباعة", value: config.printSide === "both" ? "وجهين" : "وجه واحد" },
      { label: "عدد ألوان الطباعة", value: `${config.printColors.length}` },
      { label: "ألوان الطباعة", value: printColorNames },
    ] : []),
    ...(config.isPrinted && config.printDesign?.texts?.length ? [
      { label: "نصوص الطباعة", value: config.printDesign.texts.map(t => t.value).join("، ") },
    ] : []),
  ];

  const exportJSON = useCallback(() => {
    const data = {
      configuration: {
        bagType: config.bagType,
        bagTypeLabel: rules?.label_ar,
        material: config.material,
        materialLabel: material?.label_ar,
        width: config.width,
        length: config.length,
        thickness: config.thickness,
        sideGusset: config.sideGusset,
        handle: config.handle,
        handleLabel: handle?.label_ar,
        handleHeight: config.handle === "hanger" ? getHangerHeight(config) : undefined,
        bagColor: config.bagColor,
        bagColorLabel: bagColor?.label_ar,
        isPrinted: config.isPrinted,
        printSide: config.printSide,
        printColors: config.printColors,
        printColorShades: config.printColorShades,
        hasDesignImage: !!config.printDesign?.logoUrl,
        designTexts: config.printDesign?.texts?.map(t => ({ text: t.value, color: t.color, size: t.size, x: t.x, y: t.y })) || [],
      },
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bag-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, validation, rules, material, handle, bagColor]);

  const exportImage = useCallback(async () => {
    const svgEl = previewRef.current?.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `bag-preview-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const exportPDF = useCallback(async () => {
    setIsExportingPdf(true);

    let imageDataUrl = "";
    try {
      const svgEl = previewRef.current?.querySelector("svg");
      if (svgEl) {
        imageDataUrl = await svgToDataUrl(svgEl as SVGSVGElement);
      }
    } catch {
      // continue without image
    }

    const specsHtml = specs.map(s =>
      `<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;text-align:right;width:40%">${s.label}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:right">${s.value}</td></tr>`
    ).join("");

    const validationHtml = validation.isValid
      ? '<div style="background:#dcfce7;color:#166534;padding:16px;border-radius:12px;margin:20px 0;text-align:center;font-weight:bold;font-size:16px">✅ صالح للتصنيع</div>'
      : '<div style="background:#fee2e2;color:#991b1b;padding:16px;border-radius:12px;margin:20px 0;text-align:center;font-weight:bold;font-size:16px">❌ غير صالح للتصنيع</div>';

    const errorsHtml = validation.errors.map(e => `<li style="color:#dc2626;margin:6px 0;line-height:1.5">${e.message}</li>`).join("");
    const warningsHtml = validation.warnings.map(w => `<li style="color:#d97706;margin:6px 0;line-height:1.5">${w.message}</li>`).join("");

    const imageSection = imageDataUrl
      ? `<div style="text-align:center;margin:24px 0;page-break-inside:avoid">
           <h3 style="color:#374151;margin-bottom:12px;font-size:14px">معاينة الكيس المصمم</h3>
           <img src="${imageDataUrl}" style="max-width:350px;max-height:450px;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)" />
         </div>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>مواصفات الكيس - ${rules?.label_ar || ""}</title>
        <style>
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width:800px; margin:0 auto; padding:40px; color:#1f2937; }
        </style>
      </head>
      <body>
        <div style="text-align:center;border-bottom:3px solid #1e40af;padding-bottom:20px;margin-bottom:24px">
          <h1 style="color:#1e40af;margin:0 0 6px 0;font-size:22px">بطاقة مواصفات المنتج</h1>
          <p style="color:#9ca3af;margin:0;font-size:13px">معالج تصميم الأكياس البلاستيكية | MPBF</p>
        </div>
        ${validationHtml}
        ${imageSection}
        <table style="width:100%;border-collapse:collapse;margin:24px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">${specsHtml}</table>
        ${errorsHtml ? `<div style="margin:16px 0"><h3 style="color:#dc2626;font-size:14px">الأخطاء</h3><ul style="margin:8px 0;padding-right:20px">${errorsHtml}</ul></div>` : ""}
        ${warningsHtml ? `<div style="margin:16px 0"><h3 style="color:#d97706;font-size:14px">التحذيرات</h3><ul style="margin:8px 0;padding-right:20px">${warningsHtml}</ul></div>` : ""}
        <div style="text-align:center;color:#9ca3af;margin-top:32px;font-size:11px;border-top:1px solid #e5e7eb;padding-top:16px">
          <p>تاريخ التصدير: ${new Date().toLocaleDateString("ar-SA")} | ${new Date().toLocaleTimeString("ar-SA")}</p>
        </div>
      </body></html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); setIsExportingPdf(false); }, 800);
    } else {
      setIsExportingPdf(false);
    }
  }, [specs, validation, rules]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">النتيجة النهائية</h2>
      <p className="text-gray-500 text-sm mb-6">ملخص المواصفات وحالة التصنيع</p>

      <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
        validation.isValid
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}>
        {validation.isValid ? (
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
        )}
        <div>
          <div className={`font-bold ${validation.isValid ? "text-green-700" : "text-red-700"}`}>
            {validation.isValid ? "صالح للتصنيع ✓" : "غير صالح للتصنيع ✗"}
          </div>
          {!validation.isValid && (
            <div className="text-sm text-red-600 mt-1">
              {validation.errors.length} خطأ يجب معالجته
            </div>
          )}
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {validation.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{e.message}</span>
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {validation.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 bg-gray-50 rounded-xl mb-6">
        {specs.map((spec, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-200 last:border-0">
            <span className="text-sm font-medium text-gray-600">{spec.label}</span>
            <span className="text-sm text-gray-900">{spec.value}</span>
          </div>
        ))}
      </div>

      <div ref={previewRef} className="flex justify-center mb-6">
        <BagPreview config={config} size="lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Button onClick={exportPDF} variant="outline" className="gap-2 h-12" disabled={isExportingPdf}>
          {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="text-xs">تنزيل PDF</span>
        </Button>
        <Button onClick={exportImage} variant="outline" className="gap-2 h-12">
          <Image className="h-4 w-4" />
          <span className="text-xs">تنزيل صورة</span>
        </Button>
        <Button onClick={exportJSON} variant="outline" className="gap-2 h-12">
          <FileJson className="h-4 w-4" />
          <span className="text-xs">تصدير JSON</span>
        </Button>
        <Button onClick={onRestart} variant="outline" className="gap-2 h-12 text-blue-600 border-blue-200">
          <RotateCcw className="h-4 w-4" />
          <span className="text-xs">تصميم جديد</span>
        </Button>
      </div>
    </div>
  );
}
