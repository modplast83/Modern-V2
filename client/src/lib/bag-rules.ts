export interface DimensionRange {
  min: number;
  max: number;
  unit: string;
}

export interface HandleRule {
  min_width?: number;
  min_thickness?: number;
}

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: string;
}

export interface CompatibilityRule {
  if: Record<string, number>;
  then: Record<string, number>;
  message_ar: string;
  type: "error" | "warning" | "suggestion";
}

export interface BagTypeRules {
  id: string;
  label_ar: string;
  label_en: string;
  description_ar: string;
  icon: string;
  material_allowed: string[];
  handle_allowed: string[];
  handle_rules: Record<string, HandleRule>;
  thickness: DimensionRange;
  width: DimensionRange;
  width_printed?: DimensionRange;
  length_plain: DimensionRange;
  length_printed: DimensionRange;
  side_gusset: DimensionRange;
  side_gusset_supported: boolean;
  print_colors: { min: number; max: number };
  bag_colors: string[];
  printable: boolean;
  print_area: {
    front: PrintArea;
    back: PrintArea;
  };
  compatibility_rules: CompatibilityRule[];
}

export interface MaterialInfo {
  id: string;
  label_ar: string;
  label_en: string;
  description_ar: string;
  min_thickness: number;
  max_thickness: number;
  transparency: "transparent" | "semi_transparent" | "opaque";
  surface: string;
  flexibility: string;
  density: number;
}

export interface BagColorInfo {
  id: string;
  label_ar: string;
  label_en: string;
  hex: string;
  opacity: number;
  is_transparent: boolean;
}

export interface HandleInfo {
  id: string;
  label_ar: string;
  label_en: string;
  icon: string;
}

export const MATERIALS: Record<string, MaterialInfo> = {
  HDPE: {
    id: "HDPE",
    label_ar: "بولي إيثيلين عالي الكثافة",
    label_en: "HDPE",
    description_ar: "مادة قوية ومقاومة، مناسبة للأكياس الخفيفة والمتوسطة",
    min_thickness: 35,
    max_thickness: 150,
    transparency: "semi_transparent",
    surface: "خشن قليلاً",
    flexibility: "متوسط",
    density: 0.96,
  },
  LDPE: {
    id: "LDPE",
    label_ar: "بولي إيثيلين منخفض الكثافة",
    label_en: "LDPE",
    description_ar: "مادة مرنة وناعمة، مناسبة للأكياس الكبيرة والثقيلة",
    min_thickness: 35,
    max_thickness: 150,
    transparency: "transparent",
    surface: "ناعم ولامع",
    flexibility: "عالي",
    density: 0.92,
  },
};

