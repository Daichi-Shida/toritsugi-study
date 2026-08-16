#!/usr/bin/env python3
"""dokugaku.info の過去問ページ（南関東＝東京都）を解析し、
本試験形式（正誤組み合わせ）の問題JSONを生成する。

各設問ページから ア〜エ（原文は a〜d）の各文・正誤・解説を抽出し、
公式正答に一致する正誤ベクトルを正解肢として、決定的に撹乱4肢を生成する。
画像内にしか情報がない穴埋め・語句補充型は自動でスキップする。
"""
import re, html, json, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_ROOT = ROOT / "scripts" / "kakomon_raw"

# (生データディレクトリ, 出力ファイル名, 年, ID接頭辞, 都道府県ラベル)
# 登録販売者試験はブロック単位で共通問題のため、問題文の重複を避けるには
# 「ブロックごとに1県」を選び年度を変えて集める。SOURCES は先頭が優先され、
# 後方ソースの重複問題（同一設問文）は生成時に除外される（東京＝既存を温存）。
# (生データDir, 出力ファイル, 年, ID接頭辞, ラベル)
SOURCES = [
    # 首都圏（南関東ブロック＝東京都）の直近5年。妻の学習記録が付いている
    # 既存IDを壊さないよう、従来からのソースを先頭に置いて重複除外の優先権を持たせる。
    ("r6_tokyo", "kakomon_r6_tokyo.json", 2024, "kk_r6t", "東京都（南関東）"),
    ("r5_tokyo", "kakomon_r5_tokyo.json", 2023, "kk_r5t", "東京都（南関東）"),
    ("r4_tokyo", "kakomon_r4_tokyo.json", 2022, "kk_r4t", "東京都（南関東）"),
    ("r7_toukyou", "kakomon_r7_tokyo.json", 2025, "kk_r7t", "東京都（南関東）"),
    ("r3_toukyou", "kakomon_r3_tokyo.json", 2021, "kk_r3t", "東京都（南関東）"),
    # 令和7年度・全ブロック（ブロックごとに1県）。奈良県は出典未掲載のため未収録。
    ("r7_hokkaidou", "kakomon_r7_hokkaidou.json", 2025, "kk_r7h", "北海道（北海道・東北）"),
    ("r7_ibaraki", "kakomon_r7_ibaraki.json", 2025, "kk_r7ib", "茨城県（北関東・甲信越）"),
    ("r7_aiti", "kakomon_r7_aiti.json", 2025, "kk_r7a", "愛知県（東海・北陸）"),
    ("r7_kansaikouikirengou", "kakomon_r7_kansai.json", 2025, "kk_r7k", "関西広域連合"),
    ("r7_hirosima", "kakomon_r7_hirosima.json", 2025, "kk_r7c", "広島県（中国・四国）"),
    ("r7_hukuoka", "kakomon_r7_hukuoka.json", 2025, "kk_r7f", "福岡県（九州・沖縄）"),
]

C1 = "医薬品に共通する特性と基本的な知識"
C2 = "人体の働きと医薬品"
C3 = "主な医薬品とその作用"
C4 = "薬事関係法規・制度"
C5 = "医薬品の適正使用・安全対策"


def block_chapter_map(raw_dir: Path) -> dict:
    """ブロックごとの章構成（出題順）をページの目次(mokuzi)リンクから読み取り、
    通し問番号→章名 の辞書を返す。ブロックにより章の並び順が異なる
    （南関東=1,2,4,3,5／北海道=1,3,2,4,5 等）ため位置固定では誤分類になる。
    章のサイズは全国共通（主な医薬品=40問・他=20問）。"""
    page = None
    for n in range(1, 121):
        f = raw_dir / f"{n:03d}.html"
        if f.exists() and f.stat().st_size > 2000:
            page = f
            break
    if page is None:
        return {}
    t = page.read_text(encoding="utf-8", errors="replace")
    secs = []
    for m in re.finditer(r'mokuzi-(\d)\.htm"[^>]*>([^<]+)</a>', t):
        k = int(m.group(1))
        if not any(s[0] == k for s in secs):
            secs.append((k, m.group(2)))
    secs.sort()
    order = []
    for _, txt in secs:
        if "主な医薬品" in txt:
            order.append((C3, 40))
        elif "人体" in txt:
            order.append((C2, 20))
        elif "法規" in txt or "薬事" in txt:
            order.append((C4, 20))
        elif "適正使用" in txt or "安全対策" in txt:
            order.append((C5, 20))
        else:
            order.append((C1, 20))
    mp, pos = {}, 1
    for c, size in order:
        for _ in range(size):
            mp[pos] = c
            pos += 1
    return mp

