<p align="center">
  <img src="https://img.shields.io/badge/plugin-Intranet-00b894?style=flat-square" alt="Intranet">
  <img src="https://img.shields.io/badge/api%20version-plugin.gis%2Fv1-6c5ce7?style=flat-square" alt="API Version">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/python-%E2%89%A53.10-3776AB?logo=python&style=flat-square" alt="Python">
</p>

# Intranet Service Fetcher (gen-intranet-fetcher)

A general-purpose plugin that fetches information from **intranet (LAN) services** over
**HTTP(S) REST**, **SOAP**, and **MQTT**. Configure one or more intranet addresses as
"**sites**" (`config.sites`), then request them by site name — or pass a full `url` per call.

## Protocol Support Matrix

> The host executes plugins as: **one fresh Python process per call → params via stdin →
> wait for a single stdout response → process exits**. Only request/response style protocols fit this model.

| Protocol | Status | Notes |
|----------|--------|-------|
| HTTP / HTTPS | ✅ Implemented | Generic REST calls (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) — the core capability |
| SOAP 1.1 / 1.2 | ✅ Implemented | HTTP POST + XML SOAP envelope under the hood; auto-builds the envelope (method + namespace + params) and parses responses; SOAP Faults are surfaced |
| MQTT | ⚠️ Restricted | Pub/sub, not request/response. Supported as a **one-shot** "publish to request topic → wait (timeout) on response topic" short-lived connection. The peer must follow that convention. Requires `paho-mqtt` |
| CoAP | ❌ Not supported | UDP IoT protocol — **rare in typical intranets with no real usage demand**, so not implemented for now |
| gRPC | ❌ Not supported | **Less common in intranets**, and a bare endpoint is not enough to call it (needs proto definitions or server reflection) |
| WebSocket | ❌ Not supported | **Bidirectional persistent + server push** conflicts with the per-call short-lived process model; out of scope for this "give URL → get one result" plugin |

## Quick Start

1. Copy this folder into the host's plugin directory:

   ```bash
   cp -r gen-intranet-fetcher/ /path/to/apex-mcp-bridge/service_plugins/
   ```

2. Add your intranet endpoints to `config.sites` in `plugin.json` (or via the admin UI).
   **Changes take effect immediately — no restart needed** (each call re-reads the file):

   ```jsonc
   {
     "config": {
       "default_site": "nas",
       "default_timeout": 10,
       "max_body_chars": 200000,
       "sites": [
         { "name": "nas", "type": "http", "url": "http://192.168.1.105", "desc": "LAN NAS" },
         { "name": "router", "type": "http", "url": "http://192.168.1.1:8080/api/status" },
         { "name": "ws-soap", "type": "soap", "url": "http://192.168.1.50:5000/ws" },
         {
           "name": "iot-broker", "type": "mqtt", "url": "mqtt://192.168.1.20:1883",
           "options": { "request_topic": "gw/req", "response_topic": "gw/resp", "qos": 0 }
         }
       ]
     }
   }
   ```

3. Verify: `intra.site.list {}` should return the configured sites.

## Site Config Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique id, referenced by the `site` parameter |
| `type` | string | ✅ | `http` / `soap` / `mqtt` |
| `url` | string | ✅ | Endpoint. `http(s)://...` or `mqtt(s)://host:port` |
| `desc` | string | – | Description shown in the site list |
| `headers` | object | – | Per-site default headers (http/soap) |
| `auth` | object | – | `{"username":"u","password":"p"}` |
| `timeout` | int | – | Per-site timeout (s) |
| `options` | object | – | Protocol options; MQTT: `request_topic`/`response_topic`/`qos`/`username`/`password`/`wait_timeout`/`client_id` |

Top-level config: `default_site`, `default_timeout` (10), `max_body_chars` (200000, truncation limit).

## API Reference

All methods are invoked via `local_service_call`; params arrive as stdin JSON, responses use
`{"code":0,"msg":"ok","data":{...}}`.

### intra.site.list
List configured sites (secrets masked). No params. → `sites`, `total`, `default_site`.