export const BAG_COLORS: Record<string, BagColorInfo> = {
  white: {
    id: "white",
    label_ar: "أبيض",
    label_en: "White",
    hex: "#FFFFFF",
    opacity: 1,
    is_transparent: false,
  },
  transparent: {
    id: "transparent",
    label_ar: "شفاف",
    label_en: "Transparent",
    hex: "#E8F4F8",
    opacity: 0.3,
    is_transparent: true,
  },
  black: {
    id: "black",
    label_ar: "أسود",
    label_en: "Black",
    hex: "#1A1A1A",
    opacity: 1,
    is_transparent: false,
  },
  red: {
    id: "red",
    label_ar: "أحمر",
    label_en: "Red",
    hex: "#DC2626",
    opacity: 1,
    is_transparent: false,
  },
  blue: {
    id: "blue",
    label_ar: "أزرق",
    label_en: "Blue",
    hex: "#2563EB",
    opacity: 1,
    is_transparent: false,
  },
  green: {
    id: "green",
    label_ar: "أخضر",
    label_en: "Green",
    hex: "#16A34A",
    opacity: 1,
    is_transparent: false,
  },
  yellow: {
    id: "yellow",
    label_ar: "أصفر",
    label_en: "Yellow",
    hex: "#EAB308",
    opacity: 1,
    is_transparent: false,
  },
  gold: {
    id: "gold",
    label_ar: "ذهبي",
    label_en: "Gold",
    hex: "#CA8A04",
    opacity: 1,
    is_transparent: false,
  },
  skyblue: {
    id: "skyblue",
    label_ar: "سماوي",
    label_en: "Sky Blue",
    hex: "#38BDF8",
    opacity: 1,
    is_transparent: false,
  },
  silver: {
    id: "silver",
    label_ar: "سيلفر",
    label_en: "Silver",
    hex: "#C0C0C0",
    opacity: 1,
    is_transparent: false,
  },
  gray: {
    id: "gray",
    label_ar: "رمادي",
    label_en: "Gray",
    hex: "#6B7280",
    opacity: 1,
    is_transparent: false,
  },
  olive: {
    id: "olive",
    label_ar: "زيتي",
    label_en: "Olive",
    hex: "#6B8E23",
    opacity: 1,
    is_transparent: false,
  },
  maroon: {
    id: "maroon",
    label_ar: "مارون",
    label_en: "Maroon",
    hex: "#800000",
    opacity: 1,
    is_transparent: false,
  },
  turquoise: {
    id: "turquoise",
    label_ar: "تركواز",
    label_en: "Turquoise",
    hex: "#40E0D0",
    opacity: 1,
    is_transparent: false,
  },
  pink: {
    id: "pink",
    label_ar: "وردي",
    label_en: "Pink",
    hex: "#F472B6",
    opacity: 1,
    is_transparent: false,
  },
  beige: {
    id: "beige",
    label_ar: "بيج",
    label_en: "Beige",
    hex: "#D2B48C",
    opacity: 1,
    is_transparent: false,
  },
  brown: {
    id: "brown",
    label_ar: "بني",
    label_en: "Brown",
    hex: "#8B4513",
    opacity: 1,
    is_transparent: false,
  },
  orange: {
    id: "orange",
    label_ar: "برتقالي",
    label_en: "Orange",
    hex: "#EA580C",
    opacity: 1,
    is_transparent: false,
  },
};

export const HANDLES: Record<string, HandleInfo> = {
  none: { id: "none", label_ar: "بدون مقبض", label_en: "None", icon: "Ban" },
  hanger: {
    id: "hanger",
    label_ar: "علاقي",
    label_en: "Hanger",
    icon: "ShoppingBag",
  },
  hanger_hook: {
    id: "hanger_hook",
    label_ar: "علاقي مع هوك",
    label_en: "Hanger with Hook",
    icon: "Anchor",
  },
  external_strap: {
    id: "external_strap",
    label_ar: "مقبض خارجي شريطي",
    label_en: "External Strap",
    icon: "Link",
  },
  die_cut: {
    id: "die_cut",
    label_ar: "فتحة يد",
    label_en: "Die Cut",
    icon: "Hand",
  },
  banana_9cm: {
    id: "banana_9cm",
    label_ar: "بنانة 9 سم",
    label_en: "Banana 9cm",
    icon: "Smile",
  },
  banana_6cm: {
    id: "banana_6cm",
    label_ar: "بنانة 6 سم",
    label_en: "Banana 6cm",
    icon: "Smile",
  },
  reinforced: {
    id: "reinforced",
    label_ar: "مقبض مقوى",
    label_en: "Reinforced",
    icon: "ShieldCheck",
  },
};

const ALL_BAG_COLORS = [
  "white",
  "transparent",
  "black",
  "red",
  "blue",
  "green",
  "yellow",
  "gold",
  "skyblue",
  "silver",
  "gray",
  "olive",
  "maroon",
  "turquoise",
  "pink",
  "beige",
  "brown",
  "orange",
];

