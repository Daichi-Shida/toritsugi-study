#!/usr/bin/env python3
"""metadata.jsonl の各動画について字幕を取得し transcripts.jsonl に追記。

特徴:
- 新しい順（metadata.jsonl は新しい順で記録されている）に処理する
- 再開可能：すでに取得済みのIDはスキップ
- RequestBlocked（IPブロック）は「再試行対象」として errors から除外して回す
  no_transcript / unavailable は恒久エラーとして以後スキップ
- 小バッチ実行：環境変数 LIMIT（既定12）件だけ取得して終了
- ブロック検知で即停止（連続リクエストでさらに弾かれるのを防ぐ）
- 進捗は logs/fetch_*.log に退避し、標準出力には集計のみ表示（トークン節約）

使い方:
  LIMIT=12 python3 scripts/fetch_plumeria_transcripts.py
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    RequestBlocked,
    IpBlocked,
)

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "docs" / "transcripts" / "metadata.jsonl"
OUT = ROOT / "docs" / "transcripts" / "transcripts.jsonl"
ERR = ROOT / "docs" / "transcripts" / "errors.jsonl"
LOGDIR = ROOT / "docs" / "transcripts" / "logs"
LOGDIR.mkdir(parents=True, exist_ok=True)

LIMIT = int(os.environ.get("LIMIT", "12"))
SLEEP = float(os.environ.get("SLEEP", "1.5"))  # リクエスト間隔（長めでブロック回避）

# 恒久エラー扱いの理由（以後スキップ）
PERMANENT = {"no_transcript", "unavailable"}

# 既取得IDをロード
done_ids: set[str] = set()
if OUT.exists():
    for line in OUT.open():
        try:
            done_ids.add(json.loads(line)["id"])
        except Exception:
            pass

# エラー記録をロード：恒久エラーのみスキップ集合に。RequestBlocked等は再試行対象。
perm_err_ids: set[str] = set()
if ERR.exists():
    kept_lines = []
    for line in ERR.open():
        try:
            rec = json.loads(line)
        except Exception:
            continue
        reason = rec.get("reason", "")
        if reason in PERMANENT:
            perm_err_ids.add(rec["id"])
            kept_lines.append(line.rstrip("\n"))
        # 再試行対象（RequestBlocked等）は errors.jsonl から落とす（再取得を試みるため）
    # 恒久エラーだけ残して errors.jsonl を書き直す
    ERR.write_text("\n".join(kept_lines) + ("\n" if kept_lines else ""), encoding="utf-8")

metas = [json.loads(l) for l in META.open()]
remaining = [m for m in metas if m["id"] not in done_ids and m["id"] not in perm_err_ids]

logname = LOGDIR / f"fetch_{datetime.now():%Y%m%d_%H%M%S}.log"
log = logname.open("w", encoding="utf-8")


def logline(s: str):
    log.write(s + "\n")
    log.flush()


logline(f"全{len(metas)} / 取得済 {len(done_ids)} / 恒久エラー {len(perm_err_ids)} / 残 {len(remaining)} / LIMIT={LIMIT}")

if not remaining:
    print(f"✅ 全件処理済み（取得済 {len(done_ids)}）")
    log.close()
    sys.exit(0)

api = YouTubeTranscriptApi()

ok = 0
perm = 0
blocked = False
processed = 0

with OUT.open("a", encoding="utf-8") as fout, ERR.open("a", encoding="utf-8") as ferr:
    for m in remaining:
        if processed >= LIMIT:
            break
        vid = m["id"]
        title = m.get("title", "")
        processed += 1
        try:
            transcript = api.fetch(vid, languages=["ja", "ja-JP", "ja-Hira"])
            text = " ".join(snip.text for snip in transcript.snippets)
            rec = {
                "id": vid,
                "title": title,
                "duration": m.get("duration"),
                "len": len(text),
                "n_snip": len(transcript.snippets),
                "text": text,
            }
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fout.flush()
            ok += 1
            logline(f"OK   {vid}  {len(text):>6}文字  {title[:60]}")
        except (TranscriptsDisabled, NoTranscriptFound):
            ferr.write(json.dumps({"id": vid, "reason": "no_transcript", "title": title}, ensure_ascii=False) + "\n")
            ferr.flush()
            perm += 1
            logline(f"SKIP {vid}  字幕なし  {title[:60]}")
        except VideoUnavailable:
            ferr.write(json.dumps({"id": vid, "reason": "unavailable", "title": title}, ensure_ascii=False) + "\n")
            ferr.flush()
            perm += 1
            logline(f"SKIP {vid}  動画利用不可")
        except (RequestBlocked, IpBlocked) as e:
            # IPブロック：これ以上続けても弾かれるので即停止（このIDは再試行対象のまま残す）
            blocked = True
            logline(f"BLOCKED {vid}  {type(e).__name__} — 停止")
            processed -= 1  # 取得できていないのでカウントから戻す
            break
        except Exception as e:
            ferr.write(json.dumps({"id": vid, "reason": f"error:{type(e).__name__}", "msg": str(e)[:200], "title": title}, ensure_ascii=False) + "\n")
            ferr.flush()
            logline(f"ERR  {vid}  {type(e).__name__}: {str(e)[:80]}")
            time.sleep(3)
            continue
        time.sleep(SLEEP)

log.close()

total_done = len(done_ids) + ok
status = "⛔ IPブロックで停止" if blocked else "✅ バッチ完了"
print(f"{status}: 今回OK {ok} / 恒久エラー {perm} / 累計取得 {total_done}/{len(metas)} / 残 {len(remaining) - ok - perm}")
print(f"ログ: {logname.relative_to(ROOT)}")
if blocked:
    print("→ しばらく時間を置いて再実行してください（IP回復待ち）。")
