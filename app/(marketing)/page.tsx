"use client";

import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { motion } from "motion/react";
import { baloo2, zenMaruGothic } from "@/lib/fonts";

const catchphraseEn = "Skip the streak. Build the skill.";
const catchphraseJa = "続けた日数より、話せるようになった実感を。";

export default function LandingPage() {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center ${zenMaruGothic.className}`}>
      {/* ヒーローセクション */}
      <section>
        <TextGenerateEffect words={catchphraseEn} duration={0.5} className={`text-4xl tracking-tight text-slate-900 ${baloo2.className}`} />
        <motion.p
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            delay: 1.4,
            ease: "easeOut",
          }}
          className="text-base sm:text-lg font-medium text-slate-500 tracking-wider"
        >
          {catchphraseJa}
        </motion.p>
      </section>
      
      {/* 共感セクション */}
      <section>
        英語学習アプリ、553日ストリーク。
        毎日のミッションも、月間バッジも、全部こなした。

        それでも、英語で話す・書く力が伸びている実感はなかった。
      </section>
     
      {/* なぜ伸びないかの考察 */}
      <section>
        なぜ、続けても伸びないのか

        見て「分かる」ことと、自分から「言えること」は別物です。
        漢字が読めても書けないことがあるのと同じように、
        英語も「見たら分かる」語彙と「自分で引き出せる」語彙は、まったく別の力です。

        多くの学習アプリは、選択肢から選ぶ「わかる」の練習に留まっています。
        そこにいくら回数を重ねても、「自分で組み立てて話す」力は伸びません。
      </section>
     
      {/* 解決策 */}
      <section>
        自分で組み立てて、初めて気づく

        Unstreakは、選ぶドリルではありません。

        画像を見て、英語で説明する。
        それだけです。

        選択肢はありません。自分の言葉で組み立てて、初めて
        「あ、この表現、知ってるつもりだった」という自分の穴に気づきます。

        AIがその場で添削・進捗は「予想が当たった割合」という、
        ごまかしの効かない数字で見えるようになります。
      </section>
     
      {/* 差別化ポイント */}
      <section>
        汎用カリキュラムは、もう卒業していい

        過去形が苦手な人と、前置詞が苦手な人に、
        同じ問題を解かせる意味はあるのでしょうか。

        Unstreakは、あなたが実際に詰まった構文・単語だけを記録します。
        そして、それだけを狙って再出題します。

        みんなのための汎用的な教材ではなく、
        あなただけの弱点マップができていきます。
      </section>
     
      {/* AI2の紹介 */}
      <section>
        「これ、英語でどう言うんだっけ」に、気軽に

        書いている途中、ふと詰まる瞬間があります。
        そんな時は、辞書相棒にひとこと聞くだけ。

        聞くことに、恥はいりません。
        気軽に聞けることも、実力を伸ばすための設計のひとつです。
      </section>
     
      {/* ロードマップ */}
      <section>
        これから増えていく練習

        - 英語日記 -- 一日の出来事を、英語で残す
        - トピック説明 -- あなたの日常やキャリアに合わせて、話す練習を
      </section>
     
      {/* クロージングCTA */}
      <section>
        ストリークを追うのは、もうやめませんか。

        {catchphraseEn}
      </section>
    </div>
  )
}
