import Link from "next/link";
import { copyFor, getLocale } from "../lib/i18n";

export default async function Forbidden() {
  const copy = copyFor(await getLocale());
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="space-y-4">
        <p className="text-lg font-semibold text-ink">
          {copy.errors.forbidden}
        </p>
        <Link href="/" className="text-sm text-accent">
          {copy.errors.home}
        </Link>
      </div>
    </main>
  );
}
