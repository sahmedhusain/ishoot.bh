'use client';

import * as React from 'react';
import type { Expense, ExpenseCategory, CRMDeal } from '@ishoot/database/types';
import { Card, Button, Input, Select, Modal, CurrencyDisplay, Badge } from '@ishoot/ui';
import { Plus, Receipt, Tag, TrendingDown, Trash2, CheckCircle2 } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { createExpenseAction, deleteExpenseAction } from '../../app/actions/finance';

interface ExpensesManagementViewProps {
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  deals: CRMDeal[];
}

export function ExpensesManagementView({
  initialExpenses,
  categories,
  deals,
}: ExpensesManagementViewProps) {
  const { t, locale } = useAdminLocale();

  const [expenses, setExpenses] = React.useState<Expense[]>(initialExpenses);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form states
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id || '');
  const [dealId, setDealId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [descriptionAr, setDescriptionAr] = React.useState('');
  const [amount, setAmount] = React.useState<number>(0);
  const [vendorName, setVendorName] = React.useState('');
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = React.useState(false);

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;
    setSaving(true);

    try {
      const res = await createExpenseAction({
        category_id: categoryId || undefined,
        deal_id: dealId || undefined,
        amount: Number(amount),
        description_en: description,
        description_ar: descriptionAr || description,
        vendor_name: vendorName || undefined,
        expense_date: new Date(expenseDate).toISOString(),
      });

      if (res.expense) {
        setExpenses((prev) => [res.expense, ...prev]);
      }
      setModalOpen(false);
      setDescription('');
      setDescriptionAr('');
      setAmount(0);
      setVendorName('');
    } catch (err) {
      console.error('Failed to create expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?')) {
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExpenseAction(id);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.expenses}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'متابعة نفقات الإنتاج السينمائي، إيجار المعدات، أجور الطواقم الفنية، والتكاليف التشغيلية.'
              : 'Track production expenditures, camera rentals, crew payroll, and studio operational overhead.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addExpense}</span>
        </Button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.operatingExpenses}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={totalExpense} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]">
            {expenses.length} {locale === 'ar' ? 'سند مصروف مسجل' : 'logged expense items'}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{locale === 'ar' ? 'تصنيفات التكاليف' : 'Cost Centers'}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {categories.length}
          </div>
          <div className="text-[11px] text-emerald-400">
            {locale === 'ar' ? 'موزعة عبر الأقسام' : 'production & studio overhead'}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{locale === 'ar' ? 'المشاريع المرتبطة' : 'Linked Projects'}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {deals.length}
          </div>
          <div className="text-[11px] text-[#09937F]">
            {locale === 'ar' ? 'صفقات قيد المتابعة' : 'active commercial contracts'}
          </div>
        </Card>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">{locale === 'ar' ? 'البيان / الوصف' : 'Description'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'التصنيف' : 'Category'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'المورد / الجهة' : 'Vendor'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'المشروع' : 'Deal / Project'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
              <th className="p-4 text-end">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className="p-4 text-end">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="font-bold text-white text-sm">
                    {locale === 'ar' ? (expense.description_ar || expense.description_en) : expense.description_en}
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant="outline">
                    {expense.category ? (locale === 'ar' ? expense.category.name_ar : expense.category.name_en) : '—'}
                  </Badge>
                </td>
                <td className="p-4 text-[#9EADA9] font-mono">
                  {expense.vendor_name || '—'}
                </td>
                <td className="p-4 text-[#09937F] font-mono">
                  {expense.deal?.title || '—'}
                </td>
                <td className="p-4 text-[#9EADA9] font-mono">
                  {new Date(expense.expense_date).toLocaleDateString(locale === 'ar' ? 'ar-BH' : 'en-GB')}
                </td>
                <td className="p-4 text-end font-mono font-bold text-rose-400">
                  -<CurrencyDisplay amount={Number(expense.amount)} currency="BHD" />
                </td>
                <td className="p-4 text-end">
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors inline-flex"
                    title={t.actions.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.actions.addExpense}
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'}
              </label>
              <Input
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder="إيجار عدسات سينمائية للتصوير الخارجي"
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'}
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cinema lenses rental for exterior shoot"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'المبلغ (BHD)' : 'Amount (BHD)'}
              </label>
              <Input
                type="number"
                step="0.001"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.000"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'التصنيف' : 'Category'}
              </label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0B1210] text-white">
                    {locale === 'ar' ? c.name_ar : c.name_en}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'اسم المورد / الجهة المستفيدة' : 'Vendor Name'}
              </label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="CineRent Gulf W.L.L."
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الصفقة / المشروع المرتبط' : 'Linked Deal'}
              </label>
              <Select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
              >
                <option value="" className="bg-[#0B1210] text-white">
                  {locale === 'ar' ? 'غير مرتبط بصفقة معينة (مصروف عام)' : 'General Studio Overhead'}
                </option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#0B1210] text-white">
                    {d.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'تاريخ الصرف' : 'Expense Date'}
            </label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.actions.save}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
