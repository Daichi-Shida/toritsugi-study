#!/usr/bin/env python3
"""dokugaku.info の過去問ページ（都道府県×年度）の生HTMLをローカルに保存する。

登録販売者試験はブロック単位で共通問題のため、問題文の重複を避けるには
「ブロックごとに1県」を選び、年度を変えて集める。保存先は
gen_kakomon_questions.py が参照する scripts/kakomon_raw/{year}_{pref}/。

使い方:
  python3 scripts/fetch_kakomon.py <pref> <year> [count]
  例) python3 scripts/fetch_kakomon.py hokkaidou r6 120

既に存在するファイルはスキップ（再開可能）。礼儀として各取得に小休止を入れる。
"""
import sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_ROOT = ROOT / "scripts" / "kakomon_raw"
BASE = "https://dokugaku.info/tourokuhanbaisya/kakomon/{pref}/{year}/{n:03d}.htm"
UA = "Mozilla/5.0 (study-app past-exam collector; contact fxdive@yahoo.co.jp)"


def fetch(pref: str, year: str, count: int = 120, delay: float = 0.5):
    out_dir = RAW_ROOT / f"{year}_{pref}"
    out_dir.mkdir(parents=True, exist_ok=True)
    ok = skip = miss = 0
    for n in range(1, count + 1):
        dest = out_dir / f"{n:03d}.html"
        if dest.exists() and dest.stat().st_size > 2000:
            skip += 1
            continue
        url = BASE.format(pref=pref, year=year, n=n)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if len(data) < 2000:
                miss += 1
            else:
                dest.write_bytes(data)
                ok += 1
        except Exception as e:
            miss += 1
            print(f"  miss {n:03d}: {e}")
        time.sleep(delay)
    print(f"[{year}_{pref}] 取得 {ok} / スキップ {skip} / 失敗 {miss} -> {out_dir}")
    return ok


if __name__ == "__main__":
    pref = sys.argv[1]
    year = sys.argv[2]
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 120
    fetch(pref, year, count)
