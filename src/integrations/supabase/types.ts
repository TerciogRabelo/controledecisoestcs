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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          criado_em: string
          id: string
          registro_id: string | null
          tabela: string
          usuario_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          criado_em?: string
          id?: string
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          criado_em?: string
          id?: string
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
      }
      deliberacoes: {
        Row: {
          anexos: Json
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          criado_por: string | null
          data_inicio_prazo: string | null
          data_verificacao: string | null
          deliberacao_solidaria: boolean
          descricao: string | null
          id: string
          monitoramento_fim: string | null
          monitoramento_inicio: string | null
          monitoramento_numero_processo: string | null
          monitoramento_processo_origem: boolean | null
          monitoramento_tipo:
            | Database["public"]["Enums"]["tipo_monitoramento"]
            | null
          observacao: string | null
          passivel_monitoramento: boolean
          prazo_dias: number | null
          registro_decisao_id: string
          resposta_gestor: string | null
          resultado_monitoramento: string | null
          resultado_monitoramento_id: string | null
          status_monitoramento: string
          tipo_deliberacao_id: string | null
          unidade_acompanhamento_id: string | null
          unidade_medida: string | null
          unidade_tecnica_id: string | null
          valor: number | null
        }
        Insert: {
          anexos?: Json
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          data_inicio_prazo?: string | null
          data_verificacao?: string | null
          deliberacao_solidaria?: boolean
          descricao?: string | null
          id?: string
          monitoramento_fim?: string | null
          monitoramento_inicio?: string | null
          monitoramento_numero_processo?: string | null
          monitoramento_processo_origem?: boolean | null
          monitoramento_tipo?:
            | Database["public"]["Enums"]["tipo_monitoramento"]
            | null
          observacao?: string | null
          passivel_monitoramento?: boolean
          prazo_dias?: number | null
          registro_decisao_id: string
          resposta_gestor?: string | null
          resultado_monitoramento?: string | null
          resultado_monitoramento_id?: string | null
          status_monitoramento?: string
          tipo_deliberacao_id?: string | null
          unidade_acompanhamento_id?: string | null
          unidade_medida?: string | null
          unidade_tecnica_id?: string | null
          valor?: number | null
        }
        Update: {
          anexos?: Json
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          data_inicio_prazo?: string | null
          data_verificacao?: string | null
          deliberacao_solidaria?: boolean
          descricao?: string | null
          id?: string
          monitoramento_fim?: string | null
          monitoramento_inicio?: string | null
          monitoramento_numero_processo?: string | null
          monitoramento_processo_origem?: boolean | null
          monitoramento_tipo?:
            | Database["public"]["Enums"]["tipo_monitoramento"]
            | null
          observacao?: string | null
          passivel_monitoramento?: boolean
          prazo_dias?: number | null
          registro_decisao_id?: string
          resposta_gestor?: string | null
          resultado_monitoramento?: string | null
          resultado_monitoramento_id?: string | null
          status_monitoramento?: string
          tipo_deliberacao_id?: string | null
          unidade_acompanhamento_id?: string | null
          unidade_medida?: string | null
          unidade_tecnica_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deliberacoes_registro_decisao_id_fkey"
            columns: ["registro_decisao_id"]
            isOneToOne: false
            referencedRelation: "registros_decisao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliberacoes_resultado_monitoramento_id_fkey"
            columns: ["resultado_monitoramento_id"]
            isOneToOne: false
            referencedRelation: "resultados_monitoramento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliberacoes_tipo_deliberacao_id_fkey"
            columns: ["tipo_deliberacao_id"]
            isOneToOne: false
            referencedRelation: "tipos_deliberacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliberacoes_unidade_acompanhamento_id_fkey"
            columns: ["unidade_acompanhamento_id"]
            isOneToOne: false
            referencedRelation: "unidades_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliberacoes_unidade_tecnica_id_fkey"
            columns: ["unidade_tecnica_id"]
            isOneToOne: false
            referencedRelation: "unidades_tecnicas"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_dados: {
        Row: {
          ativo: boolean
          caminho_lista: string | null
          campo_label: string
          campo_valor: string
          created_at: string
          headers: Json
          id: string
          nome: string
          tipo_alvo: Database["public"]["Enums"]["fonte_tipo_alvo"]
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          caminho_lista?: string | null
          campo_label?: string
          campo_valor?: string
          created_at?: string
          headers?: Json
          id?: string
          nome: string
          tipo_alvo: Database["public"]["Enums"]["fonte_tipo_alvo"]
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          caminho_lista?: string | null
          campo_label?: string
          campo_valor?: string
          created_at?: string
          headers?: Json
          id?: string
          nome?: string
          tipo_alvo?: Database["public"]["Enums"]["fonte_tipo_alvo"]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      orgaos_julgadores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      processos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          numero: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          numero: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          numero?: string
          updated_at?: string
        }
        Relationships: []
      }
      processos_relacionados: {
        Row: {
          created_at: string
          id: string
          numero_processo_relacionado: string
          observacao: string | null
          registro_decisao_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_processo_relacionado: string
          observacao?: string | null
          registro_decisao_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_processo_relacionado?: string
          observacao?: string | null
          registro_decisao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_relacionados_registro_decisao_id_fkey"
            columns: ["registro_decisao_id"]
            isOneToOne: false
            referencedRelation: "registros_decisao"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aprovado: boolean
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_master: boolean
          nome: string
          tribunal_id: string | null
          unidade_tecnica_id: string | null
          updated_at: string
        }
        Insert: {
          aprovado?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_master?: boolean
          nome: string
          tribunal_id?: string | null
          unidade_tecnica_id?: string | null
          updated_at?: string
        }
        Update: {
          aprovado?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_master?: boolean
          nome?: string
          tribunal_id?: string | null
          unidade_tecnica_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unidade_tecnica_id_fkey"
            columns: ["unidade_tecnica_id"]
            isOneToOne: false
            referencedRelation: "unidades_tecnicas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_decisao: {
        Row: {
          anexos: Json
          atualizado_em: string
          atualizado_por: string | null
          cpf_cnpj: string | null
          criado_em: string
          criado_por: string | null
          data_decisao: string | null
          data_transito_julgado: string | null
          gestor_responsavel: string | null
          houve_deliberacao: boolean
          id: string
          numero_decisao: string | null
          numero_processo: string
          observacoes: string | null
          orgao_julgador_id: string | null
          quantidade_deliberacoes: number
          status_registro: Database["public"]["Enums"]["status_registro"]
          tipo_decisao_id: string | null
          tipo_julgamento_id: string | null
          unidade_gestora_id: string | null
        }
        Insert: {
          anexos?: Json
          atualizado_em?: string
          atualizado_por?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          criado_por?: string | null
          data_decisao?: string | null
          data_transito_julgado?: string | null
          gestor_responsavel?: string | null
          houve_deliberacao?: boolean
          id?: string
          numero_decisao?: string | null
          numero_processo: string
          observacoes?: string | null
          orgao_julgador_id?: string | null
          quantidade_deliberacoes?: number
          status_registro?: Database["public"]["Enums"]["status_registro"]
          tipo_decisao_id?: string | null
          tipo_julgamento_id?: string | null
          unidade_gestora_id?: string | null
        }
        Update: {
          anexos?: Json
          atualizado_em?: string
          atualizado_por?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          criado_por?: string | null
          data_decisao?: string | null
          data_transito_julgado?: string | null
          gestor_responsavel?: string | null
          houve_deliberacao?: boolean
          id?: string
          numero_decisao?: string | null
          numero_processo?: string
          observacoes?: string | null
          orgao_julgador_id?: string | null
          quantidade_deliberacoes?: number
          status_registro?: Database["public"]["Enums"]["status_registro"]
          tipo_decisao_id?: string | null
          tipo_julgamento_id?: string | null
          unidade_gestora_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_decisao_orgao_julgador_id_fkey"
            columns: ["orgao_julgador_id"]
            isOneToOne: false
            referencedRelation: "orgaos_julgadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_decisao_tipo_decisao_id_fkey"
            columns: ["tipo_decisao_id"]
            isOneToOne: false
            referencedRelation: "tipos_decisao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_decisao_tipo_julgamento_id_fkey"
            columns: ["tipo_julgamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_julgamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_decisao_unidade_gestora_id_fkey"
            columns: ["unidade_gestora_id"]
            isOneToOne: false
            referencedRelation: "unidades_gestoras"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados_monitoramento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
        }
        Relationships: []
      }
      status_monitoramento_options: {
        Row: {
          ativo: boolean
          codigo: string
          cor: string
          created_at: string
          descricao: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          cor?: string
          created_at?: string
          descricao: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          cor?: string
          created_at?: string
          descricao?: string
          ordem?: number
        }
        Relationships: []
      }
      tipos_decisao: {
        Row: {
          ativo: boolean
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      tipos_deliberacao: {
        Row: {
          ativo: boolean
          cor: string
          descricao: string
          gera_prazo: boolean
          icone: string
          id: string
          permite_unidade_medida: boolean
          permite_valor: boolean
          prazo_facultativo: boolean
        }
        Insert: {
          ativo?: boolean
          cor?: string
          descricao: string
          gera_prazo?: boolean
          icone?: string
          id?: string
          permite_unidade_medida?: boolean
          permite_valor?: boolean
          prazo_facultativo?: boolean
        }
        Update: {
          ativo?: boolean
          cor?: string
          descricao?: string
          gera_prazo?: boolean
          icone?: string
          id?: string
          permite_unidade_medida?: boolean
          permite_valor?: boolean
          prazo_facultativo?: boolean
        }
        Relationships: []
      }
      tipos_julgamento: {
        Row: {
          ativo: boolean
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      tribunais: {
        Row: {
          ativo: boolean
          created_at: string
          esfera: string
          id: string
          logo_url: string | null
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          esfera?: string
          id?: string
          logo_url?: string | null
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          esfera?: string
          id?: string
          logo_url?: string | null
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades_gestoras: {
        Row: {
          cnpj: string | null
          created_at: string
          esfera: Database["public"]["Enums"]["esfera_unidade"]
          id: string
          municipio: string | null
          nome_unidade: string
          sigla: string | null
          status: boolean
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          esfera?: Database["public"]["Enums"]["esfera_unidade"]
          id?: string
          municipio?: string | null
          nome_unidade: string
          sigla?: string | null
          status?: boolean
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          esfera?: Database["public"]["Enums"]["esfera_unidade"]
          id?: string
          municipio?: string | null
          nome_unidade?: string
          sigla?: string | null
          status?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      unidades_tecnicas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          sigla: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          sigla?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          sigla?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_unidade_tecnica: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "secretaria" | "monitoramento" | "consulta"
      esfera_unidade: "estadual" | "municipal" | "federal" | "outra"
      fonte_tipo_alvo:
        | "processos"
        | "unidades_gestoras"
        | "orgaos_julgadores"
        | "tipos_decisao"
        | "tipos_julgamento"
        | "tipos_deliberacao"
      status_monitoramento:
        | "nao_iniciado"
        | "em_monitoramento"
        | "cumprido"
        | "nao_cumprido"
        | "parcialmente_cumprido"
        | "vencido"
      status_registro: "rascunho" | "ativo" | "arquivado"
      tipo_monitoramento: "processual" | "extraprocessual"
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
      app_role: ["admin", "secretaria", "monitoramento", "consulta"],
      esfera_unidade: ["estadual", "municipal", "federal", "outra"],
      fonte_tipo_alvo: [
        "processos",
        "unidades_gestoras",
        "orgaos_julgadores",
        "tipos_decisao",
        "tipos_julgamento",
        "tipos_deliberacao",
      ],
      status_monitoramento: [
        "nao_iniciado",
        "em_monitoramento",
        "cumprido",
        "nao_cumprido",
        "parcialmente_cumprido",
        "vencido",
      ],
      status_registro: ["rascunho", "ativo", "arquivado"],
      tipo_monitoramento: ["processual", "extraprocessual"],
    },
  },
} as const
