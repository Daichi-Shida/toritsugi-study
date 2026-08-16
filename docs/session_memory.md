# セッション記憶 — 登録販売者アプリ開発状況

最終更新: 2026-08-17（問題を公式PDFの原文形式に全面移行・全体監査）

---

## 2026-08-17 セッション（公式PDF化・模擬試験の時間制限廃止・解説の口語修正・全体監査）

### この日の到達点
出題プール **1321問**・**全問が公式PDF由来で本試験そのままの形式**。
公式PDFの正答と 1291問を再照合して不一致0。監査で重大な不具合0件。

| ブロック | 取得元（公式PDF） | 問数 |
|---|---|---|
| 南関東（令和3〜7年度の5年分） | 東京都 | 593 |
| 北海道・東北 | 宮城県 | 109 |
| 北関東・甲信越 | 栃木県 | 120 |
| 東海・北陸 | 愛知県 | 118 |
| 関西広域連合 | 関西広域連合 | 120 |
| 中国・四国 | 高知県 | 118 |
| 九州・沖縄 | 福岡県 | 113 |
| 手引き令和8年4月改訂（自作） | 厚労省手引き | 30 |

章別 223 / 215 / 433 / 229 / 221。形式は原文どおり
（正誤の組合せ・正しいものの組合せ・語句の組合せ＝穴埋め・単文5択）。

### 1. 模擬試験の制限時間を廃止（妻の要望）
- 120分／30分のカウントダウンと時間切れ自動提出をやめ、ヘッダーは経過時間表示に
- `MockExamSession.timeLimitSeconds` は旧データ互換で任意項目として残置。
  制限切れのまま保存された中断セッションを再開しても自動提出されない
- 開始画面の「前回の試験を再開する」表示判定を、描画中のlocalStorage参照から
  マウント後のstateへ（ハイドレーション不整合の解消）
- 検証 `scripts/verify_mock_exam_browser.mjs`。**結果画面の確認はdevサーバでは通らない**
  （StrictModeでeffectが2回走り「終了済みは読み込まない」判定で戻る）。本番ビルドで実行すること

### 2. 出典を公式PDFへ全面移行（ユーザー指摘「過去問はそのままの形式に」）
出典サイト（dokugaku.info）はリード文と選択肢の表が画像で、設問文を定型文に
差し替え・選択肢を自前生成するしかなく、画像依存の問題は丸ごと落ちていた（1320中399問）。
公式PDFに切り替えて**形式の忠実性と取りこぼしの両方を同時に解決**。

新しいパイプライン:
```
scripts/fetch_official_pdf.py     # 公式PDF取得（URL表を保持）
scripts/parse_official_exam.py    # PDF解析（行組み・正答表）
scripts/gen_official_questions.py # 問題JSON生成（解説は出典サイトから問番号で対応付け）
```

**PDF解析の落とし穴（再発しやすい）**
| 症状 | 原因と対処 |
|---|---|
| ルビが本文に混ざる | ルビ6.0pt／本文11pt。**小さい「ひらがな」だけ**落とす（下付き数字6.5ptは残す） |
| `(cid:42)` などの文字化け | 令和3・4年度は半角フォントに文字コード表が無い。**chr(cid+29)** でASCIIに復元 |
| 左右の段がつながる | 令和4年度は1枚に2ページ分。**紙幅で列に分割**して別ページ扱い＋重複は行数最大を採用 |
| 表の列が潰れる | 文字間隔が空いたら空白を挿入して列区切りを残す |
| 章見出しが読めない | 令和3・4年度は太字を二重打ち（`薬薬事事にに…`）→ `s[0::2]==s[1::2]` で復元 |
| 表紙判定の誤爆 | 「注意事項」は本文にも出る。「解答例/マークの仕方/指示があるまで開いて」で判定 |
| 午後の問番号が1に戻る | 宮城・栃木・愛知・関西・高知は科目ごとに振り直し。午前と衝突したら**+60**して通し番号化 |
| 正答表の形式差 | 3形式に対応（A:「問１ 3 問３１ 1」交互／B:見出し行＋値行／C:番号のみ交互＝東京） |
| `【問１】` 形式 | 栃木県。問番号の正規表現を括弧付きにも対応 |
| ラベルが `ア〜オ` | 福岡県。`LAB_FAMILIES` で ａ〜ｅ／ア〜オ を系統別に順序判定 |
| 左余白の縦書き章名が混ざる | 福岡県。**行の先頭x座標の最頻値＝本文の左端**とし、外側の文字を落とす（`_drop_left_margin`・福岡のみ・落としすぎたら元に戻す安全弁） |

