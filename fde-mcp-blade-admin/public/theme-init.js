/**
 * 防闪白：在样式表解析前把主题定到 html 上。
 *
 * 为什么是独立文件而不是 index.html 内联：
 *   内联 <script> 会被 Vite 的 build-html 插件纳入处理，实测导致构建卡死在
 *   transforming 阶段（10 分钟不结束）；放在 public/ 下会被原样拷贝、
 *   不参与打包，行为稳定。
 *
 * 规则与 src/utils/theme.js 保持一致（light / dark / auto）。
 * 此处 body 尚未解析，故只设 html[data-theme]；
 * body[arco-theme] 由 main.js 的 initTheme 补上。
 *
 * ⚠️ 本文件不经打包，需保持 ES5 语法（不能依赖构建期降级）。
 */
;(function () {
  try {
    var mode = localStorage.getItem('apex_color_mode') || 'light'
    var isDark =
      mode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : mode === 'dark'
    var root = document.documentElement
    var resolved = isDark ? 'dark' : 'light'
    root.setAttribute('data-theme', resolved)
    root.style.colorScheme = resolved
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light')
  }
})()
