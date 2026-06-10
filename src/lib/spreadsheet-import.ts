import { inflateRawSync } from "node:zlib";

export type SpreadsheetRow = Record<string, string>;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function attr(source: string, name: string): string {
  const match = source.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : "";
}

function columnIndex(cellRef: string, fallback: number) {
  const letters = cellRef.match(/[A-Z]+/i)?.[0];
  if (!letters) return fallback;
  let index = 0;
  for (const letter of letters.toUpperCase()) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseCsv(text: string): SpreadsheetRow[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const next = cleaned[i + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        cell += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  return rowsToObjects(rows);
}

function rowsToObjects(rows: string[][]): SpreadsheetRow[] {
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => cell.trim()));
  if (headerRowIndex < 0) return [];

  const headers = rows[headerRowIndex].map((header) => header.trim());
  return rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const record: SpreadsheetRow = {};
      headers.forEach((header, index) => {
        if (header) record[header] = row[index]?.trim() || "";
      });
      return record;
    });
}

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66_000); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) throw new Error("Invalid XLSX file");

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid XLSX central directory");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  const files = new Map<string, Buffer>();
  for (const entry of entries) {
    const localOffset = entry.localHeaderOffset;
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) continue;
    const nameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + nameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

    if (entry.method === 0) files.set(entry.name, compressed);
    else if (entry.method === 8) files.set(entry.name, inflateRawSync(compressed));
  }

  return files;
}

function readSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[\s\S]*?<\/si>/g;
  let siMatch: RegExpExecArray | null;

  while ((siMatch = siRegex.exec(xml))) {
    const chunks: string[] = [];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(siMatch[0]))) chunks.push(decodeXml(tMatch[1]));
    strings.push(chunks.join(""));
  }

  return strings;
}

function firstWorksheetPath(files: Map<string, Buffer>): string {
  if (files.has("xl/worksheets/sheet1.xml")) return "xl/worksheets/sheet1.xml";

  const rels = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8") || "";
  const relationshipMatch = rels.match(/<Relationship\b[^>]*Type="[^"]*\/worksheet"[^>]*Target="([^"]+)"/);
  if (relationshipMatch) {
    const target = decodeXml(relationshipMatch[1]).replace(/^\/+/, "");
    return target.startsWith("xl/") ? target : `xl/${target}`;
  }

  const fallback = [...files.keys()].find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if (!fallback) throw new Error("No worksheet found in XLSX file");
  return fallback;
}

function parseSheet(xml: string, sharedStrings: string[]): SpreadsheetRow[] {
  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xml))) {
    const values: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    let fallbackIndex = 0;

    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attr(attrs, "r");
      const type = attr(attrs, "t");
      const index = columnIndex(ref, fallbackIndex);
      fallbackIndex = index + 1;

      let value = "";
      if (type === "inlineStr") {
        const inline = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] || "";
        value = decodeXml(inline);
      } else {
        const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] || "";
        if (type === "s") value = sharedStrings[Number(raw)] || "";
        else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
        else value = decodeXml(raw);
      }

      values[index] = value.trim();
    }

    if (values.some(Boolean)) rows.push(values);
  }

  return rowsToObjects(rows);
}

function parseXlsx(buffer: Buffer): SpreadsheetRow[] {
  const files = readZipEntries(buffer);
  const sharedStrings = readSharedStrings(files.get("xl/sharedStrings.xml")?.toString("utf8") || "");
  const sheetPath = firstWorksheetPath(files);
  const sheet = files.get(sheetPath);
  if (!sheet) throw new Error("Worksheet data not found");
  return parseSheet(sheet.toString("utf8"), sharedStrings);
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetRow[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) return parseCsv(buffer.toString("utf8"));
  if (name.endsWith(".xlsx")) return parseXlsx(buffer);

  throw new Error("Upload a .xlsx or .csv file");
}

