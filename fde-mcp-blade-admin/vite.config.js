import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    base: '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    plugins: [
      vue(),
      // 自动导入 Vue 相关 API
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts'
      }),
      // 自动导入组件
      Components({
        dirs: ['src/components'],
        dts: 'src/components.d.ts'
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables.scss" as *;`
        }
      }
    },
    server: {
      // 绑定 loopback 而非 0.0.0.0：避免 IDE 的端口转发抢占 127.0.0.1:<port>
      // 导致 localhost 请求被转发层吞掉（现象：localhost 打不开，局域网 IP 正常）
      host: '127.0.0.1',
      port: 5173,
      open: false,
      proxy: {
        '/prod-api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:80',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/prod-api/, '/prod-api')
        },
        // 插件 Web 控制台页面：转发给后端，由主程序 /plugin-web/*path 路由托管
        '/plugin-web': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:80',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            arco: ['@arco-design/web-vue'],
            axios: ['axios']
          }
        }
      }
    }
  }
})
