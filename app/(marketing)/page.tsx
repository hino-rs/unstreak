"use client";

import Link from "next/link";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { motion } from "motion/react";
import { ArrowRight, MessageCircleQuestion, Target, TrendingUp } from "lucide-react";
import { baloo2, zenMaruGothic } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const catchphraseEn = "Skip the streak. Build the skill.";
const catchphraseJa = "続けた日数より、話せるようになった実感を。";

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold tracking-widest text-violet-500 uppercase mb-3">
      {children}
    </div>
  );
}

function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className={zenMaruGothic.className}>
      {/* ヒーローセクション */}
      <section className="flex flex-col items-center justify-center gap-6 px-4 pt-20 pb-24 text-center">
        <TextGenerateEffect
          words={catchphraseEn}
          duration={0.5}
          className={`text-4xl sm:text-6xl tracking-tight text-slate-900 ${baloo2.className}`}
        />
        <motion.p
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 1.4, ease: "easeOut" }}
          className="text-base sm:text-lg font-medium text-slate-500 tracking-wider max-w-xl"
        >
          {catchphraseJa}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-3 mt-2"
        >
          <Button
            render={<Link href="/signup" />}
            nativeButton={false}
            size="lg"
            className="bg-violet-600 text-white hover:bg-violet-600/90 px-8 h-12 text-base"
          >
            無料ではじめる
            <ArrowRight />
          </Button>
          <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="lg" className="h-12 text-base text-slate-500">
            すでにアカウントをお持ちの方
          </Button>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.3 }}
          className="text-xs text-slate-400"
        >
          クレジットカード不要・1分で開始
        </motion.p>
      </section>

      {/* 共感セクション */}
      <section className="bg-slate-50 px-4 py-16">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <p className="text-lg sm:text-xl leading-relaxed text-slate-600">
            英語学習アプリ、553日ストリーク。
            <br />
            毎日のミッションも、月間バッジも、全部こなした。
          </p>
          <p className="text-lg sm:text-xl leading-relaxed text-slate-900 font-semibold mt-4">
            それでも、英語で話す・書く力が伸びている実感はなかった。
          </p>
        </FadeIn>
      </section>

      {/* なぜ伸びないかの考察 */}
      <section className="px-4 py-20 max-w-2xl mx-auto">
        <FadeIn>
          <SectionEyebrow>なぜ、続けても伸びないのか</SectionEyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-snug">
            「わかる」と「言える」は、別の力です
          </h2>
          <p className="text-slate-600 leading-loose">
            見て「分かる」ことと、自分から「言えること」は別物です。
            漢字が読めても書けないことがあるのと同じように、
            英語も「見たら分かる」語彙と「自分で引き出せる」語彙は、まったく別の力です。
          </p>
          <p className="text-slate-600 leading-loose mt-4">
            多くの学習アプリは、選択肢から選ぶ「わかる」の練習に留まっています。
            そこにいくら回数を重ねても、「自分で組み立てて話す」力は伸びません。
          </p>
        </FadeIn>
      </section>

      {/* 解決策 */}
      <section className="bg-slate-50 px-4 py-20">
        <FadeIn className="max-w-2xl mx-auto">
          <SectionEyebrow>解決策</SectionEyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-snug">
            自分で組み立てて、初めて気づく
          </h2>
          <p className="text-slate-600 leading-loose">
            Unstreakは、選ぶドリルではありません。
            <br />
            画像を見て、英語で説明する。それだけです。
          </p>
          <p className="text-slate-600 leading-loose mt-4">
            選択肢はありません。自分の言葉で組み立てて、初めて
            「あ、この表現、知ってるつもりだった」という自分の穴に気づきます。
            AIがその場で添削し、進捗は「予想が当たった割合」という、
            ごまかしの効かない数字で見えるようになります。
          </p>
          <div className="mt-8">
            <Button render={<Link href="/signup" />} nativeButton={false} className="bg-violet-600 text-white hover:bg-violet-600/90 h-11 px-6">
              無料で試してみる
              <ArrowRight />
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* 進捗指標ハイライト */}
      <section className="px-4 py-20 max-w-2xl mx-auto text-center">
        <FadeIn>
          <SectionEyebrow>バッジでもストリークでもなく</SectionEyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 leading-snug">
            伸びは「予測成功率」で見える
          </h2>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-8 py-6">
            <TrendingUp className="size-8 text-violet-500" />
            <div className="flex items-baseline gap-1">
              <NumberTicker
                value={81}
                startValue={42}
                delay={0.2}
                className="text-4xl sm:text-5xl font-bold text-violet-600"
              />
              <span className="text-2xl font-bold text-violet-600">%</span>
            </div>
          </div>
          <p className="text-slate-500 mt-4 text-sm">
            「これ、言えると思う」という予想が、どれだけ当たるようになったか。
            <br />
            ごまかしの効かない、実力そのものの推移です。
          </p>
        </FadeIn>
      </section>

      {/* 差別化ポイント */}
      <section className="bg-slate-50 px-4 py-20">
        <FadeIn className="max-w-2xl mx-auto">
          <SectionEyebrow>差別化ポイント</SectionEyebrow>
          <div className="flex items-start gap-4">
            <div className="mt-1 shrink-0 size-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Target className="size-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-snug">
                汎用カリキュラムは、もう卒業していい
              </h2>
              <p className="text-slate-600 leading-loose">
                過去形が苦手な人と、前置詞が苦手な人に、
                同じ問題を解かせる意味はあるのでしょうか。
              </p>
              <p className="text-slate-600 leading-loose mt-4">
                Unstreakは、あなたが実際に詰まった構文・単語だけを記録します。
                そして、それだけを狙って再出題します。
                みんなのための汎用的な教材ではなく、あなただけの弱点マップができていきます。
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* AI2の紹介 */}
      <section className="px-4 py-20 max-w-2xl mx-auto">
        <FadeIn>
          <div className="flex items-start gap-4">
            <div className="mt-1 shrink-0 size-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <MessageCircleQuestion className="size-5 text-violet-500" />
            </div>
            <div>
              <SectionEyebrow>辞書相棒</SectionEyebrow>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-snug">
                「これ、英語でどう言うんだっけ」に、気軽に
              </h2>
              <p className="text-slate-600 leading-loose">
                書いている途中、ふと詰まる瞬間があります。
                そんな時は、辞書相棒にひとこと聞くだけ。
              </p>
              <p className="text-slate-600 leading-loose mt-4">
                聞くことに、恥はいりません。
                気軽に聞けることも、実力を伸ばすための設計のひとつです。
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ロードマップ */}
      <section className="bg-slate-50 px-4 py-20">
        <FadeIn className="max-w-2xl mx-auto">
          <SectionEyebrow>ロードマップ</SectionEyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-snug">
            これから増えていく練習
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-5 py-4">
              <Badge variant="secondary" className="shrink-0">近日公開</Badge>
              <span className="text-slate-700 font-medium">英語日記</span>
              <span className="text-slate-400 text-sm">— 一日の出来事を、英語で残す</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-5 py-4">
              <Badge variant="secondary" className="shrink-0">近日公開</Badge>
              <span className="text-slate-700 font-medium">トピック説明</span>
              <span className="text-slate-400 text-sm">— あなたの日常やキャリアに合わせて話す練習を</span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* クロージングCTA */}
      <section className="px-4 py-24 text-center">
        <FadeIn className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-snug">
            ストリークを追うのは、もうやめませんか。
          </h2>
          <p className={cn("text-xl sm:text-2xl tracking-tight text-slate-500", baloo2.className)}>
            {catchphraseEn}
          </p>
          <Button
            render={<Link href="/signup" />}
            nativeButton={false}
            size="lg"
            className="bg-violet-600 text-white hover:bg-violet-600/90 px-8 h-12 text-base mt-2"
          >
            無料ではじめる
            <ArrowRight />
          </Button>
        </FadeIn>
      </section>
    </div>
  );
}
