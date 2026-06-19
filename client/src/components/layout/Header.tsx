import { Sun, Moon, Palette, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme, type Theme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/use-auth";
import { useCompanyLogo } from "../../hooks/use-company-logo";
import { NotificationBell } from "../notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { logoUrl } = useCompanyLogo();

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    {
      value: "light",
      label: t("dashboard.profile.lightMode", "الوضع الفاتح"),
      icon: Sun,
    },
    {
      value: "dark",
      label: t("dashboard.profile.darkMode", "الوضع المظلم"),
      icon: Moon,
    },
    {
      value: "blue",
      label: t("dashboard.profile.blueMode", "الأزرق الاحترافي"),
      icon: Palette,
    },
  ];
  const ActiveThemeIcon =
    themeOptions.find((o) => o.value === theme)?.icon ?? Sun;

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 pt-[0px] pb-[0px] font-bold">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-lg overflow-hidden">
            <img
              src={logoUrl}
              alt={t("header.factoryLogo")}
              className="w-full h-full object-contain mt-[0px] mb-[0px] pt-[0px] pb-[0px]"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
              MPBF
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("common.appName")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={t("dashboard.profile.theme", "المظهر")}
                data-testid="button-theme-menu"
              >
                <ActiveThemeIcon className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              {themeOptions.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className="gap-2 cursor-pointer"
                    data-testid={`theme-option-${option.value}`}
                  >
                    <OptionIcon className="h-4 w-4" />
                    <span className="flex-1">{option.label}</span>
                    {theme === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <LanguageSwitcher variant="dropdown" size="sm" />
          <NotificationBell />

          <div className="flex items-center gap-3">
            <div
              className={`${isRTL ? "text-right" : "text-left"} hidden sm:block`}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.display_name_ar || user?.display_name || user?.username}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {user?.role_name_ar ||
                  user?.role_name ||
                  t("header.defaultRole")}
              </p>
            </div>
            <button
              onClick={logout}
              className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {(
                user?.display_name_ar ||
                user?.display_name ||
                user?.username ||
                t("header.defaultInitial")
              ).charAt(0)}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
