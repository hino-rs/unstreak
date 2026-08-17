-- ============================================================
-- 絵画ドリル: paintings / noticeable elements / tour pages / attempts
-- ============================================================

-- ============================================================
-- 1. paintings（fact-baseのマスタデータ。migration経由のみで書き込む）
-- ============================================================
create table if not exists paintings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  artist text not null,
  year text not null,
  tier integer not null default 1,
  image_url text not null,
  background text not null,
  intent text not null,
  interpretations text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. painting_noticeable_elements（Round1回答とのキーワード突合用）
-- ============================================================
create table if not exists painting_noticeable_elements (
  id uuid primary key default gen_random_uuid(),
  painting_id uuid not null references paintings(id) on delete cascade,
  position integer not null,
  label text not null,
  keywords text[] not null default '{}',
  unique (painting_id, position)
);

-- ============================================================
-- 3. painting_tour_pages（Revealのページ送りズーム。heading/座標/事実本文は固定、
--    AI3はgrounding_bodyを事実として本文を書き換える）
-- ============================================================
create table if not exists painting_tour_pages (
  id uuid primary key default gen_random_uuid(),
  painting_id uuid not null references paintings(id) on delete cascade,
  position integer not null,
  heading text not null,
  grounding_body text not null,
  focus_x integer not null check (focus_x between 0 and 100),
  focus_y integer not null check (focus_y between 0 and 100),
  zoom integer not null check (zoom > 0),
  unique (painting_id, position)
);

-- ============================================================
-- 4. painting_attempts（Round1→Reveal→Round2の1セッション=1行）
-- ============================================================
create table if not exists painting_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  painting_id uuid not null references paintings(id),
  image_url text not null,
  round1_text text not null,
  round1_grading jsonb not null,
  reveal_noticed_labels text[] not null default '{}',
  reveal_missed_labels text[] not null default '{}',
  reveal_narrative jsonb not null,
  reveal_tour_page_bodies text[] not null default '{}',
  round2_text text,
  round2_grading jsonb,
  credits_charged integer not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists painting_attempts_user_id_idx on painting_attempts (user_id);
create index if not exists painting_attempts_user_completed_idx
  on painting_attempts (user_id, painting_id) where completed_at is not null;

-- ============================================================
-- 5. RLS
-- ============================================================
alter table paintings enable row level security;
alter table painting_noticeable_elements enable row level security;
alter table painting_tour_pages enable row level security;
alter table painting_attempts enable row level security;

create policy "select paintings" on paintings for select to authenticated using (true);
create policy "select painting_noticeable_elements" on painting_noticeable_elements for select to authenticated using (true);
create policy "select painting_tour_pages" on painting_tour_pages for select to authenticated using (true);
-- 書き込みポリシーは意図的に作らない。paintings系はmigration経由のみで更新する

create policy "select own painting_attempts" on painting_attempts for select using (auth.uid() = user_id);
create policy "insert own painting_attempts" on painting_attempts for insert with check (auth.uid() = user_id);
create policy "update own painting_attempts" on painting_attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 6. Seedデータ（lib/mock-paintings.ts の6枚分を移植）
-- ============================================================

