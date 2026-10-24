"use client";
import type { FaqItem } from "../../types/cms";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { Button, Card, Badge, Modal, Input, ConfirmDestructiveModal } from "@platform/ui";
import { Plus, Edit, Trash2 } from "lucide-react";
import { createFaqAction, updateFaqAction, deleteFaqAction } from "../../app/actions/cms";

export function FaqsManagementView({ initialFaqs }: { initialFaqs: FaqItem[] }) {
  const { t, isRTL } = useAdminLocale();
  const [faqs, setFaqs] = React.useState(initialFaqs);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [questionEn, setQuestionEn] = React.useState("");
  const [questionAr, setQuestionAr] = React.useState("");
  const [answerEn, setAnswerEn] = React.useState("");
  const [answerAr, setAnswerAr] = React.useState("");
  const [isPublished, setIsPublished] = React.useState(true);
  const [sortOrder, setSortOrder] = React.useState(0);

  const handleOpenNew = () => {
    setEditingItem(null);
    setQuestionEn(""); setQuestionAr("");
    setAnswerEn(""); setAnswerAr("");
    setSortOrder(0); setIsPublished(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setQuestionEn(item.questionEn); setQuestionAr(item.questionAr);
    setAnswerEn(item.answerEn); setAnswerAr(item.answerAr);
    setSortOrder(item.sortOrder); setIsPublished(item.isPublished);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { questionEn, questionAr, answerEn, answerAr, sortOrder, isPublished };
    try {
      if (editingItem) {
        await updateFaqAction(editingItem.id, data);
      } else {
        await createFaqAction(data);
      }
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteFaqAction(deleteId);
      setFaqs(faqs.filter((f) => f.id !== deleteId));
    } catch (error) {
      console.error(error);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.faqsView.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.faqsView.subtitle}</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-accent text-white">
          <Plus className="w-4 h-4 me-2" /> {t.faqsView.newFaq}
        </Button>
      </div>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <Card key={faq.id} className="p-4 dark:bg-surface-raised flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={faq.isPublished ? "emerald" : "default"}>
                  {faq.isPublished ? t.faqsView.published : t.faqsView.hidden}
                </Badge>
                <span className="text-xs text-slate-400 ">
                  {t.faqsView.order}: {faq.sortOrder}
                </span>
              </div>
              <h3 className="font-bold text-sm dark:text-white">
                {isRTL && faq.questionAr ? faq.questionAr : faq.questionEn}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {isRTL && faq.answerAr ? faq.answerAr : faq.answerEn}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button aria-label={t.actions.edit} variant="outline" size="sm" onClick={() => handleOpenEdit(faq)}><Edit className="w-3.5 h-3.5" /></Button>
              <Button aria-label={t.actions.delete} variant="danger" size="sm" onClick={() => setDeleteId(faq.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal closeLabel={t.actions.close} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? t.faqsView.editFaq : t.faqsView.newFaq}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="text-xs font-bold block mb-1">{t.faqsView.questionEn}</label><Input value={questionEn} onChange={e=>setQuestionEn(e.target.value)} required /></div>
          <div><label className="text-xs font-bold block mb-1">{t.faqsView.questionAr}</label><Input value={questionAr} onChange={e=>setQuestionAr(e.target.value)} required /></div>
          <div><label className="text-xs font-bold block mb-1">{t.faqsView.answerEn}</label><textarea className="w-full rounded-md border p-2 text-sm bg-transparent dark:border-white/20" rows={4} value={answerEn} onChange={e=>setAnswerEn(e.target.value)} required /></div>
          <div><label className="text-xs font-bold block mb-1">{t.faqsView.answerAr}</label><textarea className="w-full rounded-md border p-2 text-sm bg-transparent dark:border-white/20" rows={4} value={answerAr} onChange={e=>setAnswerAr(e.target.value)} required /></div>

          <div className="flex justify-between items-center pt-2">
            <div><label className="text-xs font-bold block mb-1">{t.faqsView.sortOrder}</label><Input type="number" value={sortOrder} onChange={e=>setSortOrder(Number(e.target.value))} /></div>
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={e=>setIsPublished(e.target.checked)} className="w-4 h-4" /> {t.faqsView.publishOnWebsite}
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t.faqsView.cancel}</Button>
            <Button type="submit" className="bg-accent text-white">{t.faqsView.saveFaq}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t.faqsView.deleteFaq} description={t.faqsView.deleteConfirm} />
    </div>
  );
}
