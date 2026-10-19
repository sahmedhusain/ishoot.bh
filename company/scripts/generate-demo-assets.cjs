// Run: node company/scripts/generate-demo-assets.cjs
// Regenerates the neutral demo profile's artwork (logos, icons, stamp, signatures, hero banners) from code,
// so the demo company has no real-world brand in it.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(require.resolve("sharp", { paths: [path.join(__dirname, "../../apps/admin")] }));

const out = path.join(__dirname, "../profiles/demo/assets");
const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"));
const theme = read("../profiles/demo/theme.json");
const staff = read("../seed/demo-staff.json");
const clients = read("../seed/demo-clients.json");
const { primary, accent } = theme;

const mark = (fill, cut) => `
  <rect x="0" y="0" width="120" height="120" rx="28" fill="${fill}"/>
  <path d="M30 88V32h14l32 36V32h14v56H76L44 52v36z" fill="${cut}"/>`;

const svgs = {
  "brand/icon-light.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${mark(primary, "#FFFFFF")}</svg>`,
  "brand/icon-dark.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${mark("#FFFFFF", primary)}</svg>`,
  "brand/logo-light.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 120">${mark(primary, "#FFFFFF")}
    <text x="146" y="78" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="${primary}">Northwind</text>
    <circle cx="424" cy="74" r="7" fill="${accent}"/></svg>`,
  "brand/logo-dark.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 120">${mark("#FFFFFF", primary)}
    <text x="146" y="78" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="#FFFFFF">Northwind</text>
    <circle cx="424" cy="74" r="7" fill="${accent}"/></svg>`,
  "brand/stamp.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
    <circle cx="150" cy="150" r="140" fill="none" stroke="${primary}" stroke-width="8"/>
    <circle cx="150" cy="150" r="112" fill="none" stroke="${primary}" stroke-width="3"/>
    <g transform="translate(110 88) scale(0.66)">${mark(primary, "#FFFFFF")}</g>
    <text x="150" y="222" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="${primary}" letter-spacing="3">DEMO ONLY</text></svg>`,
};

const signature = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 236">
  <text x="40" y="150" font-family="Snell Roundhand, Brush Script MT, cursive" font-style="italic" font-size="84" fill="#1E293B">${name}</text>
  <path d="M40 180 C 200 160, 380 200, 560 170" stroke="#1E293B" stroke-width="3" fill="none"/></svg>`;
svgs["brand/signature.svg"] = signature(staff[0].nameEn);
for (const person of staff) svgs[`brand/signatures/${person.key}.svg`] = signature(person.nameEn);

// Client wordmarks: white type on transparent, in a few typographic styles so the logo strip looks varied.
const fonts = ["Helvetica, Arial, sans-serif", "Georgia, serif", "Futura, Avenir, sans-serif", "Didot, Bodoni 72, serif"];
const wordmark = (name, i) => {
  const label = name.replace(/\s*\(.*?\)\s*/g, "").replace(/&/g, "&amp;");
  const upper = i % 3 === 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160">
    <text x="320" y="100" text-anchor="middle" font-family="${fonts[i % fonts.length]}" font-size="${upper ? 46 : 54}" font-weight="${i % 2 ? 400 : 700}" letter-spacing="${upper ? 6 : 0}" fill="#FFFFFF">${upper ? label.toUpperCase() : label}</text></svg>`;
};
clients.forEach((client, i) => (svgs[`media/clients/${client.slug}.svg`] = wordmark(client.name, i)));

const banner = (i) => {
  const hues = [[primary, accent], [accent, primary], ["#0F172A", accent]][i];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hues[0]}"/><stop offset="1" stop-color="${hues[1]}"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#g)"/>
    <circle cx="${1400 - i * 300}" cy="${300 + i * 200}" r="420" fill="#FFFFFF" opacity="0.07"/>
    <circle cx="${400 + i * 250}" cy="${820 - i * 120}" r="260" fill="#FFFFFF" opacity="0.05"/></svg>`;
};

(async () => {
  for (const [file, svg] of Object.entries(svgs)) {
    const target = path.join(out, file.replace(/\.svg$/, ".png"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 1200, height: 1200, fit: "inside" }).png().toFile(target);
  }
  for (let i = 0; i < 3; i++) {
    const target = path.join(out, `media/banners/banner-0${i + 1}.jpg`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await sharp(Buffer.from(banner(i))).jpeg({ quality: 82 }).toFile(target);
  }
  console.log(`Demo assets written to ${path.relative(process.cwd(), out)}`);
})();
