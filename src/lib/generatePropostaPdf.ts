import jsPDF from "jspdf";

export interface PropostaPdfData {
  cliente: string;
  data_evento: string | null;
  local_evento: string;
  numero_convidados: number;
  valor_por_pessoa: number;
  valor_total: number;
  cardapio_nome: string;
  cardapio_itens: string[];
  // 8 seções da proposta
  abertura: string;
  descricao_evento: string;
  cardapio: string;
  servicos: string;
  investimento: string;
  forma_pagamento: string;
  observacoes_finais: string;
  encerramento: string;
}

export interface PropostaEmpresa {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  email: string | null;
  logo_url: string | null;
  cor_destaque: string | null;
}

// Default palette (matches the reference template)
const BEGE: [number, number, number] = [239, 233, 221];        // #EFE9DD
const BEGE_DARK: [number, number, number] = [220, 213, 198];   // tabela header
const TEXT_DARK: [number, number, number] = [25, 25, 25];      // #191919
const TEXT_BODY: [number, number, number] = [70, 70, 70];      // corpo levemente suavizado
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [200, 200, 200];

// Margens / layout
const MARGIN_X = 18;
const BODY_X = 22;       // corpo levemente indentado em relação ao título
const BULLET_X = 24;
const SECTION_TITLE_TO_BODY = 9;  // respiro entre título e corpo
const SECTION_BOTTOM = 7;         // respiro entre seções
const TITLE_RULE_LEN = 22;        // comprimento da linha-acento sob o título

