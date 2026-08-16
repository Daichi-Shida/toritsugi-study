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

import http.cookiejar
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "scripts" / "official_pdf"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 "
      "(study-app past-exam collector; contact fxdive@yahoo.co.jp)")
OPENER = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

TOKYO = "https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/"
TOCHIGI = "https://www.pref.tochigi.lg.jp/e07/welfare/kusuri/kusuri/documents/"
MIYAGI = "https://www.pref.miyagi.jp/documents/27993/"
AICHI = "https://www.pref.aichi.jp/uploaded/attachment/"
KANSAI = "https://www.kouiki-kansai.jp/material/files/group/12/"
KOCHI = "https://www.pref.kochi.lg.jp/doc/2014110400085/file_contents/"
FUKUOKA = "https://www.pref.fukuoka.lg.jp/uploaded/life/"

# key -> {am, pm, ans} のURL
#
# 試験はブロック単位で共通問題なので、ブロックごとに「問題PDFを公開している県」を
# 1つ選べばよい。北海道は正答しか公開しておらず、同じブロックの宮城県から取る。
# 令和7年度から奈良県の試験事務が関西広域連合に移り、奈良ブロックは無くなった。
SOURCES: dict[str, dict[str, str]] = {
    # 南関東（東京都）は直近5年分
    "r3_tokyo": {"am": TOKYO + "r3mondaiam", "pm": TOKYO + "r3mondaipm", "ans": TOKYO + "r3kaitouitiran"},
    "r4_tokyo": {"am": TOKYO + "r04mondaiam", "pm": TOKYO + "r04mondaipm", "ans": TOKYO + "r4kaitou"},
    "r5_tokyo": {"am": TOKYO + "r5mondaiam", "pm": TOKYO + "r5mondaipm", "ans": TOKYO + "r5kaitou_2"},
    "r6_tokyo": {"am": TOKYO + "2025-01-10-092944-073", "pm": TOKYO + "2025-01-10-092954-123", "ans": TOKYO + "r-6kaitou"},
    "r7_tokyo": {"am": TOKYO + "2025-12-11-172931-822", "pm": TOKYO + "2025-12-11-172956-760", "ans": TOKYO + "r-7kaitou-pdf"},
    # 令和7年度・残り6ブロック
    "r7_hokkaidou": {  # 北海道・東北（宮城県が公開）
        "am": MIYAGI + "reiwananagozen.pdf", "pm": MIYAGI + "reiwananagogo.pdf",
        "ans": MIYAGI + "reiwananakaitou.pdf"},
    "r7_ibaraki": {  # 北関東・甲信越（栃木県が公開）
        "am": TOCHIGI + "20250905100804.pdf", "pm": TOCHIGI + "20250905100635.pdf",
        "ans": TOCHIGI + "20250905100534.pdf"},
    "r7_aiti": {  # 東海・北陸（愛知県）
        "am": AICHI + "586063.pdf", "pm": AICHI + "586064.pdf", "ans": AICHI + "586065.pdf"},
    "r7_kansai": {  # 関西広域連合（令和7年度から奈良県を含む）
        "am": KANSAI + "R7tourokuhannbaisyashiken_zennhan.pdf",
        "pm": KANSAI + "R7tourokuhannbaisyashiken_kouhan.pdf",
        "ans": KANSAI + "R7touhan_kaitou.pdf"},
    "r7_hirosima": {  # 中国・四国（高知県が公開）
        "am": KOCHI + "file_202511230143454_1.pdf", "pm": KOCHI + "file_20251123014353_1.pdf",
        "ans": KOCHI + "file_20251123014359_1.pdf"},
    "r7_hukuoka": {  # 九州・沖縄（福岡県）
        "am": FUKUOKA + "800899_62757175_misc.pdf", "pm": FUKUOKA + "800899_62757176_misc.pdf",
        "ans": FUKUOKA + "800899_62757174_misc.pdf"},
}


def fetch(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 20_000:
        return False
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
    })
    # 愛知県のサイトはクッキーを返さないとリダイレクトが延々と続くため、
    # クッキーを保持するopenerで取りに行く
    with OPENER.open(req, timeout=60) as r:
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
