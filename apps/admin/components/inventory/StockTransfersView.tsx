"use client";
import * as React from "react";
import { Button, Card, Select } from "@platform/ui";
import type { getTransferWorkspace } from "@platform/database/queries/transfer-workspace";
import {
  reportMissingTransferUnitsAction,
  requestSerialTransferAction,
  processSerialTransferAction,
  previewStockHandoverAction,
  acknowledgeStockHandoverAction,
} from "../../app/actions/stock-transfers";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { SignatureCanvas } from "../shared/SignatureCanvas";
import { Field } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

type Data = Awaited<ReturnType<typeof getTransferWorkspace>>;
type Preview = Awaited<ReturnType<typeof previewStockHandoverAction>>;
export function StockTransfersView({ data }: { data: Data }) {
  const { t, locale } = useAdminLocale();
  const c = t.stockTransfers;
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  const [source, setSource] = React.useState(""),
    [transit, setTransit] = React.useState(""),
    [destination, setDestination] = React.useState(""),
    [codes, setCodes] = React.useState("");
  const [selected, setSelected] = React.useState(""),
    [received, setReceived] = React.useState("");
  const [preview, setPreview] = React.useState<Preview | null>(null),
    [signature, setSignature] = React.useState<string | null>(null);
  const keys = React.useRef(new Map<string, string>());
  const key = (name: string) => {
    let value = keys.current.get(name);
    if (!value) {
      value = crypto.randomUUID();
      keys.current.set(name, value);
    }
    return value;
  };
  const split = (value: string) => value.split(/[\s,;]+/).filter(Boolean);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };
  const [missingCodes, setMissingCodes] = React.useState("");
  const [reason, setReason] = React.useState("");
  const transfer = data.transfers.find((item) => item.id === selected);
  const local = (id: string) => data.locations.some((l) => l.id === id);
  const process = (operation: "approve" | "dispatch" | "receive" | "close") =>
    transfer &&
    run(async () => {
      await processSerialTransferAction({
        allocationId: transfer.id,
        revision: transfer.revision,
        operation,
        codes: operation === "receive" ? split(received) : [],
        idempotencyKey: key(
          `${transfer.id}:${transfer.revision}:${operation}:${operation === "receive" ? received : ""}`,
        ),
      });
      setReceived("");
      setPreview(null);
      setSignature(null);
    });
  const review = (stage: "collection" | "receipt") =>
    transfer &&
    run(async () => {
      setPreview(
        await previewStockHandoverAction({
          allocationId: transfer.id,
          revision: transfer.revision,
          stage,
        }),
      );
      setSignature(null);
    });
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <PageHeader
        back={{ href: "/dashboard/inventory", label: t.inventory.nav.stock }}
      />
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/10 p-3 text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {data.canEdit && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">{c.request}</h2>
          <p className="text-sm text-ink-muted">{c.requestHint}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                [c.source, source, setSource],
                [c.transit, transit, setTransit],
                [c.destination, destination, setDestination],
              ] as const
            ).map(([label, value, setValue]) => (
              <Field key={label} label={label}>
                {(id) => (
                  <Select
                    id={id}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">{c.choose}</option>
                    {data.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ))}
          </div>
          <Field label={c.codes}>
            {(id) => (
              <textarea
                id={id}
                rows={4}
                value={codes}
                onChange={(e) => setCodes(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl border border-outline-variant bg-surface p-3 font-mono text-sm"
              />
            )}
          </Field>
          <Button
            disabled={
              busy || !source || !transit || !destination || !codes.trim()
            }
            onClick={() =>
              run(async () => {
                const result = await requestSerialTransferAction({
                  sourceLocationId: source,
                  transitLocationId: transit,
                  destinationLocationId: destination,
                  codes: split(codes),
                  idempotencyKey: key("request"),
                });
                keys.current.delete("request");
                setCodes("");
                setSelected(result.id);
              })
            }
          >
            {c.request}
          </Button>
        </Card>
      )}
      <Card className="p-5 space-y-3">
        <Field label={c.selectTransfer}>
          {(id) => (
            <Select
              id={id}
              value={selected}
              disabled={busy}
              onChange={(e) => {
                setSelected(e.target.value);
                setReceived("");
                setPreview(null);
                setSignature(null);
              }}
            >
              <option value="">{c.choose}</option>
              {data.transfers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number} ·{" "}
                  {c.statuses[item.status as keyof typeof c.statuses] ??
                    item.status}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {!data.transfers.length && <p>{c.empty}</p>}
        {data.hasMore && <p className="text-sm">{c.recentOnly}</p>}
      </Card>
      {transfer && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">{transfer.number}</h2>
          <p>
            {c.statuses[transfer.status as keyof typeof c.statuses] ??
              transfer.status}
          </p>
          {transfer.reports.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">{c.discrepancyHistory}</h3>
              {transfer.reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-outline-variant p-3 text-sm"
                >
                  <p>{report.reason}</p>
                  <ul className="font-mono text-xs">
                    {report.codes.map((code) => (
                      <li key={code}>{code}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {transfer.lines.map((line) => (
            <div key={line.id} className="space-y-2">
              <h3 className="font-semibold">
                {locale === "ar" ? line.product.nameAr : line.product.nameEn} ·{" "}
                {line.product.sku}
              </h3>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                {[
                  [c.requested, line.requested],
                  [c.dispatched, line.dispatched],
                  [c.accepted, line.received],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-ink-muted">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <details>
                <summary className="cursor-pointer text-sm">
                  {c.manifest}
                </summary>
                <div className="max-h-64 overflow-auto">
                  <ul className="font-mono text-xs">
                    {line.serials.map((s) => (
                      <li key={s.code} className="py-1">
                        <bdi>{s.code}</bdi> ·{" "}
                        {c.serialStates[s.status as keyof typeof c.serialStates] ?? s.status}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          ))}
          {transfer.canApprove &&
            local(transfer.sourceLocationId) &&
            transfer.status === "requested" && (
              <Button disabled={busy} onClick={() => process("approve")}>
                {c.approve}
              </Button>
            )}
          {data.canEdit &&
            local(transfer.sourceLocationId) &&
            transfer.status === "approved" && (
              <Button disabled={busy} onClick={() => process("dispatch")}>
                {c.dispatch}
              </Button>
            )}
          {data.canEdit &&
            local(transfer.destinationLocationId) &&
            ["in_transit", "partially_received"].includes(transfer.status) && (
              <div className="space-y-2">
                <Field label={c.receiveCodes}>
                  {(id) => (
                    <textarea
                      id={id}
                      rows={4}
                      className="w-full rounded-xl border border-outline-variant bg-surface p-3 font-mono text-sm"
                      value={received}
                      onChange={(e) => setReceived(e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Button
                  disabled={busy || !received.trim()}
                  onClick={() => process("receive")}
                >
                  {c.receive}
                </Button>
              </div>
            )}
          {data.canEdit &&
            local(transfer.destinationLocationId) &&
            ["in_transit", "partially_received"].includes(transfer.status) && (
              <details className="space-y-3">
                <summary>{c.reportMissing}</summary>
                <Field label={c.missingCodes}>
                  {(id) => (
                    <textarea
                      id={id}
                      rows={3}
                      className="w-full rounded-xl border border-outline-variant bg-surface p-3"
                      value={missingCodes}
                      onChange={(e) => setMissingCodes(e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Field label={c.reason}>
                  {(id) => (
                    <textarea
                      id={id}
                      rows={2}
                      maxLength={1000}
                      className="w-full rounded-xl border border-outline-variant bg-surface p-3"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Button
                  disabled={busy || !missingCodes.trim() || !reason.trim()}
                  onClick={() =>
                    run(async () => {
                      await reportMissingTransferUnitsAction({
                        allocationId: transfer.id,
                        revision: transfer.revision,
                        codes: split(missingCodes),
                        reason,
                        idempotencyKey: key(
                          `${transfer.id}:${transfer.revision}:missing:${missingCodes}:${reason}`,
                        ),
                      });
                      setMissingCodes("");
                      setReason("");
                      setPreview(null);
                    })
                  }
                >
                  {c.reportMissing}
                </Button>
              </details>
            )}
          {transfer.canClose && transfer.status === "received" && (
            <Button disabled={busy} onClick={() => process("close")}>
              {c.close}
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            {data.canEdit &&
              local(transfer.sourceLocationId) &&
              transfer.status === "in_transit" && (
                <Button disabled={busy} onClick={() => review("collection")}>
                  {c.collectionSign}
                </Button>
              )}
            {data.canEdit &&
              local(transfer.destinationLocationId) &&
              ["partially_received", "received"].includes(transfer.status) && (
                <Button disabled={busy} onClick={() => review("receipt")}>
                  {c.receiptSign}
                </Button>
              )}
          </div>
        </Card>
      )}
      {preview && transfer && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">{c.review}</h2>
          <p>
            {preview.manifest.stage === "collection"
              ? c.collectionStatement
              : c.receiptStatement}
          </p>
          <p>{preview.manifest.signerName}</p>
          {preview.manifest.lines.map((line) => (
            <div key={line.productId}>
              <p>
                {locale === "ar" ? line.product.nameAr : line.product.nameEn} ·{" "}
                {line.product.sku}
              </p>
              <p>
                {c.dispatched}: {line.dispatched} · {c.accepted}:{" "}
                {line.received} · {c.outstanding}: {line.outstanding}
              </p>
              <div className="max-h-48 overflow-auto">
                <ul className="font-mono text-xs">
                  {line.serials.map((s) => (
                    <li key={s.id}>{s.code}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          <SignatureCanvas
            key={preview.hash}
            onChange={setSignature}
            clearLabel={c.clear}
            hint={c.signHint}
          />
          <Button
            disabled={busy || !signature}
            onClick={() =>
              run(async () => {
                await acknowledgeStockHandoverAction({
                  allocationId: preview.manifest.allocationId,
                  revision: preview.manifest.revision,
                  stage: preview.manifest.stage,
                  manifestHash: preview.hash,
                  signature: signature!,
                });
                setPreview(null);
                setSignature(null);
              })
            }
          >
            {c.confirmSign}
          </Button>
        </Card>
      )}
    </div>
  );
}
