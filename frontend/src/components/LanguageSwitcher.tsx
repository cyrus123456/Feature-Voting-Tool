import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'vi', labelKey: 'language.vi' },
  { code: 'zh', labelKey: 'language.zh' },
] as const

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const currentLang = (i18n.language ?? 'en').split('-')[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
          aria-label={t('language.label')}
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium uppercase">{currentLang}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                currentLang === lang.code ? 'opacity-100' : 'opacity-0'
              )}
            />
            {t(lang.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
