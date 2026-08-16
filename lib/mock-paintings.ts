// 絵画ドリルのUIモック用データ。実DBは未実装のため、fact-baseはハードコードしている。
// 画像はWikimedia Commonsのpublic domain作品をSpecial:FilePath経由で参照。

export type NoticeableElement = {
  label: string
  keywords: string[]
}

// Reveal画面のページ送り解説用。focusX/focusYは画像内の注目点を0-100%で指定し、
// zoomは背景画像の拡大率（100=ほぼ全体表示、200〜280=クローズアップ）
export type TourPage = {
  heading: string
  body: string
  focusX: number
  focusY: number
  zoom: number
}

export type MockPainting = {
  slug: string
  title: string
  artist: string
  year: string
  tier: number
  imageUrl: string
  background: string
  intent: string
  interpretations: string[]
  noticeableElements: NoticeableElement[]
  tourPages: TourPage[]
}

function wikimediaFilePath(filename: string, width = 900) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`
}

export const MOCK_PAINTINGS: MockPainting[] = [
  {
    slug: "napoleon-crossing-the-alps",
    title: "サン＝ベルナール峠を越えるボナパルト",
    artist: "ジャック＝ルイ・ダヴィッド",
    year: "1801",
    tier: 1,
    imageUrl: wikimediaFilePath(
      "Jacques-Louis David - Bonaparte franchissant le Grand Saint-Bernard, 20 mai 1800 - Google Art Project.jpg"
    ),
    background:
      "1800年、ナポレオンの第二次イタリア遠征でのアルプス越えを描いた作品。スペイン王カルロス4世への贈り物として、ナポレオン自身が依頼した5部作の一つ。",
    intent:
      "実際のナポレオンは温厚なラバに乗って峠を越えたとされるが、この絵では猛る白馬にまたがる英雄として描かれている。史実よりも自己演出を優先した肖像。",
    interpretations: [
      "歴史的事実よりも英雄神話の創出を優先した、政治的プロパガンダとする見方",
      "岩に刻まれた「BONAPARTE」の文字は、ハンニバルやカール大帝と並ぶ征服者の系譜に自らを位置づける意図的な演出だとする見方",
    ],
    noticeableElements: [
      { label: "馬", keywords: ["horse"] },
      { label: "岩に刻まれた名前", keywords: ["rock", "name", "carv", "engrav", "letter"] },
      { label: "指差すポーズ", keywords: ["point", "hand", "gesture"] },
      { label: "風になびくマント", keywords: ["cloak", "cape", "wind", "flow"] },
      { label: "険しい岩山の地形", keywords: ["mountain", "cliff", "steep", "rocky"] },
    ],
    tourPages: [
      {
        heading: "全体を見てみましょう",
        body: "1800年、ナポレオンによるアルプス越えを描いた作品です。まずは全体の構図を眺めてみましょう。",
        focusX: 45,
        focusY: 55,
        zoom: 112,
      },
      {
        heading: "猛る白馬",
        body: "実際のナポレオンは温和なラバに乗って峠を越えたとされますが、ここでは猛る白馬にまたがる英雄として描かれています。",
        focusX: 45,
        focusY: 55,
        zoom: 220,
      },
      {
        heading: "岩に刻まれた名前",
        body: "手前の岩には「BONAPARTE」の文字が刻まれています。ハンニバルやカール大帝と並ぶ征服者の系譜に自らを位置づける演出だと言われています。",
        focusX: 15,
        focusY: 80,
        zoom: 240,
      },
      {
        heading: "知られている解釈",
        body: "歴史的事実よりも英雄神話の創出を優先した、政治的プロパガンダとする見方が有力です。",
        focusX: 45,
        focusY: 55,
        zoom: 112,
      },
    ],
  },
  {
    slug: "washington-crossing-the-delaware",
    title: "デラウェア川を渡るワシントン",
    artist: "エマヌエル・ロイツェ",
    year: "1851",
    tier: 1,
    imageUrl: wikimediaFilePath(
      "Washington Crossing the Delaware by Emanuel Leutze, MMA-NYC, 1851.jpg"
    ),
    background:
      "独立戦争中の1776年12月、ワシントンがトレントン攻撃のため極寒のデラウェア川を渡った奇襲作戦を描く。制作は出来事から75年後、しかもドイツ人画家ロイツェの手による。",
    intent:
      "1848年革命で揺れるヨーロッパにおいて、自由と国民国家形成の象徴としてアメリカ独立を描き、当時のドイツの自由主義者を鼓舞する意図があったとされる。",
    interpretations: [
      "史実の再現というより、後世につくられた国民的建国神話を描いたとする見方",
      "画中の旗のデザインは当時まだ存在しておらず、歴史的正確性より象徴性を優先しているという指摘",
    ],
    noticeableElements: [
      { label: "流氷の浮かぶ川", keywords: ["ice", "river", "float"] },
      { label: "旗を持つ人物", keywords: ["flag"] },
      { label: "船に立つワシントン", keywords: ["standing", "boat", "man"] },
      { label: "夜明け前の空", keywords: ["sky", "dawn", "sunrise", "light"] },
      { label: "様々な服装の兵士たち", keywords: ["soldier", "clothes", "men", "cold"] },
    ],
    tourPages: [
      {
        heading: "全体を見てみましょう",
        body: "独立戦争中の1776年12月、ワシントンが極寒のデラウェア川を渡った奇襲作戦を描いています。",
        focusX: 50,
        focusY: 50,
        zoom: 112,
      },
      {
        heading: "流氷の浮かぶ川",
        body: "極寒の中の決死の渡河であったことを、流氷が物語っています。",
        focusX: 30,
        focusY: 80,
        zoom: 220,
      },
      {
        heading: "船に立つワシントン",
        body: "実際にはこのような姿勢での渡河は考えにくいとされますが、指導者としての威厳を強調する構図になっています。",
        focusX: 50,
        focusY: 40,
        zoom: 230,
      },
      {
        heading: "知られている解釈",
        body: "制作は出来事から75年後、しかもドイツ人画家の手によるもの。史実の再現というより、後世につくられた国民的建国神話を描いたという見方があります。",
        focusX: 50,
        focusY: 50,
        zoom: 112,
      },
    ],
  },
  {
    slug: "death-of-nelson",
    title: "ネルソン提督の死",
    artist: "アーサー・ウィリアム・デヴィス",
    year: "1807",
    tier: 1,
    imageUrl: wikimediaFilePath(
      "Arthur William Devis - The Death of Nelson - BHC0491 - Royal Museums Greenwich.jpg"
    ),
    background:
      "1805年のトラファルガーの海戦で致命傷を負ったネルソン提督が、旗艦ヴィクトリー号の船内で息を引き取る場面。デヴィスは事件後に実際に乗艦し、目撃者への取材とスケッチをもとに描いた。",
    intent:
      "同時期のベンジャミン・ウェスト版が甲板上で光に包まれる殉教者的英雄として理想化しているのに対し、デヴィス版は薄暗い船倉という史実に近い設定を選んでいる。",
    interpretations: [
      "史実の忠実な再現を重視した「記録画」としての性格が強いという見方",
      "それでも周囲で悲しむ士官たちの構図は、キリストの死を悼む伝統的な図像（哀悼図）を踏襲しているという指摘",
    ],
    noticeableElements: [
      { label: "薄暗い船内", keywords: ["dark", "dim", "below", "ship", "cabin"] },
      { label: "横たわるネルソン", keywords: ["lying", "wounded", "man on"] },
      { label: "悲しむ周囲の人々", keywords: ["sad", "grief", "surround", "officers", "crowd"] },
      { label: "差し込む光", keywords: ["light", "beam", "shadow"] },
      { label: "軍服の装飾", keywords: ["uniform", "medal", "gold"] },
    ],
    tourPages: [
      {
        heading: "全体を見てみましょう",
        body: "1805年トラファルガーの海戦で致命傷を負ったネルソン提督の最期を描いています。",
        focusX: 50,
        focusY: 40,
        zoom: 112,
      },
      {
        heading: "横たわるネルソン",
        body: "画家デヴィスは事件後に実際に乗艦し、目撃者への取材をもとにこの場面を描きました。",
        focusX: 40,
        focusY: 60,
        zoom: 230,
      },
      {
        heading: "差し込む光",
        body: "薄暗い船倉に差し込む光が、悲劇の中心へと自然に視線を導きます。",
        focusX: 50,
        focusY: 15,
        zoom: 230,
      },
      {
        heading: "知られている解釈",
        body: "同時期のベンジャミン・ウェスト版が甲板上で光に包まれる理想化された英雄像であるのに対し、この絵はより史実に近い設定を選んでいます。",
        focusX: 50,
        focusY: 40,
        zoom: 112,
      },
    ],
  },
  {
    slug: "coronation-of-napoleon",
    title: "ナポレオンの戴冠式",
    artist: "ジャック＝ルイ・ダヴィッド",
    year: "1807",
    tier: 1,
    imageUrl: wikimediaFilePath(
      "Jacques-Louis David - The Coronation of Napoleon (1805-1807).jpg"
    ),
    background:
      "1804年、ノートルダム大聖堂で行われたナポレオンの皇帝戴冠式。伝統的に戴冠は教皇が行うが、ナポレオンは教皇ピウス7世を招きながらも自ら冠を掲げ、皇后ジョゼフィーヌに授けた場面が描かれている。",
    intent:
      "教皇よりも自らの権威を優位に置く演出。さらに実際には出席していなかった母親を、和解の象徴として画面中央の貴賓席に描き加えるなど、事実を大幅に脚色している。",
    interpretations: [
      "教会権力に対する世俗権力（皇帝権）の優位を視覚的に主張した政治的声明とする見方",
      "巨大な群像構成と精緻な描写により、単なる記録を超えた国家的スペクタクルとして設計されているという見方",
    ],
    noticeableElements: [
      { label: "冠を掲げる人物", keywords: ["crown"] },
      { label: "教皇の座る位置", keywords: ["pope", "seated", "background"] },
      { label: "跪く女性", keywords: ["kneel", "woman", "dress"] },
      { label: "豪華な衣装と装飾", keywords: ["gold", "robe", "decorat", "ornate"] },
      { label: "多数の観衆・群像", keywords: ["crowd", "people", "audience", "many"] },
    ],
    tourPages: [
      {
        heading: "全体を見てみましょう",
        body: "1804年、ノートルダム大聖堂で行われたナポレオンの戴冠式を描いた作品です。",
        focusX: 50,
        focusY: 45,
        zoom: 112,
      },
      {
        heading: "自ら冠を掲げる皇帝",
        body: "伝統的に戴冠は教皇が行いますが、ナポレオンは教皇を招きながらも自ら冠を掲げています。",
        focusX: 45,
        focusY: 35,
        zoom: 230,
      },
      {
        heading: "壮麗な群像構成",
        body: "実際には出席していなかった母親を和解の象徴として描き加えるなど、事実が大幅に脚色されています。",
        focusX: 50,
        focusY: 70,
        zoom: 220,
      },
      {
        heading: "知られている解釈",
        body: "教会権力に対する世俗権力（皇帝権）の優位を視覚的に主張した、政治的声明とする見方があります。",
        focusX: 50,
        focusY: 45,
        zoom: 112,
      },
    ],
  },
  {
    slug: "third-of-may-1808",
    title: "1808年5月3日、マドリード",
    artist: "フランシスコ・デ・ゴヤ",
    year: "1814",
    tier: 1,
    imageUrl: wikimediaFilePath(
      "El Tres de Mayo, by Francisco de Goya, from Prado thin black margin.jpg"
    ),
    background:
      "1808年、ナポレオン軍占領下のマドリードで蜂起した市民が、翌未明にフランス軍によって処刑された事件を描く。制作はスペイン王政復古後、事件から6年後。",
    intent:
      "戦争の英雄的側面ではなく、名もない市民が虐殺される恐怖と不条理を告発する意図で描かれたとされる。",
    interpretations: [
      "両手を広げた白いシャツの男のポーズはキリストの磔刑像を想起させ、殉教のイメージを重ねているという見方",
      "顔の見えない兵士の列と恐怖に歪む犠牲者たちの対比が、匿名の暴力機構と個人の尊厳を対置しているという見方",
    ],
    noticeableElements: [
      { label: "両手を広げた白いシャツの男", keywords: ["white shirt", "arms", "raise", "man"] },
      { label: "地面に置かれたランタン", keywords: ["lantern", "light", "ground"] },
      { label: "顔が見えない兵士の列", keywords: ["soldier", "row", "line", "face", "back"] },
      { label: "血だまりと倒れた遺体", keywords: ["blood", "body", "dead", "lying"] },
      { label: "恐怖で歪む表情", keywords: ["fear", "scream", "terror", "expression"] },
    ],
    tourPages: [
      {
        heading: "全体を見てみましょう",
        body: "1808年、ナポレオン軍占領下のマドリードで処刑されたスペイン市民を描いた作品です。",
        focusX: 45,
        focusY: 50,
        zoom: 112,
      },
      {
        heading: "両手を広げた男",
        body: "このポーズはキリストの磔刑像を想起させ、殉教のイメージが重ねられているとされます。",
        focusX: 35,
        focusY: 45,
        zoom: 230,
      },
      {
        heading: "顔の見えない兵士たち",
        body: "顔の見えない兵士の列と、恐怖に歪む犠牲者たちの表情が対比されています。",
        focusX: 75,
        focusY: 55,
        zoom: 230,
      },
      {
        heading: "知られている解釈",
        body: "戦争の英雄的側面ではなく、名もない市民が虐殺される恐怖と不条理を告発する意図があったとされます。",
        focusX: 45,
        focusY: 50,
        zoom: 112,
      },
    ],
  },
  {
    slug: "liberty-leading-the-people",
    title: "民衆を導く自由の女神",
    artist: "ウジェーヌ・ドラクロワ",
    year: "1830",
    tier: 1,
    imageUrl: wikimediaFilePath("Eugène Delacroix - La liberté guidant le peuple.jpg"),
    background: "1830年7月、フランスで王政に対して起きた七月革命（栄光の三日間）を記念して描かれた。",
    intent:
      "自由の女神（マリアンヌ）を、実在の市民階級を象徴する労働者・ブルジョワ・少年らと共に前進させることで、革命を担う「民衆」全体を寓意的に描いた。",
    interpretations: [
      "女神が半裸で描かれる点は、古典的な寓意像（アレゴリー）の伝統とリアルな市街戦の描写を意図的に混在させているという見方",
      "シルクハットの男性（ブルジョワ）と労働者風の少年が同じ隊列にいる構図は、階級を超えた「国民」の団結を演出しているという見方",
    ],
    noticeableElements: [
      { label: "三色旗を掲げる女性", keywords: ["flag", "woman", "banner"] },
      { label: "半裸の姿", keywords: ["bare", "chest", "dress", "half"] },
      { label: "シルクハットの男性", keywords: ["hat", "man", "suit"] },
      { label: "銃を持つ少年", keywords: ["boy", "gun", "pistol", "child"] },
      { label: "倒れた兵士たちの遺体", keywords: ["body", "dead", "fallen", "ground"] },
    ],
    tourPages: [
      {
        heading: "全体を見てみましょう",
        body: "1830年7月、フランスで起きた七月革命（栄光の三日間）を記念して描かれた作品です。崩れたバリケードの上で、身分も年齢も異なる人々が入り混じって前進しています。まずは全体の構図を眺めてみてください。",
        focusX: 50,
        focusY: 45,
        zoom: 112,
      },
      {
        heading: "掲げられた三色旗",
        body: "画面上部で翻る青・白・赤の三色旗（トリコロール）。フランス革命期に生まれたこの旗は、ブルボン王政の白旗に対抗する自由と共和の象徴として、七月革命でも再び掲げられました。旗を高く掲げる構図そのものが、この絵の中心的なメッセージです。",
        focusX: 46,
        focusY: 12,
        zoom: 260,
      },
      {
        heading: "自由の女神（マリアンヌ）という寓意",
        body: "中央の女性は特定の実在人物ではなく、「自由」を擬人化した寓意像（アレゴリー）です。フリジア帽をかぶり、片胸をあらわにした姿は、古典的な勝利の女神像の伝統を踏まえています。一方で彼女は実際の市街戦の煙と埃の中に立っており、理想化された寓意像とリアルな現実描写が意図的に混在させられています。",
        focusX: 58,
        focusY: 18,
        zoom: 260,
      },
      {
        heading: "シルクハットの男性",
        body: "女神のそばで銃を構えるシルクハットの男性は、当時のブルジョワ（都市中産階級）の服装をしています。労働者風の少年や庶民と肩を並べて戦う姿は、この革命が特定の階級だけでなく、様々な立場の「国民」全体による蜂起であったことを示す構図だとされています。",
        focusX: 25,
        focusY: 37,
        zoom: 240,
      },
      {
        heading: "銃を持つ少年",
        body: "女神の右手側で両手に拳銃を構える少年。名もない街の子供が戦いに加わっている姿は、後にヴィクトル・ユゴーの小説『レ・ミゼラブル』に登場する少年ガヴローシュのモデルの一つとも言われています（実際にはこの絵の方が小説より先に描かれています）。革命が大人だけの出来事ではなかったことを物語っています。",
        focusX: 78,
        focusY: 42,
        zoom: 240,
      },
      {
        heading: "前景に横たわる犠牲者たち",
        body: "画面下部には、倒れた兵士たちの遺体が生々しく描かれています。上部で高々と旗を掲げる理想化された女神の姿と、足元に横たわる現実の犠牲とのコントラストが、この絵に単なる英雄礼賛にとどまらない重みを与えています。",
        focusX: 45,
        focusY: 80,
        zoom: 220,
      },
      {
        heading: "知られている解釈",
        body: "この絵については複数の見方があります。ひとつは、寓意像としての女神とリアルな市街戦の描写を意図的に混在させているという見方。もうひとつは、ブルジョワと労働者風の少年が同じ隊列に並ぶ構図が、階級を超えた「国民」の団結を演出しているという見方です。あなたはこの絵から、他にどんなことを感じましたか？",
        focusX: 50,
        focusY: 45,
        zoom: 112,
      },
    ],
  },
]

export const PAINTING_STAGE_THRESHOLD = 3

export function getPaintingBySlug(slug: string) {
  return MOCK_PAINTINGS.find((p) => p.slug === slug) ?? null
}
