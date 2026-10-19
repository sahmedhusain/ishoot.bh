const fs = require('fs');
const path = require('path');

const users = [
  { slug: 'omar-haddad', name: 'Omar Haddad', initial: 'S', seed: 1 },
  { slug: 'yusuf-rahman', name: 'Yusuf Rahman', initial: 'M', seed: 2 },
  { slug: 'layla-nasser', name: 'Layla Nasser', initial: 'Z', seed: 3 },
  { slug: 'karim-fawzi', name: 'Karim Fawzi', initial: 'A', seed: 4 },
  { slug: 'tariq-saleh', name: 'Tariq Saleh', initial: 'H', seed: 5 },
  { slug: 'noor-hamdan', name: 'Noor Hamdan', initial: 'F', seed: 6 },
  { slug: 'faisal-mansour', name: 'Faisal Mansour', initial: 'J', seed: 7 },
  { slug: 'sami-khoury', name: 'Sami Khoury', initial: 'K', seed: 8 },
  { slug: 'hana-yousef', name: 'Hana Yousef', initial: 'M', seed: 9 },
  { slug: 'guest', name: 'Guest Observer', initial: 'G', seed: 10 }
];

function generateSignatureSvg(user) {
  const s = user.seed;
  // Vary loop heights, widths, and curves based on seed
  const yOffset = (s * 3) % 8 - 4;
  const flourishWidth = 220 + ((s * 7) % 30);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 110" width="280" height="110">
  <defs>
    <filter id="sig-ink-${user.slug}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.7" />
    </filter>
  </defs>
  <g filter="url(#sig-ink-${user.slug})">
    <!-- Initial Loop: ${user.initial} -->
    <path d="M 28,${68 + yOffset} C ${20 + s},${38 + yOffset} ${45 + s},${20 + yOffset} ${65 - s},${26 + yOffset} C ${80 - s},${30 + yOffset} 74,${50 + yOffset} ${62 + s},${66 + yOffset} C 46,${86 + yOffset} ${66 + s},${98 + yOffset} 86,${82 + yOffset} C 104,${68 + yOffset} 116,${52 + yOffset} 126,${44 + yOffset}"
          fill="none" stroke="#014842" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Signature Flow Waves -->
    <path d="M 122,${50 + yOffset} C 128,${38 + yOffset} 136,${42 + yOffset} 142,${52 + yOffset} C 148,${62 + yOffset} 154,${44 + yOffset} 162,${48 + yOffset} C 170,${54 + yOffset} 176,${68 + yOffset} 184,${58 + yOffset} C 192,${46 + yOffset} 202,${40 + yOffset} 210,${52 + yOffset} C 218,${64 + yOffset} 224,${56 + yOffset} 230,${48 + yOffset}"
          fill="none" stroke="#014842" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Terminal Flourish Loop -->
    <path d="M 226,${52 + yOffset} C 242,${36 + yOffset} 258,${42 + yOffset} 252,${58 + yOffset} C 244,${72 + yOffset} 218,${84 + yOffset} 180,${90 + yOffset} C 130,${96 + yOffset} 70,${92 + yOffset} 40,${88 + yOffset}"
          fill="none" stroke="#014842" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Expressive Underline & Anchor Accent -->
    <path d="M ${48 + s},${94 + yOffset} C 100,${90 + yOffset} 180,${88 + yOffset} ${flourishWidth},${92 + yOffset}"
          fill="none" stroke="#09937F" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="${flourishWidth + 8}" cy="${92 + yOffset}" r="2" fill="#09937F" />
  </g>
</svg>`;
}

const adminDir = path.join(__dirname, '../apps/admin/public/brand/signatures');
const webDir = path.join(__dirname, '../apps/web/public/brand/signatures');

for (const user of users) {
  const svg = generateSignatureSvg(user);
  fs.writeFileSync(path.join(adminDir, `${user.slug}.svg`), svg);
  fs.writeFileSync(path.join(webDir, `${user.slug}.svg`), svg);
}

console.log(`Generated ${users.length} unique user signatures in admin & web.`);
