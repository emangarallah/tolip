import React from 'react';

export const TulipOpeningMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 440 440"
    role="img"
    aria-label="يد تحمل عبوة عناية طبيعية محاطة بأوراق وزهور توليب"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="tulip-jar-body" x1="165" y1="124" x2="280" y2="216" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFDFB" />
        <stop offset="1" stopColor="#F7E9E4" />
      </linearGradient>
      <linearGradient id="tulip-pink-label" x1="176" y1="136" x2="268" y2="196" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F6A6C0" />
        <stop offset="1" stopColor="#D84D83" />
      </linearGradient>
      <linearGradient id="tulip-hand-fill" x1="92" y1="260" x2="330" y2="422" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF0E8" />
        <stop offset="1" stopColor="#F7CDBF" />
      </linearGradient>
      <linearGradient id="tulip-cap" x1="180" y1="84" x2="267" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFDFB" />
        <stop offset="1" stopColor="#EACFC8" />
      </linearGradient>
    </defs>

    {/* Botanical stems and leaves */}
    <g stroke="#171717" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M100 249C75 216 65 176 78 132" />
      <path d="M339 243C370 207 381 169 368 126" />
      <path d="M104 220C82 198 60 184 42 188" />
      <path d="M350 204C372 185 392 179 408 186" />
      <path d="M84 167C62 153 55 137 60 121" />
      <path d="M374 165C393 148 397 132 391 116" />
      <path d="M60 121C49 113 49 99 59 94C69 90 79 98 76 109C74 116 68 120 60 121Z" fill="#F39AB8" />
      <path d="M391 116C381 107 384 93 395 91C406 89 412 101 405 110C402 114 397 116 391 116Z" fill="#F39AB8" />
      <path d="M42 188C22 175 18 157 27 145C49 150 65 168 66 189C58 191 50 191 42 188Z" fill="#A6BE72" />
      <path d="M104 220C81 222 61 214 50 197C68 185 91 194 104 220Z" fill="#7EAA59" />
      <path d="M78 151C58 143 48 127 51 110C70 112 83 131 78 151Z" fill="#B5C982" />
      <path d="M408 186C426 173 429 157 420 146C399 150 384 168 384 188C392 190 400 189 408 186Z" fill="#A6BE72" />
      <path d="M350 204C371 211 392 205 405 190C389 175 365 181 350 204Z" fill="#7EAA59" />
      <path d="M368 146C388 138 398 123 394 107C376 109 363 127 368 146Z" fill="#B5C982" />
    </g>

    {/* Product jar */}
    <g stroke="#171717" strokeWidth="5" strokeLinejoin="round">
      <path d="M181 87H259L265 111H175L181 87Z" fill="url(#tulip-cap)" />
      <rect x="164" y="111" width="112" height="111" rx="20" fill="url(#tulip-jar-body)" />
      <rect x="176" y="132" width="88" height="70" rx="12" fill="url(#tulip-pink-label)" stroke="#F9DCE6" strokeWidth="3" />
      <path d="M220 148C211 159 210 170 220 181C230 170 229 159 220 148Z" fill="#FFF8F8" stroke="none" />
      <path d="M220 179C209 164 199 164 195 171C198 183 210 188 220 179Z" fill="#FFF8F8" stroke="none" />
      <path d="M220 179C231 164 241 164 245 171C242 183 230 188 220 179Z" fill="#FFF8F8" stroke="none" />
      <path d="M178 121C184 116 193 115 200 116" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </g>

    {/* Open hand holding the product */}
    <path
      d="M91 408C91 379 93 351 106 329C117 310 136 298 158 285L190 266C203 258 213 244 223 232C233 220 247 222 249 233C250 242 240 255 231 266L216 283C239 269 265 249 284 239C297 231 309 238 304 250C300 258 286 270 274 280C297 267 318 254 332 250C345 246 354 256 346 268C338 280 321 293 307 304C325 298 340 294 349 303C358 312 345 325 333 335C311 354 290 367 266 379C239 393 208 404 177 414L132 425C111 424 96 418 91 408Z"
      fill="url(#tulip-hand-fill)"
      stroke="#171717"
      strokeWidth="5.5"
      strokeLinejoin="round"
    />
    <g stroke="#171717" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M218 283C235 278 250 267 265 255" />
      <path d="M274 280C288 275 300 265 311 256" />
      <path d="M307 304C319 298 329 290 337 282" />
      <path d="M126 352C140 332 158 318 181 306C194 299 206 291 216 283" />
      <path d="M132 425C132 397 135 378 150 360" />
    </g>
    <path d="M158 320C183 306 205 295 225 285C244 276 260 273 277 279C268 294 248 307 224 320C203 332 180 342 157 343C147 337 148 326 158 320Z" fill="#E66E9A" stroke="#171717" strokeWidth="4" />
    <path d="M156 327C184 313 207 303 230 294" stroke="#FFD2E1" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
