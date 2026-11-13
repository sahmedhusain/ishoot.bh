export function safeLegalHtml(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(
      /&lt;(\/?)(p|br|strong|b|em|i|ul|ol|li|h2|h3|h4|blockquote)\s*\/?&gt;/gi,
      (_, slash, tag) => `<${slash}${tag.toLowerCase()}>`,
    );
}
