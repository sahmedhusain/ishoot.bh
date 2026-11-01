"use client";
import { DataTable } from "@platform/ui";

import * as React from "react";
import type { StudioEquipment } from "@platform/database/types";
import {
  Button, Badge,
  Modal,
  Input,
  ConfirmDialog
} from "@platform/ui";
import { Plus, Trash2, CheckCircle2, Filter, Pencil } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  deleteEquipmentAction,
  createEquipmentAction,
  updateEquipmentAction,
} from "../../app/actions/cms";
import { PageHeader } from "../layout/PageHeader";

interface EquipmentManagementViewProps {
  initialEquipment: StudioEquipment[];
}

export function EquipmentManagementView({
  initialEquipment,
}: EquipmentManagementViewProps) {
  const modalFormId = React.useId();

  const { t, locale } = useAdminLocale();
  const [equipment, setEquipment] =
    React.useState<StudioEquipment[]>(initialEquipment);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);

  const [modelName, setModelName] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [category, setCategory] =
    React.useState<StudioEquipment["category"]>("");
  const [brand, setBrand] = React.useState("");
  const [specification, setSpecification] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState<number>(1);

  const categories = [
    { value: "", label: t.actions.all },
    ...Array.from(new Set(equipment.map((item) => item.category).filter(Boolean))).map((value) => ({ value, label: value })),
  ];

  const filteredItems =
    selectedCategory === ""
      ? equipment
      : equipment.filter((eq) => eq.category === selectedCategory);

  const handleDelete = async (id: string) => {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteEquipmentAction(id);
    } catch (err) {
      console.error("Failed to delete equipment:", err);
    }
  };

  const openEditor = (item?: StudioEquipment) => {
    setEditingId(item?.id ?? null);
    setModelName(item?.model_name ?? "");
    setNameAr(item?.name_ar ?? "");
    setCategory(item?.category ?? "");
    setBrand(item?.brand ?? "");
    setSpecification(item?.specification ?? "");
    setQuantity(item?.quantity ?? 1);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    setSaving(true);

    try {
      const payload = {
        category,
        model_name: modelName,
        name_ar: nameAr || modelName,
        brand: brand || undefined,
        specification: specification || undefined,
        quantity,
      };
      if (editingId) {
        const res = await updateEquipmentAction(editingId, payload);
        if (res.item) setEquipment((prev) => prev.map((eq) => (eq.id === editingId ? res.item! : eq)));
      } else {
        const res = await createEquipmentAction(payload);
        if (res.item) setEquipment((prev) => [...prev, res.item]);
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save equipment:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        actions={<Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => openEditor()}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addEquipment}</span>
        </Button>}
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-ink-muted shrink-0" />
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === c.value
              ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
              : "bg-surface border border-outline-variant text-ink-muted hover:text-ink hover:border-outline-variant"
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-outline-variant rounded-3xl overflow-x-auto shadow-sm">
        <DataTable className="w-full text-start text-xs">
          <thead className="bg-surface-sunken border-b border-outline-variant text-ink-muted uppercase  tracking-wider">
            <tr>
              <th className="p-4 text-start">{t.equipmentView.category}</th>
              <th className="p-4 text-start">{t.equipmentView.modelName}</th>
              <th className="p-4 text-start">{t.equipmentView.specs}</th>
              <th className="p-4 text-center">{t.equipmentView.qty}</th>
              <th className="p-4 text-end">{t.equipmentView.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filteredItems.map((eq) => (
              <tr
                key={eq.id}
                className="hover:bg-ink/[0.02] transition-colors"
              >
                <td className="p-4">
                  <Badge variant="emerald">{eq.category.toUpperCase()}</Badge>
                </td>
                <td className="p-4">
                  <div className="font-bold text-ink text-sm">
                    {locale === "ar"
                      ? eq.name_ar || eq.model_name
                      : eq.model_name}
                  </div>
                  {eq.brand && (
                    <div className="text-[11px]  text-accent">
                      {eq.brand}
                    </div>
                  )}
                </td>
                <td className="p-4 text-ink-muted max-w-xs truncate">
                  {eq.specification || "—"}
                </td>
                <td className="p-4 text-center  text-ink">
                  {eq.quantity || 1}
                </td>
                <td className="p-4 text-end whitespace-nowrap">
                  <button
                    onClick={() => openEditor(eq)}
                    className="p-1.5 me-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
                    title={t.actions.edit}
                    aria-label={t.actions.edit}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(eq.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title={t.actions.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      <Modal closeLabel={t.actions.close}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t.equipmentView.editEquipment : t.actions.addEquipment}
       footer={<div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-1.5"
             form={modalFormId}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.actions.save}</span>
            </Button>
          </div>}>
        <form onSubmit={handleSave} className="space-y-4" id={modalFormId}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.modelNameEnLabel}
              </span>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={t.equipmentView.modelNamePlaceholder}
                required
              />
            </label>
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.itemNameArLabel}
              </span>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t.equipmentView.itemNamePlaceholder}
               dir="rtl"/>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.category}
              </span>
              <Input value={category} onChange={(event) => setCategory(event.target.value)} list="resource-categories" maxLength={80} required />
              <datalist id="resource-categories">{categories.filter((item) => item.value).map((item) => <option key={item.value} value={item.value} />)}</datalist>
            </label>
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.brand}
              </span>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={t.equipmentView.brandPlaceholder}
              />
            </label>
          </div>

          <label>
            <span className="text-xs text-ink mb-1.5 block">
              {t.equipmentView.specs}
            </span>
            <Input
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder={t.equipmentView.specsPlaceholder}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.availableQty}
              </span>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                required
              />
            </label>
          </div>


        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDelete(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.equipmentView.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
