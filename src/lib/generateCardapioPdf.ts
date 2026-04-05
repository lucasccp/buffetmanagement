import jsPDF from "jspdf";

interface CardapioItem {
  id: string;
  nome: string;
}

interface CardapioData {
  nome: string;
  valor_sugerido_pp: number;
  cardapio_itens?: CardapioItem[];
}

interface EmpresaData {
  nome: string;
  telefone: string;
  instagram: string;
  slogan: string;
}

const BORDO = [107, 28, 35] as const;    // #6B1C23
const DOURADO = [212, 168, 83] as const; // #D4A853
const BEGE = [245, 237, 220] as const;   // #F5EDDC
const BRANCO = [255, 255, 255] as const;

function drawCoverPage(doc: jsPDF, empresa: EmpresaData) {
  const w = 210;
  const h = 297;

  // Full burgundy background
  doc.setFillColor(...BORDO);
  doc.rect(0, 0, w, h, "F");

  // Gold decorative border
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(1.5);
  doc.rect(15, 15, w - 30, h - 30);
  doc.setLineWidth(0.5);
  doc.rect(18, 18, w - 36, h - 36);

  // Top gold line accent
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(0.8);
  doc.line(50, 90, 160, 90);

  // Company name
  doc.setTextColor(...DOURADO);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome, w / 2, 115, { align: "center" });

  // Slogan
  doc.setFontSize(14);
  doc.setFont("helvetica", "italic");
  doc.text(empresa.slogan, w / 2, 132, { align: "center" });

  // Bottom gold line accent
  doc.line(50, 145, 160, 145);

  // "CARDÁPIO" title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRANCO);
  doc.text("CARDÁPIO", w / 2, 175, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DOURADO);
  doc.text("Proposta de Cotação", w / 2, 188, { align: "center" });

  // Bottom contact info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BEGE);

  const contactY = 250;
  if (empresa.telefone) {
    doc.text(empresa.telefone, w / 2, contactY, { align: "center" });
  }
  if (empresa.instagram) {
    doc.text(empresa.instagram, w / 2, contactY + 7, { align: "center" });
  }

  // Bottom decorative line
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(0.5);
  doc.line(70, contactY + 14, 140, contactY + 14);
}

function drawContentPage(doc: jsPDF, cardapio: CardapioData, empresa: EmpresaData) {
  const w = 210;
  const h = 297;
  const margin = 25;

  // Light background
  doc.setFillColor(...BEGE);
  doc.rect(0, 0, w, h, "F");

  // Top burgundy header bar
  doc.setFillColor(...BORDO);
  doc.rect(0, 0, w, 40, "F");

  // Company name in header
  doc.setTextColor(...DOURADO);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome, w / 2, 18, { align: "center" });

  // Header subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BEGE);
  doc.text("Proposta de Cotação", w / 2, 28, { align: "center" });

  // Gold accent line below header
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(1);
  doc.line(0, 40, w, 40);

  // Menu title
  let y = 60;
  doc.setTextColor(...BORDO);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(cardapio.nome, w / 2, y, { align: "center" });

  // Gold underline
  y += 5;
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(0.8);
  const titleWidth = doc.getTextWidth(cardapio.nome);
  doc.line((w - titleWidth) / 2 - 10, y, (w + titleWidth) / 2 + 10, y);

  // Price per person
  y += 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const valorFormatado = cardapio.valor_sugerido_pp.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  doc.text(`Valor sugerido por pessoa: ${valorFormatado}`, w / 2, y, { align: "center" });

  // Items section
  y += 18;
  const items = cardapio.cardapio_itens || [];

  if (items.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BORDO);
    doc.text("Itens do Cardápio", margin, y);
    y += 4;

    // Separator
    doc.setDrawColor(...DOURADO);
    doc.setLineWidth(0.4);
    doc.line(margin, y, w - margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    for (const item of items) {
      if (y > h - 50) {
        // Would overflow, but for now we keep simple
        break;
      }

      // Gold bullet
      doc.setFillColor(...DOURADO);
      doc.circle(margin + 3, y - 1.5, 1.8, "F");

      // Item name
      doc.text(item.nome, margin + 10, y);
      y += 9;
    }
  } else {
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Nenhum item cadastrado", w / 2, y, { align: "center" });
  }

  // Bottom footer bar
  doc.setFillColor(...BORDO);
  doc.rect(0, h - 20, w, 20, "F");

  doc.setTextColor(...DOURADO);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerParts = [empresa.telefone, empresa.instagram].filter(Boolean).join("  •  ");
  doc.text(footerParts, w / 2, h - 8, { align: "center" });
}

export function generateCardapioPdf(cardapios: CardapioData[], empresa: EmpresaData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Cover page
  drawCoverPage(doc, empresa);

  // Content pages
  for (const cardapio of cardapios) {
    doc.addPage();
    drawContentPage(doc, cardapio, empresa);
  }

  doc.save(`cotacao_cardapio.pdf`);
}
