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
      contactos: {
        Row: {
          asunto: string
          canal: string
          created_at: string
          cuerpo: string
          estado: string
          id: string
          negocio_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asunto: string
          canal?: string
          created_at?: string
          cuerpo: string
          estado?: string
          id?: string
          negocio_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asunto?: string
          canal?: string
          created_at?: string
          cuerpo?: string
          estado?: string
          id?: string
          negocio_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contactos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      crm: {
        Row: {
          created_at: string
          estado: string
          fecha_contacto: string | null
          id: string
          negocio_id: string
          notas: string | null
          presupuesto_enviado: boolean
          prioridad: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_contacto?: string | null
          id?: string
          negocio_id: string
          notas?: string | null
          presupuesto_enviado?: boolean
          prioridad?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_contacto?: string | null
          id?: string
          negocio_id?: string
          notas?: string | null
          presupuesto_enviado?: boolean
          prioridad?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      municipios: {
        Row: {
          codigo_postal: string
          created_at: string
          id: string
          nombre: string
          poblacion: number
          provincia: string | null
        }
        Insert: {
          codigo_postal: string
          created_at?: string
          id?: string
          nombre: string
          poblacion?: number
          provincia?: string | null
        }
        Update: {
          codigo_postal?: string
          created_at?: string
          id?: string
          nombre?: string
          poblacion?: number
          provincia?: string | null
        }
        Relationships: []
      }
      negocios: {
        Row: {
          categoria: string
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          municipio_id: string | null
          nombre: string
          numero_resenas: number
          rating: number
          telefono: string | null
          tiene_web: boolean
          updated_at: string
          url_web: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          municipio_id?: string | null
          nombre: string
          numero_resenas?: number
          rating?: number
          telefono?: string | null
          tiene_web?: boolean
          updated_at?: string
          url_web?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          municipio_id?: string | null
          nombre?: string
          numero_resenas?: number
          rating?: number
          telefono?: string | null
          tiene_web?: boolean
          updated_at?: string
          url_web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negocios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      score: {
        Row: {
          created_at: string
          etiqueta: string
          factores: Json
          id: string
          negocio_id: string
          score_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          etiqueta?: string
          factores?: Json
          id?: string
          negocio_id: string
          score_total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          etiqueta?: string
          factores?: Json
          id?: string
          negocio_id?: string
          score_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: true
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      web_generada: {
        Row: {
          contenido: string
          created_at: string
          estado: string
          id: string
          negocio_id: string
          updated_at: string
          url_publicacion: string | null
          user_id: string | null
        }
        Insert: {
          contenido: string
          created_at?: string
          estado?: string
          id?: string
          negocio_id: string
          updated_at?: string
          url_publicacion?: string | null
          user_id?: string | null
        }
        Update: {
          contenido?: string
          created_at?: string
          estado?: string
          id?: string
          negocio_id?: string
          updated_at?: string
          url_publicacion?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_generada_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enqueue_high_potential_leads: { Args: never; Returns: number }
      enqueue_lead_for_negocio: {
        Args: { _negocio_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
