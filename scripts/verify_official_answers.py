#!/usr/bin/env python3
"""公式PDF版の正答が、従来データ（出典サイト由来）の正誤と一致するか照合する。

従来データは各記述の正誤を出典サイトの「答え」欄から取っていた。公式PDF版は
正答PDFの番号から正誤を決めている。出どころが独立しているので、両者が一致すれば
「PDFの解析」と「正答の対応付け」がどちらも正しいと確認できる。

  python3 scripts/verify_official_answers.py
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "questions"

FILES = [
    "kakomon_r7_tokyo.json", "kakomon_r6_tokyo.json",
    "kakomon_r5_tokyo.json", "kakomon_r4_tokyo.json",
    "kakomon_r7_hokkaidou.json", "kakomon_r7_ibaraki.json",
    "kakomon_r7_aiti.json", "kakomon_r7_kansai.json",
    "kakomon_r7_hirosima.json",
]


def git_show(rel: str):
    r = subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=ROOT,
                       capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else []


def truth_of(q: dict) -> dict[str, bool] | None:
    """問題データから「記述ラベル -> 正誤」を取り出す。ラベルはア〜オに正規化する。"""
    jp = {"ａ": "ア", "ｂ": "イ", "ｃ": "ウ", "ｄ": "エ", "ｅ": "オ"}
    t = q.get("type")
    if t == "seigo_combination":
        combo = q["seigo_options"][q["correctIndex"]]
        return {jp.get(s["label"], s["label"]): bool(v)
                for s, v in zip(q["statements"], combo)}
    if t == "correct_combination":
        right = {jp.get(x, x) for x in q["combo_options"][q["correctIndex"]]}
        return {jp.get(s["label"], s["label"]): jp.get(s["label"], s["label"]) in right
                for s in q["statements"]}
    return None


def main() -> None:
    old: dict[str, dict] = {}
    for f in FILES:
        for q in git_show(f"src/data/questions/{f}"):
            old[q["id"]] = q
    new: dict[str, dict] = {}
    for f in FILES:
        p = DATA / f
        if p.exists():
            for q in json.loads(p.read_text(encoding="utf-8")):
                new[q["id"]] = q

    checked = mismatch = skipped = 0
    problems = []
    for qid, nq in new.items():
        oq = old.get(qid)
        if not oq:
            continue
        a, b = truth_of(oq), truth_of(nq)
        if a is None or b is None:
            skipped += 1
            continue
        common = set(a) & set(b)
        if not common:
            skipped += 1
            continue
        checked += 1
        diff = [k for k in sorted(common) if a[k] != b[k]]
        if diff:
            mismatch += 1
            problems.append((qid, diff, a, b))

    print(f"照合 {checked} 問 / 不一致 {mismatch} 問 / 形式が違い照合不可 {skipped} 問")
    for qid, diff, a, b in problems[:15]:
        print(f"  {qid}: {diff} 旧={a} 新={b}")
    if mismatch:
        sys.exit(1)
    print("OK: 公式正答と従来データの正誤がすべて一致")


if __name__ == "__main__":
    main()