insert into paintings (slug, title, artist, year, tier, image_url, background, intent, interpretations) values
  (
    'napoleon-crossing-the-alps',
    'サン＝ベルナール峠を越えるボナパルト',
    'ジャック＝ルイ・ダヴィッド',
    '1801',
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Jacques-Louis%20David%20-%20Bonaparte%20franchissant%20le%20Grand%20Saint-Bernard%2C%2020%20mai%201800%20-%20Google%20Art%20Project.jpg?width=900',
    '1800年、ナポレオンの第二次イタリア遠征でのアルプス越えを描いた作品。スペイン王カルロス4世への贈り物として、ナポレオン自身が依頼した5部作の一つ。',
    '実際のナポレオンは温厚なラバに乗って峠を越えたとされるが、この絵では猛る白馬にまたがる英雄として描かれている。史実よりも自己演出を優先した肖像。',
    array[
      '歴史的事実よりも英雄神話の創出を優先した、政治的プロパガンダとする見方',
      '岩に刻まれた「BONAPARTE」の文字は、ハンニバルやカール大帝と並ぶ征服者の系譜に自らを位置づける意図的な演出だとする見方'
    ]
  ),
  (
    'washington-crossing-the-delaware',
    'デラウェア川を渡るワシントン',
    'エマヌエル・ロイツェ',
    '1851',
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Washington%20Crossing%20the%20Delaware%20by%20Emanuel%20Leutze%2C%20MMA-NYC%2C%201851.jpg?width=900',
    '独立戦争中の1776年12月、ワシントンがトレントン攻撃のため極寒のデラウェア川を渡った奇襲作戦を描く。制作は出来事から75年後、しかもドイツ人画家ロイツェの手による。',
    '1848年革命で揺れるヨーロッパにおいて、自由と国民国家形成の象徴としてアメリカ独立を描き、当時のドイツの自由主義者を鼓舞する意図があったとされる。',
    array[
      '史実の再現というより、後世につくられた国民的建国神話を描いたとする見方',
      '画中の旗のデザインは当時まだ存在しておらず、歴史的正確性より象徴性を優先しているという指摘'
    ]
  ),
  (
    'death-of-nelson',
    'ネルソン提督の死',
    'アーサー・ウィリアム・デヴィス',
    '1807',
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20William%20Devis%20-%20The%20Death%20of%20Nelson%20-%20BHC0491%20-%20Royal%20Museums%20Greenwich.jpg?width=900',
    '1805年のトラファルガーの海戦で致命傷を負ったネルソン提督が、旗艦ヴィクトリー号の船内で息を引き取る場面。デヴィスは事件後に実際に乗艦し、目撃者への取材とスケッチをもとに描いた。',
    '同時期のベンジャミン・ウェスト版が甲板上で光に包まれる殉教者的英雄として理想化しているのに対し、デヴィス版は薄暗い船倉という史実に近い設定を選んでいる。',
    array[
      '史実の忠実な再現を重視した「記録画」としての性格が強いという見方',
      'それでも周囲で悲しむ士官たちの構図は、キリストの死を悼む伝統的な図像（哀悼図）を踏襲しているという指摘'
    ]
  ),
  (
    'coronation-of-napoleon',
    'ナポレオンの戴冠式',
    'ジャック＝ルイ・ダヴィッド',
    '1807',
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Jacques-Louis%20David%20-%20The%20Coronation%20of%20Napoleon%20(1805-1807).jpg?width=900',
    '1804年、ノートルダム大聖堂で行われたナポレオンの皇帝戴冠式。伝統的に戴冠は教皇が行うが、ナポレオンは教皇ピウス7世を招きながらも自ら冠を掲げ、皇后ジョゼフィーヌに授けた場面が描かれている。',
    '教皇よりも自らの権威を優位に置く演出。さらに実際には出席していなかった母親を、和解の象徴として画面中央の貴賓席に描き加えるなど、事実を大幅に脚色している。',
    array[
      '教会権力に対する世俗権力（皇帝権）の優位を視覚的に主張した政治的声明とする見方',
      '巨大な群像構成と精緻な描写により、単なる記録を超えた国家的スペクタクルとして設計されているという見方'
    ]
  ),
  (
    'third-of-may-1808',
    '1808年5月3日、マドリード',
    'フランシスコ・デ・ゴヤ',
    '1814',
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/El%20Tres%20de%20Mayo%2C%20by%20Francisco%20de%20Goya%2C%20from%20Prado%20thin%20black%20margin.jpg?width=900',
    '1808年、ナポレオン軍占領下のマドリードで蜂起した市民が、翌未明にフランス軍によって処刑された事件を描く。制作はスペイン王政復古後、事件から6年後。',
    '戦争の英雄的側面ではなく、名もない市民が虐殺される恐怖と不条理を告発する意図で描かれたとされる。',
    array[
      '両手を広げた白いシャツの男のポーズはキリストの磔刑像を想起させ、殉教のイメージを重ねているという見方',
      '顔の見えない兵士の列と恐怖に歪む犠牲者たちの対比が、匿名の暴力機構と個人の尊厳を対置しているという見方'
    ]
  ),
  (
    'liberty-leading-the-people',
    '民衆を導く自由の女神',
    'ウジェーヌ・ドラクロワ',
    '1830',
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Eug%C3%A8ne%20Delacroix%20-%20La%20libert%C3%A9%20guidant%20le%20peuple.jpg?width=900',
    '1830年7月、フランスで王政に対して起きた七月革命（栄光の三日間）を記念して描かれた。',
    '自由の女神（マリアンヌ）を、実在の市民階級を象徴する労働者・ブルジョワ・少年らと共に前進させることで、革命を担う「民衆」全体を寓意的に描いた。',
    array[
      '女神が半裸で描かれる点は、古典的な寓意像（アレゴリー）の伝統とリアルな市街戦の描写を意図的に混在させているという見方',
      'シルクハットの男性（ブルジョワ）と労働者風の少年が同じ隊列にいる構図は、階級を超えた「国民」の団結を演出しているという見方'
    ]
  )
