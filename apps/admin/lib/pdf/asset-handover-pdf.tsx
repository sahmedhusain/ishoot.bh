/* eslint-disable jsx-a11y/alt-text -- React PDF images are PDF primitives, not DOM images. */
import {
  Document,
  Image,
  Page,
  Path,
  Svg,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import sharp from "sharp";
import type { AssetHandoverDetail } from "@platform/database";
import type { CompanySettings } from "@platform/database/types";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import {
  C,
  Letterhead,
  docKit,
  fmtDate,
  fmtMoney,
  pageStyle,
  resolvePdfBrand,
  type DocKit,
  type PdfBrand,
} from "./kit";

/** A checklist box: ticked or left empty. It records what was checked, not the asset's condition. */
function TickBox({ ticked }: { ticked: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderWidth: 0.9,
          borderColor: ticked ? C.accent : "#9CA3AF",
          borderRadius: 2,
          backgroundColor: ticked ? C.accent : "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ticked ? (
          <Svg width={8} height={8} viewBox="0 0 24 24">
            <Path
              d="M4 12.5l5 5L20 6.5"
              stroke="#FFFFFF"
              strokeWidth={3.2}
              fill="none"
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

type Signer = {
  title: string;
  name: string;
  image?: Buffer | string | null;
  date?: string | null;
  note?: string | null;
  placeholder?: string;
};

function HandoverBody({
  k,
  h,
  signers,
}: {
  k: DocKit;
  h: AssetHandoverDetail;
  brand: PdfBrand;
  signers: Signer[];
}) {
  const { t, isAr, T, Row, Card, Field, Table, TitleBlock, SectionTitle } = k;
  const a = t.assets;
  const p = a.pdf;
  const name = isAr ? h.employee.name_ar : h.employee.name_en;
  const specValue = (key: string, type: string) => {
    const v = h.specs[key];
    if (!v) return null;
    if (type === "date") return fmtDate(v, isAr);
    if (type === "boolean") return v === "yes" ? a.yes : a.no;
    return v;
  };
  const specs = h.asset.category.spec_fields
    .map(
      (f) => [isAr ? f.labelAr : f.labelEn, specValue(f.key, f.type)] as const,
    )
    .filter(([, v]) => v);

  return (
    <>
      <TitleBlock
        title={
          h.kind === "issue"
            ? a.handover.issueDocTitle
            : a.handover.returnDocTitle
        }
        number={h.reference}
        facts={[
          [a.handover.date, fmtDate(h.handover_date, isAr)],
          [
            p.status,
            a.handoverStatuses[h.status as keyof typeof a.handoverStatuses],
          ],
        ]}
      />
      <Row style={{ gap: 12, marginBottom: 14 }}>
        <Card label={a.handover.employee}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{name}</T>
          <Field label={p.employeeNumber} value={h.employee.employee_number} />
          <Field
            label={p.jobTitle}
            value={isAr ? h.employee.job_title_ar : h.employee.job_title_en}
          />
        </Card>
        <Card label={p.asset}>
          <T style={{ fontSize: 10, fontWeight: "bold" }}>{h.asset.name}</T>
          <Field label={p.tag} value={h.asset.asset_tag} />
          <Field
            label={a.fields.category}
            value={isAr ? h.asset.category.name_ar : h.asset.category.name_en}
          />
          <Field
            label={a.fields.brand}
            value={[h.asset.brand, h.asset.model].filter(Boolean).join(" ")}
          />
          <Field label={a.fields.serial} value={h.asset.serial_number} />
          <Field
            label={a.fields.purchaseCost}
            value={
              h.asset.purchase_cost !== undefined
                ? fmtMoney(h.asset.purchase_cost, h.asset.currency, isAr)
                : null
            }
          />
          <Field
            label={a.handover.condition}
            value={a.conditions[h.condition as keyof typeof a.conditions]}
            strong
          />
        </Card>
      </Row>

      {specs.length ? (
        <>
          <SectionTitle>{p.specs}</SectionTitle>
          <Table
            columns={[
              { key: "label", label: p.detail, flex: 2 },
              { key: "value", label: p.value, flex: 3 },
            ]}
            rows={specs.map(([label, value]) => ({
              label,
              value: String(value),
            }))}
          />
        </>
      ) : null}

      {h.checklist.length ? (
        <>
          <SectionTitle>{a.handover.checklist}</SectionTitle>
          <Table
            columns={[
              { key: "item", label: p.item, flex: 4 },
              { key: "result", label: p.ticked, flex: 1.2, align: "center" },
              { key: "note", label: p.note, flex: 3 },
            ]}
            rows={h.checklist.map((c) => ({
              item: isAr ? c.labelAr : c.labelEn,
              result: <TickBox ticked={c.ok} />,
              note: c.note ?? "",
            }))}
          />
        </>
      ) : null}

      {h.accessories ||
      h.damage_notes ||
      h.damage_charge !== undefined ||
      h.notes ? (
        <View style={{ marginBottom: 12 }} wrap={false}>
          {h.accessories ? (
            <Field label={a.handover.accessories} value={h.accessories} />
          ) : null}
          {h.damage_notes ? (
            <Field label={a.handover.damage} value={h.damage_notes} />
          ) : null}
          {h.damage_charge !== undefined ? (
            <Field
              label={a.handover.charge}
              value={`${fmtMoney(h.damage_charge, h.asset.currency, isAr)}${h.deduct_from_salary ? ` · ${a.handover.deductedFromSalary}` : ""}`}
              strong
            />
          ) : null}
          {h.notes ? <Field label={a.handover.notes} value={h.notes} /> : null}
        </View>
      ) : null}

      <T
        style={{
          fontSize: 7.5,
          color: C.body,
          lineHeight: 1.55,
          marginBottom: 10,
        }}
      >
        {h.kind === "issue"
          ? a.handover.acknowledgeIssue
          : a.handover.acknowledgeReturn}
      </T>

      <View wrap={false}>
        <SectionTitle>{a.handover.signatures}</SectionTitle>
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          {signers.map((s, i) => (
            <View
              key={i}
              style={{
                width: "31.5%",
                borderWidth: 0.6,
                borderColor: C.line,
                borderRadius: 6,
                padding: 7,
              }}
            >
              <T style={{ fontSize: 7, color: C.muted }}>{s.title}</T>
              <View
                style={{
                  height: 40,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {s.image ? (
                  <Image
                    src={s.image}
                    style={{ height: 36, width: 120, objectFit: "contain" }}
                  />
                ) : (
                  <T style={{ fontSize: 7, color: "#9CA3AF" }}>
                    {s.placeholder ?? p.notSigned}
                  </T>
                )}
              </View>
              <T style={{ fontSize: 8, fontWeight: "bold" }}>{s.name || "—"}</T>
              {s.date ? (
                <T style={{ fontSize: 7, color: C.muted }}>
                  {fmtDate(s.date, isAr)}
                </T>
              ) : null}
              {s.note ? (
                <T style={{ fontSize: 6.8, color: C.muted }}>{s.note}</T>
              ) : null}
            </View>
          ))}
        </Row>
      </View>
    </>
  );
}

const pngFromDataUrl = async (data?: string) => {
  const match = data?.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  return sharp(bytes)
    .trim()
    .png()
    .toBuffer()
    .catch(() => bytes);
};

/** The handover form: asset, condition, checklist results, damage, and every signature and approval. */
export async function generateAssetHandoverPdf(
  h: AssetHandoverDetail,
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const k = docKit(locale);
  const a = k.t.assets;
  const [brand, creatorSignature, employeeSignature, approvals] =
    await Promise.all([
      resolvePdfBrand(company),
      resolveConfiguredPdfAsset(h.creator_signature_url),
      pngFromDataUrl(h.employee_signature),
      Promise.all(
        (h.approval?.decisions ?? []).map(async (d) => ({
          ...d,
          image:
            d.decision === "approved"
              ? await resolveConfiguredPdfAsset(d.signature_url)
              : null,
        })),
      ),
    ]);
  const signers: Signer[] = [
    {
      title: a.handover.issuedBy,
      name: h.created_by,
      image: creatorSignature ?? null,
      date: h.created_at,
    },
    {
      title: h.kind === "issue" ? a.handover.receivedBy : a.handover.returnedBy,
      name: h.employee_signer_name ?? "",
      image: employeeSignature,
      date: h.employee_signed_at,
    },
    ...approvals.map((d) => ({
      title: d.decision === "approved" ? a.pdf.approvedBy : a.pdf.rejectedBy,
      name: d.name,
      image: d.image ?? null,
      date: d.at,
      note: d.note ?? null,
      placeholder:
        d.decision === "approved"
          ? a.pdf.approvedElectronically
          : a.pdf.rejectedElectronically,
    })),
  ];
  return renderToBuffer(
    <Document
      title={`${h.reference} · ${h.asset.name}`}
      author={company.company_name_en}
      language={locale}
    >
      <Page size="A4" style={pageStyle}>
        <Letterhead brand={brand} />
        <HandoverBody k={k} h={h} brand={brand} signers={signers} />
        <k.Footer brand={brand} reference={h.reference} />
      </Page>
    </Document>,
  );
}
