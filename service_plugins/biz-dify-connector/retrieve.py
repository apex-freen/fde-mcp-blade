#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
retrieve.py —— 知识库语义检索（dify.dataset.retrieve）
======================================================
对指定知识库做语义检索（RAG 召回），返回与 query 最相关的文档片段，
每段含 content（文本）/ score（相关度）/ document（来源文档名）/ metadata。
前提：知识库内文档已完成索引（embedding 已配置、文档状态非 pending）。

stdin/stdout 协议：
  输入(stdin): {"dataset_id":"xxx","query":"报销流程是什么","top_k":5}
  输出(stdout): {"code":0,"msg":"ok","data":{"dataset_id":"xxx","records":[{...}]}}
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


def _normalize_record(rec: dict) -> dict:
    """把 Dify 检索记录的字段规整为 {content, score, document_name, metadata} 等"""
    seg = rec.get("segment") if isinstance(rec.get("segment"), dict) else {}
    doc = rec.get("document") if isinstance(rec.get("document"), dict) else {}
    return {
        "content": seg.get("content"),
        "segment_id": seg.get("id"),
        "score": rec.get("score"),
        "document_id": doc.get("id"),
        "document_name": doc.get("name"),
        "metadata": rec.get("metadata"),
    }


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dify.dataset.retrieve"
    params = read_params()

    try:
        dataset_id = str(params.get("dataset_id", "")).strip()
        query = str(params.get("query", "")).strip()
        if not dataset_id:
            output_json(-1, "缺少必填参数: dataset_id（知识库 ID，可用 dify.dataset.list 查询）")
        if not query:
            output_json(-1, "缺少必填参数: query（检索问题/关键词）")
        try:
            top_k_raw = params.get("top_k")
            top_k = int(top_k_raw) if top_k_raw not in (None, "") else 5
        except (TypeError, ValueError):
            output_json(-1, "top_k 须为整数")
        if top_k < 1 or top_k > 20:
            output_json(-1, "top_k 须在 1~20 之间（默认 5）")

        cfg = get_config()
        base_url = require_base_url(cfg)
        api_key = resolve_api_key(cfg, params, use="dataset")

        url = f"{base_url}/datasets/{dataset_id}/retrieve"
        body = api_request(
            "POST", url,
            headers=auth_headers(api_key),
            json_body={
                "query": query,
                "retrieval_model": {
                    "search_method": "semantic_search",
                    "reranking_enable": False,
                    "top_k": top_k,
                    "score_threshold_enabled": False,
                    "score_threshold": None,
                },
            },
            action_desc="知识库检索",
        )

        payload = data_of(body) or {}
        if isinstance(payload, dict) and isinstance(payload.get("records"), list):
            records_raw = payload["records"]
        elif isinstance(payload, dict) and isinstance(payload.get("data"), dict) \
                and isinstance(payload["data"].get("records"), list):
            records_raw = payload["data"]["records"]
        else:
            records_raw = []

        records = [_normalize_record(r) for r in records_raw if isinstance(r, dict)]
        output_json(0, "ok", clean({
            "dataset_id": dataset_id,
            "query": query,
            "top_k": top_k,
            "hit": len(records),
            "records": records,
        }))
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 知识库检索失败: {e}")


if __name__ == "__main__":
    main()
