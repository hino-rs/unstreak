import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | Unstreak",
};

export default function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updatedAt="2026年8月29日">
      <LegalSection heading="事業者名">
        <p>hino-rs（個人事業主、本名：日野快音）</p>
      </LegalSection>

      <LegalSection heading="運営責任者">
        <p>日野快音</p>
      </LegalSection>

      <LegalSection heading="所在地">
        <p>ご請求をいただいた場合、遅滞なく開示いたします。</p>
      </LegalSection>

      <LegalSection heading="電話番号">
        <p>ご請求をいただいた場合、遅滞なく開示いたします。</p>
      </LegalSection>

      <LegalSection heading="連絡先メールアドレス">
        <p>n041969944@gmail.com</p>
      </LegalSection>

      <LegalSection heading="販売価格">
        <ul>
          <li>Standardプラン：月額980円（税込）</li>
          <li>Proプラン：月額1,900円（税込）</li>
          <li>クレジット追加購入（小）：300円（税込）</li>
          <li>クレジット追加購入（中）：1,000円（税込）</li>
          <li>クレジット追加購入（大）：2,000円（税込）</li>
        </ul>
        <p>正確な価格は本サービス内の料金ページの表示を優先します。</p>
      </LegalSection>

      <LegalSection heading="商品代金以外の必要料金">
        <p>
          インターネット接続に伴う通信料等は利用者のご負担となります。それ以外に追加で必要となる料金はありません。
        </p>
      </LegalSection>

      <LegalSection heading="お支払い方法">
        <p>クレジットカード決済（Stripe社の決済システムを利用）</p>
      </LegalSection>

      <LegalSection heading="お支払い時期">
        <ul>
          <li>サブスクリプション（Standard/Pro）：登録時、以降は毎月の更新日に自動課金</li>
          <li>クレジット追加購入：購入手続き完了時</li>
        </ul>
      </LegalSection>

      <LegalSection heading="サービスの提供時期">
        <p>決済完了後、直ちにクレジットが付与され、本サービスをご利用いただけます。</p>
      </LegalSection>

      <LegalSection heading="返品・キャンセルについて">
        <p>
          本サービスはデジタルサービスの性質上、決済完了後の返金は法令上返金が義務付けられる場合を除き原則として承っておりません。サブスクリプションの解約は次回更新日の前までにお手続きください。解約時点までにお支払いいただいた料金の返金は行いません。詳細は
          <a href="/terms">利用規約</a>
          第5条をご確認ください。
        </p>
      </LegalSection>

      <LegalSection heading="動作環境">
        <p>Google Chrome、Safari、Microsoft Edge等の最新版のモダンブラウザを推奨します。</p>
      </LegalSection>
    </LegalPage>
  );
}
