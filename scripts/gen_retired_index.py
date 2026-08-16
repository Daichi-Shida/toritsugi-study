#!/usr/bin/env python3
"""出題プールから外した問題の「章・問題文」インデックスを作る。

問題を入れ替えると、出題プールから消えた問題に紐づく学習記録（localStorage）は
どの章のものか分からなくなり、章別正答率や苦手問題の集計から丸ごと抜け落ちる。
妻の達成度メーターが勝手に動かないよう、外した問題のIDと章だけを残しておき、
集計時に参照できるようにする（出題はされない）。

やること:
  1. 直前のコミット(HEAD)の index.ts が読んでいたJSONファイル群 = 「入れ替え前のプール」
  2. 作業ツリーの index.ts が読んでいるJSONファイル群 = 「入れ替え後のプール」
  3. 1にあって2にないIDを retired_index.json に追記（既存の記録は保持）

出力: src/data/questions/retired_index.json  { "問題ID": ["章名", "問題文"] }
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "src" / "data" / "questions"
INDEX_TS = "src/data/questions/index.ts"
OUT = DATA_DIR / "retired_index.json"


def imported_files(source: str) -> list[str]:
    """index.ts のimport文から読み込んでいるJSONファイル名を拾う。"""
    return re.findall(r'from\s+"\./([\w.]+\.json)"', source)


def git_show(path: str) -> str | None:
    r = subprocess.run(["git", "show", f"HEAD:{path}"], cwd=ROOT,
                       capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def load_questions(fname: str, from_head: bool) -> list[dict]:
    if from_head:
        raw = git_show(f"src/data/questions/{fname}")
        if raw is None:
            return []
        return json.loads(raw)
    path = DATA_DIR / fname
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def main() -> None:
    head_index = git_show(INDEX_TS)
    if head_index is None:
        raise SystemExit("HEAD の index.ts が読めません（git リポジトリ内で実行してください）")

    before_files = imported_files(head_index)
    after_files = imported_files((ROOT / INDEX_TS).read_text(encoding="utf-8"))

    before: dict[str, dict] = {}
    for f in before_files:
        for q in load_questions(f, from_head=True):
            before[q["id"]] = q
    after_ids = {q["id"] for f in after_files for q in load_questions(f, from_head=False)}

    retired: dict[str, list] = {}
    if OUT.exists():
        retired = json.loads(OUT.read_text(encoding="utf-8"))
    added = 0
    for qid, q in before.items():
        if qid in after_ids or qid in retired:
            continue
        retired[qid] = [q["category"], q.get("text", "")]
        added += 1

    # 出題プールに戻った問題は集計が二重にならないよう索引から外す
    revived = [qid for qid in list(retired) if qid in after_ids]
    for qid in revived:
        del retired[qid]

    OUT.write_text(json.dumps(dict(sorted(retired.items())), ensure_ascii=False, indent=1) + "\n",
                   encoding="utf-8")
    print(f"入れ替え前プール {len(before)} 問 / 入れ替え後プール {len(after_ids)} 問")
    print(f"引退インデックス: 新規 {added} 問・復活除外 {len(revived)} 問 → 計 {len(retired)} 問")
    print(f"-> {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
