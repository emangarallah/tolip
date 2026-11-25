import React from 'react';

interface TulipLogoProps {
  className?: string;
  customLogoUrl?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TulipLogo: React.FC<TulipLogoProps> = ({
  className = '',
  customLogoUrl,
  showText = true,
  size = 'md',
}) => {
  // If custom logo image is provided in settings, render it with graceful fallback
  if (customLogoUrl && customLogoUrl.trim().length > 0) {
    const imgHeight = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14' : 'h-10';
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src={customLogoUrl}
          alt="شعار توليب للعناية الطبيعية"
          className={`${imgHeight} w-auto object-contain`}
          onError={(e) => {
            // fallback to SVG if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {showText && (
          <div className="flex flex-col text-right">
            <span className="text-lg font-bold tracking-tight text-[#1F2421]">توليب</span>
            <span className="text-[10px] uppercase tracking-widest text-[#D45278] font-medium -mt-1">
              Tulip Natural Care
            </span>
          </div>
        )}
      </div>
    );
  }

  // Bespoke Tulip botanical vector logo with refined soft rose pink & organic botanical green
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[11px]' : 'text-[10px]';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${iconSize} shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#FFF0F4] to-[#F2F8F4] p-1.5 shadow-sm border border-[#F5E1E8]`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Leaves and Stem in Natural Botanical Green */}
          <path
            d="M50 92V52"
            stroke="#3B6948"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Left natural leaf */}
          <path
            d="M50 78C38 74 24 64 26 48C36 48 46 62 50 70"
            fill="#4A7C59"
            opacity="0.9"
          />
          {/* Right natural leaf */}
          <path
            d="M50 70C54 62 64 48 74 48C76 64 62 74 50 78"
            fill="#3B6948"
            opacity="0.95"
          />

          {/* Tulip Flower Petals in Elegant Soft Rose Pink */}
          {/* Central bud */}
          <ellipse
            cx="50"
            cy="36"
            rx="12"
            ry="22"
            fill="#C74169"
          />
          {/* Left petal */}
          <path
            d="M50 56C34 54 22 40 26 22C38 22 48 38 50 56Z"
            fill="#E06287"
          />
          {/* Right petal */}
          <path
            d="M50 56C66 54 78 40 74 22C62 22 52 38 50 56Z"
            fill="#D45278"
          />
          {/* Delicate highlight */}
          <path
            d="M48 24C44 32 44 42 48 48"
            stroke="#FFF0F5"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </div>

      {showText && (
        <div className={`flex flex-col text-right leading-none select-none`}>
          <span className={`${titleSize} font-bold tracking-tight text-[#1F2421] dark:text-white`}>
            توليب
          </span>
          <span className={`${subSize} tracking-[0.16em] uppercase text-[#C74169] dark:text-[#E06287] font-medium mt-1 font-sans`}>
            Tulip Natural Care
          </span>
        </div>
      )}
    </div>
  );
};
