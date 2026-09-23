import { defineStore } from 'pinia'
import { getCapabilities } from '@/api/modules/capabilities'

// ==========================================
// 能力清单 Store（GET /biz/capabilities）
//
// 定位：**「能力真相」的唯一来源** —— 后端如实回答「我这儿有什么」。
// 它 **不** 决定「本版发不发某个入口」，那是 FEATURES（src/config/features.js）的事。
// 两者分工见 1016 §3.2 第三步 (c) / §4.1 页 5。
//
// 🔴 降级纪律（1016 §4.1 页 5「容错」+ §5.3 验证清单第 13 项）：
//   1. 接口没上线 / 请求失败 → **不白屏、不阻塞登录**，静默降级；
//   2. **拿不到就按「有则显示」** —— `moduleEnabled()` 在数据缺失时返回 `true`，
//      绝不能因为拿不到能力就整块隐藏功能；
//   3. 单字段为 `null` → 页面「有则显示」，**不报错**（`build_time`/`image_tag`/
//      `image_digest` 未注入时就是 `null`，属正常态）。
// ==========================================

// 空态：全部字段按「未知」处理，模块查询走「有则显示」默认值 true
function emptyState() {
  return {
    loaded: false, // 是否已尝试拉取（成功或失败都会置 true）
    failed: false, // 本次拉取是否失败（仅用于页面提示「按默认能力展示」）
    product: null,
    version: null,
    buildTime: null,
    imageTag: null,
    imageDigest: null,
    edition: null,
    modules: [] // [{ key, name, enabled }]
  }
}

export const useCapabilitiesStore = defineStore('capabilities', {
  state: () => emptyState(),

  getters: {
    /**
     * 某模块是否启用。
     *
     * **缺省即「有则显示」**：数据未就绪、模块不在返回列表里、`enabled` 取值非法
     * —— 一律返回 `defaultEnabled`（默认 true）。这样接口排期期间功能照常可用，
     * 接口上线后自动收敛到真实值。
     *
     * @param {string} key 模块 key，如 'integration.cloud' / 'hardware.bluetooth'
     * @param {boolean} [defaultEnabled=true] 拿不到时的兜底值
     */
    moduleEnabled: (state) => (key, defaultEnabled = true) => {
      const hit = state.modules.find((m) => m?.key === key)
      if (!hit) return defaultEnabled
      // 只认显式布尔值：后端返 null / 字符串时视为「未知」→ 走兜底
      return typeof hit.enabled === 'boolean' ? hit.enabled : defaultEnabled
    }
  },

  actions: {
    /**
     * 拉取能力清单。**永不 reject** —— 调用方可以放心 fire-and-forget。
     * 失败只记 `failed = true`，由页面自行决定是否提示。
     */
    async fetchCapabilities() {
      try {
        const res = await getCapabilities()
        const data = res?.data || res || {}

        this.product = data.product ?? null
        this.version = data.version ?? null
        this.buildTime = data.build_time ?? null
        this.imageTag = data.image_tag ?? null
        this.imageDigest = data.image_digest ?? null
        this.edition = data.edition ?? null
        this.modules = Array.isArray(data.modules)
          ? data.modules
              .filter((m) => m && typeof m.key === 'string')
              .map((m) => ({
                key: m.key,
                // name 是后端中文硬编码固定文案，不是 i18n key → 仅兜底直渲
                name: m.name ?? '',
                enabled: typeof m.enabled === 'boolean' ? m.enabled : null
              }))
          : []
        this.failed = false
      } catch (e) {
        // 接口未上线 / 网络不通 / 无权限 —— 一律静默，绝不阻塞登录与首屏
        this.failed = true
        if (import.meta.env.DEV) {
          console.warn('[capabilities] 拉取失败，已按「有则显示」降级：', e?.message || e)
        }
      } finally {
        this.loaded = true
      }
    },

    /** 登出时复位，避免切换账号后残留上个账号的能力视图 */
    reset() {
      Object.assign(this, emptyState())
    }
  }
})
