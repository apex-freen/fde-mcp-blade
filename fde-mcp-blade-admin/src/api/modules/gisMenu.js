// ==========================================
// gis_menu（菜单管理）模块接口
// 接口前缀：/biz/gis_menu
// 字段风格：camelCase（menuId / menuType / permissionId ...）
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 菜单列表（树形，含停用项）
 * @param {Object} [params] - 查询参数
 * @param {string} [params.menuName] - 菜单名称，模糊查询
 * @param {string} [params.status] - 状态（0-正常 1-停用）
 */
export function getGisMenuList(params) {
  return get('/biz/gis_menu/list', params)
}

/**
 * 上级菜单树（仅启用项，用于新增/编辑时选择上级）
 * @param {number} [menuId] - 编辑时传入，排除自身及子孙
 */
export function getGisMenuTreeSelect(params) {
  return get('/biz/gis_menu/treeselect', params)
}

/**
 * 菜单详情
 * @param {number} menuId - 菜单 ID
 */
export function getGisMenuById(menuId) {
  return get(`/biz/gis_menu/${menuId}`)
}

/**
 * 新增菜单
 * @param {Object} data - 菜单数据（camelCase）
 * @param {number} data.parentId - 父菜单 ID，0=顶层
 * @param {string} data.menuName - 菜单名称
 * @param {string} data.menuType - M=目录 C=菜单
 * @param {string} [data.path] - 路由地址
 * @param {string} [data.component] - 组件路径（相对 views）
 * @param {string} [data.routeName] - 路由名称
 * @param {string} [data.query] - 路由参数
 * @param {number} [data.isFrame] - 是否外链（0-是 1-否），后端为整数，必须传数字
 * @param {number} [data.isCache] - 是否缓存（0-缓存 1-不缓存），后端为整数，必须传数字
 * @param {string} [data.visible] - 显示状态（'0'-显示 '1'-隐藏），后端为字符串，必须传 '0'/'1'
 * @param {string} [data.status] - 菜单状态（'0'-正常 '1'-停用），后端为字符串，必须传 '0'/'1'
 * @param {string} [data.icon] - 菜单图标
 * @param {string} [data.redirect] - 重定向地址
 * @param {number} [data.alwaysShow] - 是否总是显示
 * @param {number} [data.sortOrder] - 排序
 * @param {number} [data.permissionId] - 关联权限点 ID，目录传 null
 * @param {string} [data.createdBy] - 创建人
 */
export function createGisMenu(data) {
  return post('/biz/gis_menu/create', data)
}

/**
 * 修改菜单（id 走 URL 路径，不放 body）
 * @param {number} menuId - 菜单 ID
 * @param {Object} data - 同上，可携带 updatedBy
 */
export function updateGisMenu(menuId, data) {
  return put(`/biz/gis_menu/${menuId}`, data)
}

/**
 * 删除菜单（软删除）
 * @param {number} menuId - 菜单 ID
 */
export function deleteGisMenu(menuId) {
  return del(`/biz/gis_menu/${menuId}`)
}
