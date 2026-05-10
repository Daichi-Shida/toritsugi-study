#!/usr/bin/env python3
"""プルメリアちゃんねるの全動画メタデータを日本語で取得し metadata.jsonl に保存"""

import json
from pathlib import Path
import yt_dlp

OUT = Path(__file__).resolve().parent.parent / "docs" / "transcripts" / "metadata.jsonl"
OUT.parent.mkdir(parents=True, exist_ok=True)

CHANNEL_URL = "https://www.youtube.com/@plumeria-tohan/videos"

opts = {
    "quiet": True,
    "extract_flat": True,
    "skip_download": True,
    "extractor_args": {"youtubetab": {"approximate_date": ["timestamp"]}},
    # 日本語UIで取得（タイトル翻訳を回避）
    "extractor_retries": 3,
    "http_headers": {"Accept-Language": "ja-JP,ja;q=0.9"},
}

print(f"取得対象: {CHANNEL_URL}")
with yt_dlp.YoutubeDL(opts) as ydl:
    info = ydl.extract_info(CHANNEL_URL, download=False)
    entries = info.get("entries", []) or []

print(f"動画数: {len(entries)}")

with OUT.open("w", encoding="utf-8") as f:
    for e in entries:
        rec = {
            "id":       e.get("id"),
            "title":    e.get("title"),
            "duration": e.get("duration"),
            "view":     e.get("view_count"),
            "url":      e.get("url"),
        }
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")

print(f"✅ {OUT}")
print(f"  {sum(1 for _ in OUT.open())} 件記録")
