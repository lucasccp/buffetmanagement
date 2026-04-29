export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      caixa_movimentacoes: {
        Row: {
          automatica: boolean
          created_at: string
          data: string
          descricao: string
          evento_id: string | null
          id: string
          nota_fiscal_url: string | null
          referencia_id: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          valor: number
        }
        Insert: {
          automatica?: boolean
          created_at?: string
          data?: string
          descricao: string
          evento_id?: string | null
          id?: string
          nota_fiscal_url?: string | null
          referencia_id?: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          valor: number
        }
        Update: {
          automatica?: boolean
          created_at?: string
          data?: string
          descricao?: string
          evento_id?: string | null
          id?: string
          nota_fiscal_url?: string | null
          referencia_id?: string | null
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentacoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      cardapio_itens: {
        Row: {
          cardapio_id: string
          categoria: string | null
          id: string
          nome: string
        }
        Insert: {
          cardapio_id: string
          categoria?: string | null
          id?: string
          nome: string
        }
        Update: {
          cardapio_id?: string
          categoria?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardapio_itens_cardapio_id_fkey"
            columns: ["cardapio_id"]
            isOneToOne: false
            referencedRelation: "cardapios"
            referencedColumns: ["id"]
          },
        ]
      }
      cardapios: {
        Row: {
          id: string
          nome: string
          valor_sugerido_pp: number
        }
        Insert: {
          id?: string
          nome: string
          valor_sugerido_pp?: number
        }
        Update: {
          id?: string
          nome?: string
          valor_sugerido_pp?: number
        }
        Relationships: []
      }
      custos_evento: {
        Row: {
          categoria: Database["public"]["Enums"]["custo_categoria"]
          data_custo: string | null
          descricao: string
          evento_id: string
          id: string
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["custo_categoria"]
          data_custo?: string | null
          descricao: string
          evento_id: string
          id?: string
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["custo_categoria"]
          data_custo?: string | null
          descricao?: string
          evento_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          cnpj: string | null
          cor_destaque: string | null
          created_at: string
          email: string | null
          endereco: string | null
          forma_pagamento_padrao: string | null
          id: string
          logo_url: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          cor_destaque?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          forma_pagamento_padrao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          cor_destaque?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          forma_pagamento_padrao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipe: {
        Row: {
          custo_por_evento: number | null
          funcao: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          custo_por_evento?: number | null
          funcao?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          custo_por_evento?: number | null
          funcao?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      evento_cardapio: {
        Row: {
          cardapio_id: string
          evento_id: string
          id: string
        }
        Insert: {
          cardapio_id: string
          evento_id: string
          id?: string
        }
        Update: {
          cardapio_id?: string
          evento_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_cardapio_cardapio_id_fkey"
            columns: ["cardapio_id"]
            isOneToOne: false
            referencedRelation: "cardapios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_cardapio_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_equipe: {
        Row: {
          equipe_id: string
          evento_id: string
          id: string
          valor_pago: number | null
        }
        Insert: {
          equipe_id: string
          evento_id: string
          id?: string
          valor_pago?: number | null
        }
        Update: {
          equipe_id?: string
          evento_id?: string
          id?: string
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_equipe_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          data_evento: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          lead_id: string | null
          local: string | null
          nome_evento: string
          numero_convidados: number | null
          observacoes: string | null
          status: Database["public"]["Enums"]["evento_status"]
          tipo_evento: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          data_evento?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          lead_id?: string | null
          local?: string | null
          nome_evento: string
          numero_convidados?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          tipo_evento?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          data_evento?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          lead_id?: string | null
          local?: string | null
          nome_evento?: string
          numero_convidados?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          tipo_evento?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_evento: {
        Row: {
          data_pagamento: string | null
          evento_id: string
          id: string
          status_pagamento: Database["public"]["Enums"]["pagamento_status"]
          valor_recebido: number
          valor_total: number
        }
        Insert: {
          data_pagamento?: string | null
          evento_id: string
          id?: string
          status_pagamento?: Database["public"]["Enums"]["pagamento_status"]
          valor_recebido?: number
          valor_total: number
        }
        Update: {
          data_pagamento?: string | null
          evento_id?: string
          id?: string
          status_pagamento?: Database["public"]["Enums"]["pagamento_status"]
          valor_recebido?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cardapio_id: string | null
          created_at: string
          data_prevista: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          numero_convidados: number | null
          observacoes: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          tipo_evento: string | null
          valor_evento: number | null
        }
        Insert: {
          cardapio_id?: string | null
          created_at?: string
          data_prevista?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          numero_convidados?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo_evento?: string | null
          valor_evento?: number | null
        }
        Update: {
          cardapio_id?: string | null
          created_at?: string
          data_prevista?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          numero_convidados?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo_evento?: string | null
          valor_evento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cardapio_id_fkey"
            columns: ["cardapio_id"]
            isOneToOne: false
            referencedRelation: "cardapios"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_evento: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_planejada: string
          evento_id: string
          id: string
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          status: Database["public"]["Enums"]["pagamento_evento_status"]
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_planejada: string
          evento_id: string
          id?: string
          metodo_pagamento?: Database["public"]["Enums"]["metodo_pagamento"]
          status?: Database["public"]["Enums"]["pagamento_evento_status"]
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_planejada?: string
          evento_id?: string
          id?: string
          metodo_pagamento?: Database["public"]["Enums"]["metodo_pagamento"]
          status?: Database["public"]["Enums"]["pagamento_evento_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_pagamento: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          evento_id: string
          id: string
          numero_parcela: number
          status: Database["public"]["Enums"]["parcela_status"]
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          evento_id: string
          id?: string
          numero_parcela: number
          status?: Database["public"]["Enums"]["parcela_status"]
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          evento_id?: string
          id?: string
          numero_parcela?: number
          status?: Database["public"]["Enums"]["parcela_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_pagamento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          frozen: boolean
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          frozen?: boolean
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          frozen?: boolean
          id?: string
        }
        Relationships: []
      }
      propostas: {
        Row: {
          cardapio_id: string | null
          conteudo: Json
          created_at: string
          evento_id: string | null
          forma_pagamento: string | null
          id: string
          lead_id: string
          numero_convidados: number | null
          observacoes: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["proposta_status"]
          tom: string
          updated_at: string
          valor_por_pessoa: number | null
          valor_total: number | null
        }
        Insert: {
          cardapio_id?: string | null
          conteudo?: Json
          created_at?: string
          evento_id?: string | null
          forma_pagamento?: string | null
          id?: string
          lead_id: string
          numero_convidados?: number | null
          observacoes?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          tom?: string
          updated_at?: string
          valor_por_pessoa?: number | null
          valor_total?: number | null
        }
        Update: {
          cardapio_id?: string | null
          conteudo?: Json
          created_at?: string
          evento_id?: string | null
          forma_pagamento?: string | null
          id?: string
          lead_id?: string
          numero_convidados?: number | null
          observacoes?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          tom?: string
          updated_at?: string
          valor_por_pessoa?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cardapio_id_fkey"
            columns: ["cardapio_id"]
            isOneToOne: false
            referencedRelation: "cardapios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_metrics: {
        Row: {
          custo_total: number | null
          faturamento_total: number | null
          ticket_medio: number | null
          total_eventos: number | null
        }
        Relationships: []
      }
      eventos_por_status: {
        Row: {
          status: Database["public"]["Enums"]["evento_status"] | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      atualizar_parcelas_atrasadas: { Args: never; Returns: number }
      calcular_custos_evento: { Args: { p_evento_id: string }; Returns: number }
      gerar_parcelas: {
        Args: {
          p_data_inicial: string
          p_evento_id: string
          p_num_parcelas: number
          p_valor_total: number
        }
        Returns: undefined
      }
      get_ai_financial_snapshot: { Args: never; Returns: Json }
      get_caixa_fluxo_mensal: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          entradas: number
          mes: string
          saidas: number
          saldo: number
        }[]
      }
      get_caixa_metrics: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          entradas_previstas: number
          entradas_realizadas: number
          saidas: number
          saldo_atual: number
          saldo_futuro: number
        }[]
      }
      get_caixa_saldo_acumulado: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          mes: string
          saldo_acumulado: number
        }[]
      }
      get_dashboard_executivo: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_evento_id?: string
          p_tipo_evento?: string
        }
        Returns: {
          custo_total: number
          faturamento_total: number
          lucro_total: number
          margem_media: number
          ticket_medio: number
          total_eventos: number
        }[]
      }
      get_dashboard_filtrado: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_evento_id?: string
        }
        Returns: {
          custo_total: number
          faturamento_total: number
          ticket_medio: number
          total_eventos: number
        }[]
      }
      get_eventos_ranking: {
        Args: { p_data_fim?: string; p_data_inicio?: string; p_limit?: number }
        Returns: {
          custo: number
          data_evento: string
          evento_id: string
          faturamento: number
          lucro: number
          nome_evento: string
        }[]
      }
      get_executivo_mensal: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_evento_id?: string
          p_tipo_evento?: string
        }
        Returns: {
          custo_mes: number
          faturamento_mes: number
          lucro_mes: number
          mes: string
        }[]
      }
      get_financeiro_mensal: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_evento_id?: string
        }
        Returns: {
          custo_mes: number
          faturamento_mes: number
          lucro_mes: number
          mes: string
        }[]
      }
      get_financeiro_metrics: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          eventos_com_pendencia: number
          faturamento_total: number
          taxa_inadimplencia: number
          total_a_receber: number
          total_atrasado: number
          total_recebido: number
        }[]
      }
      get_financeiro_parcelas: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          eventos_com_pendencia: number
          total_a_receber: number
          total_atrasado: number
          total_recebido: number
        }[]
      }
      get_fluxo_caixa_parcelas: {
        Args: {
          p_agrupamento?: string
          p_data_fim?: string
          p_data_inicio?: string
        }
        Returns: {
          entradas_previstas: number
          entradas_realizadas: number
          periodo: string
        }[]
      }
      get_parcelas_distribuicao: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          status: string
          total: number
          valor: number
        }[]
      }
      get_parcelas_resumo: {
        Args: { p_evento_id: string }
        Returns: {
          qtd_atrasadas: number
          qtd_pagas: number
          qtd_pendentes: number
          total_atrasado: number
          total_pago: number
          total_parcelas: number
          total_pendente: number
          total_valor: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      custo_categoria:
        | "alimento"
        | "bebida"
        | "equipe"
        | "transporte"
        | "aluguel"
        | "outros"
      evento_status: "planejado" | "confirmado" | "realizado" | "cancelado"
      lead_status:
        | "novo"
        | "contato_realizado"
        | "proposta_enviada"
        | "aceita"
        | "fechado"
        | "perdido"
      metodo_pagamento:
        | "pix"
        | "dinheiro"
        | "cartao_credito"
        | "cartao_debito"
        | "transferencia"
        | "boleto"
        | "outro"
      movimentacao_tipo: "entrada" | "saida"
      pagamento_evento_status: "planejado" | "pago"
      pagamento_status: "pendente" | "parcial" | "pago"
      parcela_status: "pendente" | "pago" | "atrasado"
      proposta_status: "enviada" | "aceita" | "convertida" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      custo_categoria: [
        "alimento",
        "bebida",
        "equipe",
        "transporte",
        "aluguel",
        "outros",
      ],
      evento_status: ["planejado", "confirmado", "realizado", "cancelado"],
      lead_status: [
        "novo",
        "contato_realizado",
        "proposta_enviada",
        "aceita",
        "fechado",
        "perdido",
      ],
      metodo_pagamento: [
        "pix",
        "dinheiro",
        "cartao_credito",
        "cartao_debito",
        "transferencia",
        "boleto",
        "outro",
      ],
      movimentacao_tipo: ["entrada", "saida"],
      pagamento_evento_status: ["planejado", "pago"],
      pagamento_status: ["pendente", "parcial", "pago"],
      parcela_status: ["pendente", "pago", "atrasado"],
      proposta_status: ["enviada", "aceita", "convertida", "cancelada"],
    },
  },
} as const
