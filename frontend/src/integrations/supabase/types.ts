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
      document_templates: {
        Row: {
          body_template: string
          category: Database["public"]["Enums"]["doc_category"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          name_fr: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_template: string
          category?: Database["public"]["Enums"]["doc_category"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          name_fr: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_template?: string
          category?: Database["public"]["Enums"]["doc_category"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          name_fr?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          birth_date: string | null
          cin: string | null
          contract_end: string | null
          contract_start: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          internship_end: string | null
          internship_start: string | null
          manager: string | null
          matricule: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          position: string | null
          salary: number | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cin?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          internship_end?: string | null
          internship_start?: string | null
          manager?: string | null
          matricule?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cin?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          internship_end?: string | null
          internship_start?: string | null
          manager?: string | null
          matricule?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          content: string
          created_at: string
          document_type: string
          employee_id: string
          file_url: string | null
          generated_by: string | null
          id: string
          language: string
          template_id: string | null
          variables_used: Json
        }
        Insert: {
          content: string
          created_at?: string
          document_type: string
          employee_id: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          language?: string
          template_id?: string | null
          variables_used?: Json
        }
        Update: {
          content?: string
          created_at?: string
          document_type?: string
          employee_id?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          language?: string
          template_id?: string | null
          variables_used?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rh"
      contract_type: "CDI" | "CDD" | "Stage" | "Freelance"
      doc_category:
        | "attestation"
        | "contrat"
        | "avenant"
        | "certificat"
        | "lettre"
        | "autre"
      employee_status: "active" | "inactive" | "terminated" | "intern"
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
      app_role: ["admin", "rh"],
      contract_type: ["CDI", "CDD", "Stage", "Freelance"],
      doc_category: [
        "attestation",
        "contrat",
        "avenant",
        "certificat",
        "lettre",
        "autre",
      ],
      employee_status: ["active", "inactive", "terminated", "intern"],
    },
  },
} as const
