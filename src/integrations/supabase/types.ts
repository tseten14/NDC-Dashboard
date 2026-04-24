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
      activities: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          districts: string[] | null
          id: string
          ministry: string | null
          organization: string | null
          owner_ids: string[] | null
          status: string
          timeframe_end: string | null
          timeframe_start: string | null
          title: string
          updated_at: string
          workflow_state: Database["public"]["Enums"]["workflow_state"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          districts?: string[] | null
          id?: string
          ministry?: string | null
          organization?: string | null
          owner_ids?: string[] | null
          status?: string
          timeframe_end?: string | null
          timeframe_start?: string | null
          title: string
          updated_at?: string
          workflow_state?: Database["public"]["Enums"]["workflow_state"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          districts?: string[] | null
          id?: string
          ministry?: string | null
          organization?: string | null
          owner_ids?: string[] | null
          status?: string
          timeframe_end?: string | null
          timeframe_start?: string | null
          title?: string
          updated_at?: string
          workflow_state?: Database["public"]["Enums"]["workflow_state"]
        }
        Relationships: []
      }
      activity_target_links: {
        Row: {
          activity_id: string
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expected_contribution: string | null
          id: string
          indicator_ids: string[] | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          strategy: string
          target_id: string
        }
        Insert: {
          activity_id: string
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expected_contribution?: string | null
          id?: string
          indicator_ids?: string[] | null
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          strategy: string
          target_id: string
        }
        Update: {
          activity_id?: string
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expected_contribution?: string | null
          id?: string
          indicator_ids?: string[] | null
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          strategy?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_target_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptation_options: {
        Row: {
          applicable_sectors: string[]
          co_benefits: string | null
          cost_range_max_usd: number | null
          cost_range_min_usd: number | null
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          description: string | null
          evidence_links: string[] | null
          expected_risk_reduction: string | null
          hazard_types: string[]
          id: string
          name: string
          related_activities: string[] | null
          related_ndc_targets: string[] | null
        }
        Insert: {
          applicable_sectors?: string[]
          co_benefits?: string | null
          cost_range_max_usd?: number | null
          cost_range_min_usd?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          description?: string | null
          evidence_links?: string[] | null
          expected_risk_reduction?: string | null
          hazard_types?: string[]
          id: string
          name: string
          related_activities?: string[] | null
          related_ndc_targets?: string[] | null
        }
        Update: {
          applicable_sectors?: string[]
          co_benefits?: string | null
          cost_range_max_usd?: number | null
          cost_range_min_usd?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          description?: string | null
          evidence_links?: string[] | null
          expected_risk_reduction?: string | null
          hazard_types?: string[]
          id?: string
          name?: string
          related_activities?: string[] | null
          related_ndc_targets?: string[] | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff_summary: string | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff_summary?: string | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff_summary?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      evidence_items: {
        Row: {
          activity_id: string
          evidence_type: string
          id: string
          link_or_file_ref: string
          notes: string | null
          submitted_at: string
          submitted_by: string
          tag: string
        }
        Insert: {
          activity_id: string
          evidence_type: string
          id?: string
          link_or_file_ref: string
          notes?: string | null
          submitted_at?: string
          submitted_by: string
          tag?: string
        }
        Update: {
          activity_id?: string
          evidence_type?: string
          id?: string
          link_or_file_ref?: string
          notes?: string | null
          submitted_at?: string
          submitted_by?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      exposure_layers: {
        Row: {
          confidence_rating: Database["public"]["Enums"]["confidence_rating"]
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          exposure_type: string
          geometry_type: string | null
          id: string
          license: string | null
          name: string
          notes: string | null
          source_provider: string | null
          source_url: string | null
          vintage_date: string | null
        }
        Insert: {
          confidence_rating?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          exposure_type: string
          geometry_type?: string | null
          id: string
          license?: string | null
          name: string
          notes?: string | null
          source_provider?: string | null
          source_url?: string | null
          vintage_date?: string | null
        }
        Update: {
          confidence_rating?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          exposure_type?: string
          geometry_type?: string | null
          id?: string
          license?: string | null
          name?: string
          notes?: string | null
          source_provider?: string | null
          source_url?: string | null
          vintage_date?: string | null
        }
        Relationships: []
      }
      hazard_layers: {
        Row: {
          acute_or_chronic: Database["public"]["Enums"]["acute_chronic"]
          api_endpoint: string | null
          auth_ref: string | null
          confidence_rating: Database["public"]["Enums"]["confidence_rating"]
          created_at: string
          data_access_mode: Database["public"]["Enums"]["data_access_mode"]
          data_status: Database["public"]["Enums"]["data_status"]
          geography_coverage: string | null
          hazard_type: string
          id: string
          license: string | null
          methodology_notes: string | null
          name: string
          scenario_name: string | null
          source_provider: string | null
          source_url: string | null
          spatial_resolution: string | null
          time_horizon: string | null
          uncertainty_notes: string | null
          updated_at: string
          vintage_date: string | null
        }
        Insert: {
          acute_or_chronic?: Database["public"]["Enums"]["acute_chronic"]
          api_endpoint?: string | null
          auth_ref?: string | null
          confidence_rating?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_access_mode?: Database["public"]["Enums"]["data_access_mode"]
          data_status?: Database["public"]["Enums"]["data_status"]
          geography_coverage?: string | null
          hazard_type: string
          id: string
          license?: string | null
          methodology_notes?: string | null
          name: string
          scenario_name?: string | null
          source_provider?: string | null
          source_url?: string | null
          spatial_resolution?: string | null
          time_horizon?: string | null
          uncertainty_notes?: string | null
          updated_at?: string
          vintage_date?: string | null
        }
        Update: {
          acute_or_chronic?: Database["public"]["Enums"]["acute_chronic"]
          api_endpoint?: string | null
          auth_ref?: string | null
          confidence_rating?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_access_mode?: Database["public"]["Enums"]["data_access_mode"]
          data_status?: Database["public"]["Enums"]["data_status"]
          geography_coverage?: string | null
          hazard_type?: string
          id?: string
          license?: string | null
          methodology_notes?: string | null
          name?: string
          scenario_name?: string | null
          source_provider?: string | null
          source_url?: string | null
          spatial_resolution?: string | null
          time_horizon?: string | null
          uncertainty_notes?: string | null
          updated_at?: string
          vintage_date?: string | null
        }
        Relationships: []
      }
      output_records: {
        Row: {
          activity_id: string
          created_at: string
          created_by: string
          id: string
          method: string | null
          metric_name: string
          output_date: string
          source: string | null
          unit: string
          value: number
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by: string
          id?: string
          method?: string | null
          metric_name: string
          output_date: string
          source?: string | null
          unit: string
          value: number
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string
          id?: string
          method?: string | null
          metric_name?: string
          output_date?: string
          source?: string | null
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "output_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          district_scope: string[] | null
          id: string
          ministry_scope: string | null
          organization_scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          district_scope?: string[] | null
          id?: string
          ministry_scope?: string | null
          organization_scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          district_scope?: string[] | null
          id?: string
          ministry_scope?: string | null
          organization_scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          confidence_rating: Database["public"]["Enums"]["confidence_rating"]
          created_at: string
          data_provenance_summary: string | null
          data_status: Database["public"]["Enums"]["data_status"]
          expected_impact_summary: string | null
          exposure_layer_id: string | null
          geography_id: string | null
          geography_unit: string
          hazard_layer_id: string | null
          id: string
          related_activities: string[] | null
          related_ndc_targets: string[] | null
          related_projects: string[] | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number | null
          vulnerability_model_id: string | null
        }
        Insert: {
          confidence_rating?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_provenance_summary?: string | null
          data_status?: Database["public"]["Enums"]["data_status"]
          expected_impact_summary?: string | null
          exposure_layer_id?: string | null
          geography_id?: string | null
          geography_unit: string
          hazard_layer_id?: string | null
          id: string
          related_activities?: string[] | null
          related_ndc_targets?: string[] | null
          related_projects?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number | null
          vulnerability_model_id?: string | null
        }
        Update: {
          confidence_rating?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_provenance_summary?: string | null
          data_status?: Database["public"]["Enums"]["data_status"]
          expected_impact_summary?: string | null
          exposure_layer_id?: string | null
          geography_id?: string | null
          geography_unit?: string
          hazard_layer_id?: string | null
          id?: string
          related_activities?: string[] | null
          related_ndc_targets?: string[] | null
          related_projects?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number | null
          vulnerability_model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_exposure_layer_id_fkey"
            columns: ["exposure_layer_id"]
            isOneToOne: false
            referencedRelation: "exposure_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_hazard_layer_id_fkey"
            columns: ["hazard_layer_id"]
            isOneToOne: false
            referencedRelation: "hazard_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_vulnerability_model_id_fkey"
            columns: ["vulnerability_model_id"]
            isOneToOne: false
            referencedRelation: "vulnerability_models"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_cells: {
        Row: {
          confidence: Database["public"]["Enums"]["confidence_rating"]
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          district_id: string
          hazard_layer_id: string
          id: string
          intensity_score_0_100: number
          notes: string | null
          related_activities: string[] | null
          related_ndc_targets: string[] | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          scenario: string | null
          source_provider: string | null
          source_url: string | null
          time_horizon: string | null
          vintage: string | null
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          district_id: string
          hazard_layer_id: string
          id: string
          intensity_score_0_100: number
          notes?: string | null
          related_activities?: string[] | null
          related_ndc_targets?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          scenario?: string | null
          source_provider?: string | null
          source_url?: string | null
          time_horizon?: string | null
          vintage?: string | null
        }
        Update: {
          confidence?: Database["public"]["Enums"]["confidence_rating"]
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          district_id?: string
          hazard_layer_id?: string
          id?: string
          intensity_score_0_100?: number
          notes?: string | null
          related_activities?: string[] | null
          related_ndc_targets?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          scenario?: string | null
          source_provider?: string | null
          source_url?: string | null
          time_horizon?: string | null
          vintage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_cells_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "risk_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_cells_hazard_layer_id_fkey"
            columns: ["hazard_layer_id"]
            isOneToOne: false
            referencedRelation: "hazard_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_districts: {
        Row: {
          created_at: string
          geojson: Json
          id: string
          name: string
          region: string | null
        }
        Insert: {
          created_at?: string
          geojson: Json
          id: string
          name: string
          region?: string | null
        }
        Update: {
          created_at?: string
          geojson?: Json
          id?: string
          name?: string
          region?: string | null
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
      validation_records: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          qa_flags: string[] | null
          status: Database["public"]["Enums"]["validation_status"]
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          qa_flags?: string[] | null
          status?: Database["public"]["Enums"]["validation_status"]
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          qa_flags?: string[] | null
          status?: Database["public"]["Enums"]["validation_status"]
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      vulnerability_models: {
        Row: {
          applies_to_exposure_type: string | null
          applies_to_hazard_type: string | null
          assumptions: string | null
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          id: string
          model_reference: string | null
          name: string
          source_provider: string | null
          source_url: string | null
          uncertainty_notes: string | null
        }
        Insert: {
          applies_to_exposure_type?: string | null
          applies_to_hazard_type?: string | null
          assumptions?: string | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          id: string
          model_reference?: string | null
          name: string
          source_provider?: string | null
          source_url?: string | null
          uncertainty_notes?: string | null
        }
        Update: {
          applies_to_exposure_type?: string | null
          applies_to_hazard_type?: string | null
          assumptions?: string | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          id?: string
          model_reference?: string | null
          name?: string
          source_provider?: string | null
          source_url?: string | null
          uncertainty_notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
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
      acute_chronic: "Acute" | "Chronic"
      app_role:
        | "ProjectDeveloper"
        | "FieldOfficer"
        | "MinistryDeliveryOfficer"
        | "MRVOfficer"
        | "SeniorDecisionMaker"
        | "Admin"
      confidence_rating: "Low" | "Medium" | "High"
      data_access_mode: "Upload" | "API" | "Computed"
      data_status: "Illustrative" | "Preliminary" | "Validated"
      relationship_type: "Direct" | "Enabling" | "Proxy"
      risk_level: "Low" | "Medium" | "High" | "Extreme"
      validation_status: "Seeded" | "Uploaded" | "Verified" | "Modelled"
      workflow_state: "Draft" | "Submitted" | "Approved" | "Returned"
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
      acute_chronic: ["Acute", "Chronic"],
      app_role: [
        "ProjectDeveloper",
        "FieldOfficer",
        "MinistryDeliveryOfficer",
        "MRVOfficer",
        "SeniorDecisionMaker",
        "Admin",
      ],
      confidence_rating: ["Low", "Medium", "High"],
      data_access_mode: ["Upload", "API", "Computed"],
      data_status: ["Illustrative", "Preliminary", "Validated"],
      relationship_type: ["Direct", "Enabling", "Proxy"],
      risk_level: ["Low", "Medium", "High", "Extreme"],
      validation_status: ["Seeded", "Uploaded", "Verified", "Modelled"],
      workflow_state: ["Draft", "Submitted", "Approved", "Returned"],
    },
  },
} as const
