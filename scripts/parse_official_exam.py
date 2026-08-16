#!/usr/bin/env python3
"""公式の試験問題PDF・正答PDFを解析して、問題を原文どおりの形で取り出す。

出典サイト経由だとリード文と選択肢が画像で復元できないため、ここでは
都道府県が公開している公式PDFを直接読む。設問文・各記述・選択肢の並び・
正答番号がすべて原文のまま取れる。

PDFの注意点:
  - ルビが本文と別行に混ざる（「蕁」の次の行に「じん」）。ルビは約6ptで
    本文は約11pt なので、文字サイズで落とす。ＬＤ５０の下付き（6.5pt・数字）は残す。
  - 表紙とマークシートの説明ページに「問110 炭素の元素記号…」というダミーがある。
  - 午前が問1〜60、午後が問61〜120。

確認: python3 scripts/parse_official_exam.py r7_tokyo
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "scripts" / "official_pdf"

RUBY_MAX_SIZE = 7.0          # これ未満のひらがなはルビとみなす
LINE_Y_TOLERANCE = 3.0       # 同じ行とみなすy座標の差

# 全角の選択肢番号・記述ラベル
NUM = "１２３４５"
LABELS = "ａｂｃｄｅ"


def _z2h_num(s: str) -> str:
    return s.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


_CID_RE = re.compile(r"\(cid:(\d+)\)")


def decode_cid(s: str) -> str:
    """(cid:NN) を文字に戻す。

    令和3・4年度のPDFは半角部分のフォントに文字コード表が埋め込まれておらず、
    半角スペースやラテン文字が (cid:3) (cid:42) のようなグリフ番号で出てくる。
    このフォント群はAdobe標準のグリフ順なので、番号+29 がASCIIコードになる
    （cid:3=空白、cid:42='G'、cid:11='('）。日本語部分は正しく出るのでそのまま。
    """
    if "(cid:" not in s:
        return s

    def rep(m: re.Match) -> str:
        n = int(m.group(1))
        return chr(n + 29) if 3 <= n <= 97 else ""

    return _CID_RE.sub(rep, s)


def page_lines(pdf: Path) -> list[list[str]]:
    """ページごとの行リストを返す（ルビ除去済み）。"""
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import LTTextContainer, LTChar, LAParams

    pages: list[list[str]] = []
    for layout in extract_pages(str(pdf), laparams=LAParams()):
        width = layout.width or 595.0
        # 令和4年度のPDFは1枚に2ページ分が横並びで入っており、紙幅を超えた
        # x座標に右ページが置かれている。y座標だけで行にすると左右がつながって
        # 読めなくなるので、紙幅で列に分けてから別ページとして扱う。
        columns: dict[int, list] = {}
        for el in layout:
            if not isinstance(el, LTTextContainer):
                continue
            for line in el:
                for ch in getattr(line, "_objs", []):
                    if not isinstance(ch, LTChar):
                        continue
                    txt = ch.get_text()
                    # ルビ（小さいひらがな）を落とす。下付き数字は残す
                    if ch.size < RUBY_MAX_SIZE and re.fullmatch(r"[ぁ-ゖー]", txt):
                        continue
                    col = max(0, int(ch.x0 // width))
                    columns.setdefault(col, []).append(
                        (ch.y1, ch.x0 - col * width, ch.x1 - col * width, ch.size, txt))
        for col in sorted(columns):
            pages.append(_lines_from_chars(columns[col]))
    return pages


def _lines_from_chars(chars: list) -> list[str]:
    """(y1, x0, x1, size, 文字) の並びを、上から順の行文字列にする。"""
    chars.sort(key=lambda c: (-c[0], c[1]))
    lines: list[list[tuple[float, float, float, str]]] = []
    cur_y = None
    cur: list[tuple[float, float, float, str]] = []
    for y, x0, x1, size, txt in chars:
        if cur_y is None or abs(cur_y - y) <= LINE_Y_TOLERANCE:
            cur.append((x0, x1, size, txt))
            cur_y = y if cur_y is None else cur_y
        else:
            lines.append(cur)
            cur = [(x0, x1, size, txt)]
            cur_y = y
    if cur:
        lines.append(cur)

    out = []
    for ln in lines:
        ln.sort(key=lambda c: c[0])
        # 表組み（正答一覧・選択肢の表）は横方向の空きで列が分かれるので、
        # 文字の間隔が空いていたら空白を入れて列の区切りを残す
        parts = []
        prev_x1 = None
        for x0, x1, size, txt in ln:
            if prev_x1 is not None and x0 - prev_x1 > size * 0.35:
                parts.append(" ")
            parts.append(txt)
            prev_x1 = x1
        s = re.sub(r"[ 　]+", " ", decode_cid("".join(parts))).strip()
        if s:
            out.append(s)
    return out


def is_cover(lines: list[str]) -> bool:
    """表紙・マークシート説明のページか（ダミーの「問110 炭素の元素記号」を除くため）。

    「注意事項」という語は本文にも出る（例:高圧ガス保安法の注意事項）ので使わない。
    """
    joined = "".join(lines)
    return any(k in joined for k in ("解答例", "マークの仕方", "指示があるまで開いて"))


def question_blocks(key: str) -> dict[int, list[str]]:
    """問番号 -> その問の行リスト

    同じ問が複数回現れるPDFがある（令和4年度は2ページ分が1枚に入っている都合で
    同じ内容が重複する）ため、問ごとに候補を集めていちばん行数の多いものを採る。
    """
    candidates: dict[int, list[list[str]]] = {}
    for part in ("am", "pm"):
        pdf = PDF_DIR / f"{key}_{part}.pdf"
        if not pdf.exists():
            continue
        current: int | None = None
        buf: list[str] = []
        for lines in page_lines(pdf):
            if is_cover(lines):
                continue
            for ln in lines:
                m = re.match(r"^問\s*([０-９0-9]{1,3})\s*(.*)$", ln)
                n = int(_z2h_num(m.group(1))) if m else None
                if n is not None and 1 <= n <= 120:
                    if current is not None:
                        candidates.setdefault(current, []).append(buf)
                    current, buf = n, []
                    rest = m.group(2).strip()
                    if rest:
                        buf.append(rest)
                    continue
                if current is not None:
                    buf.append(ln)
        if current is not None:
            candidates.setdefault(current, []).append(buf)

    return {n: max(cands, key=len) for n, cands in candidates.items()}


def load_answers(key: str) -> dict[int, int]:
    """正答PDFから 問番号 -> 正答番号 を読む。"""
    pdf = PDF_DIR / f"{key}_ans.pdf"
    nums: list[int] = []
    for lines in page_lines(pdf):
        for ln in lines:
            # 「1 2 31 1 61 3 91 2」のように 設問番号/解答番号 が交互に並ぶ
            toks = re.findall(r"\d+", _z2h_num(ln))
            if len(toks) >= 2 and "設問" not in ln and "解答" not in ln:
                nums.extend(int(t) for t in toks)
    answers: dict[int, int] = {}
    for i in range(0, len(nums) - 1, 2):
        q, a = nums[i], nums[i + 1]
        if 1 <= q <= 120 and 1 <= a <= 5:
            answers.setdefault(q, a)
    return answers


# ===== 設問の型判定 =====

RE_OPT_COMBO = re.compile(rf"^([{NUM}])\s*[（(]\s*([{LABELS}][^）)]*)[）)]")
RE_OPT_SEIGO = re.compile(rf"^([{NUM}])\s+([正誤](?:\s+[正誤]){{1,4}})\s*$")
RE_HEADER = re.compile(rf"^([{LABELS}])(?:\s+[{LABELS}]){{1,4}}\s*$")
RE_STMT = re.compile(rf"^([{LABELS}])\s+(.+)$")
RE_OPT_PLAIN = re.compile(rf"^([{NUM}])\s+(\S.*)$")


def classify(lines: list[str]) -> str:
    body = "\n".join(lines)
    if RE_OPT_SEIGO.search(body) or re.search(rf"(?m)^[{NUM}]\s+[正誤]\s+[正誤]", body):
        return "seigo_combination"
    if re.search(rf"(?m)^[{NUM}]\s*[（(]\s*[{LABELS}]", body):
        return "correct_combination"
    if re.search(rf"(?m)^[{LABELS}](\s+[{LABELS}]){{1,4}}\s*$", body):
        return "word_combination"
    return "simple_select"


def main() -> None:
    key = sys.argv[1] if len(sys.argv) > 1 else "r7_tokyo"
    blocks = question_blocks(key)
    answers = load_answers(key)
    from collections import Counter
    kinds = Counter(classify(v) for v in blocks.values())
    print(f"[{key}] 問 {len(blocks)} 件 / 正答 {len(answers)} 件")
    print("  形式:", dict(kinds))
    miss = [n for n in range(1, 121) if n not in blocks]
    if miss:
        print("  取れていない問:", miss)
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    print(f"\n--- 問{n}（{classify(blocks[n])}・正答{answers.get(n)}）---")
    for ln in blocks[n]:
        print("   ", ln)


if __name__ == "__main__":
    main()
