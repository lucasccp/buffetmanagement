import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "@/integrations/supabase/client";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedItem {
  nome: string;
  tipo: "comida" | "bebida" | "sobremesa";
}

export interface ParsedCategory {
  nome: string;
  itens: ParsedItem[];
}

export interface ParsedCardapio {
  nome_cardapio: string;
  categorias: ParsedCategory[];
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageLines: string[] = [];
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const text = item.str.trim();
      if (!text) continue;

      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        pageLines.push("\n");
      }
      pageLines.push(text);
      lastY = y;
    }

    const pageText = pageLines
      .join(" ")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");

    if (pageText) lines.push(pageText);
  }

  return lines.join("\n\n");
}

export async function parsePdfCardapio(file: File): Promise<ParsedCardapio> {
  const text = await extractTextFromPdf(file);

  if (!text.trim()) {
    throw new Error("Nenhum texto encontrado no PDF.");
  }

  const { data, error } = await supabase.functions.invoke("parse-cardapio-ai", {
    body: { text },
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error("Erro ao processar cardápio com IA.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ParsedCardapio;
}
