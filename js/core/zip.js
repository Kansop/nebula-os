/** ZIP reader and writer using the stored (uncompressed) method. */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function bytesOf(value) {
  return value instanceof Uint8Array ? value : encoder.encode(String(value ?? ''));
}

function u16(value) {
  return Uint8Array.of(value & 255, (value >> 8) & 255);
}
function u32(value) {
  return Uint8Array.of(value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255);
}
function read16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}
function read32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

export function zipStore(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = bytesOf(file.data);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
      name, data,
    ]);
    locals.push(local);
    central.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const directory = concat(central);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(directory.length), u32(offset), u16(0),
  ]);
  return concat([...locals, directory, end]);
}

export function unzipStore(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const files = [];
  let offset = 0;
  while (offset + 30 <= bytes.length && read32(bytes, offset) === 0x04034b50) {
    const method = read16(bytes, offset + 8);
    const compressed = read32(bytes, offset + 18);
    const nameLength = read16(bytes, offset + 26);
    const extraLength = read16(bytes, offset + 28);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + compressed);
    if (method !== 0) throw new Error(`Only stored zip entries are supported (${name})`);
    if (name && !name.endsWith('/')) files.push({ name, data });
    offset = start + compressed;
  }
  if (!files.length) throw new Error('Not a stored zip archive');
  return files;
}

export function bytesToText(data) {
  return decoder.decode(data);
}
