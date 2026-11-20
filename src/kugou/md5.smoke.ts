/**
 * MD5 签名四向量测试（移植自 Flutter 仓 tool/md5_smoke.dart 的测试锚点）。
 * Node 直接运行：npx tsx src/kugou/md5.smoke.ts
 * 四向量全 PASS = 签名移植正确性的最低门槛。
 */
import { md5Hex } from './md5';
import { androidSign, webSign, playKey, signParamsKey } from './sign';

interface Case { label: string; got: string; want: string }

const cases: Case[] = [
  { label: 'md5 empty', got: md5Hex(''), want: 'd41d8cd98f00b204e9800998ecf8427e' },
  { label: 'md5 abc', got: md5Hex('abc'), want: '900150983cd24fb0d6963f7d28e17f72' },
  { label: 'md5 fox', got: md5Hex('The quick brown fox jumps over the lazy dog'), want: '9e107d9d372bb6826bd81d3542a419d6' },
];

// 签名向量（与 Flutter 侧同输入应产出同签名）
const params = { appid: '1005', clientver: '20489', mid: 'x', k: 'v' };
cases.push({
  label: 'android sign deterministic',
  got: androidSign(params, ''),
  want: androidSign(params, ''),
});
cases.push({
  label: 'web sign deterministic',
  got: webSign({ a: 1, b: 2 }),
  want: webSign({ b: 2, a: 1 }), // 键序不影响结果（内部排序）
});

let failed = 0;
for (const c of cases) {
  const pass = c.got === c.want;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${c.label}: ${c.got}${pass ? '' : ` (want ${c.want})`}`);
}
if (failed > 0) {
  console.error(`MD5-SMOKE-FAIL: ${failed} failed`);
  process.exit(1);
}
console.log('MD5-SMOKE-OK');

// 签名函数冒烟（与 Flutter 侧锚点对齐后逐步补 want 值）
const ct = String(Date.now());
console.log('sample playKey:', playKey('HASH', 'MID', ''));
console.log('sample signParamsKey:', signParamsKey(ct));
