import { crc32, deflateSync } from 'node:zlib';

/**
 * A real PNG the browser can decode. `noise` fills it with random pixels, which barely compress, so a large photo is
 * also a large file (3200 × 800 noise ≈ 7.7 MB), like a picture straight off a phone.
 */
export function makePng(width: number, height: number, { noise = false } = {}): Buffer {
  const row = width * 3 + 1;
  const raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * row + 1 + x * 3;
      raw[at] = noise ? Math.random() * 256 : (x * 255) / width;
      raw[at + 1] = noise ? Math.random() * 256 : (y * 255) / height;
      raw[at + 2] = noise ? Math.random() * 256 : 128;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
