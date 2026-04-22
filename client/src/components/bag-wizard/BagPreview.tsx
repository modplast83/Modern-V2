import { useId } from "react";

import {
  BAG_COLORS,
  MATERIALS,
  PRINT_COLORS_PALETTE,
} from "../../lib/bag-rules";
import {
  type BagConfiguration,
  getBagTypeRules,
  getHangerHeight,
  getBagsPerKg,
  getBagWeightGrams,
} from "../../lib/bag-rules-engine";

interface BagPreviewProps {
  config: BagConfiguration;
  size?: "sm" | "md" | "lg" | "xl";
  showDimensions?: boolean;
}

export function BagPreview({
  config,
  size = "lg",
  showDimensions = false,
}: BagPreviewProps) {
  const uid = useId().replace(/:/g, "_");

  if (!config.bagType) {
    return (
      <div className="flex items-center justify-center h-72 bg-gray-50 rounded-xl">
        <p className="text-gray-400 text-sm">اختر نوع الكيس لعرض المعاينة</p>
      </div>
    );
  }

  const rules = getBagTypeRules(config.bagType);
  if (!rules) return null;

  const bagColor = BAG_COLORS[config.bagColor] || BAG_COLORS.white;
  const material = MATERIALS[config.material];

  const svgWidth =
    size === "xl" ? 560 : size === "lg" ? 480 : size === "md" ? 340 : 220;
  const svgHeight =
    size === "xl" ? 700 : size === "lg" ? 600 : size === "md" ? 440 : 300;

  const widthMax =
    config.isPrinted && rules.width_printed
      ? rules.width_printed.max
      : rules.width.max;
  const lengthMax = config.isPrinted
    ? rules.length_printed.max
    : rules.length_plain.max;

  const widthRatio =
    config.width > 0
      ? Math.max(0.4, Math.min(1, config.width / widthMax))
      : 0.7;
  const lengthRatio =
    config.length > 0
      ? Math.max(0.4, Math.min(1, config.length / lengthMax))
      : 0.7;

  const bagW = svgWidth * 0.6 * widthRatio;
  const bagH = svgHeight * 0.6 * lengthRatio;
  const bagX = (svgWidth - bagW) / 2;
  const bagY = svgHeight * 0.25;

  const isTransparent = bagColor.is_transparent;
  const fillColor = bagColor.hex;
  const fillOpacity = isTransparent ? 0.15 : bagColor.opacity;

  const perspectiveOffset = bagW * 0.08;
  const sideWidth =
    config.sideGusset > 0 ? Math.min(bagW * 0.15, config.sideGusset * 2) : 0;

  const gradId = `bg_${uid}`;
  const sideGradId = `sg_${uid}`;
  const shadowId = `sh_${uid}`;
  const patternId = `tp_${uid}`;
  const clipId = `cl_${uid}`;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="drop-shadow-lg"
        style={{ maxHeight: size === "xl" ? 600 : size === "lg" ? 540 : 420 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={fillColor}
              stopOpacity={fillOpacity * 0.85}
            />
            <stop
              offset="50%"
              stopColor={fillColor}
              stopOpacity={fillOpacity}
            />
            <stop
              offset="100%"
              stopColor={fillColor}
              stopOpacity={fillOpacity * 0.7}
            />
          </linearGradient>

          <linearGradient id={sideGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={fillColor}
              stopOpacity={fillOpacity * 0.5}
            />
            <stop
              offset="100%"
              stopColor={fillColor}
              stopOpacity={fillOpacity * 0.7}
            />
          </linearGradient>

          <filter id={shadowId}>
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodOpacity="0.15" />
          </filter>

          {isTransparent && (
            <pattern
              id={patternId}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <rect width="5" height="5" fill="#e5e7eb" />
              <rect x="5" y="5" width="5" height="5" fill="#e5e7eb" />
              <rect x="5" y="0" width="5" height="5" fill="#f9fafb" />
              <rect x="0" y="5" width="5" height="5" fill="#f9fafb" />
            </pattern>
          )}

          <clipPath id={clipId}>
            <rect x={bagX} y={bagY} width={bagW} height={bagH} rx="3" />
          </clipPath>

          <marker
            id="arrL"
            viewBox="0 0 10 10"
            refX="2"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#1e40af" />
          </marker>
          <marker
            id="arrR"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#1e40af" />
          </marker>
        </defs>

        {isTransparent && (
          <rect
            x={bagX}
            y={bagY}
            width={bagW}
            height={bagH}
            rx="3"
            fill={`url(#${patternId})`}
          />
        )}

        {sideWidth > 0 &&
          config.handle !== "hanger" &&
          config.handle !== "hanger_hook" &&
          config.handle !== "external_strap" && (
            <polygon
              points={`${bagX + bagW},${bagY} ${bagX + bagW + sideWidth},${bagY + perspectiveOffset} ${bagX + bagW + sideWidth},${bagY + bagH + perspectiveOffset} ${bagX + bagW},${bagY + bagH}`}
              fill={`url(#${sideGradId})`}
              stroke={isTransparent ? "#d1d5db" : darkenColor(fillColor, 20)}
              strokeWidth="0.5"
              opacity={0.7}
            />
          )}

        <rect
          x={bagX}
          y={bagY}
          width={bagW}
          height={bagH}
          rx="3"
          fill={`url(#${gradId})`}
          stroke={isTransparent ? "#d1d5db" : darkenColor(fillColor, 30)}
          strokeWidth="1"
          filter={`url(#${shadowId})`}
        />

        {renderHandle(config, bagX, bagY, bagW, bagH, fillColor, fillOpacity)}

        <line
          x1={bagX}
          y1={bagY + bagH}
          x2={bagX + bagW}
          y2={bagY + bagH}
          stroke={darkenColor(fillColor, 40)}
          strokeWidth="2"
          opacity="0.6"
        />

        {isTransparent && (
          <>
            <line
              x1={bagX + bagW * 0.3}
              y1={bagY + bagH * 0.2}
              x2={bagX + bagW * 0.7}
              y2={bagY + bagH * 0.25}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            />
            <line
              x1={bagX + bagW * 0.2}
              y1={bagY + bagH * 0.4}
              x2={bagX + bagW * 0.5}
              y2={bagY + bagH * 0.42}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          </>
        )}

        {config.isPrinted &&
          config.printDesign &&
          renderPrintDesign(config, bagX, bagY, bagW, bagH, clipId)}

        {showDimensions &&
          config.width > 0 &&
          config.length > 0 &&
          renderDimensionLines(config, bagX, bagY, bagW, bagH)}

        {material && (
          <>
            <line
              x1={bagX + 8}
              y1={bagY + bagH * 0.1}
              x2={bagX + 8}
              y2={bagY + bagH * 0.9}
              stroke={
                isTransparent
                  ? "rgba(200,200,200,0.3)"
                  : "rgba(255,255,255,0.15)"
              }
              strokeWidth="0.5"
              strokeDasharray="3,6"
            />
            <line
              x1={bagX + bagW - 8}
              y1={bagY + bagH * 0.1}
              x2={bagX + bagW - 8}
              y2={bagY + bagH * 0.9}
              stroke={
                isTransparent
                  ? "rgba(200,200,200,0.3)"
                  : "rgba(255,255,255,0.15)"
              }
              strokeWidth="0.5"
              strokeDasharray="3,6"
            />
          </>
        )}
      </svg>

      <div className="mt-3 text-center space-y-1">
        <div className="text-sm font-semibold text-gray-700">
          {rules.label_ar}
        </div>
        {config.width > 0 && config.length > 0 && (
          <div className="text-xs text-gray-500">
            {config.width} × {config.length} سم
            {config.sideGusset > 0 && ` | دخلة ${config.sideGusset} سم`}
            {config.thickness > 0 && ` | ${config.thickness} ميكرون`}
            {config.handle === "hanger" &&
              ` | يد ${getHangerHeight(config)} سم`}
          </div>
        )}
        {(() => {
          const bpk = getBagsPerKg(config);
          const wg = getBagWeightGrams(config);
          if (!bpk || !wg) return null;
          return (
            <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg inline-block mt-1">
              ≈ {bpk.toLocaleString("ar-EG")} كيس/كجم · وزن الكيس{" "}
              {wg.toFixed(2)} غم
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function renderDimensionLines(
  config: BagConfiguration,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const arrowColor = "#1e40af";
  const offset = 14;
  return (
    <g fontFamily="Arial, sans-serif" fontSize="11" fill={arrowColor}>
      {/* Width dimension (bottom) */}
      <line
        x1={x}
        y1={y + h + offset}
        x2={x + w}
        y2={y + h + offset}
        stroke={arrowColor}
        strokeWidth="0.8"
        markerStart="url(#arrL)"
        markerEnd="url(#arrR)"
      />
      <line
        x1={x}
        y1={y + h + offset - 4}
        x2={x}
        y2={y + h + offset + 4}
        stroke={arrowColor}
        strokeWidth="0.8"
      />
      <line
        x1={x + w}
        y1={y + h + offset - 4}
        x2={x + w}
        y2={y + h + offset + 4}
        stroke={arrowColor}
        strokeWidth="0.8"
      />
      <rect
        x={x + w / 2 - 22}
        y={y + h + offset + 4}
        width="44"
        height="14"
        fill="white"
        stroke={arrowColor}
        strokeWidth="0.5"
        rx="2"
      />
      <text
        x={x + w / 2}
        y={y + h + offset + 14}
        textAnchor="middle"
        fontWeight="700"
      >
        {config.width} سم
      </text>

      {/* Length dimension (right) */}
      <line
        x1={x + w + offset}
        y1={y}
        x2={x + w + offset}
        y2={y + h}
        stroke={arrowColor}
        strokeWidth="0.8"
      />
      <line
        x1={x + w + offset - 4}
        y1={y}
        x2={x + w + offset + 4}
        y2={y}
        stroke={arrowColor}
        strokeWidth="0.8"
      />
      <line
        x1={x + w + offset - 4}
        y1={y + h}
        x2={x + w + offset + 4}
        y2={y + h}
        stroke={arrowColor}
        strokeWidth="0.8"
      />
      <rect
        x={x + w + offset + 4}
        y={y + h / 2 - 7}
        width="44"
        height="14"
        fill="white"
        stroke={arrowColor}
        strokeWidth="0.5"
        rx="2"
      />
      <text
        x={x + w + offset + 26}
        y={y + h / 2 + 3}
        textAnchor="middle"
        fontWeight="700"
      >
        {config.length} سم
      </text>

      {/* Thickness label */}
      {config.thickness > 0 && (
        <>
          <rect
            x={x + 4}
            y={y + h - 18}
            width="78"
            height="14"
            fill="white"
            stroke={arrowColor}
            strokeWidth="0.5"
            rx="2"
            opacity="0.9"
          />
          <text
            x={x + 43}
            y={y + h - 8}
            textAnchor="middle"
            fontWeight="600"
            fontSize="10"
          >
            {config.thickness} ميكرون
          </text>
        </>
      )}
    </g>
  );
}

function renderHandle(
  config: BagConfiguration,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  opacity: number,
) {
  const stroke = darkenColor(color, 30);

  switch (config.handle) {
    case "hanger": {
      const hangerCm = getHangerHeight(config);
      const totalLength = config.length > 0 ? config.length : 60;
      const hangerRatio = Math.max(0.12, Math.min(0.4, hangerCm / totalLength));
      const earH = h * hangerRatio;

      const cutoutW = w * 0.28;
      const cutoutDepth = earH * 0.75;
      const cutoutCX = x + w / 2;
      const cutoutTopY = y - earH;
      const cutoutBottomY = cutoutTopY + cutoutDepth;
      const cutoutR = cutoutW * 0.35;

      const sideGussetW =
        config.sideGusset > 0
          ? Math.max(
              w * 0.08,
              Math.min(
                w * 0.18,
                (config.sideGusset / (config.width || 50)) * w,
              ),
            )
          : 0;

      return (
        <g>
          <path
            d={`M${x},${y}
                L${x},${cutoutTopY + 2}
                Q${x},${cutoutTopY} ${x + 2},${cutoutTopY}
                L${cutoutCX - cutoutW / 2},${cutoutTopY}
                L${cutoutCX - cutoutW / 2},${cutoutBottomY - cutoutR}
                Q${cutoutCX - cutoutW / 2},${cutoutBottomY} ${cutoutCX - cutoutW / 2 + cutoutR},${cutoutBottomY}
                L${cutoutCX + cutoutW / 2 - cutoutR},${cutoutBottomY}
                Q${cutoutCX + cutoutW / 2},${cutoutBottomY} ${cutoutCX + cutoutW / 2},${cutoutBottomY - cutoutR}
                L${cutoutCX + cutoutW / 2},${cutoutTopY}
                L${x + w - 2},${cutoutTopY}
                Q${x + w},${cutoutTopY} ${x + w},${cutoutTopY + 2}
                L${x + w},${y}
                Z`}
            fill={color}
            fillOpacity={opacity * 0.9}
            stroke={stroke}
            strokeWidth="1"
          />
          {sideGussetW > 0 && (
            <>
              <rect
                x={x + 1}
                y={cutoutTopY + 1}
                width={sideGussetW}
                height={earH + h - 2}
                fill={color}
                fillOpacity={opacity * 0.35}
                rx="1"
              />
              <rect
                x={x + w - sideGussetW - 1}
                y={cutoutTopY + 1}
                width={sideGussetW}
                height={earH + h - 2}
                fill={color}
                fillOpacity={opacity * 0.35}
                rx="1"
              />
              <line
                x1={x + sideGussetW + 1}
                y1={cutoutTopY}
                x2={x + sideGussetW + 1}
                y2={y + h}
                stroke={stroke}
                strokeWidth="0.4"
                opacity="0.15"
                strokeDasharray="4,4"
              />
              <line
                x1={x + w - sideGussetW - 1}
                y1={cutoutTopY}
                x2={x + w - sideGussetW - 1}
                y2={y + h}
                stroke={stroke}
                strokeWidth="0.4"
                opacity="0.15"
                strokeDasharray="4,4"
              />
            </>
          )}
        </g>
      );
    }
    case "hanger_hook": {
      // Hanger ears + central hook hole (for hanging on shop hooks)
      const earH = h * 0.18;
      const earCutW = w * 0.18;
      const cutoutCX = x + w / 2;
      const earTopY = y - earH;
      const earBottomY = earTopY + earH * 0.7;
      const r = earCutW * 0.35;
      const hookR = Math.min(w, h) * 0.04;
      const hookCY = earTopY + earH * 0.4;
      return (
        <g>
          <path
            d={`M${x},${y}
                L${x},${earTopY + 2}
                Q${x},${earTopY} ${x + 2},${earTopY}
                L${cutoutCX - earCutW / 2},${earTopY}
                L${cutoutCX - earCutW / 2},${earBottomY - r}
                Q${cutoutCX - earCutW / 2},${earBottomY} ${cutoutCX - earCutW / 2 + r},${earBottomY}
                L${cutoutCX + earCutW / 2 - r},${earBottomY}
                Q${cutoutCX + earCutW / 2},${earBottomY} ${cutoutCX + earCutW / 2},${earBottomY - r}
                L${cutoutCX + earCutW / 2},${earTopY}
                L${x + w - 2},${earTopY}
                Q${x + w},${earTopY} ${x + w},${earTopY + 2}
                L${x + w},${y} Z`}
            fill={color}
            fillOpacity={opacity * 0.9}
            stroke={stroke}
            strokeWidth="1"
          />
          {/* Hook hole punched in middle of ear */}
          <circle
            cx={cutoutCX}
            cy={hookCY}
            r={hookR}
            fill="white"
            stroke={stroke}
            strokeWidth="1.2"
          />
          <circle
            cx={cutoutCX}
            cy={hookCY}
            r={hookR * 0.55}
            fill="none"
            stroke={stroke}
            strokeWidth="0.6"
            opacity="0.4"
          />
        </g>
      );
    }
    case "external_strap": {
      // Two external loop straps glued/welded on top
      const strapH = h * 0.16;
      const strapW = w * 0.04;
      const loopGap = w * 0.34;
      const loopCX1 = x + w / 2 - loopGap / 2;
      const loopCX2 = x + w / 2 + loopGap / 2;
      const baseY = y;
      const topY = y - strapH;
      return (
        <g>
          {/* Reinforcement strip across top */}
          <rect
            x={x + w * 0.1}
            y={y - 2}
            width={w * 0.8}
            height={4}
            fill={darkenColor(color, 25)}
            fillOpacity={opacity * 0.8}
            rx="1.5"
          />
          {/* Left loop */}
          <path
            d={`M${loopCX1 - loopGap / 2 + strapW / 2},${baseY}
                C${loopCX1 - loopGap / 2 + strapW / 2},${topY - strapH * 0.3} ${loopCX1 + loopGap / 2 - strapW / 2},${topY - strapH * 0.3} ${loopCX1 + loopGap / 2 - strapW / 2},${baseY}`}
            fill="none"
            stroke={darkenColor(color, 35)}
            strokeWidth={strapW}
            strokeLinecap="round"
            opacity={opacity * 0.95}
          />
          {/* Right loop */}
          <path
            d={`M${loopCX2 - loopGap / 2 + strapW / 2},${baseY}
                C${loopCX2 - loopGap / 2 + strapW / 2},${topY - strapH * 0.3} ${loopCX2 + loopGap / 2 - strapW / 2},${topY - strapH * 0.3} ${loopCX2 + loopGap / 2 - strapW / 2},${baseY}`}
            fill="none"
            stroke={darkenColor(color, 35)}
            strokeWidth={strapW}
            strokeLinecap="round"
            opacity={opacity * 0.95}
          />
        </g>
      );
    }
    case "die_cut": {
      const holeW = w * 0.3;
      const holeH = h * 0.06;
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h * 0.06}
          rx={holeW / 2}
          ry={holeH / 2}
          fill="white"
          stroke={stroke}
          strokeWidth="1"
        />
      );
    }
    case "banana_9cm":
    case "banana_6cm": {
      // Banana-shaped die-cut handle. Width is fixed in cm; convert to SVG units via bag width.
      const cm = config.handle === "banana_9cm" ? 9 : 6;
      const actualWidthCm = config.width > 0 ? config.width : 30;
      const cutoutWidthRatio = Math.max(
        0.18,
        Math.min(0.7, cm / actualWidthCm),
      );
      const holeW = w * cutoutWidthRatio;
      const holeH = h * 0.045;
      const cx = x + w / 2;
      const cy = y + h * 0.07;
      return (
        <g>
          <path
            d={`M${cx - holeW / 2},${cy}
                Q${cx},${cy + holeH * 1.8} ${cx + holeW / 2},${cy}
                Q${cx},${cy - holeH * 0.4} ${cx - holeW / 2},${cy} Z`}
            fill="white"
            stroke={stroke}
            strokeWidth="1.1"
          />
          <text
            x={cx}
            y={cy - holeH * 1.2}
            textAnchor="middle"
            fontSize="9"
            fill={stroke}
            fontWeight="600"
            opacity="0.6"
          >
            {cm} سم
          </text>
        </g>
      );
    }
    case "reinforced": {
      const patchH = h * 0.08;
      return (
        <g>
          <rect
            x={x + w * 0.15}
            y={y}
            width={w * 0.7}
            height={patchH}
            fill={darkenColor(color, 15)}
            fillOpacity={opacity}
            stroke={stroke}
            strokeWidth="0.5"
            rx="2"
          />
          <ellipse
            cx={x + w / 2}
            cy={y + patchH * 0.5}
            rx={w * 0.12}
            ry={patchH * 0.35}
            fill="white"
            stroke={stroke}
            strokeWidth="0.8"
          />
        </g>
      );
    }
    default:
      return null;
  }
}

function renderPrintDesign(
  config: BagConfiguration,
  bagX: number,
  bagY: number,
  bagW: number,
  bagH: number,
  clipId: string,
) {
  const design = config.printDesign;
  if (!design) return null;

  const marginCm = 1;
  const actualW = config.width > 0 ? config.width : 50;
  const actualH = config.length > 0 ? config.length : 60;
  const marginXPct = Math.min(10, (marginCm / actualW) * 100);
  const marginYPct = Math.min(10, (marginCm / actualH) * 100);

  const printAreaX = bagX + bagW * (marginXPct / 100);
  const printAreaY = bagY + bagH * (marginYPct / 100);
  const printAreaW = bagW * (1 - (2 * marginXPct) / 100);
  const printAreaH = bagH * (1 - (2 * marginYPct) / 100);

  const globalOffsetX = (design.offsetX / 100) * printAreaW;
  const globalOffsetY = (design.offsetY / 100) * printAreaH;

  const centerX = printAreaX + printAreaW / 2 + globalOffsetX;
  const centerY = printAreaY + printAreaH / 2 + globalOffsetY;

  return (
    <g clipPath={`url(#${clipId})`}>
      <rect
        x={printAreaX}
        y={printAreaY}
        width={printAreaW}
        height={printAreaH}
        fill="none"
        stroke="rgba(100,100,255,0.2)"
        strokeWidth="0.5"
        strokeDasharray="3,3"
        rx="2"
      />

      {design.logoUrl && (
        <image
          href={design.logoUrl}
          x={centerX - (printAreaW * 0.4 * design.scale) / 2}
          y={centerY - (printAreaH * 0.4 * design.scale) / 2}
          width={printAreaW * 0.4 * design.scale}
          height={printAreaH * 0.4 * design.scale}
          preserveAspectRatio="xMidYMid meet"
          opacity={0.9}
          transform={`rotate(${design.rotation}, ${centerX}, ${centerY})`}
        />
      )}

      {design.texts.map((text, i) => {
        const colorInfo = PRINT_COLORS_PALETTE.find((c) => c.id === text.color);
        const shade = config.printColorShades?.[text.color];

        const textX = printAreaX + (text.x / 100) * printAreaW + globalOffsetX;
        const textY = printAreaY + (text.y / 100) * printAreaH + globalOffsetY;

        return (
          <text
            key={i}
            x={textX}
            y={textY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={shade || colorInfo?.hex || "#000"}
            fontSize={Math.max(
              8,
              Math.min(28, text.size * design.scale * 0.55),
            )}
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            opacity={0.9}
          >
            {text.value}
          </text>
        );
      })}
    </g>
  );
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