**やってはいけないこと**: `gen_kakomon_questions.py` は公式PDF版と同じファイル名を
出力するため、実行すると原文形式のJSONを上書きして壊す（実際に1289→951問に壊した）。
全ブロックが公式PDF化された今、SOURCESは空。解説整形処理だけを流用している。

### 3. 出題形式の追加とUI対応
- 新形式 **`word_combination`（語句の組合せ＝穴埋め）** を types / QuizCard / mock-exam に追加
- 単文選択の表示を A〜D → 本試験どおりの **1〜5**
- **選択肢のシャッフルを廃止**（`src/lib/shuffle.ts` 削除）。正解の番号を原文と一致させるため

### 4. 解説の口語を「削除」から「書き換え」へ
- `_COLLOQUIAL_REWRITES`（んなーこたない→そのようなことはありません／とか→など／
  〜んです→〜のです／ホント→本当 等）。削除は情報のない雑談だけに限定
- **書き換えは「」の外側だけ**（`_rewrite_outside_quotes`）。手引き・条文の引用は原文のまま
- **解説が丸ごと空だった99問**の原因＝単文5択・穴埋めは出典が選択肢ごとではなく
  「解説」節にまとめ書き。「解説」節を使うようにして49問に減少
- 結果: 口語ヒット 1321問中0件

### 5. 学習記録（妻の達成度）の保全
問題を入れ替えるとプールから消えた問題の記録は章が引けず、章別正答率から丸ごと落ちる。
- `scripts/gen_retired_index.py` → `retired_index.json` に外した問題の章・問題文を退避
- `src/lib/questionIndex.ts` が ID→章 を現行プール優先・無ければ引退索引から解決
- chapters / stats の章別正答率を**プール走査ではなく学習記録走査**に変更
- `lib/score.ts` の `PASS_EXPECTATION_TARGET`（合格期待値の分母を固定。プール増で下がるのを防止）
- IDは問番号ベース（kk_r7t_001）なので、公式PDFに入れ替えても記録はそのまま紐づく

### 6. 全体監査
`scripts/audit_questions.py` を追加。validate（形の妥当性）とは別に、解いて困る不具合を見る。
- 選択肢の重複（正解が2つ）／正解番号の範囲／選択肢数
- 解説の（正）（誤）と正答の食い違い（正誤組合せ・正しいものの組合せ両方）
- 本文が空・cid文字化け・括弧不整合・別設問の混入・途中で切れた記述
- 別IDで同じ設問が重複していないか
- **公式PDFから正答を読み直しての再照合**（生成物ではなくPDFが根拠）

結果: **重大0件**／再照合1291問で不一致0。注意8件は誤検出（列挙型の短い成分名、原文の`ⅰ）ⅱ）`）。
自作の手引き30問は機械照合できないため、手引き本文で**15項目を裏取り**（全項目OK）。

### 7. 見つけて直した誤答（通算3件・いずれも従来データ側の誤り）
| ID | 内容 |
|---|---|
| kk_r7t_044 | 毒薬の譲受文書に「性別」は不要（旧データは正としていた） |
| kk_r4t_094 | 成分一覧にビタミンB12もDも無く正解はb・c |
| kk_r7f_102 | 販売従事登録は二以上の都道府県では受けられない |

