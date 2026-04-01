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
          evento_id: string
          id: string
          item_id: string
          quantidade: number
        }
        Insert: {
          evento_id: string
          id?: string
          item_id: string
          quantidade: number
        }
        Update: {
          evento_id?: string
          id?: string
          item_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "evento_cardapio_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_cardapio_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_cardapio"
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
      itens_cardapio: {
        Row: {
          custo_unitario: number
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["item_tipo"]
        }
        Insert: {
          custo_unitario: number
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["item_tipo"]
        }
        Update: {
          custo_unitario?: number
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["item_tipo"]
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          data_prevista: string | null
          email: string | null
          id: string
          nome: string
          numero_convidados: number | null
          observacoes: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          tipo_evento: string | null
        }
        Insert: {
          created_at?: string
          data_prevista?: string | null
          email?: string | null
          id?: string
          nome: string
          numero_convidados?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo_evento?: string | null
        }
        Update: {
          created_at?: string
          data_prevista?: string | null
          email?: string | null
          id?: string
          nome?: string
          numero_convidados?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo_evento?: string | null
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
      calcular_custos_evento: { Args: { p_evento_id: string }; Returns: number }
    }
    Enums: {
      custo_categoria:
        | "alimento"
        | "bebida"
        | "equipe"
        | "transporte"
        | "aluguel"
        | "outros"
      evento_status: "planejado" | "confirmado" | "realizado" | "cancelado"
      item_tipo: "comida" | "bebida" | "sobremesa"
      lead_status:
        | "novo"
        | "contato_realizado"
        | "proposta_enviada"
        | "fechado"
        | "perdido"
      pagamento_status: "pendente" | "parcial" | "pago"
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
      custo_categoria: [
        "alimento",
        "bebida",
        "equipe",
        "transporte",
        "aluguel",
        "outros",
      ],
      evento_status: ["planejado", "confirmado", "realizado", "cancelado"],
      item_tipo: ["comida", "bebida", "sobremesa"],
      lead_status: [
        "novo",
        "contato_realizado",
        "proposta_enviada",
        "fechado",
        "perdido",
      ],
      pagamento_status: ["pendente", "parcial", "pago"],
    },
  },
} as const
