import { useState } from "react";

// ═══════════════════════════════════════════════════════════
// BASIC SHAPES — 15 items
// ═══════════════════════════════════════════════════════════
const basicShapes = [
  { id: "circle", name: "Circle", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill={c}/></svg> },
  { id: "square", name: "Square", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="6" fill={c}/></svg> },
  { id: "triangle", name: "Triangle", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,8 92,88 8,88" fill={c}/></svg> },
  { id: "star", name: "Star", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={c}/></svg> },
  { id: "diamond", name: "Diamond", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill={c}/></svg> },
  { id: "hexagon", name: "Hexagon", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,5 93,27 93,73 50,95 7,73 7,27" fill={c}/></svg> },
  { id: "pentagon", name: "Pentagon", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,5 97,38 79,92 21,92 3,38" fill={c}/></svg> },
  { id: "oval", name: "Oval", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="44" ry="30" fill={c}/></svg> },
  { id: "semicircle", name: "Semicircle", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><path d="M8,55 A42,42 0 0,1 92,55 Z" fill={c}/></svg> },
  { id: "ring", name: "Ring", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke={c} strokeWidth="10"/></svg> },
  { id: "cross", name: "Cross", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><path d="M38,8 h24 v30 h30 v24 h-30 v30 h-24 v-30 h-30 v-24 h30 z" fill={c}/></svg> },
  { id: "heart", name: "Heart", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50,88 C20,65 5,50 5,32 C5,18 16,8 30,8 C38,8 45,12 50,20 C55,12 62,8 70,8 C84,8 95,18 95,32 C95,50 80,65 50,88Z" fill={c}/></svg> },
  { id: "crescent", name: "Crescent", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><circle cx="42" cy="50" r="36" fill={c}/><circle cx="62" cy="44" r="30" fill="white"/></svg> },
  { id: "arrow_right", name: "Arrow Right", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="10,35 60,35 60,15 90,50 60,85 60,65 10,65" fill={c}/></svg> },
  { id: "arrow_up", name: "Arrow Up", svg: (c, s) => <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,10 85,60 65,60 65,90 35,90 35,60 15,60" fill={c}/></svg> },
];

// ═══════════════════════════════════════════════════════════
// NUMBERS — 9 items
// ═══════════════════════════════════════════════════════════
const numbers = [1,2,3,4,5,6,7,8,9].map(n => ({
  id: `number_${n}`, name: `${n}`,
  svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill={c} />
      <text x="50" y="63" textAnchor="middle" fill="white" fontSize="46" fontWeight="bold" style={{fontFamily:"Arial,sans-serif"}}>{n}</text>
    </svg>
  ),
}));

// ═══════════════════════════════════════════════════════════
// LETTERS — 26 items
// ═══════════════════════════════════════════════════════════
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => ({
  id: `letter_${l}`, name: l,
  svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="6" y="6" width="88" height="88" rx="14" fill={c} />
      <text x="50" y="66" textAnchor="middle" fill="white" fontSize="50" fontWeight="bold" style={{fontFamily:"Arial,sans-serif"}}>{l}</text>
    </svg>
  ),
}));

// ═══════════════════════════════════════════════════════════
// EVERYDAY OBJECTS — 15 items
// ═══════════════════════════════════════════════════════════
const everyday = [
  { id: "apple", name: "Apple", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="50" cy="58" rx="30" ry="34" fill="#E53935" />
      <ellipse cx="42" cy="48" rx="8" ry="12" fill="#EF5350" opacity="0.5" />
      <path d="M50,24 C50,14 56,10 60,14" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="58" cy="16" rx="8" ry="4" fill="#43A047" transform="rotate(20,58,16)" />
    </svg>
  )},
  { id: "tree", name: "Tree", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="43" y="62" width="14" height="30" rx="3" fill="#795548" />
      <circle cx="50" cy="32" r="22" fill="#43A047" />
      <circle cx="36" cy="44" r="16" fill="#388E3C" />
      <circle cx="64" cy="44" r="16" fill="#388E3C" />
      <circle cx="50" cy="48" r="14" fill="#2E7D32" />
    </svg>
  )},
  { id: "house", name: "House", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="20" y="46" width="60" height="44" fill="#FFF9C4" stroke="#E0E0E0" strokeWidth="1" />
      <polygon points="50,10 90,46 10,46" fill="#E53935" />
      <rect x="42" y="60" width="16" height="30" rx="1" fill="#795548" />
      <circle cx="54" cy="76" r="2" fill="#FFD54F" />
      <rect x="25" y="54" width="12" height="12" fill="#81D4FA" stroke="#64B5F6" strokeWidth="1" />
      <rect x="63" y="54" width="12" height="12" fill="#81D4FA" stroke="#64B5F6" strokeWidth="1" />
      <line x1="31" y1="54" x2="31" y2="66" stroke="#90CAF9" strokeWidth="1" />
      <line x1="25" y1="60" x2="37" y2="60" stroke="#90CAF9" strokeWidth="1" />
      <line x1="69" y1="54" x2="69" y2="66" stroke="#90CAF9" strokeWidth="1" />
      <line x1="63" y1="60" x2="75" y2="60" stroke="#90CAF9" strokeWidth="1" />
    </svg>
  )},
  { id: "car", name: "Car", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="8" y="42" width="84" height="26" rx="6" fill="#1E88E5" />
      <path d="M26,42 L36,22 L64,22 L74,42" fill="#1565C0" />
      <rect x="39" y="26" width="10" height="13" rx="2" fill="#BBDEFB" />
      <rect x="53" y="26" width="10" height="13" rx="2" fill="#BBDEFB" />
      <rect x="12" y="50" width="16" height="5" rx="2" fill="#FDD835" />
      <rect x="72" y="50" width="16" height="5" rx="2" fill="#E53935" />
      <circle cx="28" cy="70" r="10" fill="#37474F" /><circle cx="28" cy="70" r="6" fill="#78909C" /><circle cx="28" cy="70" r="2" fill="#37474F" />
      <circle cx="72" cy="70" r="10" fill="#37474F" /><circle cx="72" cy="70" r="6" fill="#78909C" /><circle cx="72" cy="70" r="2" fill="#37474F" />
    </svg>
  )},
  { id: "key", name: "Key", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="30" cy="38" r="18" fill="none" stroke="#FDD835" strokeWidth="7" />
      <circle cx="30" cy="38" r="6" fill="none" stroke="#FDD835" strokeWidth="4" />
      <rect x="44" y="34" width="46" height="8" rx="3" fill="#FDD835" />
      <rect x="78" y="42" width="6" height="12" rx="1" fill="#FDD835" />
      <rect x="68" y="42" width="6" height="10" rx="1" fill="#FDD835" />
    </svg>
  )},
  { id: "book", name: "Book", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="20" y="12" width="60" height="76" rx="3" fill="#5C6BC0" />
      <rect x="27" y="12" width="53" height="76" rx="2" fill="#FAFAFA" />
      <rect x="22" y="12" width="8" height="76" fill="#3949AB" />
      <line x1="36" y1="28" x2="72" y2="28" stroke="#BDBDBD" strokeWidth="2" />
      <line x1="36" y1="38" x2="72" y2="38" stroke="#BDBDBD" strokeWidth="2" />
      <line x1="36" y1="48" x2="62" y2="48" stroke="#BDBDBD" strokeWidth="2" />
      <line x1="36" y1="58" x2="68" y2="58" stroke="#BDBDBD" strokeWidth="2" />
    </svg>
  )},
  { id: "cup", name: "Cup", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M24,32 L30,84 L70,84 L76,32 Z" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="2" />
      <path d="M76,40 Q94,40 94,54 Q94,66 76,66" fill="none" stroke="#BDBDBD" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="44" rx="18" ry="7" fill="#795548" />
      <path d="M40,20 Q42,12 44,20" fill="none" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50,16 Q52,8 54,16" fill="none" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60,20 Q62,12 64,20" fill="none" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )},
  { id: "clock", name: "Clock", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="#FAFAFA" stroke="#37474F" strokeWidth="4" />
      <circle cx="50" cy="50" r="38" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="1" />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => <line key={i} x1={50 + 34 * Math.cos((a - 90) * Math.PI / 180)} y1={50 + 34 * Math.sin((a - 90) * Math.PI / 180)} x2={50 + 38 * Math.cos((a - 90) * Math.PI / 180)} y2={50 + 38 * Math.sin((a - 90) * Math.PI / 180)} stroke="#37474F" strokeWidth={a % 90 === 0 ? "3" : "1.5"} />)}
      <line x1="50" y1="50" x2="50" y2="22" stroke="#37474F" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="66" y2="40" stroke="#37474F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="62" y2="56" stroke="#E53935" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3" fill="#37474F" />
    </svg>
  )},
  { id: "umbrella", name: "Umbrella", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M50,48 Q10,48 10,20 Q30,38 50,10 Q70,38 90,20 Q90,48 50,48 Z" fill="#E53935" />
      <path d="M50,10 Q30,38 10,20" fill="none" stroke="#C62828" strokeWidth="1.5" />
      <path d="M50,10 Q70,38 90,20" fill="none" stroke="#C62828" strokeWidth="1.5" />
      <line x1="50" y1="48" x2="50" y2="82" stroke="#795548" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50,82 Q50,90 42,90" fill="none" stroke="#795548" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )},
  { id: "phone", name: "Phone", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="28" y="8" width="44" height="84" rx="8" fill="#37474F" />
      <rect x="32" y="20" width="36" height="54" rx="2" fill="#BBDEFB" />
      <circle cx="50" cy="82" r="4" fill="#546E7A" />
      <rect x="42" y="12" width="16" height="3" rx="1.5" fill="#546E7A" />
    </svg>
  )},
  { id: "lightbulb", name: "Light Bulb", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="36" r="26" fill="#FDD835" />
      <circle cx="50" cy="36" r="20" fill="#FFEE58" opacity="0.6" />
      <rect x="40" y="58" width="20" height="10" rx="2" fill="#BDBDBD" />
      <rect x="42" y="68" width="16" height="3" rx="1" fill="#9E9E9E" />
      <rect x="42" y="72" width="16" height="3" rx="1" fill="#9E9E9E" />
      <path d="M44,76 Q50,82 56,76" fill="#9E9E9E" />
      <line x1="50" y1="8" x2="50" y2="2" stroke="#FDD835" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="20" x2="16" y2="14" stroke="#FDD835" strokeWidth="3" strokeLinecap="round" />
      <line x1="78" y1="20" x2="84" y2="14" stroke="#FDD835" strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="40" x2="8" y2="40" stroke="#FDD835" strokeWidth="3" strokeLinecap="round" />
      <line x1="86" y1="40" x2="92" y2="40" stroke="#FDD835" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )},
  { id: "flower", name: "Flower", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <line x1="50" y1="52" x2="50" y2="92" stroke="#43A047" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="36" cy="74" rx="12" ry="5" fill="#66BB6A" transform="rotate(-35,36,74)" />
      <ellipse cx="64" cy="80" rx="10" ry="4" fill="#66BB6A" transform="rotate(25,64,80)" />
      {[0,51,102,153,204,255,306].map((a, i) => <ellipse key={i} cx={50 + 16 * Math.cos(a * Math.PI / 180)} cy={34 + 16 * Math.sin(a * Math.PI / 180)} rx="10" ry="14" fill={i % 2 === 0 ? "#E53935" : "#EF5350"} transform={`rotate(${a + 90},${50 + 16 * Math.cos(a * Math.PI / 180)},${34 + 16 * Math.sin(a * Math.PI / 180)})`} />)}
      <circle cx="50" cy="34" r="10" fill="#FDD835" />
      <circle cx="48" cy="32" r="2" fill="#F9A825" />
      <circle cx="53" cy="35" r="1.5" fill="#F9A825" />
      <circle cx="50" cy="38" r="1.5" fill="#F9A825" />
    </svg>
  )},
  { id: "sun", name: "Sun", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      {[0,45,90,135,180,225,270,315].map((a, i) => <line key={i} x1={50 + 28 * Math.cos(a * Math.PI / 180)} y1={50 + 28 * Math.sin(a * Math.PI / 180)} x2={50 + 44 * Math.cos(a * Math.PI / 180)} y2={50 + 44 * Math.sin(a * Math.PI / 180)} stroke="#FDD835" strokeWidth="4" strokeLinecap="round" />)}
      <circle cx="50" cy="50" r="22" fill="#FDD835" />
      <circle cx="42" cy="46" r="2.5" fill="#F57F17" />
      <circle cx="58" cy="46" r="2.5" fill="#F57F17" />
      <path d="M42,56 Q50,62 58,56" fill="none" stroke="#F57F17" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )},
  { id: "cloud", name: "Cloud", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="50" cy="44" rx="26" ry="20" fill="#ECEFF1" />
      <ellipse cx="32" cy="52" rx="20" ry="16" fill="#ECEFF1" />
      <ellipse cx="68" cy="52" rx="18" ry="14" fill="#ECEFF1" />
      <rect x="16" y="52" width="68" height="18" rx="8" fill="#ECEFF1" />
      <ellipse cx="50" cy="40" rx="18" ry="12" fill="#F5F5F5" opacity="0.6" />
    </svg>
  )},
  { id: "moon_obj", name: "Moon", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="44" cy="50" r="34" fill="#FDD835" />
      <circle cx="60" cy="42" r="28" fill="white" />
      <circle cx="30" cy="40" r="3" fill="#F9A825" opacity="0.4" />
      <circle cx="38" cy="56" r="2" fill="#F9A825" opacity="0.3" />
      <circle cx="28" cy="62" r="2.5" fill="#F9A825" opacity="0.3" />
    </svg>
  )},
];