on conflict (slug) do nothing;

-- --- painting_noticeable_elements ---

insert into painting_noticeable_elements (painting_id, position, label, keywords)
select id, v.position, v.label, v.keywords
from paintings, (values
  (0, '馬', array['horse']),
  (1, '岩に刻まれた名前', array['rock','name','carv','engrav','letter']),
  (2, '指差すポーズ', array['point','hand','gesture']),
  (3, '風になびくマント', array['cloak','cape','wind','flow']),
  (4, '険しい岩山の地形', array['mountain','cliff','steep','rocky'])
) as v(position, label, keywords)
where paintings.slug = 'napoleon-crossing-the-alps';

insert into painting_noticeable_elements (painting_id, position, label, keywords)
select id, v.position, v.label, v.keywords
from paintings, (values
  (0, '流氷の浮かぶ川', array['ice','river','float']),
  (1, '旗を持つ人物', array['flag']),
  (2, '船に立つワシントン', array['standing','boat','man']),
  (3, '夜明け前の空', array['sky','dawn','sunrise','light']),
  (4, '様々な服装の兵士たち', array['soldier','clothes','men','cold'])
) as v(position, label, keywords)
where paintings.slug = 'washington-crossing-the-delaware';

insert into painting_noticeable_elements (painting_id, position, label, keywords)
select id, v.position, v.label, v.keywords
from paintings, (values
  (0, '薄暗い船内', array['dark','dim','below','ship','cabin']),
  (1, '横たわるネルソン', array['lying','wounded','man on']),
  (2, '悲しむ周囲の人々', array['sad','grief','surround','officers','crowd']),
  (3, '差し込む光', array['light','beam','shadow']),
  (4, '軍服の装飾', array['uniform','medal','gold'])
) as v(position, label, keywords)
where paintings.slug = 'death-of-nelson';

insert into painting_noticeable_elements (painting_id, position, label, keywords)
select id, v.position, v.label, v.keywords
from paintings, (values
  (0, '冠を掲げる人物', array['crown']),
  (1, '教皇の座る位置', array['pope','seated','background']),
  (2, '跪く女性', array['kneel','woman','dress']),
  (3, '豪華な衣装と装飾', array['gold','robe','decorat','ornate']),
  (4, '多数の観衆・群像', array['crowd','people','audience','many'])
) as v(position, label, keywords)
where paintings.slug = 'coronation-of-napoleon';

insert into painting_noticeable_elements (painting_id, position, label, keywords)
select id, v.position, v.label, v.keywords
from paintings, (values
  (0, '両手を広げた白いシャツの男', array['white shirt','arms','raise','man']),
  (1, '地面に置かれたランタン', array['lantern','light','ground']),
  (2, '顔が見えない兵士の列', array['soldier','row','line','face','back']),
  (3, '血だまりと倒れた遺体', array['blood','body','dead','lying']),
  (4, '恐怖で歪む表情', array['fear','scream','terror','expression'])
) as v(position, label, keywords)
where paintings.slug = 'third-of-may-1808';

insert into painting_noticeable_elements (painting_id, position, label, keywords)
select id, v.position, v.label, v.keywords
from paintings, (values
  (0, '三色旗を掲げる女性', array['flag','woman','banner']),
  (1, '半裸の姿', array['bare','chest','dress','half']),
  (2, 'シルクハットの男性', array['hat','man','suit']),
  (3, '銃を持つ少年', array['boy','gun','pistol','child']),
  (4, '倒れた兵士たちの遺体', array['body','dead','fallen','ground'])
) as v(position, label, keywords)
where paintings.slug = 'liberty-leading-the-people';

