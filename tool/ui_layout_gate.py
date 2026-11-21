#!/usr/bin/env python3
"""布局数值门禁（React18+TS+Vite 版）。

规则与 src/theme/layout.ts 顶部注释一致：页面/外壳不得手写间距/尺寸/圆角字面量，
必须引用 Space/Radius/Size/Breakpoint（与 eslint.layout.cjs 的 no-restricted-syntax 同义）。

本脚本只做静态启发式检查（无依赖），扫描 src/pages/**、src/shell/**：
1) sx={{ p: 8, mt: 24, gap: 12, borderRadius: 16 }} 等裸数字 → FAIL
2) JSX 布局属性 width="640" / height={240} 等裸数字 → FAIL
3) 手写断点比较 innerWidth >= 1200 等 → FAIL（须经 Breakpoint）
豁免：0/1/'100%'/'auto'/'inherit'、theme 目录、layout.ts 本身。

用法: python3 tool/ui_layout_gate.py
"""
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SCAN_DIRS = ['src/pages', 'src/shell']
EXTS = ('.ts', '.tsx')

# sx 键：间距 / 尺寸 / 圆角（与 eslint.layout.cjs 选择器一致）
SX_KEYS = (r'p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|rowGap|columnGap|'
           r'borderRadius|width|minWidth|maxWidth|height|minHeight|maxHeight')
SX_LITERAL = re.compile(r'\b(' + SX_KEYS + r')\s*:\s*(-?\d+(?:\.\d+)?)\b')
JSX_ATTR = re.compile(
    r'\b(padding|paddingX|paddingY|paddingTop|paddingBottom|paddingLeft|paddingRight|'
    r'margin|marginX|marginY|marginTop|marginBottom|marginLeft|marginRight|'
    r'gap|rowGap|columnGap|width|minWidth|maxWidth|height|minHeight|maxHeight|'
    r'borderRadius|top|left|right|bottom)\s*=\s*["\']?\{?\s*(-?\d+(?:\.\d+)?)\b'
)
BREAKPOINT = re.compile(r'(?:innerWidth|clientWidth|maxWidth|minWidth|width)\s*(?:>=|<=|>|<)\s*(\d{3,4})\b')
ALLOW = {'0', '1'}

errs = []
files = []
for d in SCAN_DIRS:
    base = os.path.join(ROOT, d)
    for root, _, names in os.walk(base):
        for n in names:
            if n.endswith(EXTS):
                files.append(os.path.join(root, n))

for path in files:
    rel = os.path.relpath(path, ROOT)
    src = open(path, encoding='utf-8').read()
    # 去注释（逐行，保留行号）
    lines = [re.sub(r'(?://|/\*).*$', '', ln) for ln in src.split('\n')]
    for lineno, ln in enumerate(lines, 1):
        for pattern, label in ((SX_LITERAL, 'sx 裸数值'), (JSX_ATTR, 'JSX 布局属性裸数值')):
            for m in pattern.finditer(ln):
                num = m.group(2)
                if num in ALLOW:
                    continue
                errs.append(f'{rel}:{lineno}: {label} {m.group(1)}={num}（须引用 Space/Radius/Size）')
        for m in BREAKPOINT.finditer(ln):
            errs.append(f'{rel}:{lineno}: 断点手写 {m.group(1)}（须经 Breakpoint）')

if errs:
    print('UI-LAYOUT-GATE: FAIL')
    for e in errs:
        print('  ' + e)
    sys.exit(1)
print(f'UI-LAYOUT-GATE: PASS ({len(files)} files scanned)')