export const BAG_TYPES: Record<string, BagTypeRules> = {
  hanger: {
    id: "hanger",
    label_ar: "كيس علاقي",
    label_en: "Hanger Bag",
    description_ar: "كيس بمقبض علاقي، مناسب للبقالة والتسوق",
    icon: "ShoppingBag",
    material_allowed: ["HDPE", "LDPE"],
    handle_allowed: ["hanger", "hanger_hook", "external_strap"],
    handle_rules: {},
    thickness: { min: 35, max: 150, unit: "ميكرون" },
    width: { min: 20, max: 100, unit: "سم" },
    width_printed: { min: 20, max: 70, unit: "سم" },
    length_plain: { min: 20, max: 100, unit: "سم" },
    length_printed: { min: 20, max: 100, unit: "سم" },
    side_gusset: { min: 3, max: 50, unit: "سم" },
    side_gusset_supported: true,
    print_colors: { min: 1, max: 4 },
    bag_colors: ALL_BAG_COLORS,
    printable: true,
    print_area: {
      front: { x: 15, y: 25, width: 70, height: 40, unit: "percent" },
      back: { x: 15, y: 25, width: 70, height: 40, unit: "percent" },
    },
    compatibility_rules: [
      {
        if: { width_gt: 50 },
        then: { thickness_min: 40 },
        message_ar:
          "للعروض الكبيرة (أكثر من 50 سم) يُنصح برفع السماكة إلى 40 ميكرون على الأقل",
        type: "warning",
      },
    ],
  },
  no_handle: {
    id: "no_handle",
    label_ar: "كيس بدون يد",
    label_en: "No Handle Bag",
    description_ar: "كيس بدون مقبض، مناسب للتغليف والشحن",
    icon: "Package",
    material_allowed: ["HDPE", "LDPE"],
    handle_allowed: ["none"],
    handle_rules: {},
    thickness: { min: 35, max: 150, unit: "ميكرون" },
    width: { min: 20, max: 100, unit: "سم" },
    width_printed: { min: 20, max: 70, unit: "سم" },
    length_plain: { min: 20, max: 100, unit: "سم" },
    length_printed: { min: 20, max: 100, unit: "سم" },
    side_gusset: { min: 3, max: 50, unit: "سم" },
    side_gusset_supported: true,
    print_colors: { min: 1, max: 4 },
    bag_colors: ALL_BAG_COLORS,
    printable: true,
    print_area: {
      front: { x: 10, y: 10, width: 80, height: 60, unit: "percent" },
      back: { x: 10, y: 10, width: 80, height: 60, unit: "percent" },
    },
    compatibility_rules: [],
  },
  banana: {
    id: "banana",
    label_ar: "كيس بنانة",
    label_en: "Banana Bag",
    description_ar: "كيس بفتحة يد مقصوصة على شكل بنانة",
    icon: "Smile",
    material_allowed: ["HDPE", "LDPE"],
    handle_allowed: ["banana_9cm", "banana_6cm"],
    handle_rules: {
      banana_9cm: { min_width: 20, min_thickness: 35 },
      banana_6cm: { min_width: 15, min_thickness: 35 },
    },
    thickness: { min: 35, max: 150, unit: "ميكرون" },
    width: { min: 20, max: 100, unit: "سم" },
    width_printed: { min: 20, max: 70, unit: "سم" },
    length_plain: { min: 20, max: 100, unit: "سم" },
    length_printed: { min: 20, max: 100, unit: "سم" },
    side_gusset: { min: 3, max: 50, unit: "سم" },
    side_gusset_supported: true,
    print_colors: { min: 1, max: 4 },
    bag_colors: ALL_BAG_COLORS,
    printable: true,
    print_area: {
      front: { x: 10, y: 20, width: 80, height: 50, unit: "percent" },
      back: { x: 10, y: 20, width: 80, height: 50, unit: "percent" },
    },
    compatibility_rules: [],
  },
  garbage: {
    id: "garbage",
    label_ar: "كيس نفايات",
    label_en: "Garbage Bag",
    description_ar: "كيس قوي ومتين مخصص للنفايات",
    icon: "Trash2",
    material_allowed: ["HDPE", "LDPE"],
    handle_allowed: ["none", "hanger"],
    handle_rules: {
      hanger: { min_width: 40, min_thickness: 40 },
    },
    thickness: { min: 35, max: 150, unit: "ميكرون" },
    width: { min: 20, max: 100, unit: "سم" },
    width_printed: { min: 20, max: 70, unit: "سم" },
    length_plain: { min: 20, max: 100, unit: "سم" },
    length_printed: { min: 20, max: 100, unit: "سم" },
    side_gusset: { min: 0, max: 0, unit: "سم" },
    side_gusset_supported: false,
    print_colors: { min: 1, max: 4 },
    bag_colors: ALL_BAG_COLORS,
    printable: true,
    print_area: {
      front: { x: 15, y: 20, width: 70, height: 40, unit: "percent" },
      back: { x: 15, y: 20, width: 70, height: 40, unit: "percent" },
    },
    compatibility_rules: [],
  },
  nylon: {
    id: "nylon",
    label_ar: "كيس نايلون",
    label_en: "Nylon Bag",
    description_ar: "كيس نايلون متعدد الاستخدامات، مناسب للتغليف",
    icon: "FileText",
    material_allowed: ["HDPE", "LDPE"],
    handle_allowed: ["none", "die_cut", "reinforced"],
    handle_rules: {
      die_cut: { min_width: 20, min_thickness: 35 },
      reinforced: { min_width: 25, min_thickness: 40 },
    },
    thickness: { min: 35, max: 150, unit: "ميكرون" },
    width: { min: 20, max: 100, unit: "سم" },
    width_printed: { min: 20, max: 70, unit: "سم" },
    length_plain: { min: 20, max: 100, unit: "سم" },
    length_printed: { min: 20, max: 100, unit: "سم" },
    side_gusset: { min: 3, max: 50, unit: "سم" },
    side_gusset_supported: true,
    print_colors: { min: 1, max: 4 },
    bag_colors: ALL_BAG_COLORS,
    printable: true,
    print_area: {
      front: { x: 10, y: 10, width: 80, height: 65, unit: "percent" },
      back: { x: 10, y: 10, width: 80, height: 65, unit: "percent" },
    },
    compatibility_rules: [],
  },
};