### 8. 手引き令和8年4月改訂への対応
- 厚労省PDFの令和7年4月版と令和8年4月版を機械比較（`extract_tebiki.py` / `tebiki_change_report.py`）
  → `docs/tebiki/changes.md`。**版名・章名・ノンブルの柱を先に落とさないと全ページが差分に化ける**
- 改訂の中心は第4章：要指導医薬品の「対面」→**「対面等」**、**特定要指導医薬品**新設、
  **特定販売の対象に要指導医薬品（特定要指導医薬品を除く）追加**、
  「濫用等のおそれのある医薬品」→**「指定濫用防止医薬品」**（成分6→8）
- 新規30問を `gen_r8_tebiki_questions.py` で生成。改訂で正誤が逆転する過去問11問を EXCLUDE_IDS で除外
- **令和7年4月から奈良県の試験事務が関西広域連合に移管＝奈良ブロックは消滅**（令和7年度は7ブロック）

### 検証コマンド一覧
```
python3 scripts/fetch_official_pdf.py       # 公式PDF取得
python3 scripts/gen_official_questions.py   # 問題JSON生成（通常はこれだけ）
python3 scripts/gen_r8_tebiki_questions.py  # 手引き改訂の自作問題
python3 scripts/gen_retired_index.py        # 引退インデックス更新
python3 scripts/validate_questions.py       # 形の妥当性
python3 scripts/audit_questions.py          # 全体監査（正答の再照合を含む）
python3 scripts/verify_official_answers.py  # 従来データとの相互照合
python3 scripts/make_stats_fixture.py       # 学習記録の検証データ生成
node scripts/verify_stats_browser.mjs [URL]      # 達成度の保全を実ブラウザで確認
node scripts/verify_mock_exam_browser.mjs [URL]  # 模擬試験（本番ビルドに対して）
```

### 主なコミット
`4ad2660` 問題入れ替え → `edcf202` 制限時間廃止 → `c3ea78e` 首都圏を公式PDF化 →
`4f68f26` 6ブロックを公式PDF化 → `52e2af9` 解説の口語修正 → `d58e0b9` 監査追加 →
`1983562` 福岡を公式PDF化（全ブロック完了）

### 残タスク
1. 解説は出典サイト由来のまま。**有料公開するなら手引き準拠で自作へ書き換えが必要**
2. 解説が判定語だけの49問（出典側に実質的な説明がないもの）
3. 東京R4の問47・48は公式PDFに本文が無い（図版）ため未収録
4. 穴埋め1問（kk_r7t_095）で本文が設問文に吸収されている（表示上は問題なし）

---

## 2026-08-16 セッション（問題入れ替え：令和7年度＋手引き改訂対応・達成度は保全）

### 依頼
- 問題を入れ替える。ただし妻が現行アプリで達成度を進めているので、**学習状況の章別正答率などの数字は変えない**こと
- 令和7年度の全ブロック過去問を取得して入れ替える
- 首都圏ブロック（南関東＝東京都）は過去5年分を取得する
- 手引きの改正箇所を反映した問題を作り、今のものと入れ替える

### 1. 出題プール：744問 → 951問（全問が正誤組み合わせ形式）
| 収録 | 内訳 |
|---|---|
| 首都圏（東京都・南関東）5年分 | R7:97 / R6:92 / R5:103 / R4:92 / R3:73 |
| 令和7年度 全ブロック | 北海道83・茨城65・愛知64・関西広域連合93・広島78・福岡81 |
| 手引き令和8年4月改訂 | 30問（新規作成） |

- 章別: 第1章172 / 第2章170 / 第3章324 / 第4章159 / 第5章126（模試の必要数20/20/40/20/20を全章で充足）
- 取得元は従来どおり dokugaku.info。`python3 scripts/fetch_kakomon.py <pref> <year> 120` で再取得可
- **奈良県ブロックのみ令和7年度が出典未掲載**（サイトはr6まで）。8ブロック中7ブロックを収録
- 中国・四国は1ブロック（広島＝香川と同一問題であることを確認済み）
- 外したもの: 令和6年度の北海道/茨城/愛知/関西/福岡、`r8_revision_questions.json`、`r8_deep_questions.json`

