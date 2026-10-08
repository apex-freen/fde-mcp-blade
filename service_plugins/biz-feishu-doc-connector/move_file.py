#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
move_file.py —— 移动云盘文件/文件夹（feishu.drive.file.move）
===========================================================
把云盘中的文件/文件夹移动到目标文件夹，需同时提供 file_token、type 与 folder_token。

stdin:  {"file_token":"...","type":"file","folder_token":"fldxxx"}
stdout: {"code":0,"msg":"ok","data":{"file_token":"...","moved_to":"fldxxx"}}
"""
import sys
import traceback

from lark_oapi.api.drive.v1 import (
    MoveFileRequestBodyBuilder,
    MoveFileRequestBuilder,
)

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
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.drive.file.move"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        file_token = str(params.get("file_token", "")).strip()
        if not file_token:
            output_json(-1, "缺少必填参数: file_token（要移动的文件/文件夹 token）")

        folder_token = str(params.get("folder_token", "")).strip()
        if not folder_token:
            output_json(-1, "缺少必填参数: folder_token（目标文件夹 token，fld 开头）")

        file_type = str(params.get("type", "")).strip().lower()
        if not file_type:
            output_json(-1, "缺少必填参数: type（文件类型）")
        if file_type not in _VALID_TYPES:
            output_json(-1, f"type 无效: [{file_type}]，可选值: {', '.join(sorted(_VALID_TYPES))}")

        # 【影子演练】由宿主影子闸门统一拦截（方法声明 side_effect=true）

        client = get_client(cfg)
        body = MoveFileRequestBodyBuilder().type(file_type).folder_token(folder_token).build()
        req = MoveFileRequestBuilder().file_token(file_token).request_body(body).build()
        data = ensure_ok(client.drive.v1.file.move(req), "移动文件")

        output_json(0, "ok", {
            "file_token": file_token,
            "type": file_type,
            "moved_to": folder_token,
            "result": getattr(data, "file", None) is not None,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 移动文件失败: {e}")


if __name__ == "__main__":
    main()
