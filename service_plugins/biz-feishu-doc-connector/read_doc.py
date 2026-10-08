#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
read_doc.py —— 读取飞书文档内容（feishu.doc.read）
================================================
读取文档标题/版本 + 纯文本正文 + 结构化块列表。
外部内容统一做防提示词注入净化，并标注 untrusted / source / write_operation。

stdin:  {"document_id":"doxcnxxx","mode":"both","max_chars":20000,"max_blocks":500}
stdout: {"code":0,"msg":"ok","data":{"title":...,"text":...,"blocks":[...],...}}
"""
import sys
import traceback

from lark_oapi.api.docx.v1 import (
    GetDocumentRequestBuilder,
    ListDocumentBlockRequestBuilder,
    RawContentDocumentRequestBuilder,
)

from feishu_doc_utils import (
    check_app_credentials,
    clamp_int,
    ensure_ok,
    get_client,
    get_config,
    neutralize_tree,
    output_json,
    read_params,
    sanitize_text,
    simplify_block,
    untrusted_marks,
)

_MAX_BLOCKS_HARD = 2000
_MAX_CHARS_HARD = 200000
_BLOCK_PAGE_SIZE = 500


def _read_text(client, document_id, max_chars):
    req = RawContentDocumentRequestBuilder().document_id(document_id).build()
    content = ensure_ok(client.docx.v1.document.raw_content(req), "获取文档纯文本").content or ""
    full_len = len(content)
    truncated = full_len > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "text": sanitize_text(content),
        "char_count": full_len,
        "truncated": truncated,
    }


def _read_blocks(client, document_id, max_blocks):
    blocks = []
    page_token = ""
    truncated = False
    while True:
        builder = ListDocumentBlockRequestBuilder() \
            .document_id(document_id) \
            .page_size(_BLOCK_PAGE_SIZE)
        if page_token:
            builder = builder.page_token(page_token)
        data = ensure_ok(client.docx.v1.document_block.list(builder.build()), "获取文档块")
        for b in (getattr(data, "items", None) or []):
            blocks.append(simplify_block(b))
        if len(blocks) >= max_blocks:
            if len(blocks) > max_blocks:
                blocks = blocks[:max_blocks]
            truncated = bool(getattr(data, "has_more", False)) or len(blocks) >= max_blocks
            break
        if getattr(data, "has_more", False) and getattr(data, "page_token", None):
            page_token = data.page_token
        else:
            break
    return {
        "blocks": neutralize_tree(blocks),
        "block_count": len(blocks),
        "blocks_truncated": truncated,
    }


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.doc.read"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        document_id = str(params.get("document_id", "")).strip()
        if not document_id:
            output_json(-1, "缺少必填参数: document_id（doxcn 开头）")

        mode = str(params.get("mode", "both")).strip().lower() or "both"
        if mode not in ("text", "blocks", "both"):
            output_json(-1, f"mode 无效: [{mode}]，可选值: text / blocks / both")

        max_chars = clamp_int(params.get("max_chars", 20000), 20000, 1, _MAX_CHARS_HARD)
        max_blocks = clamp_int(params.get("max_blocks", 500), 500, 1, _MAX_BLOCKS_HARD)

        client = get_client(cfg)

        result = {"document_id": document_id, "mode": mode}

        info_req = GetDocumentRequestBuilder().document_id(document_id).build()
        doc = getattr(ensure_ok(client.docx.v1.document.get(info_req), "获取文档信息"), "document", None)
        result["title"] = sanitize_text(str(getattr(doc, "title", "") or ""))
        result["revision_id"] = getattr(doc, "revision_id", None)

        if mode in ("text", "both"):
            result.update(_read_text(client, document_id, max_chars))
        if mode in ("blocks", "both"):
            result.update(_read_blocks(client, document_id, max_blocks))

        result.update(untrusted_marks(f"feishu://docx/{document_id}", method_name))
        output_json(0, "ok", result)
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 读取文档失败: {e}")


if __name__ == "__main__":
    main()
