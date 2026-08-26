const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Coverage documents (and similar uploads) aren't stored with a mime type
 * column — infer one from the file extension so the AI chat edge functions
 * know whether to embed a file as a PDF, an image, or plain text. */
export function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_MIME[ext] || "application/octet-stream";
}
