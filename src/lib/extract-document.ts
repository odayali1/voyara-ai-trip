import mammoth from "mammoth";
import * as XLSX from "xlsx";

/** Extract plain text from hotel catalog uploads (PDF / Word / Excel / text). */
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
    const pdfParse =
      (mod as { default?: (data: Buffer) => Promise<{ text: string }> }).default ||
      (mod as unknown as (data: Buffer) => Promise<{ text: string }>);
    const parsed = await pdfParse(buffer);
    return { text: (parsed.text || "").trim(), kind: "pdf" };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const chunks: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      chunks.push(`Sheet: ${sheetName}`);
      chunks.push(XLSX.utils.sheet_to_csv(sheet));
    }
    return { text: chunks.join("\n\n").trim(), kind: "excel" };
  }

  const text = buffer.toString("utf8").trim();
  return { text, kind: "text" };
}
