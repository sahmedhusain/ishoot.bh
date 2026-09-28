"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { USER_ROLES } from "@ishoot/config/constants";
import { createUserAction } from "../../app/actions/users";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewUserFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<any>("producer");
  const [department, setDepartment] = React.useState("production");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    setSaving(true);

    try {
      await createUserAction({
        full_name: fullName,
        email,
        password,
        role,
        department,
        phone: phone || undefined,
      });

      router.push("/dashboard/users");
    } catch (err) {
      console.error("Failed to create user:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[#9EADA9]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#09937F]" />
            <span>{t.usersNew.title}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">{t.usersNew.subtitle}</p>
        </div>
      </div>

      <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.usersNew.nameLabel}
              </label>
              <Input
                required
                placeholder="e.g. Sayed Ahmed"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.usersNew.emailLabel}
              </label>
              <Input
                type="email"
                required
                placeholder="colleague@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.usersNew.passwordLabel}
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.usersNew.roleLabel}
              </label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                {USER_ROLES.map((r) => (
                  <option
                    key={r.value}
                    value={r.value}
                    className="bg-[#0B1210] text-white"
                  >
                    {t.security.roles[r.value as keyof typeof t.security.roles] || r.value}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link href="/dashboard/users">
              <Button type="button" variant="outline" size="sm">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? t.usersNew.saving : t.usersNew.submit}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
