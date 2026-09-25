#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
create_dataset.py —— 创建知识库（dify.dataset.create）
======================================================
在 Dify 中创建新知识库（数据集），返回 dataset_id 供后续加文档/检索使用。
建库本身不含数据，需再用 dify.doc.add_text / dify.doc.upload 加文档，
且 Dify 后台须已配置好 embedding 模型，索引与检索才可用。

stdin/stdout 协议：
  输入(stdin): {"name":"公司制度知识库"}
  输出(stdout): {"code":0,"msg":"ok","data":{"dataset_id":"xxx","name":"...",...}}
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
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dify.dataset.create"
    params = read_params()

    try:
        name = str(params.get("name", "")).strip()
        if not name:
            output_json(-1, "缺少必填参数: name（知识库/数据集名称）")

        cfg = get_config()
        base_url = require_base_url(cfg)
        api_key = resolve_api_key(cfg, params, use="dataset")

        url = base_url + "/datasets"

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        body = api_request(
            "POST", url,
            headers=auth_headers(api_key),
            json_body={
                "name": name,
                "indexing_technique": "high_quality",
                "permission": "only_me",
            },
            action_desc="创建知识库",
        )

        ds = data_of(body)
        if not isinstance(ds, dict):
            ds = {}
        output_json(0, "ok", clean({
            "dataset_id": ds.get("id"),
            "name": ds.get("name") or name,
            "indexing_technique": ds.get("indexing_technique"),
            "permission": ds.get("permission"),
            "document_count": ds.get("document_count"),
        }))
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 创建知识库失败: {e}")


if __name__ == "__main__":
    main()