-- --- painting_tour_pages ---

insert into painting_tour_pages (painting_id, position, heading, grounding_body, focus_x, focus_y, zoom)
select id, v.position, v.heading, v.body, v.focus_x, v.focus_y, v.zoom
from paintings, (values
  (0, '全体を見てみましょう', '1800年、ナポレオンによるアルプス越えを描いた作品です。まずは全体の構図を眺めてみましょう。', 45, 55, 112),
  (1, '猛る白馬', '実際のナポレオンは温和なラバに乗って峠を越えたとされますが、ここでは猛る白馬にまたがる英雄として描かれています。', 45, 55, 220),
  (2, '岩に刻まれた名前', '手前の岩には「BONAPARTE」の文字が刻まれています。ハンニバルやカール大帝と並ぶ征服者の系譜に自らを位置づける演出だと言われています。', 15, 80, 240),
  (3, '知られている解釈', '歴史的事実よりも英雄神話の創出を優先した、政治的プロパガンダとする見方が有力です。', 45, 55, 112)
) as v(position, heading, body, focus_x, focus_y, zoom)
where paintings.slug = 'napoleon-crossing-the-alps';

insert into painting_tour_pages (painting_id, position, heading, grounding_body, focus_x, focus_y, zoom)
select id, v.position, v.heading, v.body, v.focus_x, v.focus_y, v.zoom
from paintings, (values
  (0, '全体を見てみましょう', '独立戦争中の1776年12月、ワシントンが極寒のデラウェア川を渡った奇襲作戦を描いています。', 50, 50, 112),
  (1, '流氷の浮かぶ川', '極寒の中の決死の渡河であったことを、流氷が物語っています。', 30, 80, 220),
  (2, '船に立つワシントン', '実際にはこのような姿勢での渡河は考えにくいとされますが、指導者としての威厳を強調する構図になっています。', 50, 40, 230),
  (3, '知られている解釈', '制作は出来事から75年後、しかもドイツ人画家の手によるもの。史実の再現というより、後世につくられた国民的建国神話を描いたという見方があります。', 50, 50, 112)
) as v(position, heading, body, focus_x, focus_y, zoom)
where paintings.slug = 'washington-crossing-the-delaware';

insert into painting_tour_pages (painting_id, position, heading, grounding_body, focus_x, focus_y, zoom)
select id, v.position, v.heading, v.body, v.focus_x, v.focus_y, v.zoom
from paintings, (values
  (0, '全体を見てみましょう', '1805年トラファルガーの海戦で致命傷を負ったネルソン提督の最期を描いています。', 50, 40, 112),
  (1, '横たわるネルソン', '画家デヴィスは事件後に実際に乗艦し、目撃者への取材をもとにこの場面を描きました。', 40, 60, 230),
  (2, '差し込む光', '薄暗い船倉に差し込む光が、悲劇の中心へと自然に視線を導きます。', 50, 15, 230),
  (3, '知られている解釈', '同時期のベンジャミン・ウェスト版が甲板上で光に包まれる理想化された英雄像であるのに対し、この絵はより史実に近い設定を選んでいます。', 50, 40, 112)
) as v(position, heading, body, focus_x, focus_y, zoom)
where paintings.slug = 'death-of-nelson';

insert into painting_tour_pages (painting_id, position, heading, grounding_body, focus_x, focus_y, zoom)
select id, v.position, v.heading, v.body, v.focus_x, v.focus_y, v.zoom
from paintings, (values
  (0, '全体を見てみましょう', '1804年、ノートルダム大聖堂で行われたナポレオンの戴冠式を描いた作品です。', 50, 45, 112),
  (1, '自ら冠を掲げる皇帝', '伝統的に戴冠は教皇が行いますが、ナポレオンは教皇を招きながらも自ら冠を掲げています。', 45, 35, 230),
  (2, '壮麗な群像構成', '実際には出席していなかった母親を和解の象徴として描き加えるなど、事実が大幅に脚色されています。', 50, 70, 220),
  (3, '知られている解釈', '教会権力に対する世俗権力（皇帝権）の優位を視覚的に主張した、政治的声明とする見方があります。', 50, 45, 112)
) as v(position, heading, body, focus_x, focus_y, zoom)
where paintings.slug = 'coronation-of-napoleon';