function hexToRgb(hex: string | null): [number, number, number] {
  if (!hex) return [244, 185, 66];
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return [244, 185, 66];
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueMenuItems(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .filter((item) => {
      const key = normalizeText(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sanitizeCardapioIntro(body: string, menuItems: string[]): string {
  const fallback = "O cardápio selecionado foi pensado para oferecer uma experiência gastronômica equilibrada, elegante e adequada ao perfil do evento.";
  const trimmed = body?.trim();
  if (!trimmed) return fallback;

  const normalizedItems = menuItems.map(normalizeText).filter((item) => item.length >= 4);
  if (!normalizedItems.length) return trimmed;

  const normalizedBody = normalizeText(trimmed);
  const mentionedCount = normalizedItems.filter((item) => normalizedBody.includes(item)).length;
  if (mentionedCount >= 2 || mentionedCount / normalizedItems.length >= 0.35) return fallback;

  const cleanedLines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      const normalizedLine = normalizeText(line);
      const mentionsItem = normalizedItems.some((item) => normalizedLine.includes(item));
      const looksLikeList = /^[•\-*–—]|^\d+[.)]/.test(line);
      return !(mentionsItem && looksLikeList);
    });

  const cleaned = cleanedLines.join("\n").trim();
  return cleaned.length >= 40 ? cleaned : fallback;
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve((r.result as string) ?? null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawStripes(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(225, 219, 205);
  const stripeW = 1.5;
  const gap = 3.5;
  for (let i = 0; i < w; i += stripeW + gap) {
    doc.rect(x + i, y, stripeW, h, "F");
  }
}

export async function generatePropostaPdf(data: PropostaPdfData, empresa: PropostaEmpresa) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const accent = hexToRgb(empresa.cor_destaque);

  // ─────────── HEADER (página 1) ───────────
  const headerH = 50;
  doc.setFillColor(...BEGE);
  doc.rect(0, 0, W, headerH, "F");
  drawStripes(doc, 10, 6, 35, 8);
  drawStripes(doc, 10, 35, 50, 8);

  doc.setTextColor(...TEXT_DARK);
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.text("Proposta de orçamento", 18, 28);

  if (empresa.logo_url) {
    const logoData = await loadImageDataUrl(empresa.logo_url);
    if (logoData) {
      try {
        const fmt = logoData.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(logoData, fmt, W - 50, 8, 38, 34, undefined, "FAST");
      } catch {
        // ignore image errors, keep going
      }
    }
  } else {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.circle(W - 30, 25, 10, "F");
    doc.setTextColor(...TEXT_DARK);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.text(empresa.nome, W - 30, 45, { align: "center" });
  }

  // ─────────── CLIENT INFO ───────────
  let y = headerH + 12;
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLIENTE:", MARGIN_X, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente, MARGIN_X + 22, y);

  doc.setFont("helvetica", "bold");
  doc.text("DATA DO EVENTO:", 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(data.data_evento), 148, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("LOCAL DO EVENTO:", MARGIN_X, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.local_evento || "A definir", MARGIN_X + 38, y);

  y += 5;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, y, W - MARGIN_X, y);
  y += 11;

  // Tokenize a string with **bold** markers into segments
  type Segment = { text: string; bold: boolean };
  const tokenize = (s: string): Segment[] => {
    const out: Segment[] = [];
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    for (const p of parts) {
      if (!p) continue;
      if (p.startsWith("**") && p.endsWith("**")) out.push({ text: p.slice(2, -2), bold: true });
      else out.push({ text: p, bold: false });
    }
    return out;
  };

  const wrapSegments = (segments: Segment[], maxWidth: number, fontSize: number): Segment[][] => {
    doc.setFontSize(fontSize);
    const lines: Segment[][] = [];
    let current: Segment[] = [];
    let currentWidth = 0;

    const measure = (text: string, bold: boolean) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      return doc.getTextWidth(text);
    };

    const pushWord = (word: string, bold: boolean, leadingSpace: boolean) => {
      const piece = (leadingSpace ? " " : "") + word;
      const w = measure(piece, bold);
      if (currentWidth + w > maxWidth && current.length > 0) {
        lines.push(current);
        current = [];
        currentWidth = 0;
        const w2 = measure(word, bold);
        current.push({ text: word, bold });
        currentWidth = w2;
      } else {
        current.push({ text: piece, bold });
        currentWidth += w;
      }
    };

    let firstWordOfLine = true;
    for (const seg of segments) {
      const blocks = seg.text.split("\n");
      blocks.forEach((block, bi) => {
        if (bi > 0) {
          lines.push(current);
          current = [];
          currentWidth = 0;
          firstWordOfLine = true;
        }
        const words = block.split(/\s+/).filter((w) => w.length > 0);
        words.forEach((word) => {
          pushWord(word, seg.bold, !firstWordOfLine);
          firstWordOfLine = false;
        });
      });
    }
    if (current.length > 0) lines.push(current);
    return lines;
  };

  const drawSegmentLine = (line: Segment[], x: number, yPos: number) => {
    let cx = x;
    for (const seg of line) {
      doc.setFont("helvetica", seg.bold ? "bold" : "normal");
      doc.text(seg.text, cx, yPos);
      cx += doc.getTextWidth(seg.text);
    }
  };

  const FOOTER_H = 30;
  const PAGE_BOTTOM = H - FOOTER_H - 8;

  // Garante espaço mínimo restante; senão vira página
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = 25;
    }
  };

  // Desenha título da seção com linha-acento
  const drawSectionTitle = (title: string) => {
    // Garante espaço para título + pelo menos 2 linhas de corpo (~20mm)
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_DARK);
    doc.text(title.toUpperCase(), MARGIN_X, y);
    // Linha-acento abaixo do título
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, y + 2, MARGIN_X + TITLE_RULE_LEN, y + 2);
    y += SECTION_TITLE_TO_BODY;
  };

  const drawBody = (body: string) => {
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_BODY);
    const segments = tokenize(body || "—");
    const wrapped = wrapSegments(segments, W - BODY_X - MARGIN_X, 10);
    wrapped.forEach((line) => {
      ensureSpace(6);
      drawSegmentLine(line, BODY_X, y);
      y += 5;
    });
  };

  const drawSection = (title: string, body: string) => {
    drawSectionTitle(title);
    drawBody(body);
    y += SECTION_BOTTOM;
  };

  // 1. ABERTURA
  drawSection("Abertura", data.abertura);

  // 2. DESCRIÇÃO DO EVENTO
  drawSection("Descrição do Evento", data.descricao_evento);

  // 3. CARDÁPIO (título + apresentação curta + bullets)
  drawSectionTitle("Cardápio");

  if (data.cardapio_nome) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(data.cardapio_nome, BODY_X, y);
    y += 6;
  }

  if (data.cardapio) {
    drawBody(data.cardapio);
    y += 2;
  }

  if (data.cardapio_itens.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_BODY);
    data.cardapio_itens.forEach((item) => {
      ensureSpace(6);
      doc.text(`•  ${item}`, BULLET_X, y);
      y += 4.8;
    });
  }
  y += SECTION_BOTTOM;

  // 4. SERVIÇOS
  drawSection("Serviços", data.servicos);

  // 5. INVESTIMENTO (texto + tabela)
  if (data.investimento) {
    drawSectionTitle("Investimento");
    drawBody(data.investimento);
    y += 4;
  } else {
    drawSectionTitle("Investimento");
  }

  // ─────────── TABELA DE INVESTIMENTO ───────────
  const tableX = MARGIN_X;
  const tableW = W - 2 * MARGIN_X;
  const colW = [tableW * 0.4, tableW * 0.22, tableW * 0.18, tableW * 0.2];
  const headerRowH = 12;
  const rowH = 11;

  // Garante que a tabela toda caiba na página
  ensureSpace(headerRowH + rowH + 6);

  // Header da tabela
  doc.setFillColor(...BEGE_DARK);
  doc.rect(tableX, y, tableW, headerRowH, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(tableX, y, tableW, headerRowH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  const headers = ["SERVIÇOS", "NÚMERO DE\nCONVIDADOS", "VALOR POR\nPESSOA", "TOTAL"];
  let cx = tableX;
  headers.forEach((h, i) => {
    const lines = h.split("\n");
    const startY = y + (lines.length === 1 ? 7.5 : 5);
    lines.forEach((ln, li) => {
      const align = i === 0 ? "left" : "center";
      const tx = i === 0 ? cx + 4 : cx + colW[i] / 2;
      doc.text(ln, tx, startY + li * 4, { align });
    });
    cx += colW[i];
  });

  y += headerRowH;

  // Linha de dados
  doc.setDrawColor(...LINE);
  doc.rect(tableX, y, tableW, rowH);
  let dx = tableX;
  for (let i = 0; i < colW.length - 1; i++) {
    dx += colW[i];
    doc.line(dx, y, dx, y + rowH);
  }
  let dx2 = tableX;
  for (let i = 0; i < colW.length - 1; i++) {
    dx2 += colW[i];
    doc.line(dx2, y - headerRowH, dx2, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);

  const rowMid = y + rowH / 2 + 1;
  cx = tableX;
  doc.text(data.cardapio_nome || "Serviço de buffet", cx + 4, rowMid);
  cx += colW[0];
  doc.text(String(data.numero_convidados ?? 0), cx + colW[1] / 2, rowMid, { align: "center" });
  cx += colW[1];
  doc.text(fmtCurrency(data.valor_por_pessoa ?? 0), cx + colW[2] / 2, rowMid, { align: "center" });
  cx += colW[2];
  doc.text(fmtCurrency(data.valor_total ?? 0), cx + colW[3] / 2, rowMid, { align: "center" });

  y += rowH + SECTION_BOTTOM + 4;

  // 6. FORMA DE PAGAMENTO
  if (data.forma_pagamento) drawSection("Forma de Pagamento", data.forma_pagamento);
  // 7. OBSERVAÇÕES FINAIS
  if (data.observacoes_finais) drawSection("Observações Finais", data.observacoes_finais);
  // 8. ENCERRAMENTO
  if (data.encerramento) drawSection("Encerramento", data.encerramento);

  // ─────────── FOOTER em TODAS as páginas ───────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = H - FOOTER_H;
    doc.setFillColor(...BEGE);
    doc.rect(0, fy, W, FOOTER_H, "F");
    drawStripes(doc, 10, H - 10, 50, 6);

    doc.setTextColor(...TEXT_DARK);
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.text(empresa.nome.toUpperCase(), MARGIN_X, fy + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    const contactParts: string[] = [];
    if (empresa.telefone) contactParts.push(empresa.telefone);
    if (empresa.endereco) contactParts.push(empresa.endereco);
    if (empresa.email) contactParts.push(empresa.email);
    doc.text(contactParts.join("  ·  "), W - MARGIN_X, fy + 14, { align: "right" });

    // Numeração de páginas
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Página ${i} de ${totalPages}`, W - MARGIN_X, fy + 22, { align: "right" });
  }

  return doc;
}
