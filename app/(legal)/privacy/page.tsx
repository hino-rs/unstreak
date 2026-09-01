import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Unstreak",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updatedAt="2026年8月26日">
      <LegalSection heading="1. 基本方針">
        <p>
          本サービスの提供者（以下「運営者」といいます）は、英語学習サービス「Unstreak」（以下「本サービス」といいます）における利用者の情報を、本ポリシーに従い適切に取り扱います。
        </p>
      </LegalSection>

      <LegalSection heading="2. 取得する情報">
        <ul>
          <li>アカウント登録時のメールアドレス・認証情報</li>
          <li>
            学習ドリルにおいて利用者が入力した英文・質問文、AIによる添削結果・弱点の記録（弱点プール）
          </li>
          <li>
            決済に関する情報（クレジットカード番号等の情報自体は決済代行事業者Stripe, Inc.が保持し、運営者は保持しません）
          </li>
          <li>アクセスログ・Cookie等の技術情報</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. 利用目的">
        <ul>
          <li>本サービスの提供・添削結果の生成・弱点の記録と再出題のため</li>
          <li>本人確認・不正利用防止・お問い合わせ対応のため</li>
          <li>クレジット・サブスクリプションの決済処理のため</li>
          <li>本サービスの品質改善・不具合対応のため</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. 外部サービスの利用・第三者提供">
        <p>
          本サービスは、機能の提供にあたり以下の外部サービス（委託先）を利用しており、その提供に必要な範囲で情報が送信されます。各サービスの取扱いについては、それぞれのプライバシーポリシーもご確認ください。
        </p>
        <ul>
          <li>Anthropic（Claude API）— 添削・質問応答・出題生成のAI処理</li>
          <li>Supabase — アカウント情報・学習データの保存</li>
          <li>Stripe — サブスクリプション・クレジット購入の決済処理</li>
          <li>Upstash（Redis）— アクセス頻度制限のための一時的な処理</li>
          <li>Unsplash — 画像描写ドリルで表示する画像の取得</li>
          <li>Google Cloud（Text-to-Speech）— リスニング機能における音声合成</li>
        </ul>
        <p>
          法令に基づく場合を除き、上記の委託先以外の第三者に対して、利用者の同意なく個人情報を提供することはありません。
        </p>
      </LegalSection>

      <LegalSection heading="5. Cookie等の利用">
        <p>
          本サービスは、ログイン状態の維持等を目的として、Cookieおよびこれに類する技術を使用します。ブラウザの設定によりCookieを無効化した場合、本サービスの一部機能が利用できなくなることがあります。
        </p>
      </LegalSection>

      <LegalSection heading="6. 安全管理措置">
        <p>
          運営者は、取得した情報への不正アクセス・漏えい・滅失・毀損を防止するため、アクセス制御その他の合理的な安全管理措置を講じます。
        </p>
      </LegalSection>

      <LegalSection heading="7. 開示・訂正・利用停止等の請求">
        <p>
          利用者は、運営者に対し、自己の個人情報の開示・訂正・削除・利用停止を請求できます。請求方法は下記のお問い合わせ先までご連絡ください。運営者は、本人確認のうえ法令に従い遅滞なく対応します。アカウント設定画面からの登録情報の確認・削除にも対応しています。
        </p>
      </LegalSection>

      <LegalSection heading="8. お問い合わせ窓口">
        <p>本ポリシーに関するお問い合わせは、以下の窓口までご連絡ください。</p>
        <p>n041969944@gmail.com</p>
      </LegalSection>

      <LegalSection heading="9. 本ポリシーの改定">
        <p>
          運営者は、必要と判断した場合、本ポリシーの内容を変更することがあります。重要な変更を行う場合には、本サービス内での掲示その他適切な方法により周知します。
        </p>
      </LegalSection>

      <LegalSection heading="附則">
        <p>制定日：2026年8月26日</p>
      </LegalSection>
    </LegalPage>
  );
}