insert into painting_tour_pages (painting_id, position, heading, grounding_body, focus_x, focus_y, zoom)
select id, v.position, v.heading, v.body, v.focus_x, v.focus_y, v.zoom
from paintings, (values
  (0, '全体を見てみましょう', '1808年、ナポレオン軍占領下のマドリードで処刑されたスペイン市民を描いた作品です。', 45, 50, 112),
  (1, '両手を広げた男', 'このポーズはキリストの磔刑像を想起させ、殉教のイメージが重ねられているとされます。', 35, 45, 230),
  (2, '顔の見えない兵士たち', '顔の見えない兵士の列と、恐怖に歪む犠牲者たちの表情が対比されています。', 75, 55, 230),
  (3, '知られている解釈', '戦争の英雄的側面ではなく、名もない市民が虐殺される恐怖と不条理を告発する意図があったとされます。', 45, 50, 112)
) as v(position, heading, body, focus_x, focus_y, zoom)
where paintings.slug = 'third-of-may-1808';

insert into painting_tour_pages (painting_id, position, heading, grounding_body, focus_x, focus_y, zoom)
select id, v.position, v.heading, v.body, v.focus_x, v.focus_y, v.zoom
from paintings, (values
  (0, '全体を見てみましょう', '1830年7月、フランスで起きた七月革命（栄光の三日間）を記念して描かれた作品です。崩れたバリケードの上で、身分も年齢も異なる人々が入り混じって前進しています。まずは全体の構図を眺めてみてください。', 50, 45, 112),
  (1, '掲げられた三色旗', '画面上部で翻る青・白・赤の三色旗（トリコロール）。フランス革命期に生まれたこの旗は、ブルボン王政の白旗に対抗する自由と共和の象徴として、七月革命でも再び掲げられました。旗を高く掲げる構図そのものが、この絵の中心的なメッセージです。', 46, 12, 260),
  (2, '自由の女神（マリアンヌ）という寓意', '中央の女性は特定の実在人物ではなく、「自由」を擬人化した寓意像（アレゴリー）です。フリジア帽をかぶり、片胸をあらわにした姿は、古典的な勝利の女神像の伝統を踏まえています。一方で彼女は実際の市街戦の煙と埃の中に立っており、理想化された寓意像とリアルな現実描写が意図的に混在させられています。', 58, 18, 260),
  (3, 'シルクハットの男性', '女神のそばで銃を構えるシルクハットの男性は、当時のブルジョワ（都市中産階級）の服装をしています。労働者風の少年や庶民と肩を並べて戦う姿は、この革命が特定の階級だけでなく、様々な立場の「国民」全体による蜂起であったことを示す構図だとされています。', 25, 37, 240),
  (4, '銃を持つ少年', '女神の右手側で両手に拳銃を構える少年。名もない街の子供が戦いに加わっている姿は、後にヴィクトル・ユゴーの小説『レ・ミゼラブル』に登場する少年ガヴローシュのモデルの一つとも言われています（実際にはこの絵の方が小説より先に描かれています）。革命が大人だけの出来事ではなかったことを物語っています。', 78, 42, 240),
  (5, '前景に横たわる犠牲者たち', '画面下部には、倒れた兵士たちの遺体が生々しく描かれています。上部で高々と旗を掲げる理想化された女神の姿と、足元に横たわる現実の犠牲とのコントラストが、この絵に単なる英雄礼賛にとどまらない重みを与えています。', 45, 80, 220),
  (6, '知られている解釈', 'この絵については複数の見方があります。ひとつは、寓意像としての女神とリアルな市街戦の描写を意図的に混在させているという見方。もうひとつは、ブルジョワと労働者風の少年が同じ隊列に並ぶ構図が、階級を超えた「国民」の団結を演出しているという見方です。あなたはこの絵から、他にどんなことを感じましたか？', 50, 45, 112)
) as v(position, heading, body, focus_x, focus_y, zoom)
where paintings.slug = 'liberty-leading-the-people';
