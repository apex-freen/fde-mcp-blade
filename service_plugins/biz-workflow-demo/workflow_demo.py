#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
biz-workflow-demo —— 工作流整体演示插件（纯模拟）

用途：为「工作流整体演示」提供 OA / MES / 财务 三个业务域共 27 个业务动作方法，
      用于演示「工作流建模 → 智能体按流程调用 → 单据自动串联 → 人工审批 → 看板与下钻」整条链路。

约定（照宿主当前实现）：
  1. 宿主执行：python3 workflow_demo.py <method_name>   （sys.argv[1] = 方法名）
  2. 参数从 stdin 读入，是一个纯 JSON 对象；宿主会另外合入 plugin.json 的 config
     （如 shadow_mode）与 server_url，本脚本只挑需要的键，其余一律忽略。
  3. 结果写到 stdout，**只能有一行 JSON**；退出码固定 0（永不崩溃）。

行为：**纯模拟** —— 不连数据库、不写文件、不调外部系统；
      只把入参回显出来并打上时间戳，便于演示可重复执行、零脏数据。
"""

import datetime
import json
import sys

# ── 本插件声明的方法（方法名 -> 无；域/步骤由方法名解析）──────────────────
# 与 plugin.json 的 methods[].name 必须完全一致，多一个少一个都会在调用时报「未知方法」。
METHODS = {
    # OA · 报销（5 步）
    "oa.expense.submit",
    "oa.expense.mgr_approve",
    "oa.expense.fin_review",
    "oa.expense.pay",
    "oa.expense.archive",
    # OA · 差旅（4 步）
    "oa.trip.apply",
    "oa.trip.mgr",
    "oa.trip.book",
    "oa.trip.fin",
    # MES · 设备点检（4 步）
    "mes.check.plan",
    "mes.check.inspect",
    "mes.check.abnormal",
    "mes.check.verify",
    # MES · 三条分析链的「分析」步（3 个，各流程独占）
    "mes.yield.analyze",
    "mes.qc.analyze",
    "mes.process.analyze",
    # MES · 三条分析链共用的处置步（4 个，被 3 条流程各绑一次）
    "mes.judge",
    "mes.dispose",
    "mes.retest",
    "mes.close",
    # MES · 独立工具（不入任何流程）
    "mes.lot.query",
    # 财务 · 月度整理入账（5 步）
    "fin.invoice.collect",
    "fin.invoice.verify",
    "fin.post",
    "fin.review",
    "fin.report",
    # 财务 · 独立工具（不入任何流程）
    "fin.stat.daily",
}


def output_json(code, msg, data):
    """统一出参：stdout 只输出这一行 JSON"""
    print(json.dumps({"code": code, "msg": msg, "data": data}, ensure_ascii=False))


def now_str():
    """本地时间，格式与系统出参一致：YYYY-MM-DD HH:MM:SS"""
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def read_params():
    """从 stdin 读取参数；空 / 非 JSON / 非对象一律按空对象处理（绝不让脚本崩）"""
    try:
        raw = sys.stdin.read()
    except Exception as exc:  # pragma: no cover - 极端情况
        print(f"[biz-workflow-demo] 读取 stdin 失败: {exc}", file=sys.stderr)
        return {}
    if not raw or not raw.strip():
        return {}
    try:
        params = json.loads(raw)
    except Exception as exc:
        print(f"[biz-workflow-demo] stdin 不是合法 JSON，按空参数处理: {exc}", file=sys.stderr)
        return {}
    if not isinstance(params, dict):
        print("[biz-workflow-demo] stdin 不是 JSON 对象，按空参数处理", file=sys.stderr)
        return {}
    return params


def build_data(method_name, params):
    """组装回显数据：域 / 步骤从方法名解析，业务字段原样回显"""
    parts = method_name.split(".")
    domain = parts[0]
    step = parts[-1]
    payload = params.get("payload")
    if payload is None:
        payload = {}
    return {
        "demo": True,
        "domain": domain,
        "step": step,
        "method": method_name,
        "doc_no": params.get("doc_no"),
        "title": params.get("title"),
        # 两个「提权开关」参数：即使本次没传也带上（值为 null），便于对照入参/出参
        "amount_level": params.get("amount_level"),
        "disposition": params.get("disposition"),
        "payload": payload,
        "at": now_str(),
    }


def resolve_method_name():
    """sys.argv[1] = 方法名（宿主传入）；缺失返回空串"""
    if len(sys.argv) > 1:
        return (sys.argv[1] or "").strip()
    return ""


def main():
    try:
        method_name = resolve_method_name()
        params = read_params()

        if not method_name:
            output_json(-1, "缺少方法名（宿主应传入 argv[1]）", None)
            return
        if method_name not in METHODS:
            output_json(-1, f"未知的演示方法: {method_name}", None)
            return

        data = build_data(method_name, params)
        # 调试信息只写 stderr，避免污染 stdout 的 JSON
        print(
            f"[biz-workflow-demo] {method_name} "
            f"doc_no={data['doc_no']} amount_level={data['amount_level']} "
            f"disposition={data['disposition']}",
            file=sys.stderr,
        )
        output_json(0, "ok", data)

    except Exception as exc:
        # 兜底：任何异常都转成 code=-1 的 JSON，保证宿主总能拿到可解析的一行输出
        output_json(-1, f"插件执行异常: {exc}", None)


if __name__ == "__main__":
    main()
