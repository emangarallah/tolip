import React, { useEffect, useState } from 'react';
import { TulipOpeningMark } from './TulipOpeningMark.tsx';
import '../../src/styles/welcome-splash.css';

type SplashPhase = 'visible' | 'fading' | 'hidden';

export function WelcomeSplash() {
  const [phase, setPhase] = useState<SplashPhase>('visible');

  useEffect(() => {
    if (phase === 'visible') {
      const timer = window.setTimeout(() => setPhase('fading'), 3000);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'fading') {
      const timer = window.setTimeout(() => setPhase('hidden'), 520);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`tulip-splash tulip-splash--${phase}`}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة الترحيب إلى الصفحة الرئيسية"
      onClick={() => setPhase('fading')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setPhase('fading');
        }
      }}
    >
      <div className="tulip-splash__content">
        <TulipOpeningMark className="tulip-splash__logo" />
        <p className="tulip-splash__pink">لقد تم اختيار منتجك بكل عناية</p>
        <p className="tulip-splash__black">ليضيف لمسة من الجمال والتميز إلى يومك.</p>
      </div>
    </div>
  );
}

export default WelcomeSplash;
