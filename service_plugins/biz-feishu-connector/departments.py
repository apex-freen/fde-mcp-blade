#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
departments.py —— 列出部门的直接子部门（feishu.contact.departments）
====================================================================
默认列根部门下的顶层部门；传 department_id 可下钻。
用于浏览组织架构后，配合 feishu.contact.user_info 定位收件人。

stdin/stdout 协议：
  输入(stdin): {"department_id":"od_xxx"}   （缺省为根部门 0）
  输出(stdout): {"code":0,"msg":"ok","data":{"items":[...],"has_more":false}}
"""
import sys
import traceback

from lark_oapi.api.contact.v3 import ChildrenDepartmentRequestBuilder

from feishu_utils import (
    clean,
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)


def _slim_dept(dept: dict) -> dict:
    """只保留子部门列表中常用的几个字段，避免返回冗余大对象"""
    keys = ["open_department_id", "department_id", "name", "i18n_name",
            "parent_department_id", "member_count", "leader_user_id"]
    return {k: dept.get(k) for k in keys if dept.get(k) is not None}


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.contact.departments"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        department_id = str(params.get("department_id", "")).strip() or "0"
        department_id_type = str(params.get("department_id_type", "")).strip() or "open_department_id"
        try:
            page_size = int(params.get("page_size", 50))
        except (TypeError, ValueError):
            page_size = 50
        if not 1 <= page_size <= 100:
            output_json(-1, "page_size 取值范围 1~100")

        req = ChildrenDepartmentRequestBuilder() \
            .department_id_type(department_id_type) \
            .department_id(department_id) \
            .fetch_child(False) \
            .page_size(page_size) \
            .build()

        client = get_client(cfg)
        data = ensure_ok(client.contact.v3.department.children(req), "查询子部门")

        items = clean(getattr(data, "items", None)) or []
        slim_items = [_slim_dept(d) for d in items if isinstance(d, dict)]

        output_json(0, "ok", {
            "department_id": department_id,
            "department_id_type": department_id_type,
            "count": len(slim_items),
            "items": slim_items,
            "has_more": bool(getattr(data, "has_more", False)),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
