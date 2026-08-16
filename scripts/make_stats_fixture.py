#!/usr/bin/env python3
"""問題入れ替えで達成度の数字が動かないことを確かめるための検証用データを作る。

「入れ替え前のプール（HEADのindex.ts）」の問題に学習記録を作り、
入れ替え前のコードで出るはずの章別正答率を先に計算しておく。
これを実ブラウザで新コードに読み込ませ、同じ数字が出れば保全できている。

出力: scripts/stats_fixture.json （.gitignore 対象・検証専用）
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "src" / "data" / "questions"
OUT = Path(__file__).resolve().parent / "stats_fixture.json"


def js_round(x: float) -> int:
    """JSの Math.round と同じ丸め（0.5は切り上げ）。Pythonの round は偶数丸めで食い違う。"""
    import math
    return math.floor(x + 0.5)


def git_show(path: str) -> str:
    return subprocess.run(["git", "show", f"HEAD:{path}"], cwd=ROOT,
                          capture_output=True, text=True, check=True).stdout


def main() -> None:
    head_index = git_show("src/data/questions/index.ts")
    before_files = re.findall(r'from\s+"\./([\w.]+\.json)"', head_index)
    before = []
    for f in before_files:
        before.extend(json.loads(git_show(f"src/data/questions/{f}")))

    # 章ごとに決まった数の問題へ、決定的なパターンで記録を付ける
    # （3問に1問は不正解、5問に1問は2回解いている、という作り）
    by_cat: dict[str, list] = {}
    for q in before:
        by_cat.setdefault(q["category"], []).append(q)

    records = {}
    for k, (cat, qs) in enumerate(sorted(by_cat.items())):
        # 章ごとに正答率が変わるようにして、章の取り違えも検出できるようにする
        wrong_every = k + 2
        for i, q in enumerate(sorted(qs, key=lambda x: x["id"])[:40]):
            attempts = 2 if i % 5 == 0 else 1
            correct = 0 if i % wrong_every == 0 else attempts
            records[q["id"]] = {
                "questionId": q["id"],
                "totalAttempts": attempts,
                "correctAttempts": correct,
                "lastAnsweredAt": "2026-08-01T00:00:00.000Z",
                "nextReviewAt": "2026-08-20T00:00:00.000Z",
                "easeFactor": 2.5,
                "intervalDays": 1,
                "repetitions": 1,
            }

    id_to_cat = {q["id"]: q["category"] for q in before}

    # 入れ替え前のコードが出していた章別の数字
    # chapters ページ: 解いた問題数と、正答率50%以上の問題の割合
    # stats ページ  : 延べ解答数に対する延べ正解数の割合
    expected = {}
    for cat in by_cat:
        attempted = correct_q = attempts = corrects = 0
        for r in records.values():
            if id_to_cat[r["questionId"]] != cat:
                continue
            attempted += 1
            if r["correctAttempts"] / r["totalAttempts"] >= 0.5:
                correct_q += 1
            attempts += r["totalAttempts"]
            corrects += r["correctAttempts"]
        expected[cat] = {
            "chaptersRate": js_round(correct_q / attempted * 100) if attempted else None,
            "chaptersAttempted": attempted,
            "statsRate": js_round(corrects / attempts * 100) if attempts else None,
        }

    progress = {
        "questionRecords": records,
        "sessions": [{
            "date": "2026-08-01T10:00:00.000Z",
            "questionsAnswered": 40,
            "correctCount": 27,
            "durationSeconds": 600,
            "categoriesStudied": list(by_cat.keys()),
        }],
        "character": {"stage": 5, "name": "メアリー！", "experience": 2400,
                      "nextLevelExp": 3000, "passExpectation": 55},
        "totalStudyDays": 12,
        "bookmarkedIds": [],
        "createdAt": "2026-05-01T00:00:00.000Z",
        "updatedAt": "2026-08-01T10:10:00.000Z",
    }

    OUT.write_text(json.dumps({"progress": progress, "expected": expected},
                              ensure_ascii=False, indent=2), encoding="utf-8")
    after_ids = set()
    after_files = re.findall(r'from\s+"\./([\w.]+\.json)"',
                             (ROOT / "src/data/questions/index.ts").read_text(encoding="utf-8"))
    for f in after_files:
        after_ids.update(q["id"] for q in json.loads((DATA_DIR / f).read_text(encoding="utf-8")))
    retired_hits = sum(1 for qid in records if qid not in after_ids)
    print(f"入れ替え前プール {len(before)} 問から記録 {len(records)} 件を生成 -> {OUT.name}")
    print(f"  うち入れ替えでプールから外れた問題の記録: {retired_hits} 件")
    for cat, e in expected.items():
        print(f"  {cat}: chapters {e['chaptersRate']}% ({e['chaptersAttempted']}問) / stats {e['statsRate']}%")


if __name__ == "__main__":
    main()
