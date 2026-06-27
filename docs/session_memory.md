# セッション記憶 — 登録販売者アプリ開発状況

最終更新: 2026-06-28（妻フィードバック対応セッション）

---

## 2026-06-28 セッション（妻フィードバック対応：難化＋上位キャラ＋字幕収集）

### 背景（妻の声）
- 「問題が簡単」／「ステータスがメアリー侍(Lv7)でカンスト」

### 1. 上位キャラ2体を追加（Lv上限 7→9）
- しきい値: Lv8=8000 / Lv9=12000 EXP（`src/lib/score.ts` STAGE_THRESHOLDS）
- **Lv8「豆侍」** `src/components/character/GoldenBeanSamuraiCharacter.tsx`
  - 金色に光るそら豆の侍SVG・gold系レア演出・変なセリフ（太郎次郎/うまたにえん/豆太郎 等）
- **Lv9「ねこさん」** `src/components/character/CatCharacter.tsx`
  - 可愛い子猫SVG・pink系レア演出・「にゃー」系セリフ（正解10種/不正解8種）
- 統合先: `types/index.ts`(CharacterStage 1-9), `score.ts`, `CharacterDisplay.tsx`, `ResultSheet.tsx`(LINES/HEADER, lineIndexを配列長準拠に変更), `LevelUpModal.tsx`, `StageBackground.tsx`

### 2. 難化＋問題拡充（過去問形式の難問）
- 分析: 既存332問の71%が単純4択＝消去法が効いて簡単。本試験主流は「正誤組み合わせ」
- **正誤組み合わせの難問40問（難易度3・全5章×8問）を追加** → 332→**372問**
- `src/data/questions/hard_questions.json`（id: hard_chN_NNN）/ index.ts・validate_questions.py に登録
- 生成器 `scripts/gen_hard_questions.py`: 各文の正誤＋解説の構造化データから seigo_options（正解＋撹乱4肢）と correctIndex を決定的生成。**修正時はこの.pyを編集して再実行**
- 検証 0エラー・type-check/build OK

### 3. プルメリア字幕の収集基盤強化＋収集
- `scripts/fetch_plumeria_transcripts.py` を改良: 新しい順・RequestBlockedは再試行対象・小バッチ(LIMIT)・**IPブロック検知で即停止**・進捗は docs/transcripts/logs/ に退避（標準出力は集計のみ＝トークン節約）
- 字幕 57→**80本**（残362）。YouTubeは約20数連続リクエストで `RequestBlocked`、回復に数十分以上必要 → 時間を空けた小バッチ再実行が必須
  - 再開: `LIMIT=12 python3 scripts/fetch_plumeria_transcripts.py`
- `scripts/prep_plumeria.py`: 取得字幕を章分類し1本ずつ本文を取り出す問題作成用ヘルパー（`list|stats|show <idx|id>`）。「過去問チャレンジ」「2026 Guidebook Revision」動画が難問・最新法改正の好素材
- ユーザー判断で収集は80本で一旦停止

### デプロイ
- commit `694354b`（キャラ＋難問40問）→ Vercel本番反映済（home/quiz 200確認）
- commit `b0ef4dc`（字幕収集基盤＋80本＋prepツール）
- 残課題: 字幕の続き収集（IP回復後・小バッチ）／取得済み素材から過去問形式の難問を継続追加

---

