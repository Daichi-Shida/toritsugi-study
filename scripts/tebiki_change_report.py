#!/usr/bin/env python3
"""令和7年4月版 → 令和8年4月版 の手引き差分を、人が読める変更点レポートにする。

extract_tebiki.py の文単位差分はページ送りや抽出ゆらぎでノイズが多い。
ここでは
  1. ページごとの柱（「…第４章薬事関係法規・制度 87」）から所属章を先に確定し、
  2. 柱・ページ番号を落として文単位に正規化し、
  3. 置換ブロックは文字単位で突き合わせて実際に変わったスパンだけを出す。
出力 docs/tebiki/changes.md を、改正対応問題を書くときの根拠資料にする。
"""
import re
import difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEBIKI = ROOT / "docs" / "tebiki"

# 柱に出る章名は手引き本文の表記（アプリ内のカテゴリ名とは別）
CHAPTER_TITLES = {
    "医薬品に共通する特性と基本的な知識": "第1章 医薬品に共通する特性と基本的な知識",
    "人体の働きと医薬品": "第2章 人体の働きと医薬品",
    "主な医薬品とその作用": "第3章 主な医薬品とその作用",
    "薬事に関する法規と制度": "第4章 薬事に関する法規と制度",
    "医薬品の適正使用と安全対策": "第5章 医薬品の適正使用と安全対策",
}

CTX = 30  # 変更スパンの前後に出す文脈の文字数
_PUNCT = "、。，．・（）()「」『』［］[]〔〕【】〈〉：；:;／/－‐-—–~〜%％ 　"


def _meaningful(s: str) -> bool:
    """約物・空白・脚注数字だけの差分か（＝抽出ノイズか）を判定する。"""
    return bool(re.sub(rf"[{re.escape(_PUNCT)}\d０-９]", "", s).strip())


def load(path: Path):
    """(文リスト, 各文の所属章リスト) を返す。

    章はページの柱から決める。柱は本文からは削るが、削る前に読み取る。
    """
    raw = path.read_text(encoding="utf-8", errors="replace")
    pages = re.split(r"\n===== p\.\d+[^=]*=====\n", raw)
    sentences, chapters = [], []
    current = "（前文・目次）"
    for page in pages:
        flat = re.sub(r"\s+", "", page)
        for key, name in CHAPTER_TITLES.items():
            if f"手引き（令和" in flat and key in flat:
                current = name
                break
        # 柱（版名＋章名＋ページ番号）を落とす
        flat = re.sub(r"試験問題の作成に関する手引き（令和[０-９0-9一二三四五六七八九十]+年"
                      r"[０-９0-9一二三四五六七八九十]+月[^）]*）", "", flat)
        flat = re.sub(r"第[１-５]章(?:" + "|".join(map(re.escape, CHAPTER_TITLES)) + r")\d*", "", flat)
        for s in flat.split("。"):
            if not s.strip():
                continue
            sentences.append(s + "。")
            chapters.append(current)
    return sentences, chapters


def char_spans(a: str, b: str):
    """2文の文字単位差分を (旧, 新, 文脈) のリストで返す。"""
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    spans = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        old, new = a[i1:i2], b[j1:j2]
        if not _meaningful(old) and not _meaningful(new):
            continue
        ctx = b[max(0, j1 - CTX): j2 + CTX]
        spans.append((old, new, ctx))
    return spans


def main() -> None:
    a, _ = load(TEBIKI / "r7_tebiki.txt")
    b, b_chap = load(TEBIKI / "r8_tebiki.txt")

    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    lines = ["# 手引き 令和7年4月版 → 令和8年4月版 変更点レポート", "",
             "厚労省PDF（行番号なし版）から機械抽出した差分。`旧` が令和7年4月版、`新` が令和8年4月版。", ""]
    count = 0
    per_chapter = {}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        chap = b_chap[min(j1, len(b_chap) - 1)]
        if tag == "replace" and (i2 - i1) == (j2 - j1):
            for k in range(i2 - i1):
                for old, new, ctx in char_spans(a[i1 + k], b[j1 + k]):
                    count += 1
                    per_chapter[chap] = per_chapter.get(chap, 0) + 1
                    lines += [f"## {count}. [{chap}] 語句の修正",
                              f"- 旧: `{old}`", f"- 新: `{new}`",
                              f"- 文脈: …{ctx}…", ""]
            continue
        count += 1
        per_chapter[chap] = per_chapter.get(chap, 0) + 1
        label = {"insert": "追加", "delete": "削除"}.get(tag, "書き換え")
        lines.append(f"## {count}. [{chap}] {label}")
        for s in a[i1:i2]:
            lines.append(f"- 旧: {s[:500]}")
        for s in b[j1:j2]:
            lines.append(f"- 新: {s[:500]}")
        lines.append("")

    out = TEBIKI / "changes.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"変更点 {count} 件 -> {out} ({out.stat().st_size:,} bytes)")
    for k, v in sorted(per_chapter.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