export const PRINT_COLORS_PALETTE = [
  { id: "black", label_ar: "أسود", hex: "#000000" },
  { id: "red", label_ar: "أحمر", hex: "#DC2626" },
  { id: "blue", label_ar: "أزرق", hex: "#2563EB" },
  { id: "green", label_ar: "أخضر", hex: "#16A34A" },
  { id: "yellow", label_ar: "أصفر", hex: "#EAB308" },
  { id: "white", label_ar: "أبيض", hex: "#FFFFFF" },
  { id: "orange", label_ar: "برتقالي", hex: "#EA580C" },
  { id: "purple", label_ar: "بنفسجي", hex: "#7C3AED" },
  { id: "brown", label_ar: "بني", hex: "#92400E" },
  { id: "gold", label_ar: "ذهبي", hex: "#CA8A04" },
  { id: "silver", label_ar: "فضي", hex: "#9CA3AF" },
  { id: "pink", label_ar: "وردي", hex: "#EC4899" },
  { id: "maroon", label_ar: "مارون", hex: "#800000" },
  { id: "turquoise", label_ar: "تركواز", hex: "#40E0D0" },
  { id: "skyblue", label_ar: "سماوي", hex: "#38BDF8" },
  { id: "olive", label_ar: "زيتي", hex: "#6B8E23" },
  { id: "beige", label_ar: "بيج", hex: "#D2B48C" },
  { id: "gray", label_ar: "رمادي", hex: "#6B7280" },
];