## プロジェクト概要
- 場所: `~/sandbox/toritsugi-study/`
- 技術スタック: Next.js 16 + TypeScript + Tailwind CSS + Framer Motion
- 起動方法: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && cd ~/sandbox/toritsugi-study && npm run dev`
- URL: http://localhost:3000 / スマホ: http://192.168.3.8:3000（IPは変わることあり、`ifconfig`で確認）

---

## 開発ハーネス
- `.claude/agents/planner.md` — 要件→仕様書
- `.claude/agents/generator.md` — 仕様書→実装
- `.claude/agents/evaluator.md` — 実装→品質検証

---

## 実装済み機能

### ページ
| パス | 内容 |
|---|---|
| `/` | ホーム（キャラクター・合格期待値ゲージ・統計） |
| `/quiz` | 通常学習・弱点モード・章別モード（`?chapter=章名`） |
| `/chapters` | 第1〜5章一覧・章別正答率表示 |
| `/mock-exam` | 本番模擬試験（120問・120分・合否判定） |
| `/mock-exam/result` | 採点結果・章別スコア・間違い問題レビュー |

### コアロジック
- `src/lib/srs.ts` — SM-2アルゴリズム（弱点優先出題）
- `src/lib/score.ts` — 合格期待値・経験値・キャラ成長計算
- `src/lib/storage.ts` — localStorage永続化
- `src/lib/mockExam.ts` — 模擬試験・合否判定・タイマー

---

## 問題データ

### 現在のファイル構成
| ファイル | 問題数 | 内容 |
|---|---|---|
| `src/data/questions/sample.json` | 14問 | 手動作成（参考用） |
| `src/data/questions/plumeria_based.json` | 38問 | プルメリア字幕参考・AI生成（第1回） |
| `src/data/questions/new_ch1_ch2.json` | 40問 | 第1章・第2章追加生成分 |
| `src/data/questions/new_ch3.json` | 30問 | 第3章追加生成分 |
| `src/data/questions/new_ch4.json` | 30問 | 第4章追加生成分 |
| `src/data/questions/new_ch5.json` | 34問 | 第5章追加生成分 |
| `src/data/questions/all.json` | **186問** | アプリが現在読み込むファイル（統合済み） |

### カテゴリ別内訳（2026-04-05統合後・186問）
| カテゴリ | 問題数 |
|---|---|
| 主な医薬品とその作用（第3章） | 44問 |
| 人体の働きと医薬品（第2章） | 31問 |
| 医薬品に共通する特性と基本的な知識（第1章） | 31問 |
| 薬事関係法規・制度（第4章相当） | 10問 |
| 医薬品の適正使用・安全対策（第5章） | 6問 |
| **合計** | **122問** |

### 問題品質方針
- カテゴリ名は手引き（令和7年4月）の正式名称に準拠
- **著作権対応**: 過去問・プルメリア動画は「参考にして書き直す」方式でAI生成
- 令和7年4月改訂3点を反映済み（new_ch2_ch5.jsonに含む）:
  1. 中性脂肪基準値に「空腹時」を追記
  2. 機能性表示食品の製造管理基準・事故報告（紅麹問題対応）
  3. 成分名変更: ベニポシド酸→ゲニポシド酸

---

## 字幕・過去問データ

### プルメリア字幕（`docs/transcripts/`）
| ファイル | サイズ | 動画数 |
|---|---|---|
| `ch1_transcript.txt` | 117,828文字 | 8本 |
| `ch2_transcript.txt` | 116,825文字 | 8本 |
| `ch3_transcript.txt` | 247,890文字 | 16本 |
| `ch4_transcript.txt` | 107,456文字 | 8本 |
| `ch5_transcript.txt` | 30,533文字 | 2本 |

- 取得済み合計: **42本**（全430本中）
- 残り約388本は今後も随時取得予定
- チャンネル: https://www.youtube.com/@plumeria-tohan
- 取得ツール: `youtube-transcript-api`（Pythonライブラリ、インストール済み）

### 過去問PDF（`docs/kakomon/`）
| ファイル | 内容 |
|---|---|
| `kinki_2024_1.txt` | 近畿2024前半（26,724文字） |
| `kinki_2024_2.txt` | 近畿2024後半（26,771文字） |
| `fukuoka_2024_1.txt` | 福岡2024前半（21,125文字） |

取得可能な追加PDF（URL既知、未ダウンロード）:
- 近畿2022・2023、福岡2022・2023、愛知2023・2024、北海道2022〜2024、岡山2022〜2024

---

## 残タスク

### 次回セッション冒頭（必須）
1. 第4章・第5章の問題数が少ない（各10問・6問）ので追加生成して all.json を更新
2. `npm run build` でエラーがないか確認

### 優先度高
4. 追加の過去問PDFをダウンロードして問題生成（愛知・北海道・岡山の2022〜2023年分）
5. さらにプルメリア字幕を取得（残り388本）→ 問題数拡充

### 優先度中
6. **統計画面** `/stats` の実装
   - カテゴリ別正答率グラフ
   - 学習日数カレンダー
   - 連続学習ストリーク
7. **PWA化**（manifest.json・Service Worker・オフライン対応）

### 将来対応
8. 問題データのクラウド配信（Supabase等）
9. App Store / Google Play 公開準備（Expo/Capacitorでラップ）

---

## 開発環境メモ
- Node.js: v24.14.1（nvm経由）
- Python: 3.9（システム）
- インストール済みPythonツール: yt-dlp, youtube-transcript-api, pdfplumber
- nvm パス: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`

