"use client";

import * as React from "react";
import type { StudioEquipment } from "@ishoot/database/types";
import {
Button,Badge,
Modal,
Input,
Select,
ConfirmDestructiveModal
} from "@ishoot/ui";
import { Plus,Trash2,CheckCircle2,Filter,Pencil } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
deleteEquipmentAction,
createEquipmentAction,
updateEquipmentAction,
} from "../../app/actions/cms";

interface EquipmentManagementViewProps {
  initialEquipment: StudioEquipment[];
}

export function EquipmentManagementView({
  initialEquipment,
}: EquipmentManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const [equipment, setEquipment] =
    React.useState<StudioEquipment[]>(initialEquipment);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);

  const [modelName, setModelName] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [category, setCategory] =
    React.useState<StudioEquipment["category"]>("cameras");
  const [brand, setBrand] = React.useState("");
  const [specification, setSpecification] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState<number>(1);

  const categories = [
    { value: "all", label: t.actions.all },
    { value: "cameras", label: t.equipmentView.categories.cameras },
    { value: "lenses", label: t.equipmentView.categories.lenses },
    { value: "lighting", label: t.equipmentView.categories.lighting },
    { value: "audio", label: t.equipmentView.categories.audio },
    { value: "grip", label: t.equipmentView.categories.grip },
    { value: "drones", label: t.equipmentView.categories.drones },
  ];

  const filteredItems =
    selectedCategory === "all"
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
    setCategory(item?.category ?? "cameras");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
            {t.cms.equipmentTitle}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {t.equipmentView.subtitle}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => openEditor()}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addEquipment}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-ink-muted shrink-0" />
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === c.value
                ? "bg-accent text-white shadow-lg shadow-accent/20"
                : "bg-surface border border-ink/10 text-ink-muted hover:text-ink hover:border-ink/20"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-ink/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-surface-sunken border-b border-ink/10 text-ink-muted uppercase  tracking-wider">
            <tr>
              <th className="p-4 text-start">{t.equipmentView.category}</th>
              <th className="p-4 text-start">{t.equipmentView.modelName}</th>
              <th className="p-4 text-start">{t.equipmentView.specs}</th>
              <th className="p-4 text-center">{t.equipmentView.qty}</th>
              <th className="p-4 text-end">{t.equipmentView.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
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
        </table>
      </div>

      <Modal closeLabel={t.actions.close}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t.equipmentView.editEquipment : t.actions.addEquipment}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.modelNameEnLabel}
              </label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={t.equipmentView.modelNamePlaceholder}
                required
              />
            </div>
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.itemNameArLabel}
              </label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t.equipmentView.itemNamePlaceholder}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.category}
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="cameras" className="bg-surface text-ink">
                  {t.equipmentView.categories.cameras}
                </option>
                <option value="lenses" className="bg-surface text-ink">
                  {t.equipmentView.categories.lenses}
                </option>
                <option value="lighting" className="bg-surface text-ink">
                  {t.equipmentView.categories.lighting}
                </option>
                <option value="audio" className="bg-surface text-ink">
                  {t.equipmentView.categories.audio}
                </option>
                <option value="grip" className="bg-surface text-ink">
                  {t.equipmentView.categories.grip}
                </option>
                <option value="drones" className="bg-surface text-ink">
                  {t.equipmentView.categories.drones}
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.brand}
              </label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={t.equipmentView.brandPlaceholder}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-ink mb-1.5 block">
              {t.equipmentView.specs}
            </label>
            <Input
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder={t.equipmentView.specsPlaceholder}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.equipmentView.availableQty}
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-ink/10">
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
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.actions.save}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal
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
