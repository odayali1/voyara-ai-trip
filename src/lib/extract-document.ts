import mammoth from "mammoth";

/** Extract plain text from hotel catalog uploads (PDF / Word / text). */
export async function extractDocumentText(
  file: File
): Promise<{ text: string; kind: string }> {
  const name = (file.name || "upload").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value.trim(), kind: "word" };
  }

  if (name.endsWith(".pdf")) {
    const mod = await import("pdf-parse");
    const pdfParse = (mod as { default?: (data: Buffer) => Promise<{ text: string }> }).default ||
      (mod as unknown as (data: Buffer) => Promise<{ text: string }>);
    const parsed = await pdfParse(buffer);
    return { text: (parsed.text || "").trim(), kind: "pdf" };
  }

  const text = buffer.toString("utf8").trim();
  return { text, kind: "text" };
}
