/**
 * 纯 JS MD5（RFC 1321），TS 移植自 Flutter 仓 lib/core/net/signing.dart 的 Md5 类。
 * 输出小写 hex。零依赖（Web Crypto 不提供 MD5，自实现是唯一纯前端路径）。
 */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = new Int32Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
}

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

/** UTF-8 编码 → MD5 → 小写 hex */
export function md5Hex(input: string): string {
  // UTF-8 编码
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      // 代理对
      c = 0x10000 + (((c & 0x3ff) << 10) | (input.charCodeAt(++i) & 0x3ff));
      bytes.push(
        0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f),
      );
    }
  }
  const msgLen = bytes.length;
  // padding：0x80 + 0x00... + 64bit little-endian bit length
  const bitLen = msgLen * 8;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  // 注意：JS 移位是 32 位模运算，8*i>=32 时会被掩掉 —— 用除法写 64 位 little-endian
  const lenLo = bitLen % 4294967296;
  const lenHi = Math.floor(bitLen / 4294967296);
  for (let i = 0; i < 4; i++) padded.push((lenLo >>> (8 * i)) & 0xff);
  for (let i = 0; i < 4; i++) padded.push((lenHi >>> (8 * i)) & 0xff);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) {
      const o = chunk + i * 4;
      M[i] = padded[o] | (padded[o + 1] << 8) | (padded[o + 2] << 16) | (padded[o + 3] << 24);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }

  // little-endian 输出
  const out = [a0, b0, c0, d0].map((v) =>
    Array.from({ length: 4 }, (_, i) => ((v >>> (8 * i)) & 0xff).toString(16).padStart(2, '0')).join(''),
  );
  return out.join('');
}
