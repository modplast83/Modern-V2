import { Link, useLocation } from "wouter";
import { useAuth } from "../../hooks/use-auth";
import { canAccessRoute } from "../../utils/roleUtils";
import { navigationItems, getLocalizedName } from "../../config/navigationConfig";
import { useLanguage } from "../../contexts/LanguageContext";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();

  // Filter modules based on user permissions
  const accessibleModules = navigationItems.filter(module => {
    return canAccessRoute(user, module.path);
  });

  return (
    <aside className="fixed right-0 top-16 bottom-0 bg-white shadow-sm border-l border-gray-200 w-64 hidden lg:block z-10 overflow-y-auto">
      <nav className="p-4">
        <div className="space-y-2">
          {accessibleModules.map((module) => {
            const Icon = module.icon;
            const isActive = location === module.path;

            return (
              <Link key={module.name} href={module.path}>
                <div
                  className={isActive ? "nav-item nav-item-active" : "nav-item"}
                >
                  <div className="w-full">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{getLocalizedName(module, language)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
