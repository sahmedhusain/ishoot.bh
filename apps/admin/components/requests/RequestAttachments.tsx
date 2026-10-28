"use client";
import { Card } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function RequestAttachments({
  files,
}: {
  files: { id: string; fileName: string; fileUrl: string }[];
}) {
  const { t } = useAdminLocale();
  if (!files.length) return null;
  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold">
        {t.requestDetail.customerAttachments}
      </h2>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              <bdi>{file.fileName}</bdi>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
