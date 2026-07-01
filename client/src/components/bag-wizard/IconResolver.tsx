import {
  ShoppingBag,
  Package,
  Smile,
  Trash2,
  FileText,
  Ban,
  Anchor,
  Link as LinkIcon,
  Hand,
  ShieldCheck,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag,
  Package,
  Smile,
  Trash2,
  FileText,
  Ban,
  Anchor,
  Link: LinkIcon,
  Hand,
  ShieldCheck,
};

interface BagIconProps {
  name: string;
  className?: string;
}

export function BagIcon({ name, className = "h-5 w-5" }: BagIconProps) {
  const Icon = ICON_MAP[name] || HelpCircle;
  return <Icon className={className} />;
}
