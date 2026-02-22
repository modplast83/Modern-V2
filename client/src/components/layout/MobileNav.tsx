import {
  Home,
  Warehouse,
  ClipboardCheck,
  Database,
  BarChart3,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const navItems = [
  { nameKey: "nav.home", icon: Home, path: "/" },
  { nameKey: "nav.warehouse", icon: Warehouse, path: "/warehouse" },
  { nameKey: "nav.quality", icon: ClipboardCheck, path: "/quality" },
  { nameKey: "nav.definitions", icon: Database, path: "/definitions" },
];

export default function MobileNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.nameKey} href={item.path}>
              <button
                className={`flex flex-col items-center p-2 min-w-0 ${
                  isActive ? "text-blue-600" : "text-gray-600"
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs leading-tight">{t(item.nameKey)}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