# 選択肢ラベルは県により a/b/c/d 形式と ア/イ/ウ/エ 形式の2通りがある。
# 出力は常に日本語ラベルへ正規化する（ア〜オはそのまま）。
LABEL_MAP = {"a": "ア", "b": "イ", "c": "ウ", "d": "エ", "e": "オ",
             "ア": "ア", "イ": "イ", "ウ": "ウ", "エ": "エ", "オ": "オ"}
LABEL_ORDER = ["a", "b", "c", "d", "e", "ア", "イ", "ウ", "エ", "オ"]

# 手動で書き起こした解説本文（判定語「正しい/誤った記述です。」の“後ろ”に続く説明）。
# 出典解説が画面表示のリスト（掲示事項一覧など）や他選択肢を「先の〜」と参照しており、
# 抽出後に文脈が失われる設問について、正誤（公式答え）に沿って学習用に書き直したもの。
MANUAL_REASONS = {
    # 店舗販売業の掲示事項
    "kk_r6t_054": {
        "ア": "「個人情報の適正な取扱いを確保するための措置」は、「要指導医薬品及び一般用医薬品の販売制度に関する事項」として掲示が義務付けられています。",
        "イ": "「情報提供及び指導を行う場所」は、法令で掲示が義務付けられた事項には含まれていません。",
        "ウ": "「医薬品による健康被害の救済制度に関する解説」は、「要指導医薬品及び一般用医薬品の販売制度に関する事項」として掲示が義務付けられています。",
        "エ": "掲示が求められるのは勤務する薬剤師・登録販売者の氏名及び担当業務であり、薬剤師名簿登録番号や販売従事登録番号の掲示までは義務付けられていません。",
    },
    "kk_r5t_054": {
        "ア": "「情報提供及び指導を行う場所」は、法令で掲示が義務付けられた事項には含まれていません。",
        "イ": "「取り扱う要指導医薬品及び一般用医薬品の区分」は、「薬局又は店舗の管理及び運営に関する事項」として掲示が義務付けられています。",
        "ウ": "「個人情報の適正な取扱いを確保するための措置」は、「要指導医薬品及び一般用医薬品の販売制度に関する事項」として掲示が義務付けられています。",
        "エ": "掲示が求められるのは勤務する登録販売者の氏名及び担当業務であり、販売従事登録番号の掲示までは義務付けられていません。",
    },
    "kk_r4t_053": {
        "ア": "「要指導医薬品や第一類・第二類・第三類医薬品の定義及びこれらに関する解説」は、「要指導医薬品及び一般用医薬品の販売制度に関する事項」として掲示が義務付けられています。",
        "イ": "「個人情報の適正な取扱いを確保するための措置」は、「要指導医薬品及び一般用医薬品の販売制度に関する事項」として掲示が義務付けられています。",
        "ウ": "掲示が求められるのは勤務する薬剤師・登録販売者の氏名及び担当業務であり、免許番号や販売従事登録番号の掲示までは義務付けられていません。",
        "エ": "掲示は当該店舗に関する事項が対象であり、許可を受けている全ての店舗の名称・所在地を掲示する義務はありません。",
    },
    # 法定表示事項
    "kk_r4t_045": {
        "ア": "日本薬局方に収載されている医薬品には、「日本薬局方」の文字等の記載が法定表示事項として求められます。",
        "イ": "「配置」の文字という法定表示事項は定められていません。",
        "エ": "指定第二類医薬品には、枠の中に「２」の数字を記載することが法定表示事項として定められています。",
    },
    # 医薬品副作用被害救済制度
    "kk_r5t_118": {
        "ア": "製品不良など、製薬企業に損害賠償責任がある場合は、救済制度の対象から除外されています。",
        "イ": "救済制度の対象外となるのは「殺菌消毒剤（人体に直接使用するものを除く）」です。本問は人体に直接使用する殺菌消毒剤なので、救済制度の対象となります。",
        "ウ": "一般用医薬品による副作用被害の救済給付の請求には、医師の診断書や医療費を証明する受診証明書のほか、その医薬品を販売した薬局開設者・販売業者等が作成する販売証明書などが必要です。",
        "エ": "手引きには「医薬品の不適正な使用による健康被害については、救済給付の対象とならない」とあります。添付文書等の用法・用量、使用上の注意に従った使用が救済の基本要件です。",
    },
    # 医薬品の定義
    "kk_r4t_042": {
        "ア": "動物の疾病の治療に使用される医薬品（動物用医薬品）も、医薬品医療機器等法の規制対象です。",
        "イ": "医薬品には、検査薬や殺虫剤、器具用消毒薬のように、人の身体に直接使用されないものもあります。",
        "ウ": "薬局や医薬品の販売業では、不正表示医薬品を販売の目的で陳列してはなりません。",
        "エ": "「やせ薬」を標榜した無承認無許可医薬品も、医薬品医療機器等法第２条第１項に定義する医薬品に含まれ、同法の規制対象となります。",
    },
    # 滋養強壮保健薬（出典解説のエは公式の正誤と食い違うため書き直し）
    "kk_r4t_094": {
        "エ": "「虚弱体質、妊娠・授乳期の骨歯の脆弱予防」は、ビタミンＤ（カルシフェロール等）の効能・効果として正しい記述です。",
    },
    # 生物由来製品
    "kk_r4t_043": {
        "イ": "生物由来製品は、医薬品、医薬部外品、化粧品又は医療機器のうちから指定されます（再生医療等製品は含まれません）。",
        "ウ": "生物由来製品は、保健衛生上特別の注意を要するものとして、厚生労働大臣が薬事・食品衛生審議会の意見を聴いて指定します。",
    },
    # 医薬部外品・化粧品
    "kk_r5t_047": {
        "ア": "誤りは「品目ごとに許可」の部分です。医薬部外品は品目ごとの「承認」が必要です（製造販売業を営むには別途「許可」も要ります）。",
        "イ": "医薬部外品の販売に許可は必要なく、コンビニやスーパーなどでも販売できます。",
        "ウ": "化粧品には、そうした文字表示の記載義務はありません。",
    },
}

