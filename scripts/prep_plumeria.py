#!/usr/bin/env python3
"""取得済みプルメリア字幕(transcripts.jsonl)を問題作成用に扱うヘルパー。

字幕本文は日本語（タイトルは自動英訳されている場合あり）。
問題作成時に「1本ずつ」本文を取り出してトークンを節約するための道具。

使い方:
  python3 scripts/prep_plumeria.py list                 # 全件を index/章/文字数/タイトルで一覧
  python3 scripts/prep_plumeria.py list --chapter 1     # 第1章のみ
  python3 scripts/prep_plumeria.py list --kakomon       # 過去問チャレンジ系のみ
  python3 scripts/prep_plumeria.py show 12              # index 12 の本文を整形表示
  python3 scripts/prep_plumeria.py show <video_id>      # 動画IDで本文表示
  python3 scripts/prep_plumeria.py stats               # 章別の本数・文字数集計
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "transcripts" / "transcripts.jsonl"

CH_PATTERNS = [
    (1, re.compile(r"(Chapter\s*1\b|第?\s*1\s*章|1章)")),
    (2, re.compile(r"(Chapter\s*2\b|第?\s*2\s*章|2章)")),
    (3, re.compile(r"(Chapter\s*3\b|第?\s*3\s*章|3章)")),
    (4, re.compile(r"(Chapter\s*4\b|第?\s*4\s*章|4章)")),
    (5, re.compile(r"(Chapter\s*5\b|第?\s*5\s*章|5章)")),
]

# 章キーワード（タイトルに章番号がない動画の補助分類）
CH_KEYWORDS = {
    1: ["薬害", "Drug-Related Harm", "副作用", "セルフメディケーション"],
    2: ["人体", "Human Body", "臓器", "消化器", "循環器"],
    3: ["かぜ薬", "Cold medicine", "Hay fever", "花粉症", "解熱鎮痛", "胃腸", "OTC", "over-the-counter"],
    4: ["法規", "Law", "Regulation", "Guidebook Revision", "ガイドブック", "改正", "rule", "Abuse Check", "abuse"],
    5: ["package insert", "添付文書", "安全", "Safety", "適正使用"],
}


def detect_chapter(title: str) -> int:
    for ch, pat in CH_PATTERNS:
        if pat.search(title):
            return ch
    low = title.lower()
    for ch, kws in CH_KEYWORDS.items():
        for kw in kws:
            if kw.lower() in low:
                return ch
    return 0  # 不明/総合


def clean(text: str) -> str:
    """字幕特有のあいづち・冗長表現を軽く整える。"""
    t = text
    t = re.sub(r"\s+", "", t)  # 字幕の細切れ空白を除去
    t = t.replace("。", "。\n")
    return t.strip()


def load():
    rows = [json.loads(l) for l in SRC.open()]
    for i, r in enumerate(rows):
        r["_idx"] = i
        r["_ch"] = detect_chapter(r.get("title", ""))
    return rows


def cmd_list(rows, chapter=None, kakomon=False):
    n = 0
    for r in rows:
        if chapter is not None and r["_ch"] != chapter:
            continue
        if kakomon and "past question" not in r["title"].lower() and "過去問" not in r["title"]:
            continue
        ch = r["_ch"] or "-"
        print(f"  [{r['_idx']:>3}] 第{ch}章  {r['len']:>6}字  {r['title'][:64]}")
        n += 1
    print(f"--- {n} 本 ---")


def cmd_show(rows, key):
    target = None
    if key.isdigit():
        idx = int(key)
        target = next((r for r in rows if r["_idx"] == idx), None)
    if target is None:
        target = next((r for r in rows if r["id"] == key), None)
    if target is None:
        print(f"見つかりません: {key}")
        sys.exit(1)
    print(f"# [{target['_idx']}] 第{target['_ch'] or '-'}章 / id={target['id']} / {target['len']}字")
    print(f"# {target['title']}")
    print("=" * 60)
    print(clean(target["text"]))


def cmd_stats(rows):
    from collections import Counter
    cnt = Counter(r["_ch"] for r in rows)
    chars = Counter()
    for r in rows:
        chars[r["_ch"]] += r["len"]
    print(f"取得済 {len(rows)} 本")
    for ch in [1, 2, 3, 4, 5, 0]:
        label = f"第{ch}章" if ch else "総合/不明"
        print(f"  {label:8s}: {cnt.get(ch,0):>3} 本 / {chars.get(ch,0):>7} 字")


def main():
    if not SRC.exists():
        print("transcripts.jsonl がありません")
        sys.exit(1)
    rows = load()
    args = sys.argv[1:]
    if not args or args[0] == "list":
        chapter = None
        kakomon = "--kakomon" in args
        if "--chapter" in args:
            chapter = int(args[args.index("--chapter") + 1])
        cmd_list(rows, chapter, kakomon)
    elif args[0] == "show" and len(args) >= 2:
        cmd_show(rows, args[1])
    elif args[0] == "stats":
        cmd_stats(rows)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
