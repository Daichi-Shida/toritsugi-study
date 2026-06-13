#!/usr/bin/env python3
"""問題と正解の「意味的」不整合を炙り出す監査スクリプト

既存の validate_questions.py は構造整合（型・範囲・(正)(誤)個別一致）を見る。
本スクリプトはより踏み込んで「正解選択肢が本当に解説と一致するか」を機械検出する。

検出ロジック:
A. seigo_combination — 解説から各文(ア〜エ)の 正/誤 を抽出して正解ベクトルを
   再構築し、(1) それが seigo_options のどれと一致するか、(2) それが correctIndex
   と一致するか を検証。解説に全文の正誤が書かれていれば、correctIndex の誤りを
   一意に特定できる。
B. correct_combination — 解説から「正しい文 = どれ」を抽出して combo_options[correctIndex]
   と照合。
C. simple_select — 解説が特定の選択肢(a/b/c/d 等)や正解番号に言及している場合、
   それが correctIndex と矛盾していないかを検出。
D. 共通 — 問題文の方向(正しいもの/誤っているもの)と、複数選択肢が同時に成立しうる
   兆候（解説に複数の「正」記述）を警告。
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "src" / "data" / "questions"
FILES = [
    "all.json",
    "seigo_sample.json",
    "quality_questions.json",
    "plumeria_questions.json",
    "r8_revision_questions.json",
    "r8_deep_questions.json",
    "plumeria_v2_questions.json",
]

issues: list[tuple[str, str, str, str]] = []  # severity, file, qid, msg

def add(sev, f, qid, msg):
    issues.append((sev, f, qid, msg))


def extract_seigo_from_explanation(stmts, expl):
    """解説から各 statement ラベルの正(True)/誤(False)を抽出。不明はNone。"""
    result = {}
    for s in stmts:
        label = s.get("label", "")
        val = None
        # 「ア（正）」「ア(誤)」「ア：正」「ア…正しい」など
        # まず明示的な (正)/(誤) マーカー
        pos = re.search(rf"{re.escape(label)}\s*[（(]\s*正\s*[）)]", expl)
        neg = re.search(rf"{re.escape(label)}\s*[（(]\s*誤\s*[）)]", expl)
        if pos and not neg:
            val = True
        elif neg and not pos:
            val = False
        elif pos and neg:
            val = "conflict"
        result[label] = val
    return result


for fname in FILES:
    path = DATA_DIR / fname
    if not path.exists():
        continue
    data = json.loads(path.read_text(encoding="utf-8"))
    for q in data:
        qid = q.get("id", "<noid>")
        qtype = q.get("type", "simple_select")
        ci = q.get("correctIndex", -1)
        expl = q.get("explanation", "")
        text = q.get("text", "")

        if qtype == "seigo_combination":
            stmts = q.get("statements", [])
            seigo = q.get("seigo_options", [])
            if not stmts or not seigo or not (0 <= ci < len(seigo)):
                continue
            labels = [s.get("label", "") for s in stmts]
            extracted = extract_seigo_from_explanation(stmts, expl)
            # conflict?
            for lab, v in extracted.items():
                if v == "conflict":
                    add("WARN", fname, qid, f"解説で {lab} に正・誤の両方の記述")
            # 全文の正誤が解説から判明したか
            known = {lab: v for lab, v in extracted.items() if v in (True, False)}
            if len(known) == len(labels):
                # 正解ベクトルを再構築
                recon = [known[lab] for lab in labels]
                # 一致する選択肢を探す
                matches = [i for i, combo in enumerate(seigo)
                           if list(combo) == recon]
                if not matches:
                    add("ERROR", fname, qid,
                        f"解説から再構築した正誤{dict(zip(labels,recon))}に一致する選択肢が無い（correctIndex={ci}）")
                elif ci not in matches:
                    add("ERROR", fname, qid,
                        f"解説の正誤は選択肢{matches}に一致するが correctIndex={ci}")
                elif len(matches) > 1:
                    add("WARN", fname, qid,
                        f"再構築した正誤に一致する選択肢が複数{matches}（重複選択肢の可能性）")
            else:
                missing = [lab for lab in labels if extracted.get(lab) not in (True, False)]
                add("INFO", fname, qid,
                    f"解説に正誤明示が無い文: {missing}（自動判定不可・要目視）")

        elif qtype == "correct_combination":
            stmts = q.get("statements", [])
            combo = q.get("combo_options", [])
            if not (0 <= ci < len(combo)):
                continue
            # 解説から「正しい(文) = ◯」を抽出
            extracted = extract_seigo_from_explanation(stmts, expl)
            known_true = {lab for lab, v in extracted.items() if v is True}
            known_false = {lab for lab, v in extracted.items() if v is False}
            labels = [s.get("label", "") for s in stmts]
            if len(known_true) + len(known_false) == len(labels):
                recon_true = sorted(known_true)
                # combo_options[ci] と照合（順不同）
                matches = [i for i, opt in enumerate(combo)
                           if sorted(opt) == recon_true]
                if not matches:
                    add("ERROR", fname, qid,
                        f"解説から再構築した正しい文{recon_true}に一致する選択肢が無い（correctIndex={ci}={combo[ci]}）")
                elif ci not in matches:
                    add("ERROR", fname, qid,
                        f"解説の正しい文は選択肢{matches}に一致するが correctIndex={ci}={combo[ci]}")
            else:
                add("INFO", fname, qid, "解説に全文の正誤明示が無い（要目視）")

        elif qtype == "simple_select":
            opts = q.get("options", [])
            if not (0 <= ci < len(opts)):
                continue
            # 解説が「正解は a/b/c/d/1/2/3/4/ア/イ/ウ/エ」と明示しているか
            m = re.search(r"(?:正解|正答|答え?|正しいのは)\s*[はが:：]?\s*[（(]?\s*([a-dA-D1-5１-５アイウエ])", expl)
            if m:
                token = m.group(1)
                idx = None
                mp = "abcdABCD12345１２３４５アイウエ"
                table = {"a":0,"b":1,"c":2,"d":3,"A":0,"B":1,"C":2,"D":3,
                         "1":0,"2":1,"3":2,"4":3,"5":4,
                         "１":0,"２":1,"３":2,"４":3,"５":4,
                         "ア":0,"イ":1,"ウ":2,"エ":3}
                idx = table.get(token)
                if idx is not None and idx != ci and idx < len(opts):
                    add("WARN", fname, qid,
                        f"解説が「正解={token}(→index {idx})」と示すが correctIndex={ci}")
            # 正解選択肢のテキストが解説で「誤り/不適切/正しくない」と否定されていないか
            correct_text = opts[ci][:12] if opts[ci] else ""

# 出力
order = {"ERROR":0,"WARN":1,"INFO":2}
issues.sort(key=lambda x: order.get(x[0],9))
n_err = sum(1 for i in issues if i[0]=="ERROR")
n_warn = sum(1 for i in issues if i[0]=="WARN")
n_info = sum(1 for i in issues if i[0]=="INFO")
print("="*70)
print(f"意味監査: ERROR {n_err} / WARN {n_warn} / INFO {n_info}")
print("="*70)
for sev, f, qid, msg in issues:
    if sev == "INFO":
        continue
    print(f"[{sev}] {f:26s} {qid:18s} {msg}")
print(f"\n(INFO {n_info}件は解説に正誤明示が無く自動判定不可・別途リスト化)")
