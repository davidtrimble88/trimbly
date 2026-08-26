// Shared by coverage-chat and vehicle-coverage-chat: turns a list of uploaded
// document references into chat-completion content parts the AI can actually
// read. PDFs and images go to the model as native multimodal input (the same
// approach parse-vehicle-service-doc already uses successfully) instead of
// being reduced to a "content not available" placeholder — that placeholder
// is now reserved for genuinely unreadable formats (.doc/.docx) or files
// that fail to load.

export type DocFileRef = { url: string; mimeType: string; label: string };

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TEXT_CHAR_LIMIT = 20_000;

export async function buildDocumentContentParts(files: DocFileRef[]): Promise<Array<Record<string, unknown>>> {
  const parts: Array<Record<string, unknown>> = [];

  for (const f of files) {
    const isText = f.mimeType.startsWith("text/");
    const isPdf = f.mimeType === "application/pdf";
    const isImage = f.mimeType.startsWith("image/");

    if (!isText && !isPdf && !isImage) {
      parts.push({ type: "text", text: `${f.label}\nContent not available — this file type can't be read yet. Do not guess or invent details from it.` });
      continue;
    }

    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

      if (isText) {
        const text = (await res.text()).slice(0, TEXT_CHAR_LIMIT);
        parts.push({ type: "text", text: `${f.label}\n${text}` });
        continue;
      }

      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_FILE_BYTES) {
        parts.push({ type: "text", text: `${f.label}\nFile too large to read (over 10MB) — do not guess or invent details from it.` });
        continue;
      }
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      const base64 = btoa(binary);

      parts.push({ type: "text", text: f.label });
      if (isPdf) {
        parts.push({ type: "file", file: { filename: "document.pdf", file_data: `data:${f.mimeType};base64,${base64}` } });
      } else {
        parts.push({ type: "image_url", image_url: { url: `data:${f.mimeType};base64,${base64}` } });
      }
    } catch {
      parts.push({ type: "text", text: `${f.label}\nCould not load this file — do not guess or invent details from it.` });
    }
  }

  return parts;
}