// ═══════════════════════════════════════════════════════════
// ANIMALS — 10 items
// ═══════════════════════════════════════════════════════════
const animals = [
  { id: "cat", name: "Cat", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="56" r="28" fill="#FF9800" />
      <polygon points="28,34 19,6 40,26" fill="#FF9800" />
      <polygon points="72,34 81,6 60,26" fill="#FF9800" />
      <polygon points="28,34 19,6 40,26" fill="#FFB74D" opacity="0.5" />
      <polygon points="72,34 81,6 60,26" fill="#FFB74D" opacity="0.5" />
      <circle cx="38" cy="50" r="5" fill="white" /><circle cx="38" cy="50" r="3" fill="#1A1A18" /><circle cx="37" cy="49" r="1" fill="white" />
      <circle cx="62" cy="50" r="5" fill="white" /><circle cx="62" cy="50" r="3" fill="#1A1A18" /><circle cx="61" cy="49" r="1" fill="white" />
      <ellipse cx="50" cy="60" rx="4" ry="3" fill="#F48FB1" />
      <path d="M47,60 L50,63 L53,60" fill="none" stroke="#F48FB1" strokeWidth="1" />
      <line x1="18" y1="52" x2="34" y2="54" stroke="#1A1A18" strokeWidth="1" /><line x1="18" y1="58" x2="34" y2="58" stroke="#1A1A18" strokeWidth="1" />
      <line x1="66" y1="54" x2="82" y2="52" stroke="#1A1A18" strokeWidth="1" /><line x1="66" y1="58" x2="82" y2="58" stroke="#1A1A18" strokeWidth="1" />
    </svg>
  )},
  { id: "dog", name: "Dog", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="54" r="28" fill="#8D6E63" />
      <ellipse cx="26" cy="36" rx="12" ry="20" fill="#795548" transform="rotate(-20,26,36)" />
      <ellipse cx="74" cy="36" rx="12" ry="20" fill="#795548" transform="rotate(20,74,36)" />
      <circle cx="40" cy="48" r="4" fill="white" /><circle cx="40" cy="48" r="2.5" fill="#1A1A18" /><circle cx="39" cy="47" r="0.8" fill="white" />
      <circle cx="60" cy="48" r="4" fill="white" /><circle cx="60" cy="48" r="2.5" fill="#1A1A18" /><circle cx="59" cy="47" r="0.8" fill="white" />
      <ellipse cx="50" cy="58" rx="10" ry="7" fill="#5D4037" />
      <ellipse cx="50" cy="56" rx="4" ry="3" fill="#1A1A18" />
      <path d="M44,64 Q50,72 56,64" fill="none" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="62" r="1" fill="#E91E63" />
    </svg>
  )},
  { id: "fish", name: "Fish", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="44" cy="50" rx="30" ry="20" fill="#1E88E5" />
      <polygon points="72,50 92,32 92,68" fill="#1565C0" />
      <ellipse cx="44" cy="50" rx="28" ry="18" fill="#42A5F5" opacity="0.4" />
      <circle cx="32" cy="44" r="5" fill="white" /><circle cx="33" cy="44" r="3" fill="#1A1A18" /><circle cx="32" cy="43" r="1" fill="white" />
      <path d="M14,42 Q8,50 14,58" fill="none" stroke="#1E88E5" strokeWidth="2" opacity="0.5" />
      <line x1="50" y1="38" x2="64" y2="38" stroke="#1565C0" strokeWidth="1" opacity="0.4" />
      <line x1="52" y1="44" x2="66" y2="44" stroke="#1565C0" strokeWidth="1" opacity="0.4" />
    </svg>
  )},
  { id: "bird", name: "Bird", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="46" cy="52" rx="26" ry="18" fill="#FDD835" />
      <circle cx="36" cy="42" r="12" fill="#FFEE58" />
      <circle cx="32" cy="40" r="3.5" fill="white" /><circle cx="33" cy="40" r="2" fill="#1A1A18" /><circle cx="32" cy="39" r="0.7" fill="white" />
      <polygon points="20,44 6,38 6,46 20,48" fill="#FF9800" />
      <path d="M70,48 L88,34 L82,52 Z" fill="#FBC02D" />
      <path d="M68,42 L84,28" fill="none" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="52" cy="60" rx="10" ry="4" fill="#F9A825" opacity="0.4" />
    </svg>
  )},
  { id: "butterfly", name: "Butterfly", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="30" cy="36" rx="22" ry="18" fill="#7E57C2" opacity="0.85" />
      <ellipse cx="70" cy="36" rx="22" ry="18" fill="#7E57C2" opacity="0.85" />
      <ellipse cx="34" cy="62" rx="16" ry="14" fill="#9575CD" opacity="0.7" />
      <ellipse cx="66" cy="62" rx="16" ry="14" fill="#9575CD" opacity="0.7" />
      <circle cx="30" cy="34" r="4" fill="#CE93D8" opacity="0.6" />
      <circle cx="70" cy="34" r="4" fill="#CE93D8" opacity="0.6" />
      <ellipse cx="50" cy="50" rx="4" ry="24" fill="#4E342E" />
      <line x1="47" y1="26" x2="36" y2="12" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" />
      <line x1="53" y1="26" x2="64" y2="12" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="11" r="2.5" fill="#4E342E" /><circle cx="64" cy="11" r="2.5" fill="#4E342E" />
    </svg>
  )},
  { id: "rabbit", name: "Rabbit", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="38" cy="22" rx="9" ry="22" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="1" />
      <ellipse cx="62" cy="22" rx="9" ry="22" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="1" />
      <ellipse cx="38" cy="22" rx="4" ry="16" fill="#F8BBD0" />
      <ellipse cx="62" cy="22" rx="4" ry="16" fill="#F8BBD0" />
      <circle cx="50" cy="58" r="28" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="1" />
      <circle cx="50" cy="58" r="22" fill="#FAFAFA" opacity="0.5" />
      <circle cx="40" cy="52" r="3.5" fill="#1A1A18" /><circle cx="39" cy="51" r="1" fill="white" />
      <circle cx="60" cy="52" r="3.5" fill="#1A1A18" /><circle cx="59" cy="51" r="1" fill="white" />
      <ellipse cx="50" cy="62" rx="4" ry="3" fill="#F48FB1" />
      <path d="M46,66 Q50,70 54,66" fill="none" stroke="#E0E0E0" strokeWidth="1.5" />
    </svg>
  )},
  { id: "frog", name: "Frog", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="50" cy="60" rx="34" ry="24" fill="#43A047" />
      <ellipse cx="50" cy="62" rx="26" ry="16" fill="#66BB6A" opacity="0.5" />
      <circle cx="32" cy="36" r="14" fill="#43A047" />
      <circle cx="68" cy="36" r="14" fill="#43A047" />
      <circle cx="32" cy="34" r="7" fill="white" /><circle cx="33" cy="33" r="4" fill="#1A1A18" /><circle cx="32" cy="32" r="1.2" fill="white" />
      <circle cx="68" cy="34" r="7" fill="white" /><circle cx="69" cy="33" r="4" fill="#1A1A18" /><circle cx="68" cy="32" r="1.2" fill="white" />
      <path d="M38,68 Q50,78 62,68" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="42" cy="56" r="2" fill="#2E7D32" opacity="0.3" /><circle cx="58" cy="56" r="2" fill="#2E7D32" opacity="0.3" />
    </svg>
  )},
  { id: "ladybug", name: "Ladybug", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="50" cy="56" rx="32" ry="28" fill="#E53935" />
      <line x1="50" y1="28" x2="50" y2="84" stroke="#1A1A18" strokeWidth="3" />
      <circle cx="50" cy="32" r="14" fill="#1A1A18" />
      <circle cx="35" cy="48" r="5" fill="#1A1A18" /><circle cx="65" cy="48" r="5" fill="#1A1A18" />
      <circle cx="38" cy="66" r="4" fill="#1A1A18" /><circle cx="62" cy="66" r="4" fill="#1A1A18" />
      <circle cx="50" cy="76" r="3" fill="#1A1A18" />
      <circle cx="44" cy="28" r="2.5" fill="white" /><circle cx="56" cy="28" r="2.5" fill="white" />
      <line x1="42" y1="22" x2="36" y2="12" stroke="#1A1A18" strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="22" x2="64" y2="12" stroke="#1A1A18" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="11" r="2" fill="#1A1A18" /><circle cx="64" cy="11" r="2" fill="#1A1A18" />
    </svg>
  )},
  { id: "turtle", name: "Turtle", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="22" cy="48" r="6" fill="#66BB6A" /><circle cx="78" cy="48" r="6" fill="#66BB6A" />
      <circle cx="26" cy="70" r="5" fill="#66BB6A" /><circle cx="74" cy="70" r="5" fill="#66BB6A" />
      <ellipse cx="50" cy="56" rx="28" ry="22" fill="#43A047" />
      <ellipse cx="50" cy="54" rx="22" ry="16" fill="#66BB6A" />
      <path d="M38,46 L50,42 L62,46 L62,60 L50,64 L38,60 Z" fill="#43A047" stroke="#2E7D32" strokeWidth="1" />
      <circle cx="16" cy="40" r="8" fill="#66BB6A" />
      <circle cx="14" cy="38" r="2" fill="#1A1A18" /><circle cx="13.5" cy="37.5" r="0.6" fill="white" />
      <path d="M10,44 Q8,42 10,40" fill="none" stroke="#66BB6A" strokeWidth="1.5" />
    </svg>
  )},
  { id: "bee", name: "Bee", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="34" cy="38" rx="16" ry="10" fill="rgba(200,225,255,0.45)" transform="rotate(-25,34,38)" />
      <ellipse cx="66" cy="38" rx="16" ry="10" fill="rgba(200,225,255,0.45)" transform="rotate(25,66,38)" />
      <ellipse cx="50" cy="56" rx="22" ry="18" fill="#FDD835" />
      <rect x="30" y="50" width="40" height="5" rx="1" fill="#1A1A18" />
      <rect x="32" y="60" width="36" height="5" rx="1" fill="#1A1A18" />
      <rect x="34" y="70" width="32" height="4" rx="1" fill="#1A1A18" />
      <circle cx="50" cy="38" r="12" fill="#1A1A18" />
      <circle cx="45" cy="36" r="2.5" fill="white" /><circle cx="55" cy="36" r="2.5" fill="white" />
      <circle cx="45" cy="36" r="1" fill="#1A1A18" /><circle cx="55" cy="36" r="1" fill="#1A1A18" />
      <line x1="46" y1="26" x2="42" y2="18" stroke="#1A1A18" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="54" y1="26" x2="58" y2="18" stroke="#1A1A18" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="42" cy="17" r="2" fill="#1A1A18" /><circle cx="58" cy="17" r="2" fill="#1A1A18" />
    </svg>
  )},
];

