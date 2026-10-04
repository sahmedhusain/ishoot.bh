import React from "react";
import { Document, Page, Text, View, Image as PdfImage, renderToBuffer } from "@react-pdf/renderer";
import type { CompanySettings, MinuteOfMeetingItem } from "@ishoot/database/types";
import { pdfStyles } from "./shared-styles";
import { resolveConfiguredPdfAsset } from "./configured-asset";
export async function generateMomPdf(mom: MinuteOfMeetingItem, company: CompanySettings) {
  const signature = await resolveConfiguredPdfAsset(mom.signature_url);
  return renderToBuffer(<Document title={mom.title}><Page size="A4" style={pdfStyles.page}>
    <Text style={{ fontSize: 18, marginBottom: 10 }}>{company.company_name_en} · {company.company_name_ar}</Text>
    <Text style={{ fontSize: 14, marginBottom: 6 }}>{mom.title}</Text>{mom.title_ar ? <Text>{mom.title_ar}</Text> : null}
    <Text>{mom.mom_number} · {mom.meeting_date} · {mom.start_time || ""} – {mom.end_time || ""}</Text><Text>{mom.location || ""}</Text>
    <View style={{ marginTop: 16 }}><Text>Attendees / الحضور</Text>{mom.attendees.map((p, i) => <Text key={i}>{p.name} · {p.role || ""} · {p.organization || ""} · {p.attended ? "Present" : "Absent"}</Text>)}</View>
    <View style={{ marginTop: 16 }}><Text>Agenda / جدول الأعمال</Text><Text>{mom.agenda}</Text></View>
    <View style={{ marginTop: 16 }}><Text>Discussion / المناقشة</Text>{mom.discussion_points.map((p, i) => <View key={i} style={{ marginTop: 8 }}><Text>{p.topic} · {p.speaker || ""}</Text><Text>{p.notes}</Text></View>)}</View>
    <View style={{ marginTop: 16 }}><Text>Decisions / القرارات</Text>{mom.decisions.map((p, i) => <Text key={i}>{i + 1}. {p}</Text>)}</View>
    <View style={{ marginTop: 16 }}><Text>Actions / الإجراءات</Text>{mom.action_items.map((p, i) => <Text key={i}>{p.task} · {p.assignee} · {p.dueDate || ""} · {p.status}</Text>)}</View>
    {mom.notes ? <Text style={{ marginTop: 16 }}>{mom.notes}</Text> : null}
    <View style={{ marginTop: 20 }}><Text>Approved by / اعتمد بواسطة: {mom.approved_by_name || ""}</Text>{signature ? <PdfImage src={signature as any} style={{ width: 120, height: 60, objectFit: "contain" }} /> : null}</View>
  </Page></Document>);
}
