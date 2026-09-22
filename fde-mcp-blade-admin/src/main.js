// ==========================================
// 应用入口
// ==========================================

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'

import App from './App.vue'
import router from './router'
import i18n from './locales'

// Arco Design 样式
import '@arco-design/web-vue/dist/arco.css'

// 全局样式
import './styles/index.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ArcoVue)
app.use(ArcoVueIcon)
app.use(i18n)

app.mount('#app')