// ═══════════════════════════════════════════════════════════
// FOOD & DRINK — 10 items
// ═══════════════════════════════════════════════════════════
const food = [
  { id: "pizza", name: "Pizza", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M50,12 L88,88 L12,88 Z" fill="#F9A825" />
      <path d="M50,18 L82,82 L18,82 Z" fill="#FFE082" />
      <circle cx="44" cy="52" r="7" fill="#E53935" /><circle cx="60" cy="62" r="6" fill="#E53935" />
      <circle cx="36" cy="70" r="5.5" fill="#E53935" /><circle cx="56" cy="44" r="5" fill="#43A047" />
      <circle cx="44" cy="52" r="3" fill="#C62828" opacity="0.4" />
      <path d="M50,12 L88,88" stroke="#E6B422" strokeWidth="1" opacity="0.3" />
    </svg>
  )},
  { id: "cake", name: "Cake", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect x="18" y="48" width="64" height="38" rx="4" fill="#F48FB1" />
      <rect x="18" y="48" width="64" height="12" fill="#EC407A" rx="4" />
      <path d="M18,60 Q34,54 50,60 Q66,66 82,60" fill="none" stroke="#FAFAFA" strokeWidth="3" />
      <ellipse cx="50" cy="48" rx="32" ry="5" fill="#FAFAFA" />
      <rect x="47" y="22" width="6" height="26" rx="2" fill="#FFCC02" />
      <ellipse cx="50" cy="20" rx="4" ry="6" fill="#FF9800" />
      <circle cx="50" cy="16" r="3" fill="#FDD835" />
    </svg>
  )},
  { id: "cookie", name: "Cookie", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="38" fill="#D4A06A" />
      <circle cx="50" cy="50" r="36" fill="#C49A6C" />
      <circle cx="37" cy="36" r="4.5" fill="#5D4037" /><circle cx="58" cy="34" r="4" fill="#5D4037" />
      <circle cx="44" cy="54" r="3.5" fill="#5D4037" /><circle cx="64" cy="56" r="4.5" fill="#5D4037" />
      <circle cx="34" cy="66" r="3.5" fill="#5D4037" /><circle cx="55" cy="70" r="4" fill="#5D4037" />
      <circle cx="37" cy="36" r="2" fill="#4E342E" opacity="0.4" /><circle cx="64" cy="56" r="2" fill="#4E342E" opacity="0.4" />
    </svg>
  )},
  { id: "icecream", name: "Ice Cream", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <polygon points="36,52 64,52 50,94" fill="#D4A06A" />
      <line x1="43" y1="52" x2="50" y2="94" stroke="#C49A6C" strokeWidth="1" opacity="0.5" />
      <line x1="57" y1="52" x2="50" y2="94" stroke="#C49A6C" strokeWidth="1" opacity="0.5" />
      <circle cx="50" cy="38" r="20" fill="#F48FB1" />
      <circle cx="36" cy="36" r="14" fill="#EC407A" />
      <circle cx="64" cy="36" r="14" fill="#F06292" />
      <ellipse cx="40" cy="30" rx="5" ry="3" fill="rgba(255,255,255,0.3)" />
      <circle cx="50" cy="26" r="5" fill="#E53935" />
      <circle cx="50" cy="26" r="2" fill="#C62828" opacity="0.4" />
    </svg>
  )},
  { id: "donut", name: "Donut", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="54" r="34" fill="#D4A06A" />
      <ellipse cx="50" cy="48" rx="34" ry="28" fill="#F48FB1" />
      <circle cx="50" cy="50" r="12" fill="white" />
      <circle cx="34" cy="38" r="2.5" fill="#FDD835" /><circle cx="56" cy="34" r="2" fill="#43A047" />
      <circle cx="66" cy="42" r="2.5" fill="#E53935" /><circle cx="42" cy="30" r="2" fill="#1E88E5" />
      <circle cx="48" cy="58" r="1.5" fill="#FDD835" /><circle cx="62" cy="54" r="2" fill="#7E57C2" />
    </svg>
  )},
  { id: "watermelon", name: "Watermelon", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M50,12 L92,82 Q50,98 8,82 Z" fill="#2E7D32" />
      <path d="M50,18 L86,78 Q50,92 14,78 Z" fill="#43A047" />
      <path d="M50,26 L78,72 Q50,84 22,72 Z" fill="#E53935" />
      <circle cx="42" cy="52" r="2.5" fill="#1A1A18" /><circle cx="55" cy="48" r="2.5" fill="#1A1A18" />
      <circle cx="48" cy="64" r="2.5" fill="#1A1A18" /><circle cx="60" cy="60" r="2" fill="#1A1A18" />
      <circle cx="36" cy="66" r="2" fill="#1A1A18" /><circle cx="52" cy="38" r="2" fill="#1A1A18" />
    </svg>
  )},
  { id: "cherry", name: "Cherry", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M50,14 Q38,30 34,54" fill="none" stroke="#43A047" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50,14 Q62,30 66,54" fill="none" stroke="#43A047" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="50" cy="12" rx="8" ry="4" fill="#66BB6A" />
      <circle cx="34" cy="64" r="16" fill="#C62828" />
      <circle cx="66" cy="64" r="16" fill="#E53935" />
      <ellipse cx="28" cy="58" rx="5" ry="7" fill="rgba(255,255,255,0.25)" />
      <ellipse cx="60" cy="58" rx="5" ry="7" fill="rgba(255,255,255,0.25)" />
    </svg>
  )},
  { id: "coffee", name: "Coffee", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M24,34 L30,86 L70,86 L76,34 Z" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="2" />
      <path d="M76,42 Q94,42 94,56 Q94,68 76,68" fill="none" stroke="#BDBDBD" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="46" rx="20" ry="8" fill="#6D4C41" />
      <ellipse cx="46" cy="44" rx="6" ry="3" fill="#8D6E63" opacity="0.5" />
      <path d="M40,22 Q42,12 44,22" fill="none" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50,18 Q52,8 54,18" fill="none" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60,22 Q62,12 64,22" fill="none" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )},
  { id: "banana", name: "Banana", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M32,78 Q14,46 36,18 Q44,10 50,16 Q32,42 40,74 Z" fill="#FDD835" />
      <path d="M32,78 Q14,46 36,18" fill="none" stroke="#F9A825" strokeWidth="2" opacity="0.5" />
      <path d="M32,78 Q34,82 40,74" fill="#8D6E63" />
      <path d="M36,18 Q40,12 44,14" fill="none" stroke="#795548" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )},
  { id: "lemon", name: "Lemon", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <ellipse cx="50" cy="50" rx="34" ry="26" fill="#FFF176" />
      <ellipse cx="50" cy="50" rx="30" ry="22" fill="#FFF9C4" opacity="0.4" />
      <path d="M16,50 Q12,48 14,42" fill="none" stroke="#C0CA33" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M84,48 Q88,46 86,42" fill="none" stroke="#C0CA33" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )},
];

