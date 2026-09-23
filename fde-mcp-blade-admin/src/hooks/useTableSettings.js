/**
 * useTableSettings —— 表格「列自定义 + 密度」公共能力（P4 加固 #4）
 *
 * - 列显隐：hiddenKeys（隐藏列的 key 列表）按页持久化到 localStorage
 *   （只存「被隐藏的」，新增列默认可见，不会因为持久化数据滞后而丢列）
 * - 密度：紧凑 mini / 适中 small / 宽松 large（Arco table size），全站共享一份
 *
 * 用法（配合 components/common/TableSettings.vue）：
 *   const { hiddenKeys, density, tableSize, isColHidden } = useTableSettings('audit_operation_log')
 *   <TableSettings :columns="colDefs" v-model:hidden-keys="hiddenKeys" v-model:density="density" />
 *   <a-table :size="tableSize" ...>
 *     <a-table-column v-if="!isColHidden('log_id')" ... />
 */
import { ref, computed, watch } from 'vue'

const DENSITY_STORAGE_KEY = 'apex_table_density'

function loadHiddenCols(storageKey) {
  try {
    const raw = localStorage.getItem(`apex_table_cols:${storageKey}`)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

export function useTableSettings(storageKey) {
  const hiddenKeys = ref(loadHiddenCols(storageKey))

  let savedDensity = 'large'
  try {
    savedDensity = localStorage.getItem(DENSITY_STORAGE_KEY) || 'large'
  } catch (e) { /* ignore */ }
  if (!['mini', 'small', 'large'].includes(savedDensity)) savedDensity = 'large'
  const density = ref(savedDensity)

  watch(hiddenKeys, (v) => {
    try { localStorage.setItem(`apex_table_cols:${storageKey}`, JSON.stringify(v)) } catch (e) { /* ignore */ }
  }, { deep: true })

  watch(density, (v) => {
    try { localStorage.setItem(DENSITY_STORAGE_KEY, v) } catch (e) { /* ignore */ }
  })

  // Arco table size：'large' 是默认值，传 undefined 走默认，避免多余 prop
  const tableSize = computed(() => (density.value === 'large' ? undefined : density.value))

  function isColHidden(key) {
    return hiddenKeys.value.includes(key)
  }

  return { hiddenKeys, density, tableSize, isColHidden }
}
