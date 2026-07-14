#!/usr/bin/env python3
"""dokugaku.info の過去問ページ（南関東＝東京都）を解析し、
本試験形式（正誤組み合わせ）の問題JSONを生成する。

各設問ページから ア〜エ（原文は a〜d）の各文・正誤・解説を抽出し、
公式正答に一致する正誤ベクトルを正解肢として、決定的に撹乱4肢を生成する。
画像内にしか情報がない穴埋め・語句補充型は自動でスキップする。
"""
import re, html, json, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_ROOT = ROOT / "scripts" / "kakomon_raw"

# (生データディレクトリ, 出力ファイル名, 年, ID接頭辞, 都道府県ラベル)
SOURCES = [
    ("r6_tokyo", "kakomon_r6_tokyo.json", 2024, "kk_r6t", "東京都（南関東）"),
    ("r5_tokyo", "kakomon_r5_tokyo.json", 2023, "kk_r5t", "東京都（南関東）"),
    ("r4_tokyo", "kakomon_r4_tokyo.json", 2022, "kk_r4t", "東京都（南関東）"),
]

C1 = "医薬品に共通する特性と基本的な知識"
C2 = "人体の働きと医薬品"
C3 = "主な医薬品とその作用"
C4 = "薬事関係法規・制度"
C5 = "医薬品の適正使用・安全対策"

# 南関東の出題順 → 章マッピング
def chapter_of(n: int) -> str:
    if 1 <= n <= 20:   return C1
    if 21 <= n <= 40:  return C2
    if 41 <= n <= 60:  return C4   # 法規は問41-60
    if 61 <= n <= 100: return C3   # 主な医薬品は問61-100
    return C5

LABEL_MAP = {"a": "ア", "b": "イ", "c": "ウ", "d": "エ", "e": "オ"}

# 令和8年5月の薬機法改正で内容が古くなり、現行では誤答を招く過去問を除外する。
# 「濫用等のおそれのある医薬品」→「指定濫用防止医薬品」への改称・販売ルール変更分。
# 現行ルールは r8_revision / r8_deep 問題群でカバーする。
EXCLUDE_IDS = {
    "kk_r6t_057",  # 濫用等のおそれのある医薬品の販売時確認事項（旧枠組み）
    "kk_r4t_055",  # 濫用等のおそれのある医薬品 確認事項（旧枠組み）
}