// ═══════════════════════════════════════════════════════════
// PATTERNS — 6 items
// ═══════════════════════════════════════════════════════════
const patterns = [
  { id: "bullseye", name: "Bullseye", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill={c} />
      <circle cx="50" cy="50" r="33" fill="white" />
      <circle cx="50" cy="50" r="22" fill={c} />
      <circle cx="50" cy="50" r="11" fill="white" />
      <circle cx="50" cy="50" r="4" fill={c} />
    </svg>
  )},
  { id: "half_half", name: "Half and Half", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="#1E88E5" />
      <path d="M50,6 A44,44 0 0,1 50,94 Z" fill={c} />
    </svg>
  )},
  { id: "striped_circle", name: "Striped", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill={c} />
      <rect x="6" y="22" width="88" height="7" fill="white" opacity="0.35" />
      <rect x="6" y="37" width="88" height="7" fill="white" opacity="0.35" />
      <rect x="6" y="52" width="88" height="7" fill="white" opacity="0.35" />
      <rect x="6" y="67" width="88" height="7" fill="white" opacity="0.35" />
    </svg>
  )},
  { id: "checkerboard", name: "Checker", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <rect width="100" height="100" rx="8" fill="white" />
      {[0,1,2,3].map(r => [0,1,2,3].map(col => (r + col) % 2 === 0 ? <rect key={`${r}${col}`} x={10 + col * 20} y={10 + r * 20} width="20" height="20" fill={c} /> : null))}
    </svg>
  )},
  { id: "spiral", name: "Spiral", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M50,50 Q50,32 64,32 Q80,32 80,50 Q80,70 58,70 Q32,70 32,46 Q32,20 56,20 Q86,20 86,52 Q86,84 50,84" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )},
  { id: "wave", name: "Wave", svg: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path d="M5,50 Q18,24 32,50 Q46,76 60,50 Q74,24 88,50" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
      <path d="M5,50 Q18,24 32,50 Q46,76 60,50 Q74,24 88,50" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.3" strokeDasharray="4,4" transform="translate(0,10)" />
    </svg>
  )},
];

