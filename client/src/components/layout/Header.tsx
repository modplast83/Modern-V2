import { useAuth } from "../../hooks/use-auth";
import { NotificationBell } from "../notifications/NotificationBell";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import FactoryLogoPath from "../../../../attached_assets/FactoryLogoHPNGW.png";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden">
            <img
              src={FactoryLogoPath}
              alt="شعار مصنع الأكياس البلاستيكية"
              className="w-full h-full object-contain mt-[0px] mb-[0px] pt-[0px] pb-[0px]"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">MPBF Next</h1>
            <p className="text-sm text-gray-600">
              {t('common.appName')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          <LanguageSwitcher variant="dropdown" size="sm" />
          <NotificationBell />

          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.display_name_ar || user?.display_name || user?.username}
              </p>
              <p className="text-xs text-gray-600">
                {user?.role_name_ar || user?.role_name || "مستخدم"}
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
                "م"
              ).charAt(0)}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
