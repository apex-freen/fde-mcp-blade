#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_doc_text.py —— 按文本创建文档（dify.doc.add_text）
======================================================
把一段纯文本作为新文档写入指定知识库（dataset_id），
由 Dify 后台切块并做 embedding 索引（异步）。切块 rules 不传，用 Dify 默认。
返回的文档状态常为 pending（等待后台解析/切块/索引），随后自动变为可用。

stdin/stdout 协议：
  输入(stdin): {"dataset_id":"xxx","name":"会议室使用规范","text":"..."}
  输出(stdout): {"code":0,"msg":"ok","data":{"dataset_id":"xxx","document_id":"...",...}}
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



def _unwrap_document(data):
    """不同 Dify 版本创建文档的返回结构略有差异，统一剥壳到文档对象（dict）"""
    doc = data_of(data)
    if isinstance(doc, dict) and isinstance(doc.get("document"), dict):
        doc = doc["document"]
    return doc if isinstance(doc, dict) else {}


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dify.doc.add_text"
    params = read_params()

    try:
        dataset_id = str(params.get("dataset_id", "")).strip()
        name = str(params.get("name", "")).strip()
        text = str(params.get("text", "")).strip()
        if not dataset_id:
            output_json(-1, "缺少必填参数: dataset_id（知识库 ID，可用 dify.dataset.list 查询）")
        if not name:
            output_json(-1, "缺少必填参数: name（文档名称）")
        if not text:
            output_json(-1, "缺少必填参数: text（文档正文）")

        cfg = get_config()
        base_url = require_base_url(cfg)
        api_key = resolve_api_key(cfg, params, use="dataset")

        url = f"{base_url}/datasets/{dataset_id}/documents/create_by_text"

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        body = api_request(
            "POST", url,
            headers=auth_headers(api_key),
            json_body={
                "name": name,
                "text": text,
                "indexing_technique": "high_quality",
            },
            action_desc="创建文本文档",
        )

        doc = _unwrap_document(body)
        status = str(doc.get("status", "") or "").strip() or "pending"
        msg = "ok"
        if status in ("pending", "waiting", "parsing", "indexing"):
            msg = "文档已提交，Dify 正在后台解析/切块/索引，稍后状态变 available 才可被检索到"
        output_json(0, msg, clean({
            "dataset_id": dataset_id,
            "document_id": doc.get("id"),
            "name": doc.get("name") or name,
            "status": status,
            "indexing_technique": doc.get("indexing_technique"),
        }))
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 创建文本文档失败: {e}")


if __name__ == "__main__":
    main()