---

## 既知のバグ修正済み（2026-04-05）

### スマホ・LAN接続でページが表示されない問題
**症状**: `http://192.168.3.8:3000` でアクセスすると背景色のみ表示・読み込み中で止まる
**原因**:
1. Next.js 16.2.2 がセキュリティ上、非localhost からの dev リソースアクセスをブロック
2. `manifest.json` が `public/` に存在しなかった（404エラー）
3. `icon-192.png` / `icon-512.png` が存在しなかった（404エラー）
4. `page.tsx` の `if (!progress) return null` がSSR状態のまま固まって見えた
**修正内容**:
- `next.config.mjs` に `allowedDevOrigins: ["192.168.3.8"]` を追加
- `public/manifest.json` を作成
- `public/icon-192.png` / `public/icon-512.png` を生成
- `page.tsx` の null return を「読み込み中...」表示に変更
**注意**: IPアドレスが変わったら `allowedDevOrigins` も更新が必要

---

## Vercelデプロイ（2026-04-06完了）

**本番URL**: https://toritsugi-study.vercel.app
- 誰でもアクセス可能（アカウント不要）
- Macの電源・Wi-Fi不要で常時アクセス可能
- Vercelアカウント: daichishida（GitHubアカウントでサインアップ）

**デプロイコマンド**（次回更新時）:
```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && cd ~/sandbox/toritsugi-study && vercel --token <新しいトークン> --yes --scope daichishida
```
※トークンは https://vercel.com/account/tokens で都度作成・使用後削除

**デプロイ時に解決した問題**:
- `.gitignore` に `.next` / `node_modules` を追加
- `eslint@8` → `^9` に更新（peer dependency競合解消）
- `package.json` に `engines: { node: ">=20.0.0" }` を追加
- gitリポジトリ初期化済み（`~/sandbox/toritsugi-study/`）

---

## キャラクター成長システム（2026-04-05 刷新）

### ステージ定義
| ステージ | 必要EXP | 絵文字/SVG | 名前 | 説明 |
|---|---|---|---|---|
| 1 | 0〜 | SVG（緑そら豆） | 豆ころ | 豆から始まる旅 |
| 2 | 200〜 | 🌱 | 芽が出てきた | 少しずつ芽が出てきた |
| 3 | 500〜 | 🌸 | 花が咲いてきた | きれいな花が咲いてきた |
| 4 | 1000〜 | 🥔 | …さといも | 合格ライン目前…なぜかさといもに |
| 5 | 2000〜 | SVG（白髪女の子） | メアリー！ | 合格安定！メアリーに変身 |

### 関連ファイル
- `src/lib/score.ts` — `STAGE_NAMES` をexport、`getStageFromExp` をexport
- `src/lib/storage.ts` — ロード時にstageからname再生成（古いlocalStorageに追従）
- `src/components/character/BeanCharacter.tsx` — 緑そら豆SVG（顔付き・丸っこい）
- `src/components/character/MaryCharacter.tsx` — 白髪青目の女の子SVG
- `src/components/character/CharacterDisplay.tsx` — ステージ別SVG/絵文字切り替え・バー色変化

### アプリタイトル
- 画面表示: 「登録販売者資格試験アプリ」
- サブタイトル: 「一緒に合格を目指そう！」
- ブラウザタブ・PWA名: 「登録販売者資格試験アプリ」
