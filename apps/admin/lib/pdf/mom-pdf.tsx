import { Document, Page, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanySettings, MinuteOfMeetingItem } from "@ishoot/database/types";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import {
  Letterhead,
  C,
  fmtDate,
  pageStyle,
  resolvePdfBrand,
  type CompanySignature,
  type PdfBrand,
  docKit,
  type DocKit,
} from "./kit";

function MomBody({ k, mom, brand, signing }: { k: DocKit;  mom: MinuteOfMeetingItem; brand: PdfBrand; signing: CompanySignature | null }) {
  const { t, isAr, T, Row, Card, Field, Table, TitleBlock, SectionTitle, Paragraph, CompanySignatureBlock } = k;
  const m = t.pdfDocs.mom;
  const status = (value: string) => (t.statusLabels as Record<string, string>)[value] ?? value;
  const time = [mom.start_time, mom.end_time].filter(Boolean).join(" – ");
  return (
    <>
      <TitleBlock
        title={m.title}
        subtitle={(isAr ? mom.title_ar || mom.title : mom.title) || undefined}
        number={mom.mom_number}
        facts={[[m.date, fmtDate(mom.meeting_date, isAr)], ...(time ? ([[m.time, time]] as Array<[string, string]>) : [])]}
      />
      {mom.location || mom.client_name || mom.deal_title ? (
        <Card style={{ flex: 0, marginBottom: 14 }}>
          <Field label={m.location} value={mom.location} />
          <Field label={t.pdfInvoice.clientDetails} value={mom.client_name} />
        </Card>
      ) : null}

      {mom.attendees.length ? (
        <>
          <SectionTitle>{m.attendees}</SectionTitle>
          <Table
            columns={[
              { key: "name", label: t.pdfDocs.client.name, flex: 2.2 },
              { key: "role", label: m.role, flex: 1.8 },
              { key: "organization", label: m.organization, flex: 1.8 },
              { key: "attendance", label: m.attendance, flex: 1, align: "center" },
            ]}
            rows={mom.attendees.map((a) => ({ name: a.name, role: a.role || "—", organization: a.organization || "—", attendance: a.attended ? m.present : m.absent }))}
          />
        </>
      ) : null}

      {mom.agenda ? (
        <View wrap={false}>
          <SectionTitle>{m.agenda}</SectionTitle>
          <Paragraph>{mom.agenda}</Paragraph>
        </View>
      ) : null}

      {mom.discussion_points.length ? (
        <>
          <SectionTitle>{m.discussion}</SectionTitle>
          {mom.discussion_points.map((point, index) => (
            <View key={index} wrap={false} style={{ marginBottom: 8, paddingBottom: 6, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T style={{ fontSize: 9, fontWeight: "bold" }}>{`${index + 1}. ${point.topic}`}</T>
                {point.speaker ? <T style={{ fontSize: 7.5, color: C.muted }}>{point.speaker}</T> : null}
              </Row>
              {point.notes ? <T style={{ fontSize: 8.5, color: C.body, marginTop: 2, lineHeight: 1.6 }}>{point.notes}</T> : null}
            </View>
          ))}
        </>
      ) : null}

      {mom.decisions.length ? (
        <View wrap={false} style={{ marginTop: 4 }}>
          <SectionTitle>{m.decisions}</SectionTitle>
          {mom.decisions.map((decision, index) => (
            <T key={index} style={{ fontSize: 8.5, color: C.body, marginBottom: 3 }}>{`${index + 1}. ${decision}`}</T>
          ))}
        </View>
      ) : null}

      {mom.action_items.length ? (
        <View style={{ marginTop: 6 }}>
          <SectionTitle>{m.actions}</SectionTitle>
          <Table
            columns={[
              { key: "task", label: m.task, flex: 3.4 },
              { key: "owner", label: m.owner, flex: 1.6 },
              { key: "due", label: m.dueDate, flex: 1.4, align: "center" },
              { key: "status", label: m.status, flex: 1.2, align: "center" },
            ]}
            rows={mom.action_items.map((a) => ({ task: a.task, owner: a.assignee || "—", due: a.dueDate ? fmtDate(a.dueDate, isAr, "short") : "—", status: status(a.status) }))}
          />
        </View>
      ) : null}

      {mom.notes ? (
        <View wrap={false}>
          <SectionTitle>{m.notes}</SectionTitle>
          <Paragraph>{mom.notes}</Paragraph>
        </View>
      ) : null}

      <Row style={{ justifyContent: "flex-end", marginTop: 18 }} wrap={false}>
        <CompanySignatureBlock brand={brand} signing={signing} label={m.approvedBy} />
      </Row>
    </>
  );
}

export async function generateMomPdf(mom: MinuteOfMeetingItem, company: CompanySettings, locale: "en" | "ar" = "en") {
  const [brand, signature] = await Promise.all([resolvePdfBrand(company), resolveConfiguredPdfAsset(mom.signature_url)]);
  const k = docKit(locale);
  const approved = mom.status === "approved" || mom.status === "shared";
  const signing: CompanySignature | null = approved ? { signatureSrc: signature ?? null, signerName: mom.approved_by_name || null } : null;
  return renderToBuffer(
    <Document title={`${mom.mom_number} · ${mom.title}`} author={company.company_name_en} language={locale}>
        <Page size="A4" style={pageStyle}>
          <Letterhead brand={brand} />
          <MomBody k={k} mom={mom} brand={brand} signing={signing} />
          <k.Footer brand={brand} reference={mom.mom_number} />
        </Page>
    </Document>,
  );
}
