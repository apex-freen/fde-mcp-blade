#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
list_files.py —— 列出云盘文件夹内容（feishu.drive.files.list）
============================================================
列出指定文件夹（缺省 config.default_folder_token）下的文件与子文件夹。
文件名等为外部数据：统一净化并标注 untrusted / source。

stdin:  {"folder_token":"fldxxx","page_size":50,"page_token":""}
stdout: {"code":0,"msg":"ok","data":{"files":[...],"has_more":...}}
"""
import sys
import traceback

from lark_oapi.api.drive.v1 import ListFileRequestBuilder

from feishu_doc_utils import (
    check_app_credentials,
    clamp_int,
    ensure_ok,
    get_client,
    get_config,
    neutralize,
    output_json,
    read_params,
    untrusted_marks,
)


def _simplify_file(f) -> dict:
    return {
        "token": getattr(f, "token", None),
        "name": neutralize(str(getattr(f, "name", "") or "")),
        "type": getattr(f, "type", None),
        "parent_token": getattr(f, "parent_token", None),
        "url": getattr(f, "url", None),
        "modified_time": getattr(f, "modified_time", None),
        "owner_id": getattr(f, "owner_id", None),
    }


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.drive.files.list"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        folder_token = str(params.get("folder_token", "")).strip() \
            or str(cfg.get("default_folder_token", "")).strip()
        page_size = clamp_int(params.get("page_size", 50), 50, 1, 200)
        page_token = str(params.get("page_token", "")).strip()

        builder = ListFileRequestBuilder().page_size(page_size)
        if folder_token:
            builder = builder.folder_token(folder_token)
        if page_token:
            builder = builder.page_token(page_token)

        client = get_client(cfg)
        data = ensure_ok(client.drive.v1.file.list(builder.build()), "列出文件")

        files = [_simplify_file(f) for f in (getattr(data, "files", None) or [])]
        result = {
            "folder_token": folder_token or None,
            "files": files,
            "file_count": len(files),
            "has_more": bool(getattr(data, "has_more", False)),
            "next_page_token": getattr(data, "next_page_token", None),
        }
        result.update(untrusted_marks(f"feishu://drive/folder/{folder_token or 'root'}", method_name))
        output_json(0, "ok", result)
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 列出文件失败: {e}")


if __name__ == "__main__":
    main()
