#!/usr/bin/env python3
"""出題プール全体の監査。

validate_questions.py は形の妥当性（必須項目・型・範囲）を見るだけなので、
ここでは「解いたときに困る」種類の不具合を探す。過去に実際に出た事故を念頭に置く。
  - 正解が2つある（選択肢の重複）
  - 解説の（正）（誤）が正答と食い違う
  - PDF解析で本文が途中で切れた／隣の問題が混ざった
  - 正答番号の対応ズレ（午後の+60補正ミス等）
公式PDFの正答は、生成物ではなくPDFから読み直して突き合わせる。

  python3 scripts/audit_questions.py
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "questions"
sys.path.insert(0, str(ROOT / "scripts"))

# 出力ファイル -> 公式PDFのキー（正答を読み直すため）
OFFICIAL_PDF_KEY = {
    "kakomon_r7_tokyo.json": "r7_tokyo", "kakomon_r6_tokyo.json": "r6_tokyo",
    "kakomon_r5_tokyo.json": "r5_tokyo", "kakomon_r4_tokyo.json": "r4_tokyo",
    "kakomon_r3_tokyo.json": "r3_tokyo",
    "kakomon_r7_hokkaidou.json": "r7_hokkaidou", "kakomon_r7_ibaraki.json": "r7_ibaraki",
    "kakomon_r7_aiti.json": "r7_aiti", "kakomon_r7_kansai.json": "r7_kansai",
    "kakomon_r7_hirosima.json": "r7_hirosima",
}

issues: list[tuple[str, str, str]] = []   # (深刻度, ID, 内容)


def bad(qid: str, msg: str) -> None:
    issues.append(("重大", qid, msg))


def warn(qid: str, msg: str) -> None:
    issues.append(("注意", qid, msg))


def options_of(q: dict):
    """選択肢の配列（比較用にタプル化）を返す。"""
    t = q.get("type", "simple_select")
    if t == "seigo_combination":
        return [tuple(o) for o in q["seigo_options"]]
    if t == "correct_combination":
        return [tuple(o) for o in q["combo_options"]]
    if t == "word_combination":
        return [tuple(o) for o in q["word_options"]]
    return [o for o in q.get("options", [])]


def texts_of(q: dict) -> list[tuple[str, str]]:
    """(場所, 文字列) の一覧。本文の壊れを見るため。"""
    out = [("設問文", q.get("text", ""))]
    for s in q.get("statements", []):
        out.append((f"記述{s.get('label')}", s.get("text", "")))
    if q.get("passage"):
        out.append(("本文", q["passage"]))
    for i, o in enumerate(q.get("options", [])):
        out.append((f"選択肢{i + 1}", o))
    return out


def main() -> None:
    files = re.findall(r'from\s+"\./([\w.]+\.json)"',
                       (DATA / "index.ts").read_text(encoding="utf-8"))
    pool: list[tuple[str, dict]] = []
    for f in files:
        for q in json.loads((DATA / f).read_text(encoding="utf-8")):
            pool.append((f, q))
    print(f"監査対象: {len(pool)} 問 / {len(files)} ファイル\n")

    seen_ids: dict[str, str] = {}
    by_statements: dict[frozenset, list[str]] = defaultdict(list)
    answer_dist: Counter = Counter()

    for fname, q in pool:
        qid = q["id"]
        qtype = q.get("type", "simple_select")
        opts = options_of(q)
        ci = q.get("correctIndex", -1)

        # --- ID重複 ---
        if qid in seen_ids:
            bad(qid, f"ID重複（{seen_ids[qid]} と {fname}）")
        seen_ids[qid] = fname

        # --- 選択肢の重複（＝正解が複数になりうる） ---
        dup = [o for o, n in Counter(opts).items() if n > 1]
        if dup:
            bad(qid, f"同じ選択肢が複数ある（正解が2つになる）: {dup[:2]}")
        if not (0 <= ci < len(opts)):
            bad(qid, f"正解番号が選択肢の範囲外: {ci + 1}/{len(opts)}")
        if not (2 <= len(opts) <= 5):
            bad(qid, f"選択肢の数が異常: {len(opts)}")
        answer_dist[ci + 1] += 1

        # --- 本文の壊れ ---
        stmt_lens = [len(s.get("text", "")) for s in q.get("statements", [])]
        short_ok = bool(stmt_lens) and max(stmt_lens) < 25   # 全部短い＝列挙型
        for where, s in texts_of(q):
            if not s or not s.strip():
                bad(qid, f"{where}が空")
                continue
            if "(cid:" in s:
                bad(qid, f"{where}に文字化け（cid）が残っている")
            if s.count("「") != s.count("」"):
                warn(qid, f"{where}の「」が閉じていない: …{s[-40:]}")
            if s.count("（") != s.count("）"):
                warn(qid, f"{where}の（）が閉じていない: …{s[-40:]}")
            # 「次のうち、〜の組合せはどれか」は成分名だけが並ぶので短くて当然。
            # 記述が長いものと混在しているときだけ、途中で切れた疑いとして報告する。
            if where.startswith("記述") and len(s) < 10 and not short_ok:
                warn(qid, f"{where}が短すぎる（途中で切れた可能性）: {s}")
            # 隣の問題が混ざっていないか
            if re.search(r"問\s*[０-９0-9]{1,3}\s*[^）]{0,6}(?:に関する|次の記述|正しい)", s):
                bad(qid, f"{where}に別の設問が混ざっている: …{s[:60]}…")
        # 設問文が問いの体裁か
        text = q.get("text", "")
        if text and not re.search(r"(どれか|選びなさい|選べ|ですか)", text):
            warn(qid, f"設問文が問いの形になっていない: {text[:50]}")

        # --- 解説と正答の整合（正誤/組合せの両方） ---
        expl = q.get("explanation", "")
        truth: dict[str, bool] = {}
        if qtype == "seigo_combination" and 0 <= ci < len(opts):
            truth = {s["label"]: bool(v) for s, v in zip(q["statements"], q["seigo_options"][ci])}
        elif qtype == "correct_combination" and 0 <= ci < len(opts):
            right = set(q["combo_options"][ci])
            truth = {s["label"]: (s["label"] in right) for s in q["statements"]}
        for label, ok in truth.items():
            pos = re.search(rf"{re.escape(label)}\s*[（(]\s*正\s*[）)]", expl)
            neg = re.search(rf"{re.escape(label)}\s*[（(]\s*誤\s*[）)]", expl)
            if pos and neg:
                bad(qid, f"解説で{label}に「正」と「誤」の両方がある")
            elif pos and not ok:
                bad(qid, f"解説は{label}（正）だが正答では誤")
            elif neg and ok:
                bad(qid, f"解説は{label}（誤）だが正答では正")
            elif not pos and not neg:
                warn(qid, f"解説に{label}の正誤が書かれていない")
        # 解説の中で正誤の言葉が矛盾していないか
        for m in re.finditer(r"([ａ-ｅアイウエオ])（正）正しい記述です。([^　]{0,40})", expl):
            if "間違っているのは" in m.group(2) or "誤りは" in m.group(2):
                bad(qid, f"解説の{m.group(1)}が「正しい」と言いつつ誤りを指摘している")

        # --- 同一設問の重複 ---
        if q.get("statements"):
            key = frozenset(re.sub(r"\s+", "", s["text"]) for s in q["statements"])
            by_statements[key].append(qid)

    # 設問の重複（別IDで同じ問題）
    for key, ids in by_statements.items():
        if len(ids) > 1:
            warn(ids[0], f"同じ記述の問題が重複: {ids}")

    # --- 公式PDFの正答と生成物を突き合わせる ---
    print("公式PDFの正答と再照合中…")
    from parse_official_exam import load_answers
    mismatch = checked = 0
    for fname, key in OFFICIAL_PDF_KEY.items():
        path = DATA / fname
        if not path.exists():
            continue
        answers = load_answers(key)
        for q in json.loads(path.read_text(encoding="utf-8")):
            n = int(q["id"].rsplit("_", 1)[1])
            official = answers.get(n)
            if official is None:
                continue
            checked += 1
            if q["correctIndex"] + 1 != official:
                mismatch += 1
                bad(q["id"], f"正答が公式PDFと違う（アプリ{q['correctIndex'] + 1} / 公式{official}）")
    print(f"  再照合 {checked} 問 / 不一致 {mismatch} 問\n")

    # --- 報告 ---
    print("正解番号の分布:", dict(sorted(answer_dist.items())))
    sev = Counter(s for s, _, _ in issues)
    print(f"\n{'=' * 60}\n重大 {sev['重大']} 件 / 注意 {sev['注意']} 件\n{'=' * 60}")
    by_msg = Counter(re.sub(r"[:：].*$", "", m) for s, _, m in issues if s == "重大")
    for msg, n in by_msg.most_common():
        print(f"  [重大] {msg}: {n} 件")
    by_msg_w = Counter(re.sub(r"[:：].*$", "", m) for s, _, m in issues if s == "注意")
    for msg, n in by_msg_w.most_common(12):
        print(f"  [注意] {msg}: {n} 件")

    print("\n--- 重大の詳細（先頭30件）---")
    for s, qid, m in [i for i in issues if i[0] == "重大"][:30]:
        print(f"  {qid}: {m}")

    if sev["重大"]:
        sys.exit(1)
    print("\n重大な問題は見つかりませんでした。")


if __name__ == "__main__":
    main()
