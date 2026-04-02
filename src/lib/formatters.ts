export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
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
