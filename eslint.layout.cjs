// ESLint 规则：禁止页面手写布局数值（用户指令：布局数值完全不由页面决定）。
// 页面只允许引用 src/theme/layout.ts 的常量（Space/Radius/Size/Breakpoint）
// 与 MUI 主题（theme.spacing() / sx 语义 props）。
// 例外：tokens/theme 目录（定义处）、layout.ts 本身、0/1/'100%'/'auto' 等非体系值。
export default {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/theme/**'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "JSXAttribute[name.name=/^(padding|paddingX|paddingY|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|marginX|marginY|marginTop|marginBottom|marginLeft|marginRight|gap|rowGap|columnGap|width|minWidth|maxWidth|height|minHeight|maxHeight|borderRadius|top|left|right|bottom)$/][value.type='Literal']",
        message:
          '布局数值必须来自 src/theme/layout.ts（Space/Radius/Size）——布局数值不由页面决定。',
      },
      {
        // sx={{ p: 2, gap: 1.5, borderRadius: '12px' }} 里的裸数字（0/1/2/…的 spacing 倍数也禁，
        // 必须显式引用常量，避免魔法数字扩散）
        selector:
          "Property[key.name=/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|rowGap|columnGap|borderRadius)$/][value.type='Literal'][value.raw=/^[0-9]/]",
        message:
          'sx 数值必须引用 layout.ts 常量（如 p: Space.lg）——禁止魔法数字。',
      },
      {
        selector:
          "CallExpression[callee.name=/^(padding|margin)$/] > Literal",
        message: '布局数值必须来自 layout.ts 常量。',
      },
    ],
  },
};
