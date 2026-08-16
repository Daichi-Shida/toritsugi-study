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
    am_numbers: set[int] = set()
    for part in ("am", "pm"):
        pdf = PDF_DIR / f"{key}_{part}.pdf"
        if not pdf.exists():
            continue
        part_blocks: dict[int, list[list[str]]] = {}
        current: int | None = None
        buf: list[str] = []
        for lines in page_lines(pdf):
            if is_cover(lines):
                continue
            for ln in lines:
                # 栃木県は【問１】のように括弧付き
                m = re.match(r"^[【\[]?\s*問\s*([０-９0-9]{1,3})\s*[】\]]?\s*(.*)$", ln)
                n = int(_z2h_num(m.group(1))) if m else None
                if n is not None and 1 <= n <= 120:
                    if current is not None:
                        part_blocks.setdefault(current, []).append(buf)
                    current, buf = n, []
                    rest = m.group(2).strip()
                    if rest:
                        buf.append(rest)
                    continue
                if current is not None:
                    buf.append(ln)
        if current is not None:
            part_blocks.setdefault(current, []).append(buf)

        # ブロックによって、午後の問番号が1に振り直される（東京・福岡は通し番号）。
        # 午前と番号がぶつかるときは午後を+60して通し番号に直す。
        offset = 60 if part == "pm" and (am_numbers & set(part_blocks)) else 0
        for n, cands in part_blocks.items():
            candidates.setdefault(n + offset, []).extend(cands)
        if part == "am":
            am_numbers = set(part_blocks)

    return {n: max(cands, key=len) for n, cands in candidates.items()}


def load_answers(key: str) -> dict[int, int]:
    """正答PDFから 問番号 -> 正答番号 を読む。

    正答表の作りは県ごとにばらばらなので、2通りの並びに対応する。
      (A) 「問１ 3 問３１ 1 …」のように 問番号と正答が交互に並ぶ（宮城・高知）
      (B) 「問１ 問２ …」「3 1 …」/「設問 1 2 …」「正答 5 4 …」のように
          見出し行と値行が対になる（関西・愛知・福岡）
    午前と午後で番号が振り直される正答表では、2度目に出た番号を+60して通し番号に直す。
    """
    pdf = PDF_DIR / f"{key}_ans.pdf"
    lines = [ln for page in page_lines(pdf) for ln in page]

    seen: dict[int, int] = {}      # 問番号 -> 出現回数
    answers: dict[int, int] = {}

    def put(num: int, val: int) -> None:
        if not (1 <= num <= 120 and 1 <= val <= 5):
            return
        seen[num] = seen.get(num, 0) + 1
        key_num = num + 60 * (seen[num] - 1)
        if key_num <= 120:
            answers.setdefault(key_num, val)

    # (A) 問番号と正答が交互に並ぶ形
    pair_re = re.compile(r"問\s*([０-９0-9]{1,3})\s+([1-5１-５])(?![０-９0-9])")
    for ln in lines:
        for m in pair_re.finditer(ln):
            put(int(_z2h_num(m.group(1))), int(_z2h_num(m.group(2))))
    if len(answers) >= 100:
        return answers

    # (B) 見出し行と値行が対になる形
    seen.clear()
    answers.clear()
    header_nums: list[int] | None = None
    for ln in lines:
        z = _z2h_num(ln)
        qs = re.findall(r"問\s*(\d{1,3})", z)
        if len(qs) < 3 and z.strip().startswith("設問"):
            qs = re.findall(r"(?<![\d])(\d{1,3})(?![\d])", z)
        if len(qs) >= 3:
            header_nums = [int(x) for x in qs]
            continue
        if header_nums:
            vals = re.findall(r"(?<![\d])([1-5])(?![\d])", z)
            if len(vals) == len(header_nums):
                for num, val in zip(header_nums, vals):
                    put(num, int(val))
                header_nums = None
    if len(answers) >= 100:
        return answers

    # (C) 番号だけが交互に並ぶ形（東京の「1 2 31 1 61 3 91 2」）
    seen.clear()
    answers.clear()
    for ln in lines:
        if "設問" in ln or "解答" in ln or "正答" in ln:
            continue
        toks = re.findall(r"\d+", _z2h_num(ln))
        if len(toks) >= 2 and len(toks) % 2 == 0:
            for i in range(0, len(toks), 2):
                put(int(toks[i]), int(toks[i + 1]))
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
