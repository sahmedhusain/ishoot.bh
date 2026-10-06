"use client";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { createUserAction } from "../../app/actions/users";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewUserFormView({
  roles,
  employees,
}: {
  employees: Array<{
    id: string;
    employeeNumber: string;
    firstNameEn: string;
    lastNameEn: string;
    email: string | null;
  }>;
  roles: Array<{ id: string; nameEn: string; nameAr: string }>;
}) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();

  const [employeeId, setEmployeeId] = React.useState("");
  const [error, setError] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<any>("producer");
  const [department] = React.useState("production");
  const [phone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    setSaving(true);

    try {
      await createUserAction({
        employeeId,
        full_name: fullName,
        email,
        password,
        role,
        department,
        phone: phone || undefined,
      });

      router.push(ROUTES.users.list);
    } catch (err) {
      setError(errorMessage(err, t, t.hrExtensions.failed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.users.list}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-ink-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <span>{t.usersNew.title}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">{t.usersNew.subtitle}</p>
        </div>
      </div>

      <Card className="p-8 bg-surface border border-ink/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block text-ink">
            {t.hrExtensions.employeeFirst}
            <Select
              required
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                const employee = employees.find(
                  (item) => item.id === e.target.value,
                );
                if (employee) {
                  setFullName(`${employee.firstNameEn} ${employee.lastNameEn}`);
                  setEmail(employee.email || "");
                }
              }}
            >
              <option value="">{t.hrExtensions.selectEmployee}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNumber} — {employee.firstNameEn}{" "}
                  {employee.lastNameEn}
                </option>
              ))}
            </Select>
          </label>
          <Link href={ROUTES.hr.newEmployee()} className="text-emerald-500">
            {t.hrExtensions.createEmployee}
          </Link>
          {error && (
            <p role="alert" className="text-red-500">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.usersNew.nameLabel}
              </label>
              <Input
                required
                placeholder={t.usersNew.fullNamePlaceholder}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.usersNew.emailLabel}
              </label>
              <Input
                type="email"
                required
                placeholder={t.usersNew.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.usersNew.passwordLabel}
              </label>
              <Input
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
                placeholder={t.usersNew.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.usersNew.roleLabel}
              </label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                {roles.map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    className="bg-surface text-ink"
                  >
                    {isRTL ? r.nameAr : r.nameEn}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-ink/10 flex items-center justify-end gap-4">
            <Link href={ROUTES.users.list}>
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
