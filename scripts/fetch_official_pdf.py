#!/usr/bin/env python3
"""都道府県が公開している公式の試験問題PDF・正答PDFを取得する。

出典サイト（dokugaku.info）はリード文と選択肢の表が画像で、問題を原文どおりの
形では復元できない（穴埋め型などは丸ごと落ちる）。公式PDFなら設問文・各文・
選択肢の並び・正答番号がそのまま取れるので、こちらを問題データの一次資料にする。

使い方:
  python3 scripts/fetch_official_pdf.py            # SOURCES を全部取得（既存はスキップ）
保存先: scripts/official_pdf/{key}_{am|pm|ans}.pdf
"""
from __future__ import annotations

import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "scripts" / "official_pdf"
UA = "Mozilla/5.0 (study-app official past-exam collector; contact fxdive@yahoo.co.jp)"

TOKYO = "https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/"

# key -> {am, pm, ans} のURL
SOURCES: dict[str, dict[str, str]] = {
    "r3_tokyo": {"am": TOKYO + "r3mondaiam", "pm": TOKYO + "r3mondaipm", "ans": TOKYO + "r3kaitouitiran"},
    "r4_tokyo": {"am": TOKYO + "r04mondaiam", "pm": TOKYO + "r04mondaipm", "ans": TOKYO + "r4kaitou"},
    "r5_tokyo": {"am": TOKYO + "r5mondaiam", "pm": TOKYO + "r5mondaipm", "ans": TOKYO + "r5kaitou_2"},
    "r6_tokyo": {"am": TOKYO + "2025-01-10-092944-073", "pm": TOKYO + "2025-01-10-092954-123", "ans": TOKYO + "r-6kaitou"},
    "r7_tokyo": {"am": TOKYO + "2025-12-11-172931-822", "pm": TOKYO + "2025-12-11-172956-760", "ans": TOKYO + "r-7kaitou-pdf"},
}


def fetch(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 20_000:
        return False
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    if not data.startswith(b"%PDF"):
        raise RuntimeError(f"PDFではありません: {url}")
    dest.write_bytes(data)
    return True


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key, urls in SOURCES.items():
        for part, url in urls.items():
            dest = OUT_DIR / f"{key}_{part}.pdf"
            try:
                got = fetch(url, dest)
            except Exception as e:
                print(f"  失敗 {key}_{part}: {e}")
                continue
            size = dest.stat().st_size
            print(f"  {'取得' if got else 'スキップ'} {dest.name} ({size:,} bytes)")
            if got:
                time.sleep(1.0)


if __name__ == "__main__":
    main()