### 2. 手引き（令和8年4月一部改訂）の反映
- 厚労省PDFの令和7年4月版と令和8年4月版を機械比較して改訂箇所を特定
  - `scripts/extract_tebiki.py`（PDF→テキスト・文単位差分）
  - `scripts/tebiki_change_report.py` → `docs/tebiki/changes.md`（章ごとの変更点レポート）
  - ページの柱（版名・章名・ノンブル）を先に落とさないと差分がノイズだらけになる
- 改訂の中心は第4章。要指導医薬品の「対面」→「**対面等**」（リアルタイム通信を含む）、
  **特定要指導医薬品**の新設、**特定販売**の対象に要指導医薬品（特定要指導医薬品を除く）が追加、
  「濫用等のおそれのある医薬品」→「**指定濫用防止医薬品**」（成分6→8・数量/年齢/表示/陳列/手順書）
- 新規30問を `scripts/gen_r8_tebiki_questions.py` → `r8_tebiki_questions.json` に生成（第1章4・第3章2・第4章20・第5章4）
- **改訂で古くなった過去問8問をEXCLUDE_IDSで除外**（正誤が逆転する/旧用語前提のもの）
  - 特定販売に要指導医薬品が入ったことで答えが反転: kk_r7h_094 / kk_r6t_055
  - 「対面により」を正とする設問: kk_r6t_052 / kk_r3t_054 / kk_r7a_082
  - 旧「濫用等のおそれ」枠組み: kk_r7h_096 / kk_r7a_095 / kk_r7f_116（＋既存のkk_r6t_057/kk_r4t_055）

### 3. 達成度の数字を入れ替えで動かさない仕組み（最重要）
問題を入れ替えると、プールから消えた問題の学習記録は章が分からなくなり、
章別正答率・苦手問題から丸ごと抜け落ちる（＝妻の数字が勝手に下がる）。対策:
- `scripts/gen_retired_index.py` … HEADのindex.tsが読んでいた問題のうち、
  新プールに無いIDの「章名・問題文」を `src/data/questions/retired_index.json` に退避（**457問**）
- `src/lib/questionIndex.ts` … ID→章/問題文を、現行プール優先・無ければ引退索引から引く
- `chapters/page.tsx` `stats/page.tsx` … 章別正答率を**プール走査ではなく学習記録走査**に変更
  （カバー率だけは現行プールに対する進み具合として別計算）
- 苦手TOP10も引退問題を消さずに表示
- `lib/score.ts` に `PASS_EXPECTATION_TARGET = 744` を追加。合格期待値の分母に
  `ALL_QUESTIONS.length` を使っていたため、プールが増えると期待値が下がる問題を止めた

### 4. 検証
- `python3 scripts/validate_questions.py` … 951問・**0エラー0警告**
- 既存287問の**正答キー・問題文・章は一切変化なし**（解説の文章のみ33問改善）／消えた457問は全て引退索引に登録済み
- `npx tsc --noEmit` / `npm run build` OK
- **実ブラウザ検証** `node scripts/verify_stats_browser.mjs`（Playwrightは~/sandbox/yosoku-market のものを借用）
  - 入れ替え前の学習記録200件（うち37件は入れ替えで消える問題）をlocalStorageに流し込み、
    /stats と /chapters の章別正答率・累計解答・通算正答率が**入れ替え前の期待値と完全一致**することを確認
  - 主要5ページ200・pageerror 0件
  - 検証データは `python3 scripts/make_stats_fixture.py` で再生成（JSの Math.round は半上げ、Pythonのroundは偶数丸めで食い違う点に注意）

### 5. 解説の口調
新ブロック分に出典サイトの口語が残っていたため `_DROP_SUBSTR` を追加
（そらそー／突っ込／ムズカシ／国語の問題／ですよね／試験に出／当サイト 等）。
921問中の口調ヒットは数問レベルまで低下。全文が判定語だけになる問題が3問だけ出るが、
出典側に実質的な解説が無いもので正誤には影響しない。

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
