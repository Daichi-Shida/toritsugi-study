#!/usr/bin/env python3
"""metadata.jsonl の各動画について字幕を取得し transcripts.jsonl に追記。
再開可能：すでに transcripts.jsonl にあるIDはスキップ。
"""

import json
import time
import sys
from pathlib import Path
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "docs" / "transcripts" / "metadata.jsonl"
OUT  = ROOT / "docs" / "transcripts" / "transcripts.jsonl"
ERR  = ROOT / "docs" / "transcripts" / "errors.jsonl"
OUT.parent.mkdir(parents=True, exist_ok=True)

# 既取得・エラー済みIDをロード
done_ids: set[str] = set()
if OUT.exists():
    for line in OUT.open():
        try:
            done_ids.add(json.loads(line)["id"])
        except Exception:
            pass
err_ids: set[str] = set()
if ERR.exists():
    for line in ERR.open():
        try:
            err_ids.add(json.loads(line)["id"])
        except Exception:
            pass

# 対象リスト
metas = [json.loads(l) for l in META.open()]
remaining = [m for m in metas if m["id"] not in done_ids and m["id"] not in err_ids]
print(f"全{len(metas)} / 取得済 {len(done_ids)} / エラー記録 {len(err_ids)} / 残 {len(remaining)}")

if not remaining:
    print("✅ 全件処理済み")
    sys.exit(0)

api = YouTubeTranscriptApi()

with OUT.open("a", encoding="utf-8") as fout, ERR.open("a", encoding="utf-8") as ferr:
    for i, m in enumerate(remaining, 1):
        vid   = m["id"]
        title = m.get("title", "")
        try:
            transcript = api.fetch(vid, languages=["ja", "ja-JP", "ja-Hira"])
            text = " ".join(snip.text for snip in transcript.snippets)
            rec = {
                "id":       vid,
                "title":    title,
                "duration": m.get("duration"),
                "len":      len(text),
                "n_snip":   len(transcript.snippets),
                "text":     text,
            }
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fout.flush()
            print(f"[{i}/{len(remaining)}] OK  {vid}  {len(text):>6}文字  {title[:50]}")
        except (TranscriptsDisabled, NoTranscriptFound):
            ferr.write(json.dumps({"id": vid, "reason": "no_transcript", "title": title}, ensure_ascii=False) + "\n")
            ferr.flush()
            print(f"[{i}/{len(remaining)}] SKIP {vid}  字幕なし")
        except VideoUnavailable:
            ferr.write(json.dumps({"id": vid, "reason": "unavailable", "title": title}, ensure_ascii=False) + "\n")
            ferr.flush()
            print(f"[{i}/{len(remaining)}] SKIP {vid}  動画利用不可")
        except Exception as e:
            ferr.write(json.dumps({"id": vid, "reason": f"error:{type(e).__name__}", "msg": str(e)[:200]}, ensure_ascii=False) + "\n")
            ferr.flush()
            print(f"[{i}/{len(remaining)}] ERR  {vid}  {type(e).__name__}: {str(e)[:80]}")
            # 連続エラー対策で長めスリープ
            time.sleep(3)
            continue

        # レート制限緩和
        time.sleep(0.6)

print("\n✅ 完了")
