import Link from "next/link"

export default function SettingsPage() {
  return (
    <div>
      <p>設定ページです</p>
      <Link href="/settings/billing" className="underline">
        クレジット・お支払い
      </Link>
    </div>
  )
}
