#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
upload_file.py —— 上传文件到云盘（feishu.drive.file.upload）
==========================================================
把宿主机本地文件上传到云盘指定文件夹（单文件 ≤20MB，走 upload_all 接口）。
file_path 为宿主机绝对路径，属管理员授权操作（方法 risk_level=auth）。

stdin:  {"file_path":"D:\\data\\report.pdf","parent_node":"fldxxx","parent_type":"explorer"}
stdout: {"code":0,"msg":"ok","data":{"file_token":"...","file_name":"report.pdf","size":12345}}
"""
import os
import sys
import traceback

from lark_oapi.api.drive.v1 import (
    UploadAllFileRequestBodyBuilder,
    UploadAllFileRequestBuilder,
)

from feishu_doc_utils import (
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)

_MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # upload_all 上限 20MB


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.drive.file.upload"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        file_path = str(params.get("file_path", "")).strip()
        if not file_path:
            output_json(-1, "缺少必填参数: file_path（宿主机本地文件的绝对路径）")
        file_path = os.path.abspath(file_path)
        if not os.path.isfile(file_path):
            output_json(-1, f"本地文件不存在或不是文件: {file_path}")

        size = os.path.getsize(file_path)
        if size > _MAX_UPLOAD_BYTES:
            output_json(-1, f"文件大小 {size} 字节超过 upload_all 上限 20MB。"
                            "大文件请改用分片上传（本插件暂未开放）")

        parent_node = str(params.get("parent_node", "")).strip() \
            or str(cfg.get("default_folder_token", "")).strip()
        if not parent_node:
            output_json(-1, "缺少 parent_node（目标文件夹 token）。"
                            "请在调用时传入，或在 config.default_folder_token 配置默认文件夹")

        parent_type = str(params.get("parent_type", "")).strip() or "explorer"
        file_name = str(params.get("file_name", "")).strip() or os.path.basename(file_path)

        # 【影子演练】由宿主影子闸门统一拦截（方法声明 side_effect=true）

        client = get_client(cfg)
        with open(file_path, "rb") as f:
            body = UploadAllFileRequestBodyBuilder() \
                .file_name(file_name) \
                .parent_type(parent_type) \
                .parent_node(parent_node) \
                .size(size) \
                .file(f) \
                .build()
            req = UploadAllFileRequestBuilder().request_body(body).build()
            data = ensure_ok(client.drive.v1.file.upload_all(req), "上传文件")

        output_json(0, "ok", {
            "file_token": getattr(data, "file_token", None),
            "file_name": file_name,
            "size": size,
            "parent_node": parent_node,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 上传文件失败: {e}")


if __name__ == "__main__":
    main()
