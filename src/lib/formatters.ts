export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  if (typeof date === "string") {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  }
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function dateToISOString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const leadStatusLabels: Record<string, string> = {
  novo: "Novo",
  contato_realizado: "Contato Realizado",
  proposta_enviada: "Proposta Enviada",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const eventoStatusLabels: Record<string, string> = {
  planejado: "Planejado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const custoCategLabels: Record<string, string> = {
  alimento: "Alimento",
  bebida: "Bebida",
  equipe: "Equipe",
  transporte: "Transporte",
  aluguel: "Aluguel",
  outros: "Outros",
};

export const movimentacaoTipoLabels: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

export const pagamentoStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
};

export const pagamentoEventoStatusLabels: Record<string, string> = {
  planejado: "Planejado",
  pago: "Pago",
};

export const metodoPagamentoLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  outro: "Outro",
};

export const parcelaStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};
