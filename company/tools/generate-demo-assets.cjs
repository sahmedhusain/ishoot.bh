const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

/** Creates a 32-bit RGBA PNG image buffer from a pixel generator function. */
function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a ?? 255;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdrData),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function generateDemoAssets() {
  const brandDir = path.resolve(__dirname, "../profiles/demo/assets/brand");
  fs.mkdirSync(brandDir, { recursive: true });

  // 1. Full logo light (combined icon + text) 400x100
  const fullLogoLight = createPng(400, 100, (x, y, w, h) => {
    // Icon square at x: 20..80, y: 20..80
    if (x >= 20 && x <= 80 && y >= 20 && y <= 80) {
      // Rounded icon box with primary color #1B365D
      const cx = x - 50, cy = y - 50;
      if (cx * cx + cy * cy <= 800) {
        // Inner diamond accent #D97706
        if (Math.abs(cx) + Math.abs(cy) <= 14) return [217, 119, 6, 255];
        return [27, 54, 93, 255];
      }
    }
    // Wordmark text bars simulation (x: 100..340, y: 35..65)
    if (x >= 100 && x <= 340 && y >= 38 && y <= 62) {
      if ((x >= 100 && x <= 220 && y >= 40 && y <= 58) || (x >= 235 && x <= 340 && y >= 44 && y <= 54)) {
        return [27, 54, 93, 255];
      }
    }
    return [255, 255, 255, 0]; // Transparent
  });
  fs.writeFileSync(path.join(brandDir, "full-logo-light.png"), fullLogoLight);

  // 2. Full logo dark (combined icon + text) 400x100
  const fullLogoDark = createPng(400, 100, (x, y, w, h) => {
    if (x >= 20 && x <= 80 && y >= 20 && y <= 80) {
      const cx = x - 50, cy = y - 50;
      if (cx * cx + cy * cy <= 800) {
        if (Math.abs(cx) + Math.abs(cy) <= 14) return [245, 158, 11, 255];
        return [59, 130, 246, 255];
      }
    }
    if (x >= 100 && x <= 340 && y >= 38 && y <= 62) {
      if ((x >= 100 && x <= 220 && y >= 40 && y <= 58) || (x >= 235 && x <= 340 && y >= 44 && y <= 54)) {
        return [243, 244, 246, 255];
      }
    }
    return [0, 0, 0, 0]; // Transparent
  });
  fs.writeFileSync(path.join(brandDir, "full-logo-dark.png"), fullLogoDark);

  // 3. Document Letterhead Header (1200x208)
  const header = createPng(1200, 208, (x, y, w, h) => {
    // Top primary bar (y: 0..12) #1B365D
    if (y < 12) return [27, 54, 93, 255];
    // Secondary accent strip (y: 12..16) #D97706
    if (y < 16) return [217, 119, 6, 255];
    // Bottom separator lines at y: 198..202
    if (y >= 198 && y < 201) return [27, 54, 93, 255];
    if (y >= 201 && y < 203) return [217, 119, 6, 255];
    // Subtle background tint
    if (y > 16 && y < 198) {
      // Top corner geometric decor
      if (x < 180 && y < 70 && (x + y < 120)) return [243, 244, 246, 255];
      if (x > 1020 && y < 70 && ((w - x) + y < 120)) return [243, 244, 246, 255];
      return [255, 255, 255, 255];
    }
    return [255, 255, 255, 255];
  });
  fs.writeFileSync(path.join(brandDir, "letterhead-header.png"), header);

  // 4. Document Letterhead Footer (1200x116)
  const footer = createPng(1200, 116, (x, y, w, h) => {
    // Top separator bar (y: 0..3) #D97706
    if (y < 3) return [217, 119, 6, 255];
    // Subtle bottom bar (y: 110..116) #1B365D
    if (y >= 110) return [27, 54, 93, 255];
    // Background clean white with subtle bottom gradient
    if (y > 90) return [249, 250, 251, 255];
    return [255, 255, 255, 255];
  });
  fs.writeFileSync(path.join(brandDir, "letterhead-footer.png"), footer);

  console.log("✓ Generated demo brand assets: full-logo-light, full-logo-dark, letterhead-header, letterhead-footer");
}

if (require.main === module) {
  generateDemoAssets();
}

module.exports = { generateDemoAssets, createPng };
