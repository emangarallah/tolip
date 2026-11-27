import React from 'react';
import { motion } from 'motion/react';

interface TulipLogoProps {
  className?: string;
  customLogoUrl?: string;
  showText?: boolean;
  letterMark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TulipLogo: React.FC<TulipLogoProps> = ({
  className = '',
  customLogoUrl,
  showText = true,
  letterMark = false,
  size = 'md',
}) => {
  if (letterMark) {
    const markSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
    const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
    const subSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[11px]' : 'text-[10px]';

    return (
      <motion.div
        className={`flex items-center gap-2.5 ${className}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <motion.div
          animate={{
            y: [0, -3.2, 0],
            scale: [1, 1.025, 1],
            rotateZ: [0, 1.45, 0, -1.45, 0],
            boxShadow: [
              '0 3px 12px rgba(199,65,105,0.16)',
              '0 5px 20px rgba(199,65,105,0.30)',
              '0 3px 12px rgba(199,65,105,0.16)',
            ],
          }}
          whileHover={{ scale: 1.09, rotate: -5 }}
          transition={{
            y: { duration: 5.4, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 6.8, repeat: Infinity, ease: 'easeInOut' },
            rotateZ: { duration: 8.4, repeat: Infinity, ease: 'easeInOut' },
            boxShadow: { duration: 6.8, repeat: Infinity, ease: 'easeInOut' },
          }}
          className={`relative flex ${markSize} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#F5D5E2] bg-gradient-to-br from-[#FFF8FA] via-[#FCE8EF] to-[#F0F6F1]`}
          aria-hidden="true"
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-2xl bg-[#E98EAD]/30 blur-md"
            animate={{ opacity: [0.08, 0.34, 0.08], scale: [0.88, 1.12, 0.88] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />
          <motion.span
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/70 to-transparent"
            animate={{ opacity: [0.35, 0.9, 0.35], x: ['-10%', '10%', '-10%'] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          <motion.span
            initial={{ opacity: 0, scale: 0.65, rotate: -18 }}
            animate={{ opacity: 1, scale: [1, 1.055, 1], rotate: [-12, -10.5, -12] }}
            transition={{
              opacity: { duration: 0.35, delay: 0.08 },
              scale: { duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
              rotate: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
            }}
            className="relative font-serif text-[29px] italic font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-[#F08AA9] via-[#C74169] to-[#8F2348] drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]"
          >
            T
          </motion.span>
          <span className="absolute left-[23%] top-[18%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.95)]" />
        </motion.div>

        {showText && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.12 }}
            className="flex flex-col text-right leading-none select-none"
          >
            <span className={`${titleSize} font-bold tracking-tight text-[#1F2421] dark:text-white`}>توليب</span>
            <span className={`${subSize} tracking-[0.16em] uppercase text-[#C74169] dark:text-[#E06287] font-medium mt-1 font-sans`}>Tulip Natural Care</span>
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (customLogoUrl && customLogoUrl.trim().length > 0) {
    const imgHeight = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14' : 'h-10';
    return (
      <motion.div
        className={`flex items-center gap-3 ${className}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <motion.img
          src={customLogoUrl}
          alt="شعار توليب للعناية الطبيعية"
          className={`${imgHeight} w-auto object-contain`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: [1, 1.025, 1], y: [0, -3, 0], rotate: [0, 0.65, 0, -0.65, 0] }}
          whileHover={{ scale: 1.05 }}
          transition={{
            opacity: { duration: 0.5, ease: 'easeOut' },
            scale: { duration: 6.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
            y: { duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
            rotate: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
          }}
          onError={(event) => {
            (event.target as HTMLElement).style.display = 'none';
          }}
        />
        {showText && (
          <div className="flex flex-col text-right">
            <span className="text-lg font-bold tracking-tight text-[#1F2421] dark:text-white">توليب</span>
            <span className="text-[10px] uppercase tracking-widest text-[#D45278] font-medium -mt-1">Tulip Natural Care</span>
          </div>
        )}
      </motion.div>
    );
  }

  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[11px]' : 'text-[10px]';

  return (
    <motion.div
      className={`flex items-center gap-2.5 ${className}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ y: [0, -2.8, 0], scale: [1, 1.02, 1], rotateZ: [0, 1.2, 0, -1.2, 0] }}
        whileHover={{ scale: 1.07, rotate: -4 }}
        transition={{
          y: { duration: 5.6, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 6.8, repeat: Infinity, ease: 'easeInOut' },
          rotateZ: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
        }}
        className={`relative ${iconSize} shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#FFF0F4] to-[#F2F8F4] p-1.5 shadow-sm border border-[#F5E1E8]`}
      >
        <motion.svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path
            d="M50 92V52"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            stroke="#3B6948" strokeWidth="4" strokeLinecap="round"
          />
          <motion.path
            d="M50 78C38 74 24 64 26 48C36 48 46 62 50 70"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ duration: 0.42, delay: 0.32, ease: 'easeOut' }}
            style={{ transformOrigin: '50px 70px' }}
            fill="#4A7C59"
          />
          <motion.path
            d="M50 70C54 62 64 48 74 48C76 64 62 74 50 78"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 0.95, scale: 1 }}
            transition={{ duration: 0.42, delay: 0.42, ease: 'easeOut' }}
            style={{ transformOrigin: '50px 70px' }}
            fill="#3B6948"
          />
          <motion.ellipse
            cx="50" cy="36" rx="12" ry="22" fill="#C74169"
            initial={{ opacity: 0, scaleY: 0.35 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 15, delay: 0.5 }}
            style={{ transformOrigin: '50px 36px' }}
          />
          <motion.path
            d="M50 56C34 54 22 40 26 22C38 22 48 38 50 56Z"
            initial={{ opacity: 0, scale: 0.82, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.48, delay: 0.58, ease: 'easeOut' }}
            style={{ transformOrigin: '50px 48px' }}
            fill="#E06287"
          />
          <motion.path
            d="M50 56C66 54 78 40 74 22C62 22 52 38 50 56Z"
            initial={{ opacity: 0, scale: 0.82, rotate: 8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.48, delay: 0.68, ease: 'easeOut' }}
            style={{ transformOrigin: '50px 48px' }}
            fill="#D45278"
          />
          <motion.path
            d="M48 24C44 32 44 42 48 48"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.75 }}
            transition={{ duration: 0.45, delay: 0.9, ease: 'easeOut' }}
            stroke="#FFF0F5" strokeWidth="2" strokeLinecap="round"
          />
        </motion.svg>
      </motion.div>

      {showText && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, delay: 0.12 }}
          className="flex flex-col text-right leading-none select-none"
        >
          <span className={`${titleSize} font-bold tracking-tight text-[#1F2421] dark:text-white`}>توليب</span>
          <span className={`${subSize} tracking-[0.16em] uppercase text-[#C74169] dark:text-[#E06287] font-medium mt-1 font-sans`}>Tulip Natural Care</span>
        </motion.div>
      )}
    </motion.div>
  );
};
