"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { ModalFooter, Button, Input, Modal, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { ADJUSTMENT_REASONS, MANUAL_MOVEMENTS } from "@platform/database/constants/inventory";
import type { WarehouseRecord } from "@platform/database";
import { changeStockAction, transferStockAction } from "../../app/actions/inventory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

export interface LocationOption {
  id: string;
  label: string;
}

/** The item a dialog acts on: a product, or one variant of it. */
export interface StockTarget {
  productId: string;
  variantId?: string | null;
  name: string;
  trackBatches: boolean;
}

function useSubmit(onDone: () => void) {
  const { t } = useAdminLocale();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const submit = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      onDone();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

/** Receive, adjust or write off stock of one item at one location. */
export function StockChangeModal({ target, locations, currency, onClose, onDone }: { target: StockTarget; locations: LocationOption[]; currency: string; onClose: () => void; onDone: () => void }) {
  const { t } = useAdminLocale();
  const copy = t.inventory.change;
  const [form, setForm] = React.useState({ type: "receipt", locationId: locations[0]?.id ?? "", quantity: "", direction: "in", unitCost: "", batchNumber: "", expiryDate: "", reason: "", note: "" });
  const { busy, error, submit } = useSubmit(onDone);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const receipt = form.type === "receipt";
  const save = () =>
    submit(() =>
      changeStockAction({
        type: form.type,
        productId: target.productId,
        variantId: target.variantId ?? undefined,
        locationId: form.locationId,
        quantity: Number(form.quantity),
        direction: form.type === "adjustment" ? form.direction : undefined,
        unitCost: receipt && form.unitCost !== "" ? Number(form.unitCost) : undefined,
        batchNumber: target.trackBatches ? form.batchNumber : undefined,
        expiryDate: target.trackBatches && receipt && form.expiryDate ? form.expiryDate : undefined,
        reason: receipt ? undefined : form.reason,
        note: form.note,
      }),
    );
  return (
    <Modal isOpen onClose={onClose} title={formatMessage(t.inventory.stock.changeFor, { name: target.name })} closeLabel={copy.cancel} footer={null}>
      <div className="space-y-4" data-testid="stock-change">
        <div role="radiogroup" aria-label={copy.type} className="grid grid-cols-3 gap-2">
          {MANUAL_MOVEMENTS.map((type) => (
            <button key={type} type="button" role="radio" aria-checked={form.type === type} onClick={() => set({ type, reason: type === "write_off" ? "damaged" : type === "adjustment" ? "correction" : "" })} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${form.type === type ? "border-accent bg-accent/10 text-ink" : "border-outline-variant text-ink-muted hover:border-ink/30"}`}>
              {copy.types[type]}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={copy.location}>
            {(id) => (
              <Select id={id} value={form.locationId} onChange={(e) => set({ locationId: e.target.value })} className="rounded-lg">
                {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.quantity}>
            {(id) => <Input id={id} name="quantity" type="number" min={0} step="0.001" inputMode="decimal" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} className="rounded-lg" />}
          </Field>
          {form.type === "adjustment" && (
            <Field label={copy.direction}>
              {(id) => (
                <Select id={id} value={form.direction} onChange={(e) => set({ direction: e.target.value })} className="rounded-lg">
                  <option value="in">{copy.directionIn}</option>
                  <option value="out">{copy.directionOut}</option>
                </Select>
              )}
            </Field>
          )}
          {receipt && (
            <Field label={formatMessage(copy.unitCost, { currency })}>
              {(id) => <Input id={id} name="unitCost" type="number" min={0} step="0.001" inputMode="decimal" value={form.unitCost} onChange={(e) => set({ unitCost: e.target.value })} className="rounded-lg" />}
            </Field>
          )}
          {!receipt && (
            <Field label={copy.reason}>
              {(id) => (
                <Select id={id} value={form.reason} onChange={(e) => set({ reason: e.target.value })} className="rounded-lg">
                  {ADJUSTMENT_REASONS.map((reason) => <option key={reason} value={reason}>{t.inventory.reasons[reason]}</option>)}
                </Select>
              )}
            </Field>
          )}
          {target.trackBatches && (
            <Field label={copy.batch}>
              {(id) => <Input id={id} name="batchNumber" dir="ltr" maxLength={60} value={form.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} className="rounded-lg font-mono" />}
            </Field>
          )}
          {target.trackBatches && receipt && (
            <Field label={copy.expiry}>
              {(id) => <Input id={id} name="expiryDate" type="date" value={form.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} className="rounded-lg" />}
            </Field>
          )}
          <Field label={copy.note} wide>
            {(id) => <Input id={id} maxLength={500} value={form.note} onChange={(e) => set({ note: e.target.value })} className="rounded-lg" />}
          </Field>
        </div>
        {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
        <ModalFooter><div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{copy.cancel}</Button>
          <Button type="button" variant="primary" size="sm" className="gap-1.5" disabled={busy || !form.quantity || !form.locationId} onClick={save} data-testid="stock-change-save">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? copy.saving : copy.save}
          </Button>
        </div></ModalFooter>
      </div>
    </Modal>
  );
}

/** Moves stock of one item from one location to another. */
export function TransferModal({ target, locations, onClose, onDone }: { target: StockTarget; locations: LocationOption[]; onClose: () => void; onDone: () => void }) {
  const { t } = useAdminLocale();
  const copy = t.inventory.change;
  const [form, setForm] = React.useState({ fromLocationId: locations[0]?.id ?? "", toLocationId: locations[1]?.id ?? "", quantity: "", batchNumber: "", note: "" });
  const { busy, error, submit } = useSubmit(onDone);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const select = (key: "fromLocationId" | "toLocationId", label: string) => (
    <Field label={label}>
      {(id) => (
        <Select id={id} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} className="rounded-lg">
          {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>
      )}
    </Field>
  );
  return (
    <Modal isOpen onClose={onClose} title={formatMessage(t.inventory.stock.transferFor, { name: target.name })} closeLabel={copy.cancel} footer={null}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {select("fromLocationId", copy.from)}
          {select("toLocationId", copy.to)}
          <Field label={copy.quantity}>
            {(id) => <Input id={id} type="number" min={0} step="0.001" inputMode="decimal" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} className="rounded-lg" />}
          </Field>
          {target.trackBatches && (
            <Field label={copy.batch}>
              {(id) => <Input id={id} dir="ltr" maxLength={60} value={form.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} className="rounded-lg font-mono" />}
            </Field>
          )}
          <Field label={copy.note} wide>
            {(id) => <Input id={id} maxLength={500} value={form.note} onChange={(e) => set({ note: e.target.value })} className="rounded-lg" />}
          </Field>
        </div>
        {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
        <ModalFooter><div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{copy.cancel}</Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="gap-1.5"
            disabled={busy || !form.quantity}
            onClick={() => submit(() => transferStockAction({ productId: target.productId, variantId: target.variantId ?? undefined, fromLocationId: form.fromLocationId, toLocationId: form.toLocationId, quantity: Number(form.quantity), batchNumber: target.trackBatches ? form.batchNumber : undefined, note: form.note }))}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? copy.saving : copy.save}
          </Button>
        </div></ModalFooter>
      </div>
    </Modal>
  );
}

/** Every location in use, as "Main warehouse · A-01", for the dialogs' pickers. */
export function useLocationOptions(warehouses: WarehouseRecord[]): LocationOption[] {
  const { locale } = useAdminLocale();
  return React.useMemo(
    () =>
      warehouses
        .filter((w) => w.is_active)
        .flatMap((w) => w.locations.filter((l) => l.is_active).map((l) => ({ id: l.id, label: `${locale === "ar" ? w.name_ar : w.name_en} · ${l.name || l.code}` }))),
    [warehouses, locale],
  );
}
