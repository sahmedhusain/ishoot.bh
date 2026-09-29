"use client";

import * as React from "react";
import { Button, Card, Modal, Input, ConfirmDestructiveModal } from "@ishoot/ui";
import { Plus, Edit, Trash2 } from "lucide-react";
import { createStatisticAction, updateStatisticAction, deleteStatisticAction } from "../../app/actions/cms";

export function StatsManagementView({ initialStats }: { initialStats: any[] }) {
  const [stats, setStats] = React.useState(initialStats);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [value, setValue] = React.useState("");
  const [labelEn, setLabelEn] = React.useState("");
  const [labelAr, setLabelAr] = React.useState("");
  const [subLabelEn, setSubLabelEn] = React.useState("");
  const [subLabelAr, setSubLabelAr] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState(0);

  const handleOpenNew = () => {
    setEditingItem(null);
    setValue(""); setLabelEn(""); setLabelAr("");
    setSubLabelEn(""); setSubLabelAr(""); setIcon(""); setSortOrder(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setValue(item.value); setLabelEn(item.labelEn); setLabelAr(item.labelAr);
    setSubLabelEn(item.subLabelEn || ""); setSubLabelAr(item.subLabelAr || "");
    setIcon(item.icon || ""); setSortOrder(item.sortOrder);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { value, labelEn, labelAr, subLabelEn, subLabelAr, icon, sortOrder };
    try {
      if (editingItem) {
        await updateStatisticAction(editingItem.id, data);
      } else {
        await createStatisticAction(data);
      }
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStatisticAction(deleteId);
      setStats(stats.filter((s) => s.id !== deleteId));
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
            Studio Statistics
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage the KPI metric cards displayed on the website.</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-[#09937F] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Statistic
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.id} className="p-5 dark:bg-[#111C19] flex flex-col justify-between">
            <div>
              <div className="text-2xl font-mono font-bold text-[#09937F] mb-2">{stat.value}</div>
              <h3 className="font-bold text-sm dark:text-white">{stat.labelEn}</h3>
              <p className="text-xs text-slate-500 mt-1">{stat.subLabelEn}</p>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(stat)} className="flex-1"><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteId(stat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Edit Statistic" : "New Statistic"} >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1"><label className="text-xs font-bold block mb-1">Value (e.g. 150+)</label><Input value={value} onChange={e=>setValue(e.target.value)} required /></div>
            <div className="col-span-2 sm:col-span-1"><label className="text-xs font-bold block mb-1">Lucide Icon Name</label><Input value={icon} onChange={e=>setIcon(e.target.value)} placeholder="Film, Video, etc." /></div>
            <div><label className="text-xs font-bold block mb-1">Label (En)</label><Input value={labelEn} onChange={e=>setLabelEn(e.target.value)} required /></div>
            <div><label className="text-xs font-bold block mb-1">Label (Ar)</label><Input value={labelAr} onChange={e=>setLabelAr(e.target.value)} required /></div>
            <div><label className="text-xs font-bold block mb-1">Sub-Label (En)</label><Input value={subLabelEn} onChange={e=>setSubLabelEn(e.target.value)} /></div>
            <div><label className="text-xs font-bold block mb-1">Sub-Label (Ar)</label><Input value={subLabelAr} onChange={e=>setSubLabelAr(e.target.value)} /></div>
          </div>
          <div><label className="text-xs font-bold block mb-1">Sort Order</label><Input type="number" value={sortOrder} onChange={e=>setSortOrder(Number(e.target.value))} /></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#09937F] text-white">Save Statistic</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Statistic" description="Are you sure?" />
    </div>
  );
}
