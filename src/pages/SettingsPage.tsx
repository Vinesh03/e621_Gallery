import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdvancedSettings } from '@/components/gallery/AdvancedSettings';
import { useLanguage } from '@/hooks/use-language';
import { PageTransition } from '@/components/PageTransition';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition variant="slideRight">
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('settings.advanced')}</h1>
          </div>
        </header>

        {/* Content */}
        <main className="p-4">
          <AdvancedSettings />
        </main>
      </div>
    </PageTransition>
  );
}