const allCategories = [
  { name: "Basic Shapes", color: "#6C5CE7", items: basicShapes },
  { name: "Numbers", color: "#0984E3", items: numbers },
  { name: "Letters", color: "#00B894", items: letters },
  { name: "Everyday Objects", color: "#E17055", items: everyday },
  { name: "Animals", color: "#43A047", items: animals },
  { name: "Food & Drink", color: "#E53935", items: food },
  { name: "Patterns", color: "#7E57C2", items: patterns },
];

const totalCount = allCategories.reduce((s, c) => s + c.items.length, 0);

const palette = ["#E53935","#1E88E5","#43A047","#FDD835","#7E57C2","#E17055","#F48FB1","#00ACC1","#8BC34A","#FF7043","#37474F","#8D6E63"];

export default function Library() {
  const [tab, setTab] = useState(0);
  const [color, setColor] = useState("#7E57C2");
  const [sz, setSz] = useState(64);
  const cat = allCategories[tab];

  return (
    <div style={{ fontFamily:"-apple-system,sans-serif", background:"#F5F5F5", minHeight:"100vh", padding:"20px 16px" }}>
      <div style={{ maxWidth:960, margin:"0 auto" }}>
        <div style={{ marginBottom:16 }}>
          <span style={{ fontSize:26, fontWeight:800, color:"#1A1A18" }}>Object Library</span>
          <span style={{ fontSize:14, color:"#757575", marginLeft:12 }}>{totalCount} objects across {allCategories.length} categories</span>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#757575" }}>Colour:</span>
          {palette.map(c => <div key={c} onClick={() => setColor(c)} style={{ width:26, height:26, borderRadius:6, background:c, cursor:"pointer", border: color===c ? "3px solid #1A1A18" : "2px solid transparent", transition:"border 0.15s" }} />)}
          <span style={{ fontSize:12, fontWeight:600, color:"#757575", marginLeft:16 }}>Size:</span>
          <input type="range" min={36} max={96} value={sz} onChange={e => setSz(+e.target.value)} style={{ width:100 }} />
          <span style={{ fontSize:12, color:"#757575" }}>{sz}px</span>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {allCategories.map((c, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, transition:"all 0.15s",
              background: tab===i ? c.color : "#E0E0E0", color: tab===i ? "white" : "#616161",
            }}>{c.name} ({c.items.length})</button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill, minmax(${sz+32}px, 1fr))`, gap:10 }}>
          {cat.items.map(item => (
            <div key={item.id} style={{
              background:"white", borderRadius:10, padding:10,
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              border:"1px solid #EEEEEE", boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ width:sz, height:sz, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {item.svg(color, sz)}
              </div>
              <span style={{ fontSize:10, fontWeight:600, color:"#757575" }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
