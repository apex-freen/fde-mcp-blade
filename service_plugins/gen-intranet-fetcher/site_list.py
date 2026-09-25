#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
site_list.py —— intra.site.list
================================
列出插件 plugin.json config.sites 中预配置的全部内网站点（脱敏回显）。
stdout: {"code":0,"msg":"ok","data":{"sites":[...],"total":N,"default_site":"..."}}
"""
import traceback

from intra_utils import (
    output_json,
    read_stdin_params,
    method_name_arg,
    get_config,
    get_sites,
    redact_url,
    sanitize_options,
    sanitize_headers,
)

TYPE_LABELS = {
    "http": "HTTP(S)",
    "soap": "SOAP",
    "mqtt": "MQTT",
}


def main():
    method_name = method_name_arg()
    read_stdin_params()  # 本方法无业务参数，仅消费 stdin
    cfg = get_config()

    sites = []
    for s in get_sites():
        name = str(s.get("name", "") or "").strip()
        if not name:
            continue
        site_type = str(s.get("type", "") or "http").strip().lower()
        url = str(s.get("url", "") or "").strip()
        entry = {
            "name": name,
            "type": site_type if site_type in TYPE_LABELS else site_type,
            "protocol": TYPE_LABELS.get(site_type, site_type.upper()),
            "url": redact_url(url) if url else "",
            "desc": str(s.get("desc", "") or "").strip(),
        }
        if s.get("headers"):
            entry["headers_keys"] = sanitize_headers(s.get("headers"))
        if s.get("auth"):
            entry["has_auth"] = True
        if s.get("timeout"):
            entry["timeout"] = s.get("timeout")
        options = sanitize_options(s.get("options"))
        if options:
            entry["options"] = options
        sites.append(entry)

    output_json(
        0,
        "ok",
        {
            "sites": sites,
            "total": len(sites),
            "default_site": str(cfg.get("default_site", "") or "").strip(),
        },
    )


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"列出站点失败: {e}")
