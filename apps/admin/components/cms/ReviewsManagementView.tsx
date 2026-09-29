"use client";

import * as React from "react";
import { Button, Card, Badge, Modal, Input, ConfirmDestructiveModal } from "@ishoot/ui";
import { Plus, Edit, Trash2, Star, CheckCircle, XCircle } from "lucide-react";
import { createReviewAction, updateReviewAction, deleteReviewAction } from "../../app/actions/cms";

export function ReviewsManagementView({ initialReviews }: { initialReviews: any[] }) {
  const [reviews, setReviews] = React.useState(initialReviews);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [authorEn, setAuthorEn] = React.useState("");
  const [authorAr, setAuthorAr] = React.useState("");
  const [companyEn, setCompanyEn] = React.useState("");
  const [companyAr, setCompanyAr] = React.useState("");
  const [quoteEn, setQuoteEn] = React.useState("");
  const [quoteAr, setQuoteAr] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [isApproved, setIsApproved] = React.useState(true);

  const handleOpenNew = () => {
    setEditingItem(null);
    setAuthorEn(""); setAuthorAr("");
    setCompanyEn(""); setCompanyAr("");
    setQuoteEn(""); setQuoteAr("");
    setRating(5); setIsApproved(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setAuthorEn(item.authorEn); setAuthorAr(item.authorAr);
    setCompanyEn(item.companyEn || ""); setCompanyAr(item.companyAr || "");
    setQuoteEn(item.quoteEn); setQuoteAr(item.quoteAr);
    setRating(item.rating); setIsApproved(item.isApproved);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { authorEn, authorAr, companyEn, companyAr, quoteEn, quoteAr, rating, isApproved };
    try {
      if (editingItem) {
        await updateReviewAction(editingItem.id, data);
      } else {
        await createReviewAction(data);
      }
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReviewAction(deleteId);
      setReviews(reviews.filter((r) => r.id !== deleteId));
    } catch (error) {
      console.error(error);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Customer Reviews & Ratings
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage client testimonials, star ratings, and web visibility.</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-[#09937F] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Review
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((rev) => (
          <Card key={rev.id} className="p-5 dark:bg-[#111C19]">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(rev.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <Badge variant={rev.isApproved ? "emerald" : "default"}>
                {rev.isApproved ? "Published" : "Hidden"}
              </Badge>
            </div>
            <p className="text-sm italic text-slate-700 dark:text-slate-300">"{rev.quoteEn}"</p>
            <div className="mt-4">
              <p className="font-bold text-sm dark:text-white">{rev.authorEn}</p>
              <p className="text-xs text-slate-500">{rev.companyEn}</p>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(rev)}><Edit className="w-3.5 h-3.5" /></Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteId(rev.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Edit Review" : "New Review"} >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold block mb-1">Author (En)</label><Input value={authorEn} onChange={e=>setAuthorEn(e.target.value)} required /></div>
            <div><label className="text-xs font-bold block mb-1">Author (Ar)</label><Input value={authorAr} onChange={e=>setAuthorAr(e.target.value)} required /></div>
            <div><label className="text-xs font-bold block mb-1">Company (En)</label><Input value={companyEn} onChange={e=>setCompanyEn(e.target.value)} /></div>
            <div><label className="text-xs font-bold block mb-1">Company (Ar)</label><Input value={companyAr} onChange={e=>setCompanyAr(e.target.value)} /></div>
          </div>
          <div><label className="text-xs font-bold block mb-1">Quote (En)</label><textarea className="w-full rounded-md border p-2 text-sm bg-transparent dark:border-white/20" rows={3} value={quoteEn} onChange={e=>setQuoteEn(e.target.value)} required /></div>
          <div><label className="text-xs font-bold block mb-1">Quote (Ar)</label><textarea className="w-full rounded-md border p-2 text-sm bg-transparent dark:border-white/20" rows={3} value={quoteAr} onChange={e=>setQuoteAr(e.target.value)} required /></div>
          <div className="flex justify-between items-center pt-2">
            <div><label className="text-xs font-bold block mb-1">Rating (1-5)</label><Input type="number" min="1" max="5" value={rating} onChange={e=>setRating(Number(e.target.value))} /></div>
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={isApproved} onChange={e=>setIsApproved(e.target.checked)} className="w-4 h-4" /> Publish on Website
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#09937F] text-white">Save Review</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Review" description="Are you sure you want to permanently delete this review?" />
    </div>
  );
}
