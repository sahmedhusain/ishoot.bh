"use client";
import type { FaqItem } from "../../types/cms";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { Button, Card, Badge, Modal, Input, ConfirmDialog } from "@platform/ui";
import { Plus, Edit, Trash2 } from "lucide-react";
import { createFaqAction, updateFaqAction, deleteFaqAction } from "../../app/actions/cms";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { LanguageFields } from "../setup/LanguageFields";

export function FaqsManagementView({ initialFaqs, languages }: { initialFaqs: FaqItem[]; languages: readonly ContentLanguage[] }) {
  const modalFormId = React.useId();

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
      <div className="flex items-center justify-between" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">
            {t.faqsView.title}
          </h1>
          <p className="text-xs text-ink-muted mt-1">{t.faqsView.subtitle}</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-accent text-accent-foreground">
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
                <span className="text-xs text-ink-muted ">
                  {t.faqsView.order}: {faq.sortOrder}
                </span>
              </div>
              <h3 className="font-bold text-sm dark:text-ink">
                {isRTL && faq.questionAr ? faq.questionAr : faq.questionEn}
              </h3>
              <p className="text-sm text-ink-muted dark:text-ink-muted mt-1">
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

      <Modal closeLabel={t.actions.close} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? t.faqsView.editFaq : t.faqsView.newFaq} footer={<div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">{t.faqsView.cancel}</Button>
            <Button type="submit" className="bg-accent text-accent-foreground" form={modalFormId}>{t.faqsView.saveFaq}</Button>
          </div>}>
        <form onSubmit={handleSave} className="space-y-4" id={modalFormId}>
          <LanguageFields name="question" label={t.faqsView.question} languages={languages} required maxLength={500} en={questionEn} ar={questionAr} onChange={(v) => { setQuestionEn(v.en); setQuestionAr(v.ar); }} />
          <LanguageFields name="answer" label={t.faqsView.answer} languages={languages} multiline required maxLength={5000} en={answerEn} ar={answerAr} onChange={(v) => { setAnswerEn(v.en); setAnswerAr(v.ar); }} />

          <div className="flex justify-between items-center pt-2">
            <label><span className="text-xs font-bold block mb-1">{t.faqsView.sortOrder}</span><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></label>
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-4 h-4" /> {t.faqsView.publishOnWebsite}
            </label>
          </div>

        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t.faqsView.deleteFaq} description={t.faqsView.deleteConfirm} />
    </div>
  );
}
