import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from './button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  variant?: 'button' | 'dropdown' | 'toggle';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  size = 'default',
  showLabel = false 
}: LanguageSwitcherProps) {
  const { language, setLanguage, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

  if (variant === 'toggle') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleLanguage}
        className="gap-2"
        data-testid="button-language-toggle"
      >
        <Globe className="h-4 w-4" />
        {showLabel && (
          <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
        )}
      </Button>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={toggleLanguage}
        className="gap-2"
        data-testid="button-language-switch"
      >
        <Globe className="h-4 w-4" />
        <span>{language === 'ar' ? 'English' : 'العربية'}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={size}
          className="gap-2"
          data-testid="button-language-dropdown"
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {language === 'ar' ? 'العربية' : 'English'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage('ar')}
          className={language === 'ar' ? 'bg-accent' : ''}
          data-testid="menu-item-arabic"
        >
          <span className="mr-2">🇸🇦</span>
          العربية
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
          data-testid="menu-item-english"
        >
          <span className="mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
