#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
append_doc.py —— 向文档写入内容（feishu.doc.append）
==================================================
两步走：
  1. 调「内容转块」接口把 Markdown/HTML 转成飞书块（保留标题/列表/加粗等结构）；
  2. 把这些块作为子块写入文档根块（block_id = document_id），默认追加到末尾。

stdin:  {"document_id":"doxcnxxx","content":"# 标题\n正文","format":"markdown","index":null}
stdout: {"code":0,"msg":"ok","data":{"append_count":3,"block_count":4,...}}
"""
import sys
import traceback

from lark_oapi.api.docx.v1 import (
    ConvertDocumentRequestBodyBuilder,
    ConvertDocumentRequestBuilder,
    CreateDocumentBlockDescendantRequestBodyBuilder,
    CreateDocumentBlockDescendantRequestBuilder,
)

from feishu_doc_utils import (
    check_app_credentials,
    doc_url,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)

_CONTENT_TYPE_BY_FORMAT = {"markdown": "markdown", "html": "html"}


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.doc.append"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        document_id = str(params.get("document_id", "")).strip()
        if not document_id:
            output_json(-1, "缺少必填参数: document_id（doxcn 开头）")

        content = str(params.get("content", ""))
        if not content.strip():
            output_json(-1, "缺少必填参数: content（要写入的内容）")

        fmt = str(params.get("format", "markdown")).strip().lower() or "markdown"
        if fmt not in _CONTENT_TYPE_BY_FORMAT:
            output_json(-1, f"format 无效: [{fmt}]，可选值: markdown / html")
        content_type = _CONTENT_TYPE_BY_FORMAT[fmt]

        index = params.get("index")
        if index is not None:
            try:
                index = int(index)
            except (TypeError, ValueError):
                output_json(-1, f"index 必须为整数，当前为: {index!r}")

        # 【影子演练】由宿主影子闸门统一拦截（方法声明 side_effect=true）

        client = get_client(cfg)

        # 1) Markdown/HTML → 飞书块
        convert_body = ConvertDocumentRequestBodyBuilder() \
            .content_type(content_type) \
            .content(content) \
            .build()
        convert_req = ConvertDocumentRequestBuilder().request_body(convert_body).build()
        cdata = ensure_ok(client.docx.v1.document.convert(convert_req), "内容转块")

        blocks = getattr(cdata, "blocks", None) or []
        first_ids = getattr(cdata, "first_level_block_ids", None) or []
        if not blocks or not first_ids:
            output_json(0, "ok", {
                "document_id": document_id,
                "append_count": 0,
                "block_count": 0,
                "note": "内容为空或解析后无可用块，未写入",
                "url": doc_url(cfg, document_id),
            })

        # 2) 作为子块写入文档根块（block_id = document_id），默认追加到末尾
        body_builder = CreateDocumentBlockDescendantRequestBodyBuilder() \
            .children_id(list(first_ids)) \
            .descendants(blocks)
        if index is not None:
            body_builder = body_builder.index(index)

        descendant_req = CreateDocumentBlockDescendantRequestBuilder() \
            .document_id(document_id) \
            .block_id(document_id) \
            .request_body(body_builder.build()) \
            .build()
        ensure_ok(client.docx.v1.document_block_descendant.create(descendant_req), "写入文档内容")

        output_json(0, "ok", {
            "document_id": document_id,
            "append_count": len(first_ids),
            "block_count": len(blocks),
            "appended_block_ids": list(first_ids),
            "position": index if index is not None else "end",
            "format": fmt,
            "url": doc_url(cfg, document_id),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 写入文档失败: {e}")


if __name__ == "__main__":
    main()
