#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
delete_file.py —— 删除云盘文件/文件夹（feishu.drive.file.delete）
==============================================================
把云盘中的文件/文件夹删除（移入回收站）。需同时提供 file_token 与 type。
属高危不可逆操作，方法 risk_level=auth，默认需人工授权。

stdin:  {"file_token":"...","type":"file"}
stdout: {"code":0,"msg":"ok","data":{"file_token":"...","deleted":true}}
"""
import sys
import traceback

from lark_oapi.api.drive.v1 import DeleteFileRequestBuilder

from feishu_doc_utils import (
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)

_VALID_TYPES = {"file", "docx", "doc", "sheet", "bitable", "folder",
                "mindnote", "shortcut", "wiki"}


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.drive.file.delete"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        file_token = str(params.get("file_token", "")).strip()
        if not file_token:
            output_json(-1, "缺少必填参数: file_token（要删除的文件/文件夹 token）")

        file_type = str(params.get("type", "")).strip().lower()
        if not file_type:
            output_json(-1, "缺少必填参数: type（文件类型）")
        if file_type not in _VALID_TYPES:
            output_json(-1, f"type 无效: [{file_type}]，可选值: {', '.join(sorted(_VALID_TYPES))}")

        # 【影子演练】由宿主影子闸门统一拦截（方法声明 side_effect=true）

        client = get_client(cfg)
        req = DeleteFileRequestBuilder().file_token(file_token).type(file_type).build()
        ensure_ok(client.drive.v1.file.delete(req), "删除文件")

        output_json(0, "ok", {
            "file_token": file_token,
            "type": file_type,
            "deleted": True,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 删除文件失败: {e}")


if __name__ == "__main__":
    main()