def clean_text(fn: Path) -> str:
    raw = fn.read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<script.*?</script>", "", raw, flags=re.S)
    t = re.sub(r"<style.*?</style>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "\n", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t　]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t


def norm(s: str) -> str:
    s = re.sub(r"\s+", "", s)
    return s.strip()


def clean_reason(reason: str) -> str:
    """解説理由から先頭の余分な句読点と定型フィラーを除去する。"""
    reason = reason.lstrip("、。 ")
    # サイト特有のくだけたフィラーを削る
    fillers = [
        "知らんかったでは、ダメですよね。", "難しく考えないで、解答してください。",
        "解説のしようがありません。", "テキストを精読しておきましょう。",
        "テキストで確認しておきましょう。", "テキストと過去問を繰り返しておきましょう。",
        "シッカリ見ておきましょう。", "しっかり見ておきましょう。",
        "そのとおりの記述です。", "これも、そのとおりの記述です。",
    ]
    for f in fillers:
        reason = reason.replace(f, "")
    return reason.strip("、。 ")


def parse_question(raw_dir: Path, n: int):
    txt = clean_text(raw_dir / f"{n:03d}.html")
    body = txt.split("難易度コメント")[-1].split("もし、最終解答")[0]

    m = re.search(r"正解：\s*([0-9]+)", body)
    if not m:
        return None
    ans = int(m.group(1))

    tm = re.search(r"第" + str(n) + r"問‐([^\n]+)", txt)
    topic = tm.group(1).strip() if tm else ""
    # 年度・サイト名などが付いたタイトルは冒頭の主題だけに切り詰める
    topic = re.split(r"[：:（(]|令和|\d", topic)[0].strip("　 ")

    # 各文の正誤サマリ： 「a」は「正」です
    seigo = {}
    for mm in re.finditer(r"「([a-e])」は「([正誤])」", body):
        seigo[mm.group(1)] = (mm.group(2) == "正")
    if len(seigo) < 3:
        return None

    # 各選択肢ブロックから 本文 + 解説理由 を抽出
    stmts = {}
    reasons = {}
    # 「選択肢a … 選択肢b …」の順にブロック分割
    blocks = re.split(r"(?:^|\n)\s*選択肢([a-e])\s*\n", body)
    # blocks: [pre, 'a', blockA, 'b', blockB, ...]
    for i in range(1, len(blocks) - 1, 2):
        lbl = blocks[i]
        blk = blocks[i + 1]
        # 本文： 「TEXT」ですが
        tm2 = re.search(r"「(.+?)」ですが", blk, flags=re.S)
        if not tm2:
            continue
        stmts[lbl] = norm(tm2.group(1))
        # 理由： 「TEXT」ですが、以降 〜 よって、選択肢は の手前まで
        rest = blk.split("ですが", 1)[1]
        rest = rest.split("よって、選択肢")[0]
        reasons[lbl] = clean_reason(norm(rest))

    labels_sorted = [l for l in ["a", "b", "c", "d", "e"] if l in seigo]
    # 本文が取れていない文があるものはスキップ（画像依存型）
    if any(l not in stmts or len(stmts[l]) < 10 for l in labels_sorted):
        return None
    if len(labels_sorted) < 4:
        return None

    return {
        "n": n,
        "topic": topic,
        "ans": ans,
        "labels": labels_sorted,
        "stmts": stmts,
        "seigo": seigo,
        "reasons": reasons,
    }


def stable_int(s: str) -> int:
    return int(hashlib.md5(s.encode("utf-8")).hexdigest(), 16)


def make_distractors(correct, qid):
    n = len(correct)
    seed = stable_int(qid)
    seen = {tuple(correct)}
    out = []
    candidates = []
    for i in range(n):
        v = correct[:]; v[i] = not v[i]; candidates.append(v)
    for i in range(n):
        for j in range(i + 1, n):
            v = correct[:]; v[i] = not v[i]; v[j] = not v[j]; candidates.append(v)
    candidates.sort(key=lambda v: stable_int(qid + "".join("1" if x else "0" for x in v)))
    for v in candidates:
        t = tuple(v)
        if t not in seen:
            seen.add(t); out.append(v)
        if len(out) == 4:
            break
    return out


def build_source(raw_name, out_name, year, prefix, pref_label):
    raw_dir = RAW_ROOT / raw_name
    out_path = ROOT / "src" / "data" / "questions" / out_name
    questions = []
    skipped = []
    for n in range(1, 121):
        p = parse_question(raw_dir, n)
        if p is None:
            skipped.append(n); continue
        labels_src = p["labels"]
        jp_labels = [LABEL_MAP[l] for l in labels_src]
        statements = [{"label": jp_labels[i], "text": p["stmts"][labels_src[i]]}
                      for i in range(len(labels_src))]
        correct = [p["seigo"][l] for l in labels_src]
        qid = f"{prefix}_{n:03d}"
        if qid in EXCLUDE_IDS:
            skipped.append(n); continue
        distractors = make_distractors(correct, qid)
        pos = stable_int(qid + "_pos") % 5
        options = distractors[:]
        options.insert(pos, correct)
        # 解説：各文の正誤＋理由
        expl_parts = []
        for i, l in enumerate(labels_src):
            verdict = "正" if p["seigo"][l] else "誤"
            reason = p["reasons"].get(l, "")[:140]
            expl_parts.append(f"{jp_labels[i]}（{verdict}）{reason}" if reason
                              else f"{jp_labels[i]}（{verdict}）")
        explanation = "　".join(expl_parts)
        cat = chapter_of(n)
        topic = p["topic"]
        text = (f"{topic}に関する次の記述について、正しい正誤の組み合わせを一つ選びなさい。"
                if topic else "次の記述について、正しい正誤の組み合わせを一つ選びなさい。")
        questions.append({
            "id": qid,
            "type": "seigo_combination",
            "category": cat,
            "year": year,
            "prefecture": pref_label,
            "text": text,
            "statements": statements,
            "seigo_options": options,
            "correctIndex": pos,
            "explanation": explanation,
            "difficulty": 3,
        })

    out_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    from collections import Counter
    for q in questions:
        assert len(q["seigo_options"]) == 5, q["id"]
        assert len({tuple(o) for o in q["seigo_options"]}) == 5, f"撹乱肢重複 {q['id']}"
        assert 0 <= q["correctIndex"] < 5
        assert len(q["seigo_options"][q["correctIndex"]]) == len(q["statements"])
    ch = Counter(q["category"] for q in questions)
    print(f"[{raw_name}] 生成 {len(questions)} 問 -> {out_name}")
    print("  章別:", {k[:6]: v for k, v in ch.items()})
    print(f"  スキップ {len(skipped)} 問(画像依存の穴埋め等): {skipped}")
    return len(questions)


def build():
    total = 0
    for raw_name, out_name, year, prefix, pref_label in SOURCES:
        total += build_source(raw_name, out_name, year, prefix, pref_label)
    print(f"\n合計 {total} 問 生成・自己検証 OK")


if __name__ == "__main__":
    build()
