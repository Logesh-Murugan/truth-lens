// Generate placeholder green circle PNG icons
// Uses raw PNG encoding (no external dependencies)

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createGreenCirclePNG(size) {
  const width = size;
  const height = size;

  // Create raw RGBA pixel data (with filter byte per row)
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = (size / 2) - 1;

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    rawData[rowStart] = 0; // filter byte: None

    for (let x = 0; x < width; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pixelStart = rowStart + 1 + x * 4;

      if (dist <= radius) {
        // Green circle: #4ade80
        rawData[pixelStart] = 74;     // R
        rawData[pixelStart + 1] = 222; // G
        rawData[pixelStart + 2] = 128; // B
        rawData[pixelStart + 3] = 255; // A
      } else if (dist <= radius + 1) {
        // Anti-aliased edge
        const alpha = Math.max(0, Math.min(255, Math.round((radius + 1 - dist) * 255)));
        rawData[pixelStart] = 74;
        rawData[pixelStart + 1] = 222;
        rawData[pixelStart + 2] = 128;
        rawData[pixelStart + 3] = alpha;
      } else {
        // Transparent
        rawData[pixelStart] = 0;
        rawData[pixelStart + 1] = 0;
        rawData[pixelStart + 2] = 0;
        rawData[pixelStart + 3] = 0;
      }
    }
  }

  // Compress with zlib
  const compressed = zlib.deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const typeBuffer = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const crcInput = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return crc ^ 0xFFFFFFFF;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", compressed);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = createGreenCirclePNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}

console.log("Done! All icons generated.");
