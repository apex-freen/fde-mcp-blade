#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
upload_doc_file.py —— 按本地文件上传创建文档（dify.doc.upload）
==============================================================
把宿主机上的一个文件（file_path 绝对路径）经 multipart/form-data 上传到
指定知识库（dataset_id）建文档，由 Dify 解析/切块/索引（异步）。
file_path 为本地绝对路径，仅限管理员授权使用；文件不存在/不可读会明确报错。

stdin/stdout 协议：
  输入(stdin): {"dataset_id":"xxx","file_path":"/home/xxx/制度手册.pdf"}
  输出(stdout): {"code":0,"msg":"ok","data":{"dataset_id":"xxx","document_id":"...","file_name":"...",...}}
"""
import json
import os
import sys
import traceback

from dify_utils import (
    api_request,
    auth_headers,
    clean,
    data_of,
    get_config,
    output_json,
    read_params,
    require_base_url,
    resolve_api_key,
)



def _unwrap_document(data):
    """不同 Dify 版本创建文档的返回结构略有差异，统一剥壳到文档对象（dict）"""
    doc = data_of(data)
    if isinstance(doc, dict) and isinstance(doc.get("document"), dict):
        doc = doc["document"]
    return doc if isinstance(doc, dict) else {}


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dify.doc.upload"
    params = read_params()

    try:
        dataset_id = str(params.get("dataset_id", "")).strip()
        file_path = str(params.get("file_path", "")).strip()
        if not dataset_id:
            output_json(-1, "缺少必填参数: dataset_id（知识库 ID，可用 dify.dataset.list 查询）")
        if not file_path:
            output_json(-1, "缺少必填参数: file_path（宿主机上待上传文件的绝对路径，管理员授权使用）")
        if not os.path.isfile(file_path):
            output_json(-1, f"文件不存在或不是普通文件: {file_path}"
                            "（file_path 须为宿主机上的绝对路径，管理员授权使用）")
        if not os.access(file_path, os.R_OK):
            output_json(-1, f"文件不可读（无读权限）: {file_path}")

        cfg = get_config()
        base_url = require_base_url(cfg)
        api_key = resolve_api_key(cfg, params, use="dataset")

        filename = os.path.basename(file_path)
        url = f"{base_url}/datasets/{dataset_id}/documents/create_by_file"

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        try:
            with open(file_path, "rb") as f:
                body = api_request(
                    "POST", url,
                    headers=auth_headers(api_key),
                    data={"data": json.dumps({"indexing_technique": "high_quality"}, ensure_ascii=False)},
                    files={"file": (filename, f)},
                    action_desc="上传文档",
                )
        except OSError as e:
            output_json(-1, f"读取文件失败: {file_path} —— {e}")

        doc = _unwrap_document(body)
        status = str(doc.get("status", "") or "").strip() or "pending"
        msg = "ok"
        if status in ("pending", "waiting", "parsing", "indexing"):
            msg = "文件已上传，Dify 正在后台解析/切块/索引，稍后状态变 available 才可被检索到"
        output_json(0, msg, clean({
            "dataset_id": dataset_id,
            "document_id": doc.get("id"),
            "name": doc.get("name") or filename,
            "file_name": doc.get("name") or filename,
            "status": status,
            "indexing_technique": doc.get("indexing_technique"),
        }))
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 上传文档失败: {e}")


if __name__ == "__main__":
    main()
