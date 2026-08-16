#!/usr/bin/env python3
"""厚労省「試験問題の作成に関する手引き」PDFからテキストを抽出する。

令和7年4月版と令和8年4月版のテキストを取り出し、行単位の差分を取ることで
改訂箇所（追加・削除）を機械的に特定する。問題作成の一次資料として使う。

使い方:
  python3 scripts/extract_tebiki.py extract   # PDF -> docs/tebiki/*.txt
  python3 scripts/extract_tebiki.py diff      # r7 -> r8 の差分を docs/tebiki/diff_r7_r8.txt へ
"""
import re
import sys
import difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEBIKI = ROOT / "docs" / "tebiki"


def extract(pdf: Path, out: Path) -> None:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf))
    parts = []
    for i, page in enumerate(reader.pages, 1):
        try:
            parts.append(f"\n===== p.{i} =====\n" + (page.extract_text() or ""))
        except Exception as e:  # 壊れたページはスキップして継続
            parts.append(f"\n===== p.{i} (extract error: {e}) =====\n")
    out.write_text("".join(parts), encoding="utf-8")
    print(f"{pdf.name}: {len(reader.pages)}ページ -> {out.name} ({out.stat().st_size:,} bytes)")


def normalize_lines(path: Path) -> list[str]:
    """文単位に正規化する。

    版が変わるとページ送り・折り返し位置が動くため、行単位の比較では差分が
    ノイズだらけになる。全文を1本の文字列に連結してから句点で文に切り直し、
    改行位置に依存しない比較単位をつくる。
    """
    text = path.read_text(encoding="utf-8", errors="replace")
    text = re.sub(r"\n===== p\.\d+[^=]*=====\n", "\n", text)
    text = re.sub(r"\s+", "", text)
    # 全ページに入る柱（版名）は版ごとに必ず違うので、比較前に落とす。
    # 残さないと全ページが差分として浮いてしまう。
    text = re.sub(r"試験問題の作成に関する手引き（令和[０-９0-9一二三四五六七八九十]+年[０-９0-9一二三四五六七八九十]+月[^）]*）", "", text)
    # 柱の残り（章名＋ページ番号）。改訂でページがずれるため数字ごと落とす。
    text = re.sub(
        r"第[１-５]章(?:医薬品に共通する特性と基本的な知識|人体の働きと医薬品"
        r"|主な医薬品とその作用|薬事関係法規・制度|医薬品の適正使用・安全対策)\d*",
        "", text)
    # ページ番号・行番号の残骸（連続する裸の数字列）を削る
    text = re.sub(r"(?<=。)\d{1,4}(?=[^\d])", "", text)
    sentences = [s + "。" for s in text.split("。") if s.strip()]
    return sentences


def diff() -> None:
    a = normalize_lines(TEBIKI / "r7_tebiki.txt")
    b = normalize_lines(TEBIKI / "r8_tebiki.txt")
    out = TEBIKI / "diff_r7_r8.txt"
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    chunks = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        chunks.append(f"\n--- {tag} r7[{i1}:{i2}] -> r8[{j1}:{j2}] ---")
        for x in a[i1:i2]:
            chunks.append(f"- {x}")
        for x in b[j1:j2]:
            chunks.append(f"+ {x}")
    out.write_text("\n".join(chunks), encoding="utf-8")
    n = sum(1 for c in chunks if c.lstrip().startswith("---"))
    print(f"差分ブロック {n} 件 -> {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "extract"
    if cmd == "extract":
        for name in ("r7_tebiki", "r8_tebiki"):
            extract(TEBIKI / f"{name}.pdf", TEBIKI / f"{name}.txt")
    elif cmd == "diff":
        diff()
    else:
        raise SystemExit(f"unknown command: {cmd}")
