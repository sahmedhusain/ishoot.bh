'use client';

import * as React from 'react';
import {
  getAllExpenses,
  getExpenseCategories,
  getCRMDeals,
  createExpense,
  Expense,
  ExpenseCategory,
  CRMDeal,
} from '@ishoot/database';
import { Card, Button, Input, Select, Modal, CurrencyDisplay, Badge } from '@ishoot/ui';
import { Plus, Receipt, Tag, TrendingDown } from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [deals, setDeals] = React.useState<CRMDeal[]>([]);

  const [modalOpen, setModalOpen] = React.useState(false);

  // Form states
  const [categoryId, setCategoryId] = React.useState('');
  const [dealId, setDealId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState<number>(0);
  const [vendorName, setVendorName] = React.useState('');
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = React.useState(false);

  const loadData = React.useCallback(() => {
    Promise.all([getAllExpenses(), getExpenseCategories(), getCRMDeals()]).then(
      ([exp, cats, dList]) => {
        setExpenses(exp);
        setCategories(cats);
        setDeals(dList);
        if (cats.length > 0) setCategoryId(cats[0].id);
      }
    );
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense({
      category_id: categoryId,
      deal_id: dealId || undefined,
      description_en: description,
      amount: Number(amount),
      currency: 'BHD',
      expense_date: expenseDate,
      vendor_name: vendorName,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? 'monthly' : undefined,
    });
    setModalOpen(false);
    setDescription('');
    setAmount(0);
    setVendorName('');
    loadData();
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Operating & Production Expenses
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Track gear rentals, freelance crew wages, travel logistics, studio lease, and software overhead.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 px-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-[10px] text-[#9EADA9] uppercase font-mono">Total Expenses</div>
              <div className="text-lg font-bold text-white font-mono">
                <CurrencyDisplay amount={totalExpenses} currency="BHD" />
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">Expense Date</th>
              <th className="p-4 text-start">Category</th>
              <th className="p-4 text-start">Description & Vendor</th>
              <th className="p-4 text-start">Linked Project</th>
              <th className="p-4 text-end">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-mono text-[#9EADA9]">{e.expense_date}</td>
                <td className="p-4">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                    style={{
                      backgroundColor: `${e.category?.color || '#9EADA9'}15`,
                      color: e.category?.color || '#9EADA9',
                      borderColor: `${e.category?.color || '#9EADA9'}30`,
                    }}
                  >
                    {e.category?.name_en || 'General'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-white">{e.description_en}</div>
                  {e.vendor_name && (
                    <div className="text-[11px] text-[#9EADA9]">Vendor: {e.vendor_name}</div>
                  )}
                </td>
                <td className="p-4">
                  {e.deal?.title ? (
                    <span className="text-[#09937F] font-medium">{e.deal.title}</span>
                  ) : (
                    <span className="text-[#9EADA9]/40">Studio Overhead</span>
                  )}
                </td>
                <td className="p-4 text-end font-mono font-bold text-white">
                  <CurrencyDisplay amount={e.amount} currency={e.currency} />
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
        title="Record Operating or Project Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">Expense Category *</label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en} ({c.name_ar})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">Description *</label>
            <Input
              required
              placeholder="e.g. Lens set rental for commercial shoot"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Amount (BHD) *</label>
              <Input
                type="number"
                step="0.001"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Date *</label>
              <Input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">Vendor / Supplier</label>
            <Input
              placeholder="e.g. Manovate Gear"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">Assign to Project (Optional)</label>
            <Select value={dealId} onChange={(e) => setDealId(e.target.value)}>
              <option value="">Studio Operational Overhead (Unassigned)</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.contact?.company || 'Project'})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-[#09937F]"
            />
            <label htmlFor="recurring" className="text-xs text-[#9EADA9]">
              Recurring Monthly Expense (e.g. Studio Lease, Subscriptions)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
