"use client";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { Card, Badge, ConfirmDestructiveModal } from "@ishoot/ui";
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  Building2,
  User,
  MessageSquare,
} from "lucide-react";
import {
  toggleReviewApprovalAction,
  deleteReviewAction,
} from "../../app/actions/cms";

export function ReviewsManagementView({ initialReviews }: { initialReviews: any[] }) {
  const { t, isRTL } = useAdminLocale();
  const [reviews, setReviews] = React.useState(initialReviews);
  const [filter, setFilter] = React.useState<"all" | "pending" | "published">("all");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const pendingCount = reviews.filter((r) => !r.isApproved).length;
  const publishedCount = reviews.filter((r) => r.isApproved).length;

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
          reviews.length
        ).toFixed(1)
      : "5.0";

  const filteredReviews = reviews.filter((r) => {
    if (filter === "pending") return !r.isApproved;
    if (filter === "published") return r.isApproved;
    return true;
  });

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    setProcessingId(id);
    try {
      const newStatus = !currentStatus;
      await toggleReviewApprovalAction(id, newStatus);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isApproved: newStatus } : r))
      );
    } catch (error) {
      console.error("Failed to toggle review status:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReviewAction(deleteId);
      setReviews((prev) => prev.filter((r) => r.id !== deleteId));
    } catch (error) {
      console.error("Failed to delete review:", error);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>{t.reviewsView.title}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#09937F]/10 text-[#09937F] border border-[#09937F]/20  font-medium">
              {t.reviewsView.badge}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-2xl">
            {t.reviewsView.subtitle}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px]  text-slate-400 dark:text-neutral-400 uppercase tracking-wider">
              {t.reviewsView.pendingApproval}
            </div>
            <div className="text-2xl font-black text-amber-500 mt-0.5">
              {pendingCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px]  text-slate-400 dark:text-neutral-400 uppercase tracking-wider">
              {t.reviewsView.liveOnWebsite}
            </div>
            <div className="text-2xl font-black text-emerald-500 mt-0.5">
              {publishedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px]  text-slate-400 dark:text-neutral-400 uppercase tracking-wider">
              {t.reviewsView.avgRating}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              <span>{averageRating}</span>
              <span className="text-xs font-normal text-amber-400">★ ★ ★ ★ ★</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#09937F]/10 border border-[#09937F]/20 text-[#09937F] flex items-center justify-center">
            <Star className="w-5 h-5 fill-current" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "all"
              ? "bg-[#014842] text-white shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          {t.reviewsView.tabAll} ({reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === "pending"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          }`}
        >
          <span>{t.reviewsView.tabPending}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter("published")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "published"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          }`}
        >
          {t.reviewsView.tabPublished} ({publishedCount})
        </button>
      </div>

      {/* Review List */}
      {filteredReviews.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            No reviews in this view.
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
            Client reviews submitted through the website will appear here for your moderation.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => (
            <Card
              key={rev.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                rev.isApproved
                  ? "bg-white dark:bg-[#111C19] border-slate-200 dark:border-white/10"
                  : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(Number(rev.rating) || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <Badge
                    variant={rev.isApproved ? "emerald" : "default"}
                    className={
                      rev.isApproved
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    }
                  >
                    {rev.isApproved ? t.reviewsView.statusPublished : t.reviewsView.statusPending}
                  </Badge>
                </div>

                <div className="pt-3 space-y-2">
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed italic">
                    "{rev.quoteEn || rev.quoteAr}"
                  </p>

                  {rev.quoteAr && rev.quoteEn && rev.quoteAr !== rev.quoteEn && (
                    <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed font-arabic text-right">
                      "{rev.quoteAr}"
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#09937F]" />
                      <span>{rev.authorEn || rev.authorAr}</span>
                    </div>
                    {(rev.companyEn || rev.companyAr) && (
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{rev.companyEn || rev.companyAr}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px]  text-slate-400 dark:text-neutral-500 text-end">
                    {rev.year || "2026"}
                  </div>
                </div>

                {/* Moderation Actions: Admin only adds (approves) or doesn't add (hides) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={processingId === rev.id}
                    onClick={() => handleToggleApproval(rev.id, rev.isApproved)}
                    className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                      rev.isApproved
                        ? "bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 dark:bg-white/5 dark:hover:bg-amber-950/40 dark:text-neutral-300 dark:hover:text-amber-300 border border-slate-200 dark:border-white/10"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    }`}
                  >
                    {rev.isApproved ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{t.reviewsView.hideFromWeb}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.reviewsView.approvePublish}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteId(rev.id)}
                    className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title={t.reviewsView.deleteReview}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDestructiveModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.reviewsView.deleteReview}
        description={t.reviewsView.deleteConfirm}
      />
    </div>
  );
}
