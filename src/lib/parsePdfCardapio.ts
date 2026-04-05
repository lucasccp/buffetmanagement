import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedCategory {
  name: string;
  items: string[];
}

export interface ParsedCardapio {
  title: string;
  categories: ParsedCategory[];
}

const CATEGORY_KEYWORDS = [
  "cardápio", "menu", "bebida", "drink", "sobremesa", "doce",
  "entrada", "prato", "salada", "salgado", "acompanhamento",
  "welcome", "coffee", "brunch", "coquetel", "jantar", "almoço",
];

function looksLikeCategory(line: string, prevEmpty: boolean): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 60) return false;
  // Lines that are short, don't end with common item punctuation, and look like titles
  const lower = trimmed.toLowerCase();
  if (CATEGORY_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  // Short standalone line after an empty line
  if (prevEmpty && trimmed.length <= 40 && !trimmed.includes(",") && !/\d{2}/.test(trimmed)) return true;
  return false;
}

export async function parsePdfCardapio(file: File): Promise<ParsedCardapio> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const text = item.str.trim();
      if (!text) continue;

      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        lines.push("\n");
      }
      lines.push(text);
      lastY = y;
    }

    const pageText = lines
      .join(" ")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    allLines = allLines.concat(pageText, [""]);
  }

  // Determine title from first meaningful line
  const firstLine = allLines.find((l) => l.trim().length > 0) || file.name.replace(/\.pdf$/i, "");
  const title = firstLine.trim();

  // Parse categories and items
  const categories: ParsedCategory[] = [];
  let currentCategory: ParsedCategory = { name: "Geral", items: [] };
  let prevEmpty = true;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();

    if (line.length === 0) {
      prevEmpty = true;
      continue;
    }

    // Skip the title line itself
    if (i === allLines.indexOf(title) && categories.length === 0 && currentCategory.items.length === 0) {
      prevEmpty = false;
      continue;
    }

    if (looksLikeCategory(line, prevEmpty)) {
      if (currentCategory.items.length > 0) {
        categories.push(currentCategory);
      }
      currentCategory = { name: line, items: [] };
    } else {
      currentCategory.items.push(line);
    }

    prevEmpty = false;
  }

  // Push last category
  if (currentCategory.items.length > 0) {
    categories.push(currentCategory);
  }

  // If no categories found, put everything in "Geral"
  if (categories.length === 0) {
    const allItems = allLines.filter((l) => l.trim().length > 0 && l.trim() !== title);
    if (allItems.length > 0) {
      categories.push({ name: "Geral", items: allItems });
    }
  }

  // Deduplicate items within each category
  for (const cat of categories) {
    const seen = new Set<string>();
    cat.items = cat.items.filter((item) => {
      const key = item.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Remove categories with no items
  const finalCategories = categories.filter((c) => c.items.length > 0);

  return { title, categories: finalCategories };
}
