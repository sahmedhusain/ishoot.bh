"use client";

import * as React from "react";
import type { StudioEquipment } from "@ishoot/database/types";
import {
Button,Badge,
Modal,
Input,
Select,
CurrencyDisplay,
ConfirmDestructiveModal
} from "@ishoot/ui";
import { Plus,Trash2,CheckCircle2,Filter } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
deleteEquipmentAction,
createEquipmentAction,
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
  const [dailyRate, setDailyRate] = React.useState<number>(150);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    setSaving(true);

    try {
      const res = await createEquipmentAction({
        category,
        model_name: modelName,
        name_ar: nameAr || modelName,
        brand: brand || undefined,
        specification: specification || undefined,
        daily_rate_bhd: dailyRate,
        quantity,
      });

      if (res.item) {
        setEquipment((prev) => [...prev, res.item]);
      }
      setIsModalOpen(false);
      setModelName("");
      setNameAr("");
      setBrand("");
      setSpecification("");
      setDailyRate(150);
      setQuantity(1);
    } catch (err) {
      console.error("Failed to create equipment:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.cms.equipmentTitle}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.equipmentView.subtitle}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addEquipment}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-[#9EADA9] shrink-0" />
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === c.value
                ? "bg-[#09937F] text-white shadow-lg shadow-[#09937F]/20"
                : "bg-[#0B1210] border border-white/10 text-[#9EADA9] hover:text-white hover:border-white/20"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase  tracking-wider">
            <tr>
              <th className="p-4 text-start">{t.equipmentView.category}</th>
              <th className="p-4 text-start">{t.equipmentView.modelName}</th>
              <th className="p-4 text-start">{t.equipmentView.specs}</th>
              <th className="p-4 text-center">{t.equipmentView.qty}</th>
              <th className="p-4 text-end">{t.cms.dailyRate}</th>
              <th className="p-4 text-end">{t.equipmentView.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.map((eq) => (
              <tr
                key={eq.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-4">
                  <Badge variant="emerald">{eq.category.toUpperCase()}</Badge>
                </td>
                <td className="p-4">
                  <div className="font-bold text-white text-sm">
                    {locale === "ar"
                      ? eq.name_ar || eq.model_name
                      : eq.model_name}
                  </div>
                  {eq.brand && (
                    <div className="text-[11px]  text-[#09937F]">
                      {eq.brand}
                    </div>
                  )}
                </td>
                <td className="p-4 text-[#9EADA9] max-w-xs truncate">
                  {eq.specification || "—"}
                </td>
                <td className="p-4 text-center  text-white">
                  {eq.quantity || 1}
                </td>
                <td className="p-4 text-end  font-bold text-[#09937F]">
                  {eq.daily_rate_bhd ? (
                    <CurrencyDisplay
                      amount={eq.daily_rate_bhd}
                      currency="BHD"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4 text-end">
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.actions.addEquipment}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
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
              <label className="text-xs text-white mb-1.5 block">
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
              <label className="text-xs text-white mb-1.5 block">
                {t.equipmentView.category}
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="cameras" className="bg-[#0B1210] text-white">
                  {t.equipmentView.categories.cameras}
                </option>
                <option value="lenses" className="bg-[#0B1210] text-white">
                  {t.equipmentView.categories.lenses}
                </option>
                <option value="lighting" className="bg-[#0B1210] text-white">
                  {t.equipmentView.categories.lighting}
                </option>
                <option value="audio" className="bg-[#0B1210] text-white">
                  {t.equipmentView.categories.audio}
                </option>
                <option value="grip" className="bg-[#0B1210] text-white">
                  {t.equipmentView.categories.grip}
                </option>
                <option value="drones" className="bg-[#0B1210] text-white">
                  {t.equipmentView.categories.drones}
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
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
            <label className="text-xs text-white mb-1.5 block">
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
              <label className="text-xs text-white mb-1.5 block">
                {t.equipmentView.dailyRateBhd}
              </label>
              <Input
                type="number"
                step="0.001"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
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

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
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