# 手引き令和8年4月改訂（改正薬機法）で内容が古くなり、現行では誤答を招く過去問を除外する。
# 過去問はいずれも出題時点の手引きに基づくため、改正で「公式の正誤が逆転した」ものや
# 「旧制度の用語・枠組みを前提にしたもの」はそのまま出すと誤って覚えてしまう。
# 現行ルールは r8_tebiki 問題群（scripts/gen_r8_tebiki_questions.py）でカバーする。
EXCLUDE_IDS = {
    # 「濫用等のおそれのある医薬品」→「指定濫用防止医薬品」。確認事項も
    # 「若年者」から「18歳未満」へ変わり、成分も6→8に拡大した。
    "kk_r6t_057",  # 販売時の確認事項（旧枠組み）
    "kk_r4t_055",  # 販売時の確認事項（旧枠組み）
    "kk_r7h_096",  # 販売時の確認事項（旧枠組み・若年者）
    "kk_r7a_095",  # 販売時の確認事項（旧枠組み・若年者）
    "kk_r7f_116",  # 対象成分と確認事項（旧枠組み）
    # 特定販売の対象に「要指導医薬品（特定要指導医薬品を除く。）」が加わり、
    # 旧「要指導医薬品は特定販売できない」を前提とした設問は正誤が逆転した。
    "kk_r7h_094",  # ア「特定販売により要指導医薬品を販売できる」＝旧誤・新正
    "kk_r6t_055",  # ア 特定販売の定義に要指導医薬品を含むか＝旧誤・新正
    # 要指導医薬品の情報提供・指導は「対面」から「対面等」（リアルタイム通信を含む）へ。
    "kk_r6t_052",  # ア「対面により」を正とする設問
    "kk_r3t_054",  # ア「対面により」を正とする設問
    "kk_r7a_082",  # ア「対面による情報提供が必要」を正とする設問
}


