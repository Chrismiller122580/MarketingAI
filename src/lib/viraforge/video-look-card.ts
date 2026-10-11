import { deflateSync } from "node:zlib";

const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
};

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[(stride + 1) * y] = 0;
    rgba.copy(raw, (stride + 1) * y + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function fillRoundRect(
  pixels: Buffer,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  color: [number, number, number, number],
) {
  const r = Math.min(radius, Math.floor(w / 2), Math.floor(h / 2));
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      let inside = true;
      if (px < x + r && py < y + r) {
        const dx = x + r - px;
        const dy = y + r - py;
        inside = dx * dx + dy * dy <= r * r;
      } else if (px >= x + w - r && py < y + r) {
        const dx = px - (x + w - r - 1);
        const dy = y + r - py;
        inside = dx * dx + dy * dy <= r * r;
      } else if (px < x + r && py >= y + h - r) {
        const dx = x + r - px;
        const dy = py - (y + h - r - 1);
        inside = dx * dx + dy * dy <= r * r;
      } else if (px >= x + w - r && py >= y + h - r) {
        const dx = px - (x + w - r - 1);
        const dy = py - (y + h - r - 1);
        inside = dx * dx + dy * dy <= r * r;
      }
      if (!inside) continue;
      const i = (py * width + px) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }
}

function drawText(
  pixels: Buffer,
  width: number,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: [number, number, number, number],
) {
  let cursor = x;
  const gap = scale;
  for (const raw of text.toUpperCase()) {
    const glyph = GLYPHS[raw] ?? GLYPHS[" "];
    if (!glyph) continue;
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy]!.length; gx += 1) {
        if (glyph[gy]![gx] !== "1") continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const px = cursor + gx * scale + sx;
            const py = y + gy * scale + sy;
            const i = (py * width + px) * 4;
            if (i < 0 || i + 3 >= pixels.length) continue;
            pixels[i] = color[0];
            pixels[i + 1] = color[1];
            pixels[i + 2] = color[2];
            pixels[i + 3] = color[3];
          }
        }
      }
    }
    cursor += 5 * scale + gap;
  }
}

export function renderPopupCard(label: string, line: string): Buffer {
  const scale = 5;
  const text = line.toUpperCase().replace(/[^A-Z0-9 ']/g, " ").trim() || "WATCH THIS";
  const textWidth = text.length * (5 * scale + scale) - scale;
  const width = Math.max(360, textWidth + 72);
  const height = 132;
  const pixels = Buffer.alloc(width * height * 4);
  fillRoundRect(pixels, width, 0, 0, width, height, 28, [17, 17, 17, 230]);
  fillRoundRect(pixels, width, 0, 0, 14, height, 8, [245, 158, 11, 255]);
  drawText(pixels, width, label.slice(0, 10), 36, 22, 3, [251, 191, 36, 255]);
  drawText(pixels, width, text, 36, 58, scale, [255, 255, 255, 255]);
  return encodePng(width, height, pixels);
}
