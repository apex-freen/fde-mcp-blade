#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
list_datasets.py —— 列出知识库（dify.dataset.list）
===================================================
列出当前数据集 API Key 可见的全部知识库（数据集），
返回每个的 dataset_id/名称/文档数，用于拿到 dataset_id 执行后续操作。

stdin/stdout 协议：
  输入(stdin): {"page":1,"limit":20}（均可选）
  输出(stdout): {"code":0,"msg":"ok","data":{"page":1,"limit":20,"datasets":[...]}}
"""
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


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dify.dataset.list"
    params = read_params()

    try:
        try:
            page = int(params.get("page", 1) if params.get("page") not in (None, "") else 1)
            limit = int(params.get("limit", 20) if params.get("limit") not in (None, "") else 20)
        except (TypeError, ValueError):
            output_json(-1, "page/limit 须为整数")
        if page < 1:
            page = 1
        if limit < 1:
            limit = 20

        cfg = get_config()
        base_url = require_base_url(cfg)
        api_key = resolve_api_key(cfg, params, use="dataset")

        url = f"{base_url}/datasets?page={page}&limit={limit}"
        body = api_request("GET", url, headers=auth_headers(api_key), action_desc="列出知识库")

        raw = data_of(body)
        if isinstance(raw, dict) and isinstance(raw.get("data"), list):
            raw = raw["data"]
        items = raw if isinstance(raw, list) else []

        datasets = []
        for d in items:
            if not isinstance(d, dict):
                continue
            datasets.append({
                "dataset_id": d.get("id"),
                "name": d.get("name"),
                "document_count": d.get("document_count"),
                "indexing_technique": d.get("indexing_technique"),
                "permission": d.get("permission"),
            })

        output_json(0, "ok", clean({
            "page": page,
            "limit": limit,
            "total": len(datasets),
            "datasets": datasets,
        }))
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 列出知识库失败: {e}")


if __name__ == "__main__":
    main()