def clean_text(fn: Path) -> str:
    raw = fn.read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<script.*?</script>", "", raw, flags=re.S)
    t = re.sub(r"<style.*?</style>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "\n", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t　]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t


def norm(s: str) -> str:
    s = re.sub(r"\s+", "", s)
    return s.strip()


def join_text(s: str) -> str:
    """改行由来の空白を畳みつつ、ラテン語（学名・GCP等）の語間空白は保持する。

    旧実装は全空白を除去していたため『Good Clinical Practice』が
    『GoodClinicalPractice』に、学名『Saposhnikovia divaricata』が
    連結して潰れていた。ここではASCII英数字に挟まれた空白のみ残す。
    """
    s = re.sub(r"\s+", " ", s).strip()
    chars = list(s)
    out = []
    for i, ch in enumerate(chars):
        if ch == " ":
            prev = chars[i - 1] if i > 0 else ""
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if re.match(r"[A-Za-z0-9]", prev) and re.match(r"[A-Za-z0-9]", nxt):
                out.append(" ")
            # それ以外（日本語間の折り返し空白）は除去
        else:
            out.append(ch)
    return "".join(out)


# --- 解説文の整形 -----------------------------------------------------------
# 出典（dokugaku.info）の解説は口語・受験メタ・自サイト参照が混ざるため、
# 事実（手引き引用・誤りの指摘・正しい記述）だけを残し、真面目な文体に整える。

# この語を含む文はまるごと削除する（口語スラング・受験雑談・自サイト誘導）。
_DROP_SUBSTR = (
    "んなーこた", "ずっこけ", "配偶者", "小難し", "ってな", "もんね", "ですもん",
    "ウンヌン", "なりふり", "常識的", "憶え方", "語呂", "他県", "どの県", "なぜか",
    "的な出題", "超絶", "ド定番", "油断", "そのとおりの記述", "こういうとアレ",
    "知らんかった", "難しく考えないで", "テキスト", "過去問", "一読",
    "ガチ", "解説のしようがありません", "青魚", "ずばり",
    # 追加：受験雑談・砕けた比喩・実質情報のない口語
    "おなじみ", "昔から", "よく出", "そっくり", "お手持ち", "イメージ",
    "ざっくり", "甘く見", "目を通", "方がいい", "いいや", "たりします",
    "全体的に", "まんま", "ものでした", "でしたね", "ダメ",
    "カンタン", "？？？", "ザル", "まずいです", "絡めて", "かと思います",
    "定番", "そういうセンター", "正しいアルファベット", "当たってください",
    "意識して", "となった人", "というようなもの", "わけですね",
    # 追加：常に学習助言・自サイト誘導となる語（引用文の外側にしか現れない）
    "押えて", "押さえて", "チェック", "参考にして", "ブログ", "繋がり",
    "おきたい", "損はありません", "つーか", "ちょっとした", "わざわざ",
    "とかで", "くらいに憶", "憶えるといい", "覚えるといい", "参考：",
    "先見た", "先に見た", "こんな", "問題とか",
    # 追加：受験頻度メタ（「試験に出ます」系）・砕けた口語
    "そこそこ", "マイナー", "何でも出", "でも出ます", "まず出ます",
    "すべて出ます", "ふつうに出", "全国的に", "正面から出", "出ると言",
    "繰り返しますが", "太文字", "感覚的に", "理屈を追う", "意外に",
    "いいじゃん", "そうすっと", "いきなり", "出るです", "今後も出る",
    # 追加：出題頻度メタ・章跨ぎの自己参照・曖昧な口語
    "こういう記述", "出るようになって", "基本知識」で",
    "変えられそう", "作って売った", "把握するといい", "突っ込ま",
    # 追加：出題メタ・砕けた助言/断定（新ブロックで多い）
    "からの出題", "出題です", "ひっかけ", "くらいです", "問われた",
    "無視して", "怪しい", "間違ってはいけない", "間違えてはいけない",
    "難問", "ちゃいます", "しちゃう", "なんです", "でいいです",
    "ていいです", "といいです", "ばいいです", "たほうがいい",
    "ておけばいい", "ていればいい", "すればいい", "出るようにな",
    "出題実績", "近年になって", "意味ない", "仕方ない", "しかたない",
    "復習まで", "言っても",
    # 追加（令和7年度・新ブロック分で残っていた口語・受験メタ）
    "そらそー", "突っ込", "ムズカシ", "押さえまし", "押えまし", "国語の問題",
    "しろよ", "お終い", "おしまい",
    "ですよね", "でしょうね", "試験に出", "当サイト", "わたし", "ドンドコ",
    "読んでおいて", "いるんです", "ないんです", "なんですが",
    "勉強になりました", "わからんです", "くんです", "効くんです",
)
# 実質情報がなく学習を促すだけの文（末尾が下記）は削除。
_ADVICE_END = ("おきましょう。", "ください。", "ましょう。", "しましょう。")
# ただし下記の事実キーワードを含む文は残す（誤り指摘・手引き引用など）。
_KEEP_HINT = (
    "手引き", "間違っているのは", "正しくは", "とあります", "制定", "規定",
    "定めて", "基準", "に該当", "に規定", "改正", "とは、", "をいう",
)


def _split_sentences(text: str) -> list:
    """句点『。！？』で文分割する。ただし「」で囲まれた引用内では切らない。

    『！』『？』は文末を『。』に正規化して切る（口語的な感嘆符を残さない）。
    """
    out, buf, depth = [], "", 0
    for ch in text:
        if ch == "「":
            depth += 1
            buf += ch
        elif ch == "」":
            depth = max(0, depth - 1)
            buf += ch
        elif depth == 0 and ch in "。！？!?":
            buf += "。"
            out.append(buf)
            buf = ""
        else:
            buf += ch
    if buf.strip():
        # 末尾の句点が引用「」の内側に入り、区切れずに残った文を終止させる
        if not buf.rstrip().endswith(("。", "！", "？")):
            buf = buf.rstrip() + "。"
        out.append(buf)
    return out


def _normalize_sentence(s: str) -> str:
    """先頭のフィラー接続詞と余分な句読点を除き、口語語尾を丁寧語に整える。"""
    s = s.strip().lstrip("、。 　")
    for lead in ("まあ、", "これも、", "また、", "んなもんで、", "んで、",
                 "なお、", "そして、", "つまり、"):
        if s.startswith(lead):
            s = s[len(lead):].lstrip("、。 　")
    # 口語的な語尾（〜ですよね／〜ですね／〜でしょう）を常態の丁寧語に寄せる
    s = re.sub(r"です[よね]+ー?。$", "です。", s)
    s = re.sub(r"ます[よね]+ー?。$", "ます。", s)
    s = re.sub(r"よねー?。$", "。", s)          # 〜でしたよね。/減りませんよね。→ 常体丁寧
    s = re.sub(r"でしょうね。$", "です。", s)
    s = re.sub(r"でしょう。$", "です。", s)
    # 口語表現を書き言葉へ：〜わけです→のです、〜じゃない→ではない
    s = re.sub(r"わけです。$", "のです。", s)
    s = s.replace("じゃないです", "ではありません").replace("じゃない", "ではない")
    s = s.replace("じゃなく", "ではなく")
    # 「できないです。」のような口語の否定形を丁寧語に直す
    s = re.sub(r"できないです。$", "できません。", s)
    s = re.sub(r"ないです。$", "ありません。", s)
    # 「でしょう→です」変換等で生じうる崩れた終止（動詞の辞書形＋です）を丁寧語に直す
    s = re.sub(r"するです。$", "します。", s)
    s = re.sub(r"あるです。$", "あります。", s)
    s = re.sub(r"出るです。$", "出ます。", s)
    s = re.sub(r"いるです。$", "います。", s)
    s = re.sub(r"なるです。$", "なります。", s)
    # 対応する開き括弧のない閉じ括弧（出典の箇条書き記号「ⅱ）」やトリム跡）を除去。
    # 均衡した（…）は count が等しく while が回らないので壊さない。
    while s.count("）") > s.count("（"):
        s = s.replace("）", "", 1)
    s = re.sub(r"。。+", "。", s).strip("、　 ")
    if s and not s.endswith(("。", "！", "？", "」", "）")):
        s += "。"
    return s.strip()


def clean_reason(reason: str, maxlen: int = 240) -> str:
    """出典の口語解説を、事実中心の真面目な文体へ整形する。

    - 口語スラング・受験雑談・自サイト誘導の文は削除
    - 学習を促すだけの助言文は削除（誤り指摘・手引き引用は残す）
    - 口語語尾を丁寧語に統一
    - 文の途中では切らず、maxlen 目安で文単位に打ち切る
    """
    kept, total = [], 0
    for s in _split_sentences(reason):
        s = s.strip()
        if not s:
            continue
        if any(x in s for x in _DROP_SUBSTR):
            continue
        keepy = any(k in s for k in _KEEP_HINT)
        # 事実キーワードを含まず、学習を促すだけの助言文（〜ください／〜ましょう）は削除
        if not keepy and s.endswith(_ADVICE_END):
            continue
        ns = _normalize_sentence(s)
        if not ns:
            continue
        # 正規化（でしょう→です 等）で助言・メタ語尾が生じることがあるため再判定
        if not any(k in ns for k in _KEEP_HINT) and any(x in ns for x in _DROP_SUBSTR):
            continue
        # 引用符が閉じていない文（元データの途中欠落）は採用しない
        if ns.count("「") != ns.count("」"):
            continue
        if kept and total + len(ns) > maxlen:
            break
        kept.append(ns)
        total += len(ns)
    return "".join(kept)


def parse_question(raw_dir: Path, n: int):
    txt = clean_text(raw_dir / f"{n:03d}.html")
    body = txt.split("難易度コメント")[-1].split("もし、最終解答")[0]

    m = re.search(r"正解：\s*([0-9]+)", body)
    if not m:
        return None
    ans = int(m.group(1))

    tm = re.search(r"第" + str(n) + r"問‐([^\n]+)", txt)
    topic = tm.group(1).strip() if tm else ""
    # 年度・サイト名などが付いたタイトルは冒頭の主題だけに切り詰める
    topic = re.split(r"[：:（(]|令和|\d", topic)[0].strip("　 ")

    # 各文の正誤サマリ： 「a」は「正」です
    seigo = {}
    for mm in re.finditer(r"「([a-eア-オ])」は「([正誤])」", body):
        seigo[mm.group(1)] = (mm.group(2) == "正")
    if len(seigo) < 3:
        return None

    # 各選択肢ブロックから 本文 + 解説理由 を抽出
    stmts = {}
    reasons = {}
    # 「選択肢a … 選択肢b …」の順にブロック分割
    blocks = re.split(r"(?:^|\n)\s*選択肢([a-eア-オ])\s*\n", body)
    # blocks: [pre, 'a', blockA, 'b', blockB, ...]
    for i in range(1, len(blocks) - 1, 2):
        lbl = blocks[i]
        blk = blocks[i + 1]
        # 本文と理由を「判定語（正しい/誤った記述です）」で区切って抽出する。
        # 本文に「ですが」や入れ子の「」が含まれても壊れないよう、貪欲一致で
        # 判定語の直前の「」ですが までを本文とする。
        tm2 = re.search(
            r"「(.+)」ですが[、\s]*(正しい記述です|誤った記述です)",
            blk, flags=re.S)
        if not tm2:
            continue
        stmts[lbl] = join_text(tm2.group(1))
        # 理由： 判定語の直後 〜 「よって、選択肢は」の手前まで
        rest = blk[tm2.end():].split("よって、選択肢")[0]
        reasons[lbl] = clean_reason(join_text(rest))

    labels_sorted = [l for l in LABEL_ORDER if l in seigo]
    # 本文が取れていない文があるものはスキップ（画像依存型）
    if any(l not in stmts or len(stmts[l]) < 10 for l in labels_sorted):
        return None
    if len(labels_sorted) < 4:
        return None

    return {
        "n": n,
        "topic": topic,
        "ans": ans,
        "labels": labels_sorted,
        "stmts": stmts,
        "seigo": seigo,
        "reasons": reasons,
    }


def stable_int(s: str) -> int:
    return int(hashlib.md5(s.encode("utf-8")).hexdigest(), 16)


def make_distractors(correct, qid):
    n = len(correct)
    seed = stable_int(qid)
    seen = {tuple(correct)}
    out = []
    candidates = []
    for i in range(n):
        v = correct[:]; v[i] = not v[i]; candidates.append(v)
    for i in range(n):
        for j in range(i + 1, n):
            v = correct[:]; v[i] = not v[i]; v[j] = not v[j]; candidates.append(v)
    candidates.sort(key=lambda v: stable_int(qid + "".join("1" if x else "0" for x in v)))
    for v in candidates:
        t = tuple(v)
        if t not in seen:
            seen.add(t); out.append(v)
        if len(out) == 4:
            break
    return out


def _dup_key(statements):
    """設問の重複判定キー：各文（空白除去）の集合。ブロックが違っても同一設問文なら一致。"""
    return frozenset(re.sub(r"\s+", "", s["text"]) for s in statements)


def build_source(raw_name, out_name, year, prefix, pref_label, seen_keys=None):
    raw_dir = RAW_ROOT / raw_name
    out_path = ROOT / "src" / "data" / "questions" / out_name
    chap_map = block_chapter_map(raw_dir)
    if seen_keys is None:
        seen_keys = set()
    questions = []
    skipped = []
    dup = 0
    for n in range(1, 121):
        p = parse_question(raw_dir, n)
        if p is None:
            skipped.append(n); continue
        labels_src = p["labels"]
        jp_labels = [LABEL_MAP[l] for l in labels_src]
        statements = [{"label": jp_labels[i], "text": p["stmts"][labels_src[i]]}
                      for i in range(len(labels_src))]
        # 別ブロックとの重複設問（同一文の集合）は除外。先行ソース（東京）を優先。
        key = _dup_key(statements)
        if key in seen_keys:
            dup += 1; continue
        seen_keys.add(key)
        correct = [p["seigo"][l] for l in labels_src]
        qid = f"{prefix}_{n:03d}"
        if qid in EXCLUDE_IDS:
            skipped.append(n); continue
        distractors = make_distractors(correct, qid)
        pos = stable_int(qid + "_pos") % 5
        options = distractors[:]
        options.insert(pos, correct)
        # 解説：各文の正誤＋理由
        # 正誤判定は公式の「答え」欄（seigo）を唯一の根拠とする。出典の解説文冒頭に
        # 混入している判定語は稀に答え欄と食い違う（スクレイプ由来の誤り）ため除去し、
        # マーカー（正/誤）と本文の判定語が矛盾しないよう seigo から一意に再構成する。
        expl_parts = []
        for i, l in enumerate(labels_src):
            is_correct = p["seigo"][l]
            verdict = "正" if is_correct else "誤"
            jp = jp_labels[i]
            override = MANUAL_REASONS.get(qid, {}).get(jp)
            reason = override if override is not None else p["reasons"].get(l, "")
            reason = re.sub(r"^(?:正しい|誤った)記述です。", "", reason).strip()
            verdict_word = "正しい記述です。" if is_correct else "誤った記述です。"
            body = verdict_word + reason
            expl_parts.append(f"{jp}（{verdict}）{body}")
        explanation = "　".join(expl_parts)
        cat = chap_map.get(n) or C3
        topic = p["topic"]
        text = (f"{topic}に関する次の記述について、正しい正誤の組み合わせを一つ選びなさい。"
                if topic else "次の記述について、正しい正誤の組み合わせを一つ選びなさい。")
        questions.append({
            "id": qid,
            "type": "seigo_combination",
            "category": cat,
            "year": year,
            "prefecture": pref_label,
            "text": text,
            "statements": statements,
            "seigo_options": options,
            "correctIndex": pos,
            "explanation": explanation,
            "difficulty": 3,
        })

    out_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    from collections import Counter
    for q in questions:
        assert len(q["seigo_options"]) == 5, q["id"]
        assert len({tuple(o) for o in q["seigo_options"]}) == 5, f"撹乱肢重複 {q['id']}"
        assert 0 <= q["correctIndex"] < 5
        assert len(q["seigo_options"][q["correctIndex"]]) == len(q["statements"])
    ch = Counter(q["category"] for q in questions)
    print(f"[{raw_name}] 生成 {len(questions)} 問 -> {out_name}"
          + (f"（重複除外 {dup}）" if dup else ""))
    print("  章別:", {k[:6]: v for k, v in ch.items()})
    print(f"  スキップ {len(skipped)} 問(画像依存の穴埋め等): {skipped}")
    return len(questions)


def build():
    total = 0
    seen_keys = set()
    for raw_name, out_name, year, prefix, pref_label in SOURCES:
        total += build_source(raw_name, out_name, year, prefix, pref_label, seen_keys)
    print(f"\n合計 {total} 問 生成・自己検証 OK")


if __name__ == "__main__":
    build()
