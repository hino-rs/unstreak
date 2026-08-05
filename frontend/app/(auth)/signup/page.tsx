import { signup } from "../actions";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6">アカウント作成</h1>

      <form action={signup} className="flex flex-col gap-4">
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="signup-email"
            required
            className="w-full border px-3 py-2 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            id="signup-password"
            required
            className="w-full border px-3 py-2 rounded-md"
          />
        </div>

        <Button type="submit" className="w-full mt-2">
          登録
        </Button>
      </form>
    </div>
  );
}