### intra.http.request
Generic HTTP(S) request — the core method (timeout 60s, risk `normal`).

| Param | Type | Notes |
|-------|------|-------|
| `site` | string | Site name, or omit to use `default_site` |
| `url` | string | Full intranet URL (takes precedence; `site` then only inherits headers/auth) |
| `path` | string | Path appended to the base URL |
| `method` | string | Default GET; GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS |
| `headers` | object | Custom request headers |
| `params` | object | URL query parameters |
| `body` | string/object | Object → JSON serialized; string sent raw |
| `content_type` | string | Request body Content-Type |
| `timeout` | int | Seconds |
| `username`/`password` | string | Basic auth override |
| `insecure_ssl` | bool | Skip TLS verification (self-signed intranet) |
| `follow_redirects` | bool | Default true |
| `max_body_chars` | int | Response truncation limit for this call |

Returns: `status`, `reason`, `ok` (2xx), `request_url`/`final_url` (redacted), `redirected`,
`headers` (whitelist), `content_type`, `charset`, `size_bytes`, `body_text`, `truncated`,
`json` + `json_parsed`, `binary`, `elapsed_ms`.
**Any HTTP response — including 404/500 — is a successful call (code=0);** check `data.ok`/`status` for business outcome. Only connection failures/timeouts return an error.

### intra.soap.call
Call an intranet SOAP WebService (SOAP 1.1/1.2; timeout 60s, risk `normal`).

Params: `site`/`url`, `method` (operation name; required unless `raw_body`), `namespace`,
`soap_action`, `soap_version` (1 or 2), `params` (nested objects/arrays supported),
`raw_body` (advanced: raw SOAP Body XML), plus headers/timeout/auth/insecure_ssl/max_body_chars.
Returns: `status`, `ok`, `content_type`, `body_xml` (truncated), `truncated`, `parsed`
(XML → structure; repeated elements become arrays). **SOAP Faults** are reported as errors with faultcode/faultstring.

### intra.mqtt.request
One-shot MQTT request/response (timeout 60s, risk `normal`).

Params: `site`/`url` (broker), `request_topic` (required), `response_topic` (omit = publish-only),
`payload` (string, or object → JSON), `qos`, `username`/`password`, `wait_timeout`.
Returns: `broker`, topics, `published`, `publish_rc`, `payload`, `messages`, `message_count`,
`waited_ms`, `timed_out` (+ hint). Requires `paho-mqtt`; a clear missing-dependency error is returned otherwise.

## Web Console

A built-in UI (`web_ui/index.html`, zero token cost):
- Browse configured sites (click a row to load it into the request panel)
- HTTP / SOAP / MQTT tabs to fire requests and view structured results
- A "Protocol Support" tab with the support matrix
- A live call log (each request = one plugin method call)

## File Layout

```
gen-intranet-fetcher/
├── plugin.json          # Manifest (methods + config.sites)
├── requirements.txt     # requests (HTTP/SOAP), paho-mqtt (MQTT)
├── intra_utils.py       # Shared helpers (config/sites/url/auth/masking)
├── site_list.py         # intra.site.list handler
├── http_request.py      # intra.http.request handler
├── soap_call.py         # intra.soap.call handler
├── mqtt_request.py      # intra.mqtt.request handler
├── web_ui/index.html    # Console
├── skills/intra-fetch-intranet/SKILL.md
├── README.md            # This file
└── README_ZH.md         # 中文文档
```

## FAQ

- **"Missing dependency paho-mqtt"?** Only `intra.mqtt.request` needs it: `pip install paho-mqtt` (or `.plugins-venv/bin/pip install paho-mqtt`).
- **Restart after editing `plugin.json`?** No — every call spawns a fresh process that re-reads it.
- **"'site [xxx]' not found"?** The name is not in `config.sites`; run `intra.site.list` or pass a direct `url`.
- **Self-signed HTTPS errors?** Add `insecure_ssl:true`.
- **Why no CoAP/gRPC/WebSocket?** See the support matrix above.
- **Security?** Only add trusted intranet services; site passwords are masked everywhere; response headers are whitelisted.
