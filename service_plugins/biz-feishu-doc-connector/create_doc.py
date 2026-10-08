#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
create_doc.py —— 创建新版飞书文档（feishu.doc.create）
====================================================
以应用身份（tenant_access_token）创建一个 docx 空文档，可指定标题与所属文件夹。

stdin:  {"title": "周报", "folder_token": "fldxxxx"}
stdout: {"code":0,"msg":"ok","data":{"document_id":"doxcn...","title":"周报","url":...}}
"""
import sys
import traceback

from lark_oapi.api.docx.v1 import (
    CreateDocumentRequestBodyBuilder,
    CreateDocumentRequestBuilder,
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


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.doc.create"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        title = str(params.get("title", "")).strip()
        if not title:
            output_json(-1, "缺少必填参数: title（文档标题）")

        folder_token = str(params.get("folder_token", "")).strip() \
            or str(cfg.get("default_folder_token", "")).strip()

        # 【影子演练】由宿主影子闸门统一拦截（方法声明 side_effect=true）

        body = CreateDocumentRequestBodyBuilder().title(title)
        if folder_token:
            body = body.folder_token(folder_token)

        req = CreateDocumentRequestBuilder().request_body(body.build()).build()
        client = get_client(cfg)
        data = ensure_ok(client.docx.v1.document.create(req), "创建文档")

        doc = getattr(data, "document", None)
        document_id = getattr(doc, "document_id", None)
        if not document_id:
            output_json(-1, "创建文档失败: 响应中未返回 document_id")

        output_json(0, "ok", {
            "document_id": document_id,
            "title": getattr(doc, "title", None) or title,
            "revision_id": getattr(doc, "revision_id", None),
            "folder_token": folder_token or None,
            "url": doc_url(cfg, document_id),
            "note": "文档已创建（正文为空），可用 feishu.doc.append 写入 Markdown 内容",
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 创建文档失败: {e}")


if __name__ == "__main__":
    main()
