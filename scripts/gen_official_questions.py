#!/usr/bin/env python3
"""公式PDFから、本試験と同じ形のままの問題JSONを作る。

これまでは出典サイト（dokugaku.info）のHTMLから復元していたが、リード文と
選択肢の表が画像のため、設問文を定型文に差し替え・選択肢を自前生成する必要が
あり、原文の形を保てなかった（穴埋め型などは丸ごと落ちていた）。
ここでは公式PDFを一次資料にして、設問文・各記述・選択肢の並び・正答番号を
そのまま使う。解説だけは公式PDFに無いので、出典サイトのものを問番号で対応付ける。

  python3 scripts/fetch_official_pdf.py      # PDF取得（先に実行）
  python3 scripts/gen_official_questions.py  # JSON生成

出力: src/data/questions/kakomon_{year}_{pref}.json
※ JSONは直接編集しないこと（再生成で上書きされる）。
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from parse_official_exam import (  # noqa: E402
    question_blocks, load_answers, page_lines, PDF_DIR, _z2h_num,
)
import gen_kakomon_questions as GK  # noqa: E402  解説の整形処理を借りる

C1 = "医薬品に共通する特性と基本的な知識"
C2 = "人体の働きと医薬品"
C3 = "主な医薬品とその作用"
C4 = "薬事関係法規・制度"
C5 = "医薬品の適正使用・安全対策"

# 手引きの章名（PDFの見出し）→ アプリのカテゴリ名
HEADING_TO_CATEGORY = [
    ("医薬品に共通する特性と基本的な知識", C1),
    ("人体の働きと医薬品", C2),
    ("主な医薬品とその作用", C3),
    ("薬事に関する法規と制度", C4),
    ("薬事関係法規", C4),
    ("医薬品の適正使用と安全対策", C5),
    ("医薬品の適正使用・安全対策", C5),
]

NUM = "１２３４５"
LAB = "ａｂｃｄｅ"

# (PDFキー, 出典サイトの生HTMLディレクトリ, 出力ファイル, 年, ID接頭辞, ラベル)
#
# 試験はブロック単位で共通問題なので、問題PDFはブロック内のどの県のものでも中身は同じ。
# IDの接頭辞と解説の取得元（出典サイトの県）は従来のまま据え置き、妻の学習記録が
# そのまま紐づくようにしている（例: 北海道・東北は宮城県のPDFだが ID は kk_r7h）。
SOURCES = [
    # 南関東（東京都）は直近5年分
    ("r7_tokyo", "r7_toukyou", "kakomon_r7_tokyo.json", 2025, "kk_r7t", "東京都（南関東）"),
    ("r6_tokyo", "r6_tokyo", "kakomon_r6_tokyo.json", 2024, "kk_r6t", "東京都（南関東）"),
    ("r5_tokyo", "r5_tokyo", "kakomon_r5_tokyo.json", 2023, "kk_r5t", "東京都（南関東）"),
    ("r4_tokyo", "r4_tokyo", "kakomon_r4_tokyo.json", 2022, "kk_r4t", "東京都（南関東）"),
    ("r3_tokyo", "r3_toukyou", "kakomon_r3_tokyo.json", 2021, "kk_r3t", "東京都（南関東）"),
    # 令和7年度・残り6ブロック
    ("r7_hokkaidou", "r7_hokkaidou", "kakomon_r7_hokkaidou.json", 2025, "kk_r7h", "北海道・東北"),
    ("r7_ibaraki", "r7_ibaraki", "kakomon_r7_ibaraki.json", 2025, "kk_r7ib", "北関東・甲信越"),
    ("r7_aiti", "r7_aiti", "kakomon_r7_aiti.json", 2025, "kk_r7a", "東海・北陸"),
    ("r7_kansai", "r7_kansaikouikirengou", "kakomon_r7_kansai.json", 2025, "kk_r7k", "関西広域連合"),
    ("r7_hirosima", "r7_hirosima", "kakomon_r7_hirosima.json", 2025, "kk_r7c", "中国・四国"),
    # 九州・沖縄（福岡県）は未対応。PDFの左余白に章名が縦書きで入っていて本文行に
    # 混ざるため、記述と選択肢を切り出せない。当面は従来方式（出典サイト由来）の
    # kakomon_r7_hukuoka.json をそのまま使う（gen_kakomon_questions.py が生成）。
]

# 手引き令和8年4月改訂で内容が古くなった過去問（gen_kakomon_questions.py と同じ理由）
EXCLUDE_IDS = GK.EXCLUDE_IDS


# ===== 章の割り当て =====

def _undouble(s: str) -> str:
    """二重打ちの見出しを元に戻す（「薬薬事事にに…」→「薬事に…」）。

    令和3・4年度のPDFは章見出しを太字にするため同じ文字を2回描いており、
    文字単位で読むと全部が重なって出てくる。
    """
    if len(s) >= 4 and len(s) % 2 == 0 and s[0::2] == s[1::2]:
        return s[0::2]
    return s


def fallback_chapter_map(raw_dir: str) -> dict[int, str]:
    """PDFに章見出しが無いブロック用。出典サイトの目次から章の並びを読む。

    章の並びと問数（主な医薬品40問・他20問）はブロックごとに決まっているので、
    出典ページの目次リンクから順序だけ借りれば通し番号に割り当てられる。
    """
    return GK.block_chapter_map(ROOT / "scripts" / "kakomon_raw" / raw_dir)


def chapter_map(key: str) -> dict[int, str]:
    """PDFの章見出しと直後の問番号から、問番号→章を決める。

    章の並びはブロックごとに違う（南関東は 1,2,4,3,5 の順）ので、位置決め打ちにしない。
    """
    marks: list[tuple[int, str]] = []
    for part in ("am", "pm"):
        pdf = PDF_DIR / f"{key}_{part}.pdf"
        if not pdf.exists():
            continue
        pending: str | None = None
        for lines in page_lines(pdf):
            for ln in lines:
                s = _undouble(ln.replace(" ", ""))
                for heading, cat in HEADING_TO_CATEGORY:
                    if s == heading or s.endswith(heading):
                        pending = cat
                        break
                m = re.match(r"^[【\[]?\s*問\s*([０-９0-9]{1,3})", ln)
                if m and pending:
                    n = int(_z2h_num(m.group(1)))
                    if 1 <= n <= 120:
                        marks.append((n, pending))
                        pending = None
    marks.sort()
    out: dict[int, str] = {}
    if not marks:
        return out
    for i, (start, cat) in enumerate(marks):
        end = marks[i + 1][0] - 1 if i + 1 < len(marks) else 120
        for n in range(start, end + 1):
            out[n] = cat
    return out


# ===== 本文の組み立て =====

def _clean(s: str) -> str:
    s = s.replace("(", "（").replace(")", "）")
    return re.sub(r"[ 　]+", " ", s).strip()


def _join(parts: list[str]) -> str:
    """折り返しでちぎれた行をつなぐ。日本語の行間の空白は詰める。"""
    text = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if text and re.search(r"[A-Za-z0-9]$", text) and re.match(r"[A-Za-z0-9]", p):
            text += " "
        text += p
    return _clean(text)


def _strip_page_numbers(lines: list[str]) -> list[str]:
    return [ln for ln in lines if not re.fullmatch(r"[0-9０-９]{1,3}", ln.strip())]


RE_STMT_START = re.compile(rf"^([{LAB}])\s+(\S.*)$")
RE_SEIGO_ROW = re.compile(rf"^([{NUM}])\s+([正誤](?:\s+[正誤]){{1,4}})\s*$")
RE_HEADER = re.compile(rf"^([{LAB}])(?:\s+[{LAB}]){{1,4}}\s*$")
RE_WORD_ROW = re.compile(rf"^([{NUM}])\s+(\S.*)$")
RE_COMBO = re.compile(rf"([{NUM}])\s*（\s*([{LAB}][^）]*)）")


def parse_question(lines: list[str]):
    """1問分の行から、設問文・記述・選択肢を取り出す。"""
    lines = _strip_page_numbers(lines)
    if not lines:
        return None

    body = "\n".join(lines)

    # --- 正誤の組合せ ---
    rows = [i for i, ln in enumerate(lines) if RE_SEIGO_ROW.match(ln)]
    if len(rows) >= 4:
        first = rows[0]
        header = first - 1 if first > 0 and RE_HEADER.match(lines[first - 1]) else first
        stmts, lead = _split_statements(lines[:header])
        combos = []
        for i in rows:
            m = RE_SEIGO_ROW.match(lines[i])
            combos.append([c == "正" for c in m.group(2).split()])
        if not stmts or len({len(c) for c in combos}) != 1:
            return None
        if len(combos[0]) != len(stmts):
            return None
        return {"type": "seigo_combination", "text": lead, "statements": stmts,
                "seigo_options": combos}

    # --- 正しいものの組合せ ---
    combo_hits = RE_COMBO.findall(body)
    if len(combo_hits) >= 4:
        idx = min(i for i, ln in enumerate(lines) if RE_COMBO.search(ln))
        stmts, lead = _split_statements(lines[:idx])
        opts = [[c for c in labels if c in LAB] for _, labels in combo_hits]
        if not stmts:
            return None
        return {"type": "correct_combination", "text": lead, "statements": stmts,
                "combo_options": opts}

    # --- 語句の組合せ（穴埋め）---
    headers = [i for i, ln in enumerate(lines) if RE_HEADER.match(ln)]
    if headers:
        h = headers[-1]
        rows2 = []
        for ln in lines[h + 1:]:
            m = RE_WORD_ROW.match(ln)
            if not m:
                break
            rows2.append(m.group(2).split())
        hdr = lines[h].split()
        if len(rows2) >= 4 and all(len(r) == len(hdr) for r in rows2):
            lead, passage = _split_lead_passage(lines[:h])
            return {"type": "word_combination", "text": lead, "passage": passage,
                    "word_headers": hdr, "word_options": rows2}

    # --- 単文の5択 ---
    starts = [i for i, ln in enumerate(lines) if RE_WORD_ROW.match(ln)]
    picks = []
    expected = 1
    for i in starts:
        m = RE_WORD_ROW.match(lines[i])
        if NUM.index(m.group(1)) + 1 == expected:
            picks.append(i)
            expected += 1
    if len(picks) >= 4:
        lead = _join(lines[:picks[0]])
        options = []
        for k, i in enumerate(picks):
            end = picks[k + 1] if k + 1 < len(picks) else len(lines)
            first = RE_WORD_ROW.match(lines[i]).group(2)
            options.append(_join([first] + lines[i + 1:end]))
        return {"type": "simple_select", "text": lead, "options": options}

    return None


def _split_statements(lines: list[str]):
    """記述（ａ〜ｅ）と、その前の設問文に分ける。"""
    starts = [i for i, ln in enumerate(lines) if RE_STMT_START.match(ln)]
    # ラベルが ａ から順に並んでいるものだけ採用する
    picks, expected = [], 0
    for i in starts:
        lab = RE_STMT_START.match(lines[i]).group(1)
        if LAB.index(lab) == expected:
            picks.append(i)
            expected += 1
    if not picks:
        return [], _join(lines)
    lead = _join(lines[:picks[0]])
    stmts = []
    for k, i in enumerate(picks):
        end = picks[k + 1] if k + 1 < len(picks) else len(lines)
        m = RE_STMT_START.match(lines[i])
        stmts.append({"label": m.group(1), "text": _join([m.group(2)] + lines[i + 1:end])})
    return stmts, lead


def _split_lead_passage(lines: list[str]):
    """穴埋め型の「設問文」と「本文（空欄入りの文章）」を分ける。"""
    for i, ln in enumerate(lines):
        if "どれか" in ln:
            return _join(lines[:i + 1]), _join(lines[i + 1:])
    return _join(lines), ""


# ===== 解説（出典サイトの解説を問番号で対応付ける）=====

def load_reasons(raw_dir: str, n: int) -> dict[str, tuple[bool | None, str]]:
    """出典ページから ラベル→(出典が示す正誤, 理由) を取り出す。

    正誤も一緒に持ち帰るのは、公式正答と食い違ったときに理由文を使わないため。
    出典の判定が誤っていることが実際にあり（東京R7問44・R4問94）、そのまま載せると
    「誤った記述です」と書きながら正しい理由を説明する矛盾した解説になる。
    単文5択なら '1'..'5' がキー。
    """
    path = ROOT / "scripts" / "kakomon_raw" / raw_dir / f"{n:03d}.html"
    if not path.exists():
        return {}
    txt = GK.clean_text(path)
    body = txt.split("難易度コメント")[-1]
    # 解説のあとに続く「次の問題へ」等のナビ文言を落とす
    body = re.split(r"(?:もし、最終解答|さて、最終解答|>>>|次の問題へ)", body)[0]
    out: dict[str, tuple[bool | None, str]] = {}
    blocks = re.split(r"(?:^|\n)\s*選択肢\s*([a-eア-オ1-5１-５])\s*\n", body)
    for i in range(1, len(blocks) - 1, 2):
        key = blocks[i]
        rest = blocks[i + 1].split("よって、選択肢")[0]
        verdict: bool | None = None
        m = re.search(r"「(.+)」ですが[、\s]*(正しい|誤った)記述です。", rest, flags=re.S)
        if m:
            verdict = m.group(2) == "正しい"
            rest = rest[m.end():]
        else:
            m2 = re.search(r"(正しい|誤った)記述です。", rest)
            if m2:
                verdict = m2.group(1) == "正しい"
                rest = rest[m2.end():]
        reason = GK.clean_reason(GK.join_text(rest))
        if reason:
            out[GK.LABEL_MAP.get(key, key)] = (verdict, reason)
    # 単文5択や穴埋め型は選択肢ごとではなく「解説」節にまとめて書かれている。
    # 選択肢別の理由が取れた場合も、補足として拾っておく。
    m = re.search(r"解説\s*(.+)", body, flags=re.S)
    if m:
        reason = GK.clean_reason(GK.join_text(m.group(1)), maxlen=400)
        if reason:
            out.setdefault("_", (None, reason))
    return out


LABEL_JP = {"ａ": "ア", "ｂ": "イ", "ｃ": "ウ", "ｄ": "エ", "ｅ": "オ"}


def build_explanation(q: dict, correct_index: int, reasons: dict, qid: str,
                      conflicts: list[str]) -> str:
    """公式の正答を根拠に、記述ごとの正誤＋理由の解説を組み立てる。

    出典の判定が公式正答と食い違う記述は、理由文を採らない（矛盾を載せないため）。
    """
    def reason_for(label: str, official: bool) -> str:
        # 出典側は ア/イ/ウ/エ に正規化済みなので、ａ→ア に読み替えて引く
        got = reasons.get(LABEL_JP.get(label, label))
        if not got:
            return ""
        verdict, reason = got
        if verdict is not None and verdict != official:
            conflicts.append(f"{qid}{label}")
            return ""
        return reason

    if q["type"] in ("seigo_combination", "correct_combination"):
        if q["type"] == "seigo_combination":
            truth = dict(zip((s["label"] for s in q["statements"]),
                             q["seigo_options"][correct_index]))
        else:
            right = set(q["combo_options"][correct_index])
            truth = {s["label"]: s["label"] in right for s in q["statements"]}
        parts = []
        for s in q["statements"]:
            ok = bool(truth[s["label"]])
            head = "正しい記述です。" if ok else "誤った記述です。"
            parts.append(f"{s['label']}（{'正' if ok else '誤'}）{head}{reason_for(s['label'], ok)}")
        return "　".join(parts)

    if q["type"] == "simple_select":
        parts = [f"正解は{correct_index + 1}です。"]
        per_option = False
        for i, _opt in enumerate(q["options"]):
            got = reasons.get(str(i + 1)) or reasons.get("１２３４５"[i])
            if got and got[1]:
                parts.append(f"{i + 1}：{got[1]}")
                per_option = True
        # 選択肢ごとの理由が無い出典は「解説」節にまとめ書きされている
        if not per_option:
            got = reasons.get("_")
            if got and got[1]:
                parts.append(got[1])
        return "　".join(parts)

    # 穴埋め
    pairs = "、".join(
        f"（{h}）{w}" for h, w in zip(q["word_headers"], q["word_options"][correct_index]))
    got = reasons.get("_")
    body = got[1] if got else ""
    return f"正解は{correct_index + 1}です。{pairs}が入ります。{body}".strip()


# ===== 生成 =====

def build_source(key, raw_dir, out_name, year, prefix, pref_label):
    blocks = question_blocks(key)
    answers = load_answers(key)
    chapters = chapter_map(key)
    # 見出しを持たないPDF（宮城・栃木・関西など）は出典サイトの目次から章を決める
    if len(set(chapters.values())) < 5:
        fallback = fallback_chapter_map(raw_dir)
        if len(set(fallback.values())) >= 5:
            chapters = fallback
    questions, skipped, no_answer, excluded = [], [], [], []
    conflicts: list[str] = []
    for n in sorted(blocks):
        qid = f"{prefix}_{n:03d}"
        if qid in EXCLUDE_IDS:
            excluded.append(n)
            continue
        parsed = parse_question(blocks[n])
        if parsed is None:
            skipped.append(n)
            continue
        ans = answers.get(n)
        if ans is None:
            no_answer.append(n)
            continue
        n_opts = len(parsed.get("seigo_options") or parsed.get("combo_options")
                     or parsed.get("word_options") or parsed.get("options") or [])
        if not (1 <= ans <= n_opts):
            no_answer.append(n)
            continue
        correct_index = ans - 1
        reasons = load_reasons(raw_dir, n)
        q = {
            "id": qid,
            "type": parsed["type"],
            "category": chapters.get(n, C3),
            "year": year,
            "prefecture": pref_label,
            "text": parsed["text"],
            "correctIndex": correct_index,
            "explanation": build_explanation(parsed, correct_index, reasons, qid, conflicts),
            "difficulty": 3,
        }
        for extra in ("statements", "seigo_options", "combo_options",
                      "passage", "word_headers", "word_options", "options"):
            if extra in parsed:
                q[extra] = parsed[extra]
        questions.append(q)

    out_path = ROOT / "src" / "data" / "questions" / out_name
    out_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
    from collections import Counter
    kinds = Counter(q["type"] for q in questions)
    chs = Counter(q["category"] for q in questions)
    print(f"[{key}] {len(questions)} 問 -> {out_name}")
    print("  形式:", dict(kinds))
    print("  章別:", {k[:6]: v for k, v in chs.items()})
    missing = [n for n in range(1, 121) if n not in blocks]
    if excluded:
        print(f"  手引き改訂で除外 {len(excluded)} 問: {excluded}")
    if skipped:
        print(f"  解析できず {len(skipped)} 問: {skipped}")
    if no_answer:
        print(f"  正答が合わず {len(no_answer)} 問: {no_answer}")
    if missing:
        print(f"  公式PDFに本文なし（図版）{len(missing)} 問: {missing}")
    if conflicts:
        print(f"  出典の判定が公式正答と食い違い理由文を不採用 {len(conflicts)} 件: {conflicts[:12]}")
    return len(questions)


def build():
    total = 0
    for args in SOURCES:
        total += build_source(*args)
    print(f"\n合計 {total} 問")


if __name__ == "__main__":
    build()
