import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

interface PWAInstallButtonProps {
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstallPrompt(null);
      return;
    }

    const message = isIOS
      ? 'لتثبيت توليب على iPhone أو iPad: افتحي الموقع في Safari، اضغطي زر المشاركة، ثم اختاري «إضافة إلى الشاشة الرئيسية».'
      : 'لتثبيت توليب: افتحي قائمة المتصفح (⋮ أو ⋯) ثم اختاري «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».';
    window.alert(message);
  };

  return (
    <button type="button" onClick={handleInstall} className={className} aria-label="تثبيت متجر توليب على الجهاز">
      {isIOS ? <Smartphone className="h-4 w-4 shrink-0" /> : <Download className="h-4 w-4 shrink-0" />}
      <span>تثبيت التطبيق</span>
    </button>
  );
};
