#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
download_file.py —— 从云盘下载文件到本地（feishu.drive.file.download）
====================================================================
把云盘文件下载到宿主机本地。save_path 缺省落到 config.download_dir 或插件目录 downloads/；
若配置了 config.allowed_download_dirs 白名单，save_path 必须落在其一（防任意写文件）。

stdin:  {"file_token":"...","save_path":"D:\\data\\a.pdf"}
stdout: {"code":0,"msg":"ok","data":{"save_path":"...","size":12345}}
"""
import os
import sys
import traceback

from lark_oapi.api.drive.v1 import DownloadFileRequestBuilder

from feishu_doc_utils import (
    check_app_credentials,
    get_client,
    get_config,
    output_json,
    read_params,
    resolve_download_path,
)


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.drive.file.download"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        file_token = str(params.get("file_token", "")).strip()
        if not file_token:
            output_json(-1, "缺少必填参数: file_token（云盘文件 token）")

        save_path = str(params.get("save_path", "")).strip()

        # 【影子演练】由宿主影子闸门统一拦截（方法声明 side_effect=true）

        client = get_client(cfg)
        req = DownloadFileRequestBuilder().file_token(file_token).build()
        resp = client.drive.v1.file.download(req)

        if not resp.success() or getattr(resp, "file", None) is None:
            msg = str(getattr(resp, "msg", "") or "")
            code = str(getattr(resp, "code", ""))
            output_json(-1, f"下载文件失败: code={code}, msg={msg}"
                            "（常见原因：权限 scope 未申请/未发布、file_token 无效、"
                            "应用无该文件阅读权限）")

        remote_name = str(getattr(resp, "file_name", "") or "") or f"{file_token}.bin"
        target = resolve_download_path(cfg, save_path, remote_name)
        os.makedirs(os.path.dirname(target), exist_ok=True)

        with open(target, "wb") as out:
            out.write(resp.file.read())

        output_json(0, "ok", {
            "file_token": file_token,
            "save_path": target,
            "file_name": remote_name,
            "size": os.path.getsize(target),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 下载文件失败: {e}")


if __name__ == "__main__":
    main()
