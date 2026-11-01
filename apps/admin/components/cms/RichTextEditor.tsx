"use client";

import * as React from "react";
import { Button, Input, Modal, Select } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns3,
  Rows3,
  Trash2,
  Heading2,
  Heading3,
  ImageIcon,
  Images,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Video,
} from "lucide-react";
import { EMBED_PRESETS, embedSource, type EmbedPreset } from "@platform/database/cms/blocks";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { richTextExtensions } from "../../lib/rich-text/extensions";

type ImageResource = "pages" | "articles";

/**
 * Word or Google Docs leave classes, inline styles, comments and Office tags in what they put on the clipboard;
 * the editor keeps only the structure (headings, lists, tables, links), so strip the rest before parsing.
 */
function cleanPastedHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(o|w|m|v):[^>]*>/gi, "")
    .replace(/\s(class|style|lang|id)="[^"]*"/gi, "")
    .replace(/<span>([\s\S]*?)<\/span>/gi, "$1")
    .replace(/<b\s+[^>]*?id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, "$1");
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 px-1.5 grid place-items-center rounded-md text-xs transition-colors disabled:opacity-30 ${active ? "bg-accent/15 text-accent" : "text-ink-muted hover:text-ink hover:bg-ink/5"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, imageResource }: { editor: Editor; imageResource: ImageResource }) {
  const { t } = useAdminLocale();
  const copy = t.richText;
  const files = React.useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = React.useState<({ kind: "link" | "video" | "embed"; value: string } | { kind: "image"; value: string; image: { src: string; alt: string } }) | null>(null);
  const [preset, setPreset] = React.useState<EmbedPreset>("instagram");
  const [error, setError] = React.useState("");
  const formId = React.useId();
  const [uploading, setUploading] = React.useState<"image" | "gallery" | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      align: (["left", "center", "right", "justify"] as const).find((value) => e.isActive({ textAlign: value })) ?? null,
      rtl: e.isActive({ dir: "rtl" }),
      ltr: e.isActive({ dir: "ltr" }),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  const upload = async (list: FileList | null, mode: "image" | "gallery") => {
    if (!list?.length) return;
    setError(""); setUploading(mode);
    try {
      const uploaded: { src: string; alt: string }[] = [];
      for (const file of Array.from(list).slice(0, mode === "image" ? 1 : 24)) {
        const result = await uploadFileDirectly(file, { entityType: "cms_asset", entityId: imageResource });
        uploaded.push({ src: result.fileUrl, alt: file.name.replace(/\.[^.]+$/, "") });
      }
      if (mode === "image") {
        setDialog({ kind: "image", value: "", image: uploaded[0] });
      } else chain().setGallery(uploaded).run();
    } catch (error) {
      setError(errorMessage(error, t, copy.uploadFailed));
    } finally {
      setUploading(null);
      if (files.current) files.current.value = "";
    }
  };

  // Pointer-down preserves the text selection; focus the actual dialog opener on click.
  const link = (event: React.MouseEvent<HTMLButtonElement>) => { event.currentTarget.focus(); setError(""); setDialog({ kind: "link", value: (editor.getAttributes("link").href as string | undefined) ?? "" }); };
  const video = (event: React.MouseEvent<HTMLButtonElement>) => { event.currentTarget.focus(); setError(""); setDialog({ kind: "video", value: "" }); };
  const embed = (event: React.MouseEvent<HTMLButtonElement>) => { event.currentTarget.focus(); setError(""); setPreset("instagram"); setDialog({ kind: "embed", value: "" }); };
  const applyDialog = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dialog) return;
    const value = dialog.value.trim();
    if (dialog.kind === "link") {
      if (value) {
        try {
          const url = new URL(value, window.location.origin);
          if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value) || !["http:", "https:", "mailto:", "tel:"].includes(url.protocol) || url.username || url.password) throw new Error();
        } catch { setError(copy.linkInvalid); return; }
      }
      const changed = value ? chain().extendMarkRange("link").setLink({ href: value }).run() : chain().extendMarkRange("link").unsetLink().run();
      if (!changed) { setError(copy.linkInvalid); return; }
    } else if (dialog.kind === "video") {
      if (embedSource("youtube", value)) chain().setYoutubeVideo({ src: value }).run();
      else if (embedSource("vimeo", value)) chain().setEmbed({ preset: "vimeo", src: value }).run();
      else { setError(copy.videoInvalid); return; }
    } else if (dialog.kind === "embed") {
      if (!embedSource(preset, value)) { setError(copy.embedInvalid); return; }
      chain().setEmbed({ preset, src: value }).run();
    } else if (dialog.kind === "image") chain().setFigure({ ...dialog.image, caption: value }).run();
    setDialog(null); setError("");
  };

  return (
    <>
      <div role="toolbar" aria-label={copy.toolbar} className="flex flex-wrap items-center gap-0.5 border-b border-outline-variant bg-surface-sunken/60 px-2 py-1.5 sticky top-0 z-10">
        <ToolButton label={copy.paragraph} active={!state.h2 && !state.h3} onClick={() => chain().setParagraph().run()}><Pilcrow className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.heading2} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.heading3} active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-ink/10" />
        <ToolButton label={copy.bold} active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.italic} active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.underline} active={state.underline} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.strike} active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.link} active={state.link} onClick={link}><Link2 className="w-4 h-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-ink/10" />
        <ToolButton label={copy.alignLeft} active={state.align === "left"} onClick={() => chain().setTextAlign("left").run()}><AlignLeft className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.alignCenter} active={state.align === "center"} onClick={() => chain().setTextAlign("center").run()}><AlignCenter className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.alignRight} active={state.align === "right"} onClick={() => chain().setTextAlign("right").run()}><AlignRight className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.justify} active={state.align === "justify"} onClick={() => chain().setTextAlign("justify").run()}><AlignJustify className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.rtl} active={state.rtl} onClick={() => chain().setTextDirection(state.rtl ? null : "rtl").run()}><span className="font-bold">{copy.rtlShort}</span></ToolButton>
        <ToolButton label={copy.ltr} active={state.ltr} onClick={() => chain().setTextDirection(state.ltr ? null : "ltr").run()}><span className="font-bold">{copy.ltrShort}</span></ToolButton>
        <span className="mx-1 h-5 w-px bg-ink/10" />
        <ToolButton label={copy.bulletList} active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.orderedList} active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.quote} active={state.quote} onClick={() => chain().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.table} active={state.table} onClick={() => (state.table ? chain().addRowAfter().run() : chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><Table2 className="w-4 h-4" /></ToolButton>
        {state.table && (
          <>
            <ToolButton label={copy.addColumn} onClick={() => chain().addColumnAfter().run()}><Columns3 className="w-4 h-4" /></ToolButton>
            <ToolButton label={copy.deleteRow} onClick={() => chain().deleteRow().run()}><Rows3 className="w-4 h-4" /></ToolButton>
            <ToolButton label={copy.deleteTable} onClick={() => chain().deleteTable().run()}><Trash2 className="w-4 h-4" /></ToolButton>
          </>
        )}
        <span className="mx-1 h-5 w-px bg-ink/10" />
        <ToolButton label={copy.image} disabled={!!uploading} onClick={() => { files.current?.setAttribute("data-mode", "image"); files.current?.removeAttribute("multiple"); files.current?.click(); }}>
          {uploading === "image" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </ToolButton>
        <ToolButton label={copy.gallery} disabled={!!uploading} onClick={() => { files.current?.setAttribute("data-mode", "gallery"); files.current?.setAttribute("multiple", ""); files.current?.click(); }}>
          {uploading === "gallery" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Images className="w-4 h-4" />}
        </ToolButton>
        <ToolButton label={copy.video} onClick={video}><Video className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.embed} onClick={embed}><Code2 className="w-4 h-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-ink/10" />
        <ToolButton label={copy.clear} onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.undo} disabled={!state.undo} onClick={() => chain().undo().run()}><Undo2 className="w-4 h-4" /></ToolButton>
        <ToolButton label={copy.redo} disabled={!state.redo} onClick={() => chain().redo().run()}><Redo2 className="w-4 h-4" /></ToolButton>
        <input ref={files} type="file" accept="image/png,image/jpeg,image/webp" aria-label={copy.uploadImages} tabIndex={-1} className="hidden" onChange={(e) => upload(e.target.files, (e.target.getAttribute("data-mode") as "image" | "gallery") ?? "image")} />
      </div>
      {error && !dialog && <p role="alert" className="px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      <Modal isOpen={dialog !== null} onClose={() => { setDialog(null); setError(""); }} title={dialog ? copy[dialog.kind] : undefined} className="max-w-lg" footer={<div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => { setDialog(null); setError(""); }}>{t.actions.cancel}</Button><Button type="submit" form={formId}>{dialog?.kind === "image" ? copy.insertImage : copy.apply}</Button></div>}>
        <form id={formId} noValidate onSubmit={applyDialog} className="space-y-3">
          {dialog?.kind === "embed" && <div className="space-y-1"><label htmlFor={`${formId}-preset`} className="text-sm font-medium">{copy.embedPresetPrompt}</label><Select id={`${formId}-preset`} value={preset} onChange={event => { setPreset(event.target.value as EmbedPreset); setError(""); }}>{EMBED_PRESETS.map(value => <option key={value} value={value}>{copy.embedNames[value]}</option>)}</Select></div>}
          <div className="space-y-1"><label htmlFor={`${formId}-value`} className="text-sm font-medium">{dialog?.kind === "image" ? copy.captionPrompt : dialog?.kind === "link" ? copy.linkPrompt : dialog?.kind === "video" ? copy.videoPrompt : copy.embedUrlPrompt}</label><Input id={`${formId}-value`} value={dialog?.value ?? ""} dir={dialog?.kind === "image" ? undefined : "ltr"} placeholder={dialog?.kind === "image" ? copy.captionPlaceholder : dialog?.kind === "video" ? copy.videoPlaceholder : t.copy.urlExample} onChange={event => { setDialog(current => current ? { ...current, value: event.target.value } : null); setError(""); }} aria-invalid={!!error} aria-describedby={`${formId}-help${error ? ` ${formId}-error` : ""}`} /></div>
          <p id={`${formId}-help`} className="text-xs text-ink-muted">{dialog?.kind === "link" ? copy.linkHelp : dialog?.kind === "image" ? copy.captionHelp : dialog?.kind === "video" ? copy.videoHelp : copy.embedHelp}</p>
          {error && <p id={`${formId}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        </form>
      </Modal>
    </>
  );
}

/** A document editor that feels like a word processor; it stores TipTap JSON and the server renders clean HTML. */
export function RichTextEditor({ value, onChange, label, dir, imageResource }: { value: unknown; onChange: (doc: unknown) => void; label: string; dir: "rtl" | "ltr"; imageResource: ImageResource }) {
  const id = React.useId();
  const editor = useEditor({
    extensions: richTextExtensions(),
    content: value && typeof value === "object" ? (value as object) : "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "rich-text-editor rich-text min-h-[260px] px-5 py-4 focus:outline-none", dir, "aria-labelledby": id, role: "textbox", "aria-multiline": "true" },
      transformPastedHTML: cleanPastedHtml,
    },
    // A plain copy: TipTap builds some objects without a prototype, which server actions cannot receive as data.
    onUpdate: ({ editor: e }) => onChange(JSON.parse(JSON.stringify(e.getJSON()))),
  });
  return (
    <div className="space-y-1.5">
      <span id={id} className="text-xs font-medium text-ink">{label}</span>
      <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
        {editor ? <Toolbar editor={editor} imageResource={imageResource} /> : <div className="h-11 border-b border-outline-variant" />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
