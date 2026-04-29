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
  descricao_servico: string;
  texto_cardapio: string;
  observacoes: string;
  forma_pagamento: string;
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
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [200, 200, 200];

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
  // Vertical decorative stripes (lighter beige)
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

  // ─────────── HEADER ───────────
  const headerH = 50;
  doc.setFillColor(...BEGE);
  doc.rect(0, 0, W, headerH, "F");
  // Decorative stripe blocks (left and middle, like the template)
  drawStripes(doc, 10, 6, 35, 8);
  drawStripes(doc, 10, 35, 50, 8);

  // Title
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.text("Proposta de orçamento", 18, 28);

  // Logo (right side)
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
    // Decorative accent square as logo placeholder
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
  doc.text("CLIENTE:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente, 40, y);

  doc.setFont("helvetica", "bold");
  doc.text("DATA DO EVENTO:", 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(data.data_evento), 148, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("LOCAL DO EVENTO:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.local_evento || "A definir", 56, y);

  y += 5;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(18, y, W - 18, y);
  y += 9;

  // Render a single line that may contain **bold** segments
  const drawRichLine = (line: string, x: number, yPos: number) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((s) => s.length > 0);
    let cx = x;
    parts.forEach((part) => {
      const isBold = part.startsWith("**") && part.endsWith("**");
      const text = isBold ? part.slice(2, -2) : part;
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.text(text, cx, yPos);
      cx += doc.getTextWidth(text);
    });
  };

  // Helper to draw a section title + body (supports **bold** in body)
  const drawSection = (title: string, body: string) => {
    if (y > H - 60) { doc.addPage(); y = 25; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_DARK);
    doc.text(title.toUpperCase(), 18, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    // splitTextToSize can break inside ** markers; use normal font width as approximation
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize((body || "—").replace(/\*\*/g, ""), W - 60);
    // Re-wrap original (with markers) using the cleaned line lengths
    const wrapped = wrapPreservingMarkers(body || "—", lines);
    wrapped.forEach((l: string) => {
      if (y > H - 40) { doc.addPage(); y = 25; }
      drawRichLine(l, 40, y);
      y += 5;
    });
    y += 4;
  };

  drawSection("Apresentação", data.descricao_servico);

  // CARDAPIO with itens
  if (y > H - 80) { doc.addPage(); y = 25; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("CARDÁPIO", 18, y);
  y += 6;

  if (data.cardapio_nome) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(data.cardapio_nome, 40, y);
    y += 5;
  }

  if (data.texto_cardapio) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(data.texto_cardapio, W - 60);
    lines.forEach((l: string) => {
      if (y > H - 40) { doc.addPage(); y = 25; }
      doc.text(l, 40, y);
      y += 5;
    });
    y += 2;
  }

  if (data.cardapio_itens.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    data.cardapio_itens.forEach((item) => {
      if (y > H - 40) { doc.addPage(); y = 25; }
      doc.text(`•  ${item}`, 42, y);
      y += 4.5;
    });
    y += 4;
  }

  // ─────────── TABLE ───────────
  if (y > H - 60) { doc.addPage(); y = 25; }
  const tableX = 18;
  const tableW = W - 36;
  const colW = [tableW * 0.4, tableW * 0.22, tableW * 0.18, tableW * 0.2];
  const headerRowH = 12;
  const rowH = 11;

  // Header row
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

  // Body row
  doc.setDrawColor(...LINE);
  doc.rect(tableX, y, tableW, rowH);
  // column dividers
  let dx = tableX;
  for (let i = 0; i < colW.length - 1; i++) {
    dx += colW[i];
    doc.line(dx, y, dx, y + rowH);
  }
  // header dividers
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

  y += rowH + 10;

  // OBSERVATIONS
  if (data.observacoes) drawSection("Observações", data.observacoes);
  if (data.forma_pagamento) drawSection("Forma de pagamento", data.forma_pagamento);

  // ─────────── FOOTER ───────────
  const footerH = 30;
  const fy = H - footerH;
  doc.setFillColor(...BEGE);
  doc.rect(0, fy, W, footerH, "F");
  drawStripes(doc, 10, H - 10, 50, 6);

  doc.setTextColor(...TEXT_DARK);
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.text(empresa.nome.toUpperCase(), 18, fy + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const contactParts: string[] = [];
  if (empresa.telefone) contactParts.push(empresa.telefone);
  if (empresa.endereco) contactParts.push(empresa.endereco);
  if (empresa.email) contactParts.push(empresa.email);
  doc.text(contactParts.join("  ·  "), W - 18, fy + 14, { align: "right" });

  return doc;
}
