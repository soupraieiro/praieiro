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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_identifiers: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          public_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          public_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          public_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_identifiers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_catalogs: {
        Row: {
          catalog_url: string | null
          clicks_count: number | null
          company_logo_url: string | null
          company_name: string
          contact_email: string | null
          created_at: string
          end_date: string | null
          id: string
          impressions_count: number | null
          is_active: boolean | null
          monthly_fee: number | null
          start_date: string | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          catalog_url?: string | null
          clicks_count?: number | null
          company_logo_url?: string | null
          company_name: string
          contact_email?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          impressions_count?: number | null
          is_active?: boolean | null
          monthly_fee?: number | null
          start_date?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          catalog_url?: string | null
          clicks_count?: number | null
          company_logo_url?: string | null
          company_name?: string
          contact_email?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          impressions_count?: number | null
          is_active?: boolean | null
          monthly_fee?: number | null
          start_date?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      adam_notifications: {
        Row: {
          action_data: Json | null
          action_required: boolean | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          read_at: string | null
          satoshi_hash: string | null
          severity: string | null
          source_error_id: string | null
          title: string
        }
        Insert: {
          action_data?: Json | null
          action_required?: boolean | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          read_at?: string | null
          satoshi_hash?: string | null
          severity?: string | null
          source_error_id?: string | null
          title: string
        }
        Update: {
          action_data?: Json | null
          action_required?: boolean | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          read_at?: string | null
          satoshi_hash?: string | null
          severity?: string | null
          source_error_id?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_accounts: {
        Row: {
          account_type: string
          admin_user_id: string
          created_at: string
          id: string
          is_active: boolean
          linked_client_id: string | null
          linked_vendor_id: string | null
        }
        Insert: {
          account_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          linked_client_id?: string | null
          linked_vendor_id?: string | null
        }
        Update: {
          account_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          linked_client_id?: string | null
          linked_vendor_id?: string | null
        }
        Relationships: []
      }
      admin_ai_verdicts: {
        Row: {
          category: string
          consensus_reached: boolean | null
          context_data: Json | null
          created_at: string
          deepseek_response: string | null
          final_verdict: string
          gemini_response: string | null
          gpt_response: string | null
          id: string
          problem_description: string
          processing_time_ms: number | null
          requested_by: string | null
          solutions: Json | null
        }
        Insert: {
          category: string
          consensus_reached?: boolean | null
          context_data?: Json | null
          created_at?: string
          deepseek_response?: string | null
          final_verdict: string
          gemini_response?: string | null
          gpt_response?: string | null
          id?: string
          problem_description: string
          processing_time_ms?: number | null
          requested_by?: string | null
          solutions?: Json | null
        }
        Update: {
          category?: string
          consensus_reached?: boolean | null
          context_data?: Json | null
          created_at?: string
          deepseek_response?: string | null
          final_verdict?: string
          gemini_response?: string | null
          gpt_response?: string | null
          id?: string
          problem_description?: string
          processing_time_ms?: number | null
          requested_by?: string | null
          solutions?: Json | null
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          indicator_name: string | null
          indicator_value: number | null
          is_read: boolean
          message: string
          severity: string
          threshold_value: number | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          indicator_name?: string | null
          indicator_value?: number | null
          is_read?: boolean
          message: string
          severity?: string
          threshold_value?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          indicator_name?: string | null
          indicator_value?: number | null
          is_read?: boolean
          message?: string
          severity?: string
          threshold_value?: number | null
          title?: string
        }
        Relationships: []
      }
      admin_allowed_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admin_allowed_emails_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_goals: {
        Row: {
          created_at: string
          current_value: number
          goal_name: string
          goal_type: string
          id: string
          month: string
          target_value: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          goal_name: string
          goal_type: string
          id?: string
          month: string
          target_value?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          goal_name?: string
          goal_type?: string
          id?: string
          month?: string
          target_value?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_capability_types: {
        Row: {
          capability_key: string
          capability_name: string
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          output_category: string
        }
        Insert: {
          capability_key: string
          capability_name: string
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          output_category: string
        }
        Update: {
          capability_key?: string
          capability_name?: string
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          output_category?: string
        }
        Relationships: []
      }
      ai_cognitive_health: {
        Row: {
          avg_reasoning_length: number | null
          bias_direction: string | null
          created_at: string
          decisions_approved: number | null
          decisions_blocked: number | null
          fidelity_index: number | null
          id: string
          provider: string
          short_reasoning_count: number | null
          total_cost_usd: number | null
          total_tokens_used: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          avg_reasoning_length?: number | null
          bias_direction?: string | null
          created_at?: string
          decisions_approved?: number | null
          decisions_blocked?: number | null
          fidelity_index?: number | null
          id?: string
          provider: string
          short_reasoning_count?: number | null
          total_cost_usd?: number | null
          total_tokens_used?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          avg_reasoning_length?: number | null
          bias_direction?: string | null
          created_at?: string
          decisions_approved?: number | null
          decisions_blocked?: number | null
          fidelity_index?: number | null
          id?: string
          provider?: string
          short_reasoning_count?: number | null
          total_cost_usd?: number | null
          total_tokens_used?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      ai_council_admin_notifications: {
        Row: {
          action_data: Json | null
          action_required: boolean | null
          action_type: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message: string
          notification_type: string
          priority: string | null
          read_at: string | null
          satoshi_hash: string | null
          source_agent_id: string | null
          source_decision_id: string | null
          source_suggestion_id: string | null
          title: string
        }
        Insert: {
          action_data?: Json | null
          action_required?: boolean | null
          action_type?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message: string
          notification_type: string
          priority?: string | null
          read_at?: string | null
          satoshi_hash?: string | null
          source_agent_id?: string | null
          source_decision_id?: string | null
          source_suggestion_id?: string | null
          title: string
        }
        Update: {
          action_data?: Json | null
          action_required?: boolean | null
          action_type?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          satoshi_hash?: string | null
          source_agent_id?: string | null
          source_decision_id?: string | null
          source_suggestion_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_admin_notifications_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_council_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_council_admin_notifications_source_decision_id_fkey"
            columns: ["source_decision_id"]
            isOneToOne: false
            referencedRelation: "ai_council_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_council_admin_notifications_source_suggestion_id_fkey"
            columns: ["source_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_council_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_council_agents: {
        Row: {
          agent_key: string
          agent_name: string
          agent_role: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          specialization: string[] | null
        }
        Insert: {
          agent_key: string
          agent_name: string
          agent_role: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          specialization?: string[] | null
        }
        Update: {
          agent_key?: string
          agent_name?: string
          agent_role?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          specialization?: string[] | null
        }
        Relationships: []
      }
      ai_council_code_issues: {
        Row: {
          created_at: string | null
          description: string
          detected_by: string | null
          file_path: string
          id: string
          issue_type: string
          line_end: number | null
          line_start: number
          resolved_at: string | null
          resolved_by: string | null
          satoshi_hash: string | null
          severity: string
          status: string | null
          suggested_fix: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          detected_by?: string | null
          file_path: string
          id?: string
          issue_type: string
          line_end?: number | null
          line_start: number
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity: string
          status?: string | null
          suggested_fix?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          detected_by?: string | null
          file_path?: string
          id?: string
          issue_type?: string
          line_end?: number | null
          line_start?: number
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string
          status?: string | null
          suggested_fix?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_council_decisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          consensus_level: number | null
          created_at: string | null
          decision_summary: string
          decision_type: string
          execution_details: Json | null
          execution_status: string | null
          id: string
          participating_agents: string[] | null
          satoshi_hash: string | null
          suggestion_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          consensus_level?: number | null
          created_at?: string | null
          decision_summary: string
          decision_type: string
          execution_details?: Json | null
          execution_status?: string | null
          id?: string
          participating_agents?: string[] | null
          satoshi_hash?: string | null
          suggestion_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          consensus_level?: number | null
          created_at?: string | null
          decision_summary?: string
          decision_type?: string
          execution_details?: Json | null
          execution_status?: string | null
          id?: string
          participating_agents?: string[] | null
          satoshi_hash?: string | null
          suggestion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_decisions_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_council_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_council_diagnostics: {
        Row: {
          created_at: string | null
          detected_by: string | null
          id: string
          lovable_prompt: string | null
          problem_description: string
          problem_title: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          sql_correction: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          detected_by?: string | null
          id?: string
          lovable_prompt?: string | null
          problem_description: string
          problem_title: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          sql_correction?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          detected_by?: string | null
          id?: string
          lovable_prompt?: string | null
          problem_description?: string
          problem_title?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          sql_correction?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_diagnostics_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_council_events: {
        Row: {
          agent_id: string
          audit_hash: string | null
          btc_context: Json | null
          consensus_reached: boolean | null
          consensus_required: boolean | null
          created_at: string | null
          decision_payload: Json
          event_type: string
          id: string
          ip_hash: string | null
          project_id: string | null
          session_id: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          audit_hash?: string | null
          btc_context?: Json | null
          consensus_reached?: boolean | null
          consensus_required?: boolean | null
          created_at?: string | null
          decision_payload: Json
          event_type: string
          id?: string
          ip_hash?: string | null
          project_id?: string | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          audit_hash?: string | null
          btc_context?: Json | null
          consensus_reached?: boolean | null
          consensus_required?: boolean | null
          created_at?: string | null
          decision_payload?: Json
          event_type?: string
          id?: string
          ip_hash?: string | null
          project_id?: string | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_council_growth_metrics: {
        Row: {
          category: string
          created_at: string | null
          current_value: number | null
          growth_rate: number | null
          id: string
          metric_key: string
          metric_name: string
          period_end: string | null
          period_start: string | null
          previous_value: number | null
          satoshi_hash: string | null
          target_value: number | null
          trend: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_value?: number | null
          growth_rate?: number | null
          id?: string
          metric_key: string
          metric_name: string
          period_end?: string | null
          period_start?: string | null
          previous_value?: number | null
          satoshi_hash?: string | null
          target_value?: number | null
          trend?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_value?: number | null
          growth_rate?: number | null
          id?: string
          metric_key?: string
          metric_name?: string
          period_end?: string | null
          period_start?: string | null
          previous_value?: number | null
          satoshi_hash?: string | null
          target_value?: number | null
          trend?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_council_information_flows: {
        Row: {
          anomaly_details: Json | null
          anomaly_detected: boolean | null
          created_at: string | null
          flow_data: Json
          flow_type: string
          id: string
          processed_by: string[] | null
          risk_score: number | null
          satoshi_hash: string | null
          source_id: string | null
          source_table: string
        }
        Insert: {
          anomaly_details?: Json | null
          anomaly_detected?: boolean | null
          created_at?: string | null
          flow_data?: Json
          flow_type: string
          id?: string
          processed_by?: string[] | null
          risk_score?: number | null
          satoshi_hash?: string | null
          source_id?: string | null
          source_table: string
        }
        Update: {
          anomaly_details?: Json | null
          anomaly_detected?: boolean | null
          created_at?: string | null
          flow_data?: Json
          flow_type?: string
          id?: string
          processed_by?: string[] | null
          risk_score?: number | null
          satoshi_hash?: string | null
          source_id?: string | null
          source_table?: string
        }
        Relationships: []
      }
      ai_council_meeting_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          message_content: string
          message_type: string | null
          reactions: Json | null
          satoshi_hash: string | null
          sender_id: string | null
          sender_name: string
          sender_type: string
          session_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          message_content: string
          message_type?: string | null
          reactions?: Json | null
          satoshi_hash?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
          session_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          message_content?: string
          message_type?: string | null
          reactions?: Json | null
          satoshi_hash?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_meeting_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_council_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_council_notification_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          id: string
          notification_id: string | null
          previous_activity_hash: string | null
          satoshi_hash: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          id?: string
          notification_id?: string | null
          previous_activity_hash?: string | null
          satoshi_hash?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          id?: string
          notification_id?: string | null
          previous_activity_hash?: string | null
          satoshi_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_notification_activity_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "ai_council_admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_council_proposals: {
        Row: {
          consensus_reached: boolean | null
          created_at: string
          created_by_agent: string | null
          current_value: number | null
          ecosystem_analysis: Json
          executed_at: string | null
          expires_at: string | null
          justification: string
          proposal_id: string
          proposal_type: string
          proposed_value: number | null
          satoshi_hash: string | null
          status: string | null
          target_param_key: string | null
          total_agents: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          consensus_reached?: boolean | null
          created_at?: string
          created_by_agent?: string | null
          current_value?: number | null
          ecosystem_analysis?: Json
          executed_at?: string | null
          expires_at?: string | null
          justification: string
          proposal_id?: string
          proposal_type: string
          proposed_value?: number | null
          satoshi_hash?: string | null
          status?: string | null
          target_param_key?: string | null
          total_agents?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          consensus_reached?: boolean | null
          created_at?: string
          created_by_agent?: string | null
          current_value?: number | null
          ecosystem_analysis?: Json
          executed_at?: string | null
          expires_at?: string | null
          justification?: string
          proposal_id?: string
          proposal_type?: string
          proposed_value?: number | null
          satoshi_hash?: string | null
          status?: string | null
          target_param_key?: string | null
          total_agents?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_proposals_target_param_key_fkey"
            columns: ["target_param_key"]
            isOneToOne: false
            referencedRelation: "protocol_parameters"
            referencedColumns: ["param_key"]
          },
          {
            foreignKeyName: "ai_council_proposals_target_param_key_fkey"
            columns: ["target_param_key"]
            isOneToOne: false
            referencedRelation: "protocol_parameters_current"
            referencedColumns: ["param_key"]
          },
        ]
      }
      ai_council_sessions: {
        Row: {
          decisions_made: number | null
          ended_at: string | null
          id: string
          participants: string[] | null
          satoshi_hash: string | null
          session_summary: Json | null
          session_topic: string | null
          session_type: string | null
          started_at: string | null
          status: string | null
          suggestions_generated: number | null
        }
        Insert: {
          decisions_made?: number | null
          ended_at?: string | null
          id?: string
          participants?: string[] | null
          satoshi_hash?: string | null
          session_summary?: Json | null
          session_topic?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          suggestions_generated?: number | null
        }
        Update: {
          decisions_made?: number | null
          ended_at?: string | null
          id?: string
          participants?: string[] | null
          satoshi_hash?: string | null
          session_summary?: Json | null
          session_topic?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          suggestions_generated?: number | null
        }
        Relationships: []
      }
      ai_council_suggestions: {
        Row: {
          admin_response: string | null
          affected_areas: string[] | null
          agent_id: string | null
          created_at: string | null
          description: string
          effort_score: number | null
          id: string
          impact_score: number | null
          implementation_steps: Json | null
          priority: string | null
          responded_at: string | null
          satoshi_hash: string | null
          status: string | null
          suggestion_type: string
          title: string
        }
        Insert: {
          admin_response?: string | null
          affected_areas?: string[] | null
          agent_id?: string | null
          created_at?: string | null
          description: string
          effort_score?: number | null
          id?: string
          impact_score?: number | null
          implementation_steps?: Json | null
          priority?: string | null
          responded_at?: string | null
          satoshi_hash?: string | null
          status?: string | null
          suggestion_type: string
          title: string
        }
        Update: {
          admin_response?: string | null
          affected_areas?: string[] | null
          agent_id?: string | null
          created_at?: string | null
          description?: string
          effort_score?: number | null
          id?: string
          impact_score?: number | null
          implementation_steps?: Json | null
          priority?: string | null
          responded_at?: string | null
          satoshi_hash?: string | null
          status?: string | null
          suggestion_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_council_suggestions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_council_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decision_log: {
        Row: {
          affected_entities: Json | null
          affected_users: number | null
          agent_id: string
          created_at: string
          decision_scope: Database["public"]["Enums"]["ai_decision_scope"]
          decision_summary: string
          executed_at: string | null
          id: string
          impact_assessment: Json | null
          parameters_modified: Json | null
          reversible: boolean | null
          rollback_reason: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          satoshi_hash: string
        }
        Insert: {
          affected_entities?: Json | null
          affected_users?: number | null
          agent_id: string
          created_at?: string
          decision_scope: Database["public"]["Enums"]["ai_decision_scope"]
          decision_summary: string
          executed_at?: string | null
          id?: string
          impact_assessment?: Json | null
          parameters_modified?: Json | null
          reversible?: boolean | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          satoshi_hash: string
        }
        Update: {
          affected_entities?: Json | null
          affected_users?: number | null
          agent_id?: string
          created_at?: string
          decision_scope?: Database["public"]["Enums"]["ai_decision_scope"]
          decision_summary?: string
          executed_at?: string | null
          id?: string
          impact_assessment?: Json | null
          parameters_modified?: Json | null
          reversible?: boolean | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          satoshi_hash?: string
        }
        Relationships: []
      }
      ai_external_tasks: {
        Row: {
          completed_at: string | null
          consensus_status: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          fallback_provider: string | null
          id: string
          input_data: Json
          is_critical: boolean | null
          output_data: Json | null
          output_data_b: Json | null
          priority: string | null
          processing_time_ms: number | null
          provider: string
          provider_b: string | null
          reasoning_logic: string | null
          reasoning_logic_b: string | null
          satoshi_hash: string | null
          started_at: string | null
          status: string
          task_type: string
          tokens_cost_usd: number | null
          tokens_used: number | null
        }
        Insert: {
          completed_at?: string | null
          consensus_status?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          fallback_provider?: string | null
          id?: string
          input_data?: Json
          is_critical?: boolean | null
          output_data?: Json | null
          output_data_b?: Json | null
          priority?: string | null
          processing_time_ms?: number | null
          provider: string
          provider_b?: string | null
          reasoning_logic?: string | null
          reasoning_logic_b?: string | null
          satoshi_hash?: string | null
          started_at?: string | null
          status?: string
          task_type: string
          tokens_cost_usd?: number | null
          tokens_used?: number | null
        }
        Update: {
          completed_at?: string | null
          consensus_status?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          fallback_provider?: string | null
          id?: string
          input_data?: Json
          is_critical?: boolean | null
          output_data?: Json | null
          output_data_b?: Json | null
          priority?: string | null
          processing_time_ms?: number | null
          provider?: string
          provider_b?: string | null
          reasoning_logic?: string | null
          reasoning_logic_b?: string | null
          satoshi_hash?: string | null
          started_at?: string | null
          status?: string
          task_type?: string
          tokens_cost_usd?: number | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_metrics: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          metric_name: string
          metric_type: string
          priority: number | null
          suggested_by: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric_name: string
          metric_type: string
          priority?: number | null
          suggested_by?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric_name?: string
          metric_type?: string
          priority?: number | null
          suggested_by?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      ai_provider_health: {
        Row: {
          avg_latency_ms: number | null
          consecutive_failures: number | null
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          provider: string
          status: string
          total_failures: number | null
          total_requests: number | null
          updated_at: string
        }
        Insert: {
          avg_latency_ms?: number | null
          consecutive_failures?: number | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          provider: string
          status?: string
          total_failures?: number | null
          total_requests?: number | null
          updated_at?: string
        }
        Update: {
          avg_latency_ms?: number | null
          consecutive_failures?: number | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          provider?: string
          status?: string
          total_failures?: number | null
          total_requests?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_provider_usage_logs: {
        Row: {
          cost_usd: number | null
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          output_tokens: number | null
          provider_id: string
          request_type: string
          satoshi_hash: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          output_tokens?: number | null
          provider_id: string
          request_type: string
          satoshi_hash?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          output_tokens?: number | null
          provider_id?: string
          request_type?: string
          satoshi_hash?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_usage_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          api_key_ref: string
          capabilities: Json
          cost_per_1k_tokens: number | null
          created_at: string
          id: string
          is_default: boolean | null
          latency_profile: string
          legacy_format: Json | null
          max_tokens: number | null
          metadata: Json | null
          output_types: string[]
          priority: number | null
          provider_company: string
          provider_id: string
          provider_name: string
          satoshi_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key_ref: string
          capabilities?: Json
          cost_per_1k_tokens?: number | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          latency_profile?: string
          legacy_format?: Json | null
          max_tokens?: number | null
          metadata?: Json | null
          output_types?: string[]
          priority?: number | null
          provider_company: string
          provider_id: string
          provider_name: string
          satoshi_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_ref?: string
          capabilities?: Json
          cost_per_1k_tokens?: number | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          latency_profile?: string
          legacy_format?: Json | null
          max_tokens?: number | null
          metadata?: Json | null
          output_types?: string[]
          priority?: number | null
          provider_company?: string
          provider_id?: string
          provider_name?: string
          satoshi_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      amendment_votes: {
        Row: {
          amendment_id: string
          id: string
          reasoning: string | null
          satoshi_hash: string | null
          vote: string
          vote_weight: number | null
          voted_at: string
          voter_id: string
          voter_type: string
        }
        Insert: {
          amendment_id: string
          id?: string
          reasoning?: string | null
          satoshi_hash?: string | null
          vote: string
          vote_weight?: number | null
          voted_at?: string
          voter_id: string
          voter_type: string
        }
        Update: {
          amendment_id?: string
          id?: string
          reasoning?: string | null
          satoshi_hash?: string | null
          vote?: string
          vote_weight?: number | null
          voted_at?: string
          voter_id?: string
          voter_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "amendment_votes_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "constitutional_amendments"
            referencedColumns: ["id"]
          },
        ]
      }
      arbitration_cases: {
        Row: {
          appeal_count: number | null
          appeal_deadline: string | null
          assigned_at: string | null
          case_number: string
          case_summary: string
          case_type: string
          created_at: string
          decision_at: string | null
          defendant_id: string
          evidence_defendant: Json | null
          evidence_plaintiff: Json | null
          id: string
          plaintiff_id: string
          satoshi_hash: string | null
          status: Database["public"]["Enums"]["arbitration_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          appeal_count?: number | null
          appeal_deadline?: string | null
          assigned_at?: string | null
          case_number: string
          case_summary: string
          case_type: string
          created_at?: string
          decision_at?: string | null
          defendant_id: string
          evidence_defendant?: Json | null
          evidence_plaintiff?: Json | null
          id?: string
          plaintiff_id: string
          satoshi_hash?: string | null
          status?: Database["public"]["Enums"]["arbitration_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          appeal_count?: number | null
          appeal_deadline?: string | null
          assigned_at?: string | null
          case_number?: string
          case_summary?: string
          case_type?: string
          created_at?: string
          decision_at?: string | null
          defendant_id?: string
          evidence_defendant?: Json | null
          evidence_plaintiff?: Json | null
          id?: string
          plaintiff_id?: string
          satoshi_hash?: string | null
          status?: Database["public"]["Enums"]["arbitration_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      arbitration_decisions: {
        Row: {
          ai_fact_presentation: Json | null
          ai_impact_simulation: Json | null
          case_id: string
          created_at: string
          decision_details: Json | null
          decision_summary: string
          finalized_at: string | null
          id: string
          immutable_hash: string
          is_final: boolean | null
          remedies_ordered: Json | null
          satoshi_hash: string
          votes_for_defendant: number | null
          votes_for_plaintiff: number | null
          votes_neutral: number | null
        }
        Insert: {
          ai_fact_presentation?: Json | null
          ai_impact_simulation?: Json | null
          case_id: string
          created_at?: string
          decision_details?: Json | null
          decision_summary: string
          finalized_at?: string | null
          id?: string
          immutable_hash: string
          is_final?: boolean | null
          remedies_ordered?: Json | null
          satoshi_hash: string
          votes_for_defendant?: number | null
          votes_for_plaintiff?: number | null
          votes_neutral?: number | null
        }
        Update: {
          ai_fact_presentation?: Json | null
          ai_impact_simulation?: Json | null
          case_id?: string
          created_at?: string
          decision_details?: Json | null
          decision_summary?: string
          finalized_at?: string | null
          id?: string
          immutable_hash?: string
          is_final?: boolean | null
          remedies_ordered?: Json | null
          satoshi_hash?: string
          votes_for_defendant?: number | null
          votes_for_plaintiff?: number | null
          votes_neutral?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arbitration_decisions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "arbitration_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      arbitration_panels: {
        Row: {
          arbitrator_id: string
          assigned_at: string
          case_id: string
          id: string
          panel_position: number
          recusal_reason: string | null
          recused: boolean | null
          satoshi_hash: string | null
          vote: string | null
          vote_reasoning: string | null
          voted_at: string | null
        }
        Insert: {
          arbitrator_id: string
          assigned_at?: string
          case_id: string
          id?: string
          panel_position: number
          recusal_reason?: string | null
          recused?: boolean | null
          satoshi_hash?: string | null
          vote?: string | null
          vote_reasoning?: string | null
          voted_at?: string | null
        }
        Update: {
          arbitrator_id?: string
          assigned_at?: string
          case_id?: string
          id?: string
          panel_position?: number
          recusal_reason?: string | null
          recused?: boolean | null
          satoshi_hash?: string | null
          vote?: string | null
          vote_reasoning?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arbitration_panels_arbitrator_id_fkey"
            columns: ["arbitrator_id"]
            isOneToOne: false
            referencedRelation: "civic_arbitrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitration_panels_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "arbitration_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_registry: {
        Row: {
          asset_description: string | null
          asset_id: string
          asset_name: string
          asset_type: string
          blockchain: string | null
          checksum: string | null
          circulating_supply: number | null
          contract_address: string | null
          created_at: string
          decimals: number | null
          entity_id: string
          metadata: Json | null
          owner_id: string | null
          status: string | null
          token_id: string | null
          token_standard: string | null
          total_supply: number | null
          updated_at: string
        }
        Insert: {
          asset_description?: string | null
          asset_id?: string
          asset_name: string
          asset_type: string
          blockchain?: string | null
          checksum?: string | null
          circulating_supply?: number | null
          contract_address?: string | null
          created_at?: string
          decimals?: number | null
          entity_id: string
          metadata?: Json | null
          owner_id?: string | null
          status?: string | null
          token_id?: string | null
          token_standard?: string | null
          total_supply?: number | null
          updated_at?: string
        }
        Update: {
          asset_description?: string | null
          asset_id?: string
          asset_name?: string
          asset_type?: string
          blockchain?: string | null
          checksum?: string | null
          circulating_supply?: number | null
          contract_address?: string | null
          created_at?: string
          decimals?: number | null
          entity_id?: string
          metadata?: Json | null
          owner_id?: string | null
          status?: string | null
          token_id?: string | null
          token_standard?: string | null
          total_supply?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      attack_pattern_alerts: {
        Row: {
          affected_region: string | null
          alert_name: string
          attack_count: number | null
          description: string | null
          first_detected_at: string
          id: string
          ip_addresses: string[] | null
          is_active: boolean | null
          last_detected_at: string
          metadata: Json | null
          pattern_type: string
          resolved_at: string | null
          resolved_by: string | null
          satoshi_hash: string | null
          severity: string | null
        }
        Insert: {
          affected_region?: string | null
          alert_name: string
          attack_count?: number | null
          description?: string | null
          first_detected_at?: string
          id?: string
          ip_addresses?: string[] | null
          is_active?: boolean | null
          last_detected_at?: string
          metadata?: Json | null
          pattern_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string | null
        }
        Update: {
          affected_region?: string | null
          alert_name?: string
          attack_count?: number | null
          description?: string | null
          first_detected_at?: string
          id?: string
          ip_addresses?: string[] | null
          is_active?: boolean | null
          last_detected_at?: string
          metadata?: Json | null
          pattern_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      banned_ips: {
        Row: {
          attack_type: string | null
          blocked_at: string
          blocked_variable: string | null
          id: string
          ip_address: string
          is_active: boolean | null
          metadata: Json | null
          reason: string
          satoshi_hash: string | null
          severity: string | null
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          attack_type?: string | null
          blocked_at?: string
          blocked_variable?: string | null
          id?: string
          ip_address: string
          is_active?: boolean | null
          metadata?: Json | null
          reason: string
          satoshi_hash?: string | null
          severity?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          attack_type?: string | null
          blocked_at?: string
          blocked_variable?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean | null
          metadata?: Json | null
          reason?: string
          satoshi_hash?: string | null
          severity?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: []
      }
      beaches: {
        Row: {
          beach_name: string
          city: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          beach_name: string
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          beach_name?: string
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: []
      }
      board_governance_reports: {
        Row: {
          action_taken_at: string | null
          action_taken_by: string | null
          created_at: string
          director_name: string
          id: string
          is_active: boolean | null
          metrics: Json | null
          recommendations: Json | null
          region_data: Json | null
          report_summary: string
          report_title: string
          report_type: string
          requires_action: boolean | null
          risk_level: string | null
          satoshi_hash: string | null
          updated_at: string
        }
        Insert: {
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string
          director_name: string
          id?: string
          is_active?: boolean | null
          metrics?: Json | null
          recommendations?: Json | null
          region_data?: Json | null
          report_summary: string
          report_title: string
          report_type: string
          requires_action?: boolean | null
          risk_level?: string | null
          satoshi_hash?: string | null
          updated_at?: string
        }
        Update: {
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string
          director_name?: string
          id?: string
          is_active?: boolean | null
          metrics?: Json | null
          recommendations?: Json | null
          region_data?: Json | null
          report_summary?: string
          report_title?: string
          report_type?: string
          requires_action?: boolean | null
          risk_level?: string | null
          satoshi_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cache_store: {
        Row: {
          btc_parity_last: number | null
          btc_updated_at: string | null
          cache_key: string
          cache_value: Json
          created_at: string | null
          expires_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          btc_parity_last?: number | null
          btc_updated_at?: string | null
          cache_key: string
          cache_value: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          btc_parity_last?: number | null
          btc_updated_at?: string | null
          cache_key?: string
          cache_value?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cached_news: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          source: string | null
          title: string
          type: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          source?: string | null
          title: string
          type?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          source?: string | null
          title?: string
          type?: string | null
          url?: string | null
        }
        Relationships: []
      }
      chat_analytics: {
        Row: {
          avg_messages_per_session: number | null
          avg_response_time_ms: number | null
          created_at: string | null
          date: string
          id: string
          negative_feedback_count: number | null
          positive_feedback_count: number | null
          top_categories: Json | null
          total_messages: number | null
          total_sessions: number | null
          total_tokens_used: number | null
          unique_users: number | null
        }
        Insert: {
          avg_messages_per_session?: number | null
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          id?: string
          negative_feedback_count?: number | null
          positive_feedback_count?: number | null
          top_categories?: Json | null
          total_messages?: number | null
          total_sessions?: number | null
          total_tokens_used?: number | null
          unique_users?: number | null
        }
        Update: {
          avg_messages_per_session?: number | null
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          id?: string
          negative_feedback_count?: number | null
          positive_feedback_count?: number | null
          top_categories?: Json | null
          total_messages?: number | null
          total_sessions?: number | null
          total_tokens_used?: number | null
          unique_users?: number | null
        }
        Relationships: []
      }
      chat_contexts: {
        Row: {
          context_key: string
          context_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          system_prompt: string
          updated_at: string | null
        }
        Insert: {
          context_key: string
          context_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          system_prompt: string
          updated_at?: string | null
        }
        Update: {
          context_key?: string
          context_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          system_prompt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_media_interactions: {
        Row: {
          action_type: string
          ai_response: string | null
          chat_message_id: string | null
          confidence_score: number | null
          created_at: string
          detection_method: string | null
          id: string
          latency_ms: number | null
          media_query: string
          playback_duration_seconds: number | null
          playback_started_at: string | null
          playlist_id: string | null
          session_id: string
          updated_at: string
          user_feedback: string | null
          user_id: string | null
          user_query: string
          user_skipped: boolean | null
          video_id: string | null
        }
        Insert: {
          action_type?: string
          ai_response?: string | null
          chat_message_id?: string | null
          confidence_score?: number | null
          created_at?: string
          detection_method?: string | null
          id?: string
          latency_ms?: number | null
          media_query: string
          playback_duration_seconds?: number | null
          playback_started_at?: string | null
          playlist_id?: string | null
          session_id: string
          updated_at?: string
          user_feedback?: string | null
          user_id?: string | null
          user_query: string
          user_skipped?: boolean | null
          video_id?: string | null
        }
        Update: {
          action_type?: string
          ai_response?: string | null
          chat_message_id?: string | null
          confidence_score?: number | null
          created_at?: string
          detection_method?: string | null
          id?: string
          latency_ms?: number | null
          media_query?: string
          playback_duration_seconds?: number | null
          playback_started_at?: string | null
          playlist_id?: string | null
          session_id?: string
          updated_at?: string
          user_feedback?: string | null
          user_id?: string | null
          user_query?: string
          user_skipped?: boolean | null
          video_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          feedback_comment: string | null
          feedback_rating: number | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          role: string
          session_id: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          feedback_comment?: string | null
          feedback_rating?: number | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          role: string
          session_id: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          feedback_comment?: string | null
          feedback_rating?: number | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          role?: string
          session_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          context_key: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          message_count: number | null
          model_used: string | null
          session_token: string | null
          title: string | null
          total_tokens_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          message_count?: number | null
          model_used?: string | null
          session_token?: string | null
          title?: string | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          message_count?: number | null
          model_used?: string | null
          session_token?: string | null
          title?: string | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_suggestions: {
        Row: {
          category: string | null
          context_key: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          question: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          context_key?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          context_key?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      chat_webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          message_id: string | null
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_webhook_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_youtube_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          genre: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          music_query: string | null
          payload: Json
          playlist_id: string | null
          processed_at: string | null
          session_id: string
          source: string
          status: string
          updated_at: string
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          genre?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          music_query?: string | null
          payload?: Json
          playlist_id?: string | null
          processed_at?: string | null
          session_id: string
          source: string
          status?: string
          updated_at?: string
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          genre?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          music_query?: string | null
          payload?: Json
          playlist_id?: string | null
          processed_at?: string | null
          session_id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: []
      }
      chatbot_interactions: {
        Row: {
          confidence_score: number | null
          context_data: Json | null
          created_at: string | null
          id: string
          intent_detected: string | null
          message_content: string | null
          message_type: string
          response_time_ms: number | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          message_content?: string | null
          message_type: string
          response_time_ms?: number | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          message_content?: string | null
          message_type?: string
          response_time_ms?: number | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      civic_arbitrators: {
        Row: {
          approval_rating: number | null
          arbitrator_name: string
          cases_judged: number | null
          created_at: string
          disqualified_until: string | null
          id: string
          is_active: boolean | null
          last_case_at: string | null
          satoshi_hash: string | null
          specializations: string[] | null
          updated_at: string
          user_id: string
          verified_human_id: string
        }
        Insert: {
          approval_rating?: number | null
          arbitrator_name: string
          cases_judged?: number | null
          created_at?: string
          disqualified_until?: string | null
          id?: string
          is_active?: boolean | null
          last_case_at?: string | null
          satoshi_hash?: string | null
          specializations?: string[] | null
          updated_at?: string
          user_id: string
          verified_human_id: string
        }
        Update: {
          approval_rating?: number | null
          arbitrator_name?: string
          cases_judged?: number | null
          created_at?: string
          disqualified_until?: string | null
          id?: string
          is_active?: boolean | null
          last_case_at?: string | null
          satoshi_hash?: string | null
          specializations?: string[] | null
          updated_at?: string
          user_id?: string
          verified_human_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_arbitrators_verified_human_id_fkey"
            columns: ["verified_human_id"]
            isOneToOne: false
            referencedRelation: "verified_humans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_conchas: {
        Row: {
          balance: number
          client_id: string
          created_at: string
          id: string
          reais_balance: number
          total_deposited: number
          total_earned: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          balance?: number
          client_id: string
          created_at?: string
          id?: string
          reais_balance?: number
          total_deposited?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          client_id?: string
          created_at?: string
          id?: string
          reais_balance?: number
          total_deposited?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_favorites: {
        Row: {
          client_id: string
          created_at: string
          id: string
          vendor_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          vendor_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      client_product_interests: {
        Row: {
          beach_id: string | null
          client_id: string | null
          created_at: string
          id: string
          product_category: string
          vendor_id: string | null
        }
        Insert: {
          beach_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          product_category: string
          vendor_id?: string | null
        }
        Update: {
          beach_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          product_category?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_product_interests_beach_id_fkey"
            columns: ["beach_id"]
            isOneToOne: false
            referencedRelation: "beaches"
            referencedColumns: ["id"]
          },
        ]
      }
      client_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          satoshi_hash: string | null
          type: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          satoshi_hash?: string | null
          type: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          satoshi_hash?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accepted_terms: boolean | null
          accepted_terms_at: string | null
          created_at: string | null
          preferred_beach_id: string | null
          profile_id: string
          terms_version: string | null
        }
        Insert: {
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          created_at?: string | null
          preferred_beach_id?: string | null
          profile_id: string
          terms_version?: string | null
        }
        Update: {
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          created_at?: string | null
          preferred_beach_id?: string | null
          profile_id?: string
          terms_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_new_preferred_beach_id_fkey"
            columns: ["preferred_beach_id"]
            isOneToOne: false
            referencedRelation: "beaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_new_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      concha_emissions: {
        Row: {
          amount: number
          authorized_by: string | null
          created_at: string | null
          hard_cap: number
          id: string
          operation_type: string
          reason: string | null
          signature_hash: string | null
          total_supply_after: number
        }
        Insert: {
          amount: number
          authorized_by?: string | null
          created_at?: string | null
          hard_cap?: number
          id?: string
          operation_type: string
          reason?: string | null
          signature_hash?: string | null
          total_supply_after: number
        }
        Update: {
          amount?: number
          authorized_by?: string | null
          created_at?: string | null
          hard_cap?: number
          id?: string
          operation_type?: string
          reason?: string | null
          signature_hash?: string | null
          total_supply_after?: number
        }
        Relationships: [
          {
            foreignKeyName: "concha_emissions_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concha_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          satoshi_hash: string | null
          type: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          satoshi_hash?: string | null
          type: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          satoshi_hash?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "concha_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      constitutional_amendments: {
        Row: {
          affects_immutable_axioms: boolean | null
          amendment_number: number
          constitutional_block_id: number | null
          created_at: string
          dao_approval_percentage: number | null
          dao_approved: boolean | null
          founder_approved: boolean | null
          founder_approved_at: string | null
          full_text: string
          id: string
          proposed_by: string
          proposed_by_type: string
          public_review_started_at: string | null
          requires_67_percent: boolean | null
          satoshi_hash: string | null
          simulation_ended_at: string | null
          simulation_results: Json | null
          simulation_started_at: string | null
          status: Database["public"]["Enums"]["amendment_status"]
          summary: string
          title: string
          updated_at: string
          user_approval_percentage: number | null
          user_approved: boolean | null
          voting_ended_at: string | null
          voting_started_at: string | null
        }
        Insert: {
          affects_immutable_axioms?: boolean | null
          amendment_number: number
          constitutional_block_id?: number | null
          created_at?: string
          dao_approval_percentage?: number | null
          dao_approved?: boolean | null
          founder_approved?: boolean | null
          founder_approved_at?: string | null
          full_text: string
          id?: string
          proposed_by: string
          proposed_by_type: string
          public_review_started_at?: string | null
          requires_67_percent?: boolean | null
          satoshi_hash?: string | null
          simulation_ended_at?: string | null
          simulation_results?: Json | null
          simulation_started_at?: string | null
          status?: Database["public"]["Enums"]["amendment_status"]
          summary: string
          title: string
          updated_at?: string
          user_approval_percentage?: number | null
          user_approved?: boolean | null
          voting_ended_at?: string | null
          voting_started_at?: string | null
        }
        Update: {
          affects_immutable_axioms?: boolean | null
          amendment_number?: number
          constitutional_block_id?: number | null
          created_at?: string
          dao_approval_percentage?: number | null
          dao_approved?: boolean | null
          founder_approved?: boolean | null
          founder_approved_at?: string | null
          full_text?: string
          id?: string
          proposed_by?: string
          proposed_by_type?: string
          public_review_started_at?: string | null
          requires_67_percent?: boolean | null
          satoshi_hash?: string | null
          simulation_ended_at?: string | null
          simulation_results?: Json | null
          simulation_started_at?: string | null
          status?: Database["public"]["Enums"]["amendment_status"]
          summary?: string
          title?: string
          updated_at?: string
          user_approval_percentage?: number | null
          user_approved?: boolean | null
          voting_ended_at?: string | null
          voting_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "constitutional_amendments_constitutional_block_id_fkey"
            columns: ["constitutional_block_id"]
            isOneToOne: false
            referencedRelation: "constitutional_blocks"
            referencedColumns: ["block_number"]
          },
        ]
      }
      constitutional_blocks: {
        Row: {
          axioms_affected: string[] | null
          block_hash: string
          block_number: number
          block_type: string
          content: Json
          created_at: string
          created_by: string
          is_genesis: boolean | null
          is_immutable: boolean | null
          previous_block_hash: string | null
        }
        Insert: {
          axioms_affected?: string[] | null
          block_hash: string
          block_number?: number
          block_type: string
          content: Json
          created_at?: string
          created_by: string
          is_genesis?: boolean | null
          is_immutable?: boolean | null
          previous_block_hash?: string | null
        }
        Update: {
          axioms_affected?: string[] | null
          block_hash?: string
          block_number?: number
          block_type?: string
          content?: Json
          created_at?: string
          created_by?: string
          is_genesis?: boolean | null
          is_immutable?: boolean | null
          previous_block_hash?: string | null
        }
        Relationships: []
      }
      constitutional_signatories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          jurisdiction: string
          metadata: Json
          name: string
          public_key: string
          required_for_quorum: boolean
          role: string
          voting_power: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          jurisdiction: string
          metadata?: Json
          name: string
          public_key: string
          required_for_quorum?: boolean
          role: string
          voting_power: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          jurisdiction?: string
          metadata?: Json
          name?: string
          public_key?: string
          required_for_quorum?: boolean
          role?: string
          voting_power?: number
        }
        Relationships: []
      }
      constitutional_state: {
        Row: {
          drift_detection_enabled: boolean
          frozen_at: string | null
          frozen_by: string | null
          frozen_reason: string | null
          governance_frozen: boolean
          id: string
          last_updated: string
          max_price_drift_percent: number
          satoshi_hash: string | null
          time_lock_minutes: number
        }
        Insert: {
          drift_detection_enabled?: boolean
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          governance_frozen?: boolean
          id?: string
          last_updated?: string
          max_price_drift_percent?: number
          satoshi_hash?: string | null
          time_lock_minutes?: number
        }
        Update: {
          drift_detection_enabled?: boolean
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          governance_frozen?: boolean
          id?: string
          last_updated?: string
          max_price_drift_percent?: number
          satoshi_hash?: string | null
          time_lock_minutes?: number
        }
        Relationships: []
      }
      constitutional_validation_logs: {
        Row: {
          action_type: string
          actual_value: number | null
          agent_id: string
          created_at: string
          decision_id: string | null
          drift_history: Json | null
          id: string
          invariant_name: string | null
          is_allowed: boolean
          reasoning_logic: string
          satoshi_hash: string | null
          threshold_value: number | null
          validation_type: string
        }
        Insert: {
          action_type: string
          actual_value?: number | null
          agent_id: string
          created_at?: string
          decision_id?: string | null
          drift_history?: Json | null
          id?: string
          invariant_name?: string | null
          is_allowed: boolean
          reasoning_logic: string
          satoshi_hash?: string | null
          threshold_value?: number | null
          validation_type: string
        }
        Update: {
          action_type?: string
          actual_value?: number | null
          agent_id?: string
          created_at?: string
          decision_id?: string | null
          drift_history?: Json | null
          id?: string
          invariant_name?: string | null
          is_allowed?: boolean
          reasoning_logic?: string
          satoshi_hash?: string | null
          threshold_value?: number | null
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "constitutional_validation_logs_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "governance_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_states: {
        Row: {
          auto_response_enabled: boolean | null
          category: Database["public"]["Enums"]["critical_state_category"]
          created_at: string
          description: string | null
          detection_rules: Json | null
          id: string
          requires_human_intervention: boolean | null
          satoshi_hash: string | null
          severity_level: number
          state_key: string
          state_name: string
          updated_at: string
        }
        Insert: {
          auto_response_enabled?: boolean | null
          category: Database["public"]["Enums"]["critical_state_category"]
          created_at?: string
          description?: string | null
          detection_rules?: Json | null
          id?: string
          requires_human_intervention?: boolean | null
          satoshi_hash?: string | null
          severity_level: number
          state_key: string
          state_name: string
          updated_at?: string
        }
        Update: {
          auto_response_enabled?: boolean | null
          category?: Database["public"]["Enums"]["critical_state_category"]
          created_at?: string
          description?: string | null
          detection_rules?: Json | null
          id?: string
          requires_human_intervention?: boolean | null
          satoshi_hash?: string | null
          severity_level?: number
          state_key?: string
          state_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      developer_code_issues: {
        Row: {
          created_at: string | null
          detected_by: string | null
          file_path: string
          id: string
          issue_description: string
          issue_type: string
          line_end: number | null
          line_start: number
          resolved_at: string | null
          resolved_by: string | null
          satoshi_hash: string | null
          severity: string
          source_audit_id: string | null
          status: string | null
          suggested_fix: string | null
        }
        Insert: {
          created_at?: string | null
          detected_by?: string | null
          file_path: string
          id?: string
          issue_description: string
          issue_type: string
          line_end?: number | null
          line_start: number
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity: string
          source_audit_id?: string | null
          status?: string | null
          suggested_fix?: string | null
        }
        Update: {
          created_at?: string | null
          detected_by?: string | null
          file_path?: string
          id?: string
          issue_description?: string
          issue_type?: string
          line_end?: number | null
          line_start?: number
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string
          source_audit_id?: string | null
          status?: string | null
          suggested_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_code_issues_source_audit_id_fkey"
            columns: ["source_audit_id"]
            isOneToOne: false
            referencedRelation: "developer_source_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_source_audit: {
        Row: {
          audited_by: string | null
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          language: string | null
          last_audit_at: string | null
          satoshi_hash: string | null
          source_code: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          audited_by?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          language?: string | null
          last_audit_at?: string | null
          satoshi_hash?: string | null
          source_code: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          audited_by?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          language?: string | null
          last_audit_at?: string | null
          satoshi_hash?: string | null
          source_code?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      dissolution_state: {
        Row: {
          created_at: string
          data_export_progress: number | null
          estimated_completion: string | null
          final_block_hash: string | null
          final_message: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          keys_destroyed_at: string | null
          keys_destruction_scheduled_at: string | null
          reason: string | null
          satoshi_hash: string | null
          status: Database["public"]["Enums"]["dissolution_status"]
          updated_at: string
          witness_signatures: Json | null
        }
        Insert: {
          created_at?: string
          data_export_progress?: number | null
          estimated_completion?: string | null
          final_block_hash?: string | null
          final_message?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          keys_destroyed_at?: string | null
          keys_destruction_scheduled_at?: string | null
          reason?: string | null
          satoshi_hash?: string | null
          status?: Database["public"]["Enums"]["dissolution_status"]
          updated_at?: string
          witness_signatures?: Json | null
        }
        Update: {
          created_at?: string
          data_export_progress?: number | null
          estimated_completion?: string | null
          final_block_hash?: string | null
          final_message?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          keys_destroyed_at?: string | null
          keys_destruction_scheduled_at?: string | null
          reason?: string | null
          satoshi_hash?: string | null
          status?: Database["public"]["Enums"]["dissolution_status"]
          updated_at?: string
          witness_signatures?: Json | null
        }
        Relationships: []
      }
      editable_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      employee_permissions: {
        Row: {
          can_edit_financial: boolean | null
          can_edit_transactions: boolean | null
          can_edit_users: boolean | null
          can_view_financial: boolean | null
          can_view_messages: boolean | null
          can_view_orders: boolean | null
          can_view_transactions: boolean | null
          can_view_users: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_edit_financial?: boolean | null
          can_edit_transactions?: boolean | null
          can_edit_users?: boolean | null
          can_view_financial?: boolean | null
          can_view_messages?: boolean | null
          can_view_orders?: boolean | null
          can_view_transactions?: boolean | null
          can_view_users?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_edit_financial?: boolean | null
          can_edit_transactions?: boolean | null
          can_edit_users?: boolean | null
          can_view_financial?: boolean | null
          can_view_messages?: boolean | null
          can_view_orders?: boolean | null
          can_view_transactions?: boolean | null
          can_view_users?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      engineering_logs: {
        Row: {
          business_impact: string | null
          created_at: string
          error_category: string | null
          error_code: string
          error_message: string
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          risk_level: string | null
          satoshi_hash: string | null
          source_component: string | null
          suggested_sql: string | null
        }
        Insert: {
          business_impact?: string | null
          created_at?: string
          error_category?: string | null
          error_code: string
          error_message: string
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string | null
          satoshi_hash?: string | null
          source_component?: string | null
          suggested_sql?: string | null
        }
        Update: {
          business_impact?: string | null
          created_at?: string
          error_category?: string | null
          error_code?: string
          error_message?: string
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string | null
          satoshi_hash?: string | null
          source_component?: string | null
          suggested_sql?: string | null
        }
        Relationships: []
      }
      ethical_economy_rules: {
        Row: {
          auto_enforcement: boolean | null
          created_at: string
          description: string
          detection_algorithm: Json | null
          id: string
          is_active: boolean | null
          penalty_on_violation: Json | null
          prohibited_practice: Database["public"]["Enums"]["predatory_practice"]
          rule_key: string
          rule_name: string
          satoshi_hash: string | null
          updated_at: string
          violation_threshold: number | null
        }
        Insert: {
          auto_enforcement?: boolean | null
          created_at?: string
          description: string
          detection_algorithm?: Json | null
          id?: string
          is_active?: boolean | null
          penalty_on_violation?: Json | null
          prohibited_practice: Database["public"]["Enums"]["predatory_practice"]
          rule_key: string
          rule_name: string
          satoshi_hash?: string | null
          updated_at?: string
          violation_threshold?: number | null
        }
        Update: {
          auto_enforcement?: boolean | null
          created_at?: string
          description?: string
          detection_algorithm?: Json | null
          id?: string
          is_active?: boolean | null
          penalty_on_violation?: Json | null
          prohibited_practice?: Database["public"]["Enums"]["predatory_practice"]
          rule_key?: string
          rule_name?: string
          satoshi_hash?: string | null
          updated_at?: string
          violation_threshold?: number | null
        }
        Relationships: []
      }
      exposure_plans: {
        Row: {
          analytics_access: boolean | null
          created_at: string | null
          description: string | null
          featured_in_search: boolean | null
          id: string
          is_active: boolean | null
          monthly_fee_cents: number
          plan_level: number
          plan_name: string
          priority_support: boolean | null
          visibility_boost: number | null
        }
        Insert: {
          analytics_access?: boolean | null
          created_at?: string | null
          description?: string | null
          featured_in_search?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_fee_cents: number
          plan_level: number
          plan_name: string
          priority_support?: boolean | null
          visibility_boost?: number | null
        }
        Update: {
          analytics_access?: boolean | null
          created_at?: string | null
          description?: string | null
          featured_in_search?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_fee_cents?: number
          plan_level?: number
          plan_name?: string
          priority_support?: boolean | null
          visibility_boost?: number | null
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          text_content: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          text_content?: string | null
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          text_content?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      founder_public_record: {
        Row: {
          context_data: Json | null
          decision_summary: string
          decision_type: string
          id: string
          immutable_hash: string
          impact_analysis: Json | null
          justification: string
          previous_record_hash: string | null
          public_reaction_summary: string | null
          recorded_at: string
          satoshi_hash: string
          was_controversial: boolean | null
        }
        Insert: {
          context_data?: Json | null
          decision_summary: string
          decision_type: string
          id?: string
          immutable_hash: string
          impact_analysis?: Json | null
          justification: string
          previous_record_hash?: string | null
          public_reaction_summary?: string | null
          recorded_at?: string
          satoshi_hash: string
          was_controversial?: boolean | null
        }
        Update: {
          context_data?: Json | null
          decision_summary?: string
          decision_type?: string
          id?: string
          immutable_hash?: string
          impact_analysis?: Json | null
          justification?: string
          previous_record_hash?: string | null
          public_reaction_summary?: string | null
          recorded_at?: string
          satoshi_hash?: string
          was_controversial?: boolean | null
        }
        Relationships: []
      }
      governance_decisions: {
        Row: {
          agent_id: string
          change_percent: number | null
          confirmation_deadline: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          current_value: number | null
          decision_type: string
          executed_at: string | null
          id: string
          invariants_checked: Json | null
          invariants_violated: Json | null
          metadata: Json | null
          proposed_value: number | null
          reasoning_logic: string
          satoshi_hash: string | null
          status: string
          target_entity: string | null
        }
        Insert: {
          agent_id: string
          change_percent?: number | null
          confirmation_deadline?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          current_value?: number | null
          decision_type: string
          executed_at?: string | null
          id?: string
          invariants_checked?: Json | null
          invariants_violated?: Json | null
          metadata?: Json | null
          proposed_value?: number | null
          reasoning_logic: string
          satoshi_hash?: string | null
          status?: string
          target_entity?: string | null
        }
        Update: {
          agent_id?: string
          change_percent?: number | null
          confirmation_deadline?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          current_value?: number | null
          decision_type?: string
          executed_at?: string | null
          id?: string
          invariants_checked?: Json | null
          invariants_violated?: Json | null
          metadata?: Json | null
          proposed_value?: number | null
          reasoning_logic?: string
          satoshi_hash?: string | null
          status?: string
          target_entity?: string | null
        }
        Relationships: []
      }
      governance_switches: {
        Row: {
          ai_cost_monthly: number | null
          break_even_revenue: number | null
          changed_at: string | null
          changed_by: string | null
          created_at: string
          description: string | null
          human_cost_monthly: number | null
          id: string
          is_active: boolean | null
          mode: string
          module_icon: string | null
          module_key: string
          module_name: string
          satoshi_hash: string | null
          team_size: number | null
        }
        Insert: {
          ai_cost_monthly?: number | null
          break_even_revenue?: number | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string
          description?: string | null
          human_cost_monthly?: number | null
          id?: string
          is_active?: boolean | null
          mode?: string
          module_icon?: string | null
          module_key: string
          module_name: string
          satoshi_hash?: string | null
          team_size?: number | null
        }
        Update: {
          ai_cost_monthly?: number | null
          break_even_revenue?: number | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string
          description?: string | null
          human_cost_monthly?: number | null
          id?: string
          is_active?: boolean | null
          mode?: string
          module_icon?: string | null
          module_key?: string
          module_name?: string
          satoshi_hash?: string | null
          team_size?: number | null
        }
        Relationships: []
      }
      hacker_intelligence_logs: {
        Row: {
          attack_type: string | null
          blocked_at: string | null
          blocked_by: string | null
          city: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          estimated_damage_prevented: number | null
          honeypot_triggered: string | null
          id: string
          ip_address: string
          is_blocked: boolean | null
          latitude: number | null
          longitude: number | null
          region: string | null
          request_path: string | null
          satoshi_hash: string | null
          severity: string | null
          user_agent: string | null
        }
        Insert: {
          attack_type?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          estimated_damage_prevented?: number | null
          honeypot_triggered?: string | null
          id?: string
          ip_address: string
          is_blocked?: boolean | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          request_path?: string | null
          satoshi_hash?: string | null
          severity?: string | null
          user_agent?: string | null
        }
        Update: {
          attack_type?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          estimated_damage_prevented?: number | null
          honeypot_triggered?: string | null
          id?: string
          ip_address?: string
          is_blocked?: boolean | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          request_path?: string | null
          satoshi_hash?: string | null
          severity?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      human_work_queue: {
        Row: {
          ai_reasoning: string | null
          ai_suggestion: Json | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          human_decision: Json | null
          human_notes: string | null
          id: string
          module_key: string
          priority: string | null
          satoshi_hash: string | null
          started_at: string | null
          status: string
          task_type: string
          title: string
        }
        Insert: {
          ai_reasoning?: string | null
          ai_suggestion?: Json | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          human_decision?: Json | null
          human_notes?: string | null
          id?: string
          module_key: string
          priority?: string | null
          satoshi_hash?: string | null
          started_at?: string | null
          status?: string
          task_type: string
          title: string
        }
        Update: {
          ai_reasoning?: string | null
          ai_suggestion?: Json | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          human_decision?: Json | null
          human_notes?: string | null
          id?: string
          module_key?: string
          priority?: string | null
          satoshi_hash?: string | null
          started_at?: string | null
          status?: string
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      immutable_axioms: {
        Row: {
          axiom_id: string
          axiom_number: number
          axiom_text: string
          axiom_title: string
          can_never_be_modified: boolean | null
          genesis_block_hash: string
          last_integrity_check: string | null
          rationale: string | null
          satoshi_hash: string
          violation_count: number | null
        }
        Insert: {
          axiom_id: string
          axiom_number: number
          axiom_text: string
          axiom_title: string
          can_never_be_modified?: boolean | null
          genesis_block_hash: string
          last_integrity_check?: string | null
          rationale?: string | null
          satoshi_hash: string
          violation_count?: number | null
        }
        Update: {
          axiom_id?: string
          axiom_number?: number
          axiom_text?: string
          axiom_title?: string
          can_never_be_modified?: boolean | null
          genesis_block_hash?: string
          last_integrity_check?: string | null
          rationale?: string | null
          satoshi_hash?: string
          violation_count?: number | null
        }
        Relationships: []
      }
      integrity_validations: {
        Row: {
          executed_at: string
          executed_by: string | null
          execution_time_ms: number | null
          is_valid: boolean
          result_checksum: string | null
          scope_entity_id: string | null
          total_records_checked: number | null
          validation_id: string
          validation_type: string
          violations: Json | null
          violations_found: number | null
        }
        Insert: {
          executed_at?: string
          executed_by?: string | null
          execution_time_ms?: number | null
          is_valid: boolean
          result_checksum?: string | null
          scope_entity_id?: string | null
          total_records_checked?: number | null
          validation_id?: string
          validation_type: string
          violations?: Json | null
          violations_found?: number | null
        }
        Update: {
          executed_at?: string
          executed_by?: string | null
          execution_time_ms?: number | null
          is_valid?: boolean
          result_checksum?: string | null
          scope_entity_id?: string | null
          total_records_checked?: number | null
          validation_id?: string
          validation_type?: string
          violations?: Json | null
          violations_found?: number | null
        }
        Relationships: []
      }
      ip_blacklist: {
        Row: {
          attack_count: number | null
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          id: string
          ip_address: string
          is_permanent: boolean | null
          reason: string | null
          satoshi_hash: string | null
        }
        Insert: {
          attack_count?: number | null
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          is_permanent?: boolean | null
          reason?: string | null
          satoshi_hash?: string | null
        }
        Update: {
          attack_count?: number | null
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_permanent?: boolean | null
          reason?: string | null
          satoshi_hash?: string | null
        }
        Relationships: []
      }
      key_destruction_log: {
        Row: {
          destroyed_at: string
          destruction_method: string
          id: string
          immutable_hash: string
          key_identifier: string
          key_type: string
          public_announcement_url: string | null
          satoshi_hash: string
          verification_hashes: Json | null
          witness_count: number | null
        }
        Insert: {
          destroyed_at?: string
          destruction_method: string
          id?: string
          immutable_hash: string
          key_identifier: string
          key_type: string
          public_announcement_url?: string | null
          satoshi_hash: string
          verification_hashes?: Json | null
          witness_count?: number | null
        }
        Update: {
          destroyed_at?: string
          destruction_method?: string
          id?: string
          immutable_hash?: string
          key_identifier?: string
          key_type?: string
          public_announcement_url?: string | null
          satoshi_hash?: string
          verification_hashes?: Json | null
          witness_count?: number | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          level: string | null
          proposed_by: string | null
          satoshi_hash: string | null
          solution_edge_logic: string | null
          solution_key: string
          solution_sql: string | null
          status: string | null
          title: string
          updated_at: string
          usage_count: number | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string | null
          proposed_by?: string | null
          satoshi_hash?: string | null
          solution_edge_logic?: string | null
          solution_key: string
          solution_sql?: string | null
          status?: string | null
          title: string
          updated_at?: string
          usage_count?: number | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string | null
          proposed_by?: string | null
          satoshi_hash?: string | null
          solution_edge_logic?: string | null
          solution_key?: string
          solution_sql?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          version?: number | null
        }
        Relationships: []
      }
      ledger: {
        Row: {
          amount: number
          audited_at: string | null
          audited_by: string | null
          balance_after: number
          created_at: string
          currency: string
          description: string | null
          entry_type: string
          id: string
          idempotency_key: string | null
          metadata: Json | null
          origin_id: string | null
          profile_id: string
          reference_id: string | null
          reference_type: string | null
          satoshi_hash: string | null
          signature_hash: string | null
          status: string | null
        }
        Insert: {
          amount: number
          audited_at?: string | null
          audited_by?: string | null
          balance_after: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          origin_id?: string | null
          profile_id: string
          reference_id?: string | null
          reference_type?: string | null
          satoshi_hash?: string | null
          signature_hash?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          audited_at?: string | null
          audited_by?: string | null
          balance_after?: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          origin_id?: string | null
          profile_id?: string
          reference_id?: string | null
          reference_type?: string | null
          satoshi_hash?: string | null
          signature_hash?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string
          event_checksum: string
          event_data: Json
          event_id: string
          event_type: string
          execution_context: Json | null
          ip_hash: string | null
          previous_event_checksum: string | null
          sequence_number: number
          tx_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_checksum: string
          event_data?: Json
          event_id?: string
          event_type: string
          execution_context?: Json | null
          ip_hash?: string | null
          previous_event_checksum?: string | null
          sequence_number?: number
          tx_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_checksum?: string
          event_data?: Json
          event_id?: string
          event_type?: string
          execution_context?: Json | null
          ip_hash?: string | null
          previous_event_checksum?: string | null
          sequence_number?: number
          tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_events_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "current_state"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "ledger_events_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "protocol_state"
            referencedColumns: ["tx_id"]
          },
        ]
      }
      location_history: {
        Row: {
          accuracy_radius: number | null
          altitude: number | null
          created_at: string
          heading: number | null
          id: string
          latitude: number
          location: unknown
          longitude: number
          profile_id: string
          session_id: string | null
          source: string | null
          speed: number | null
        }
        Insert: {
          accuracy_radius?: number | null
          altitude?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          latitude: number
          location: unknown
          longitude: number
          profile_id: string
          session_id?: string | null
          source?: string | null
          speed?: number | null
        }
        Update: {
          accuracy_radius?: number | null
          altitude?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          latitude?: number
          location?: unknown
          longitude?: number
          profile_id?: string
          session_id?: string | null
          source?: string | null
          speed?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_phases: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          chat_sentinel_enabled: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          linear_meter_fee_cents: number | null
          phase_name: string
          phase_number: number
          regional_fee_max_cents: number | null
          regional_fee_min_cents: number | null
          registration_trigger: number
          satoshi_hash: string | null
          transaction_fee_cents: number | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          chat_sentinel_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          linear_meter_fee_cents?: number | null
          phase_name: string
          phase_number: number
          regional_fee_max_cents?: number | null
          regional_fee_min_cents?: number | null
          registration_trigger?: number
          satoshi_hash?: string | null
          transaction_fee_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          chat_sentinel_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          linear_meter_fee_cents?: number | null
          phase_name?: string
          phase_number?: number
          regional_fee_max_cents?: number | null
          regional_fee_min_cents?: number | null
          registration_trigger?: number
          satoshi_hash?: string | null
          transaction_fee_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      music_genres: {
        Row: {
          color_class: string | null
          created_at: string
          display_order: number | null
          genre_emoji: string | null
          genre_key: string
          genre_name: string
          id: string
          is_active: boolean | null
          play_count: number | null
          playlist_id: string | null
          search_query: string
          updated_at: string
        }
        Insert: {
          color_class?: string | null
          created_at?: string
          display_order?: number | null
          genre_emoji?: string | null
          genre_key: string
          genre_name: string
          id?: string
          is_active?: boolean | null
          play_count?: number | null
          playlist_id?: string | null
          search_query: string
          updated_at?: string
        }
        Update: {
          color_class?: string | null
          created_at?: string
          display_order?: number | null
          genre_emoji?: string | null
          genre_key?: string
          genre_name?: string
          id?: string
          is_active?: boolean | null
          play_count?: number | null
          playlist_id?: string | null
          search_query?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_order_id: string | null
          related_vendor_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_order_id?: string | null
          related_vendor_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_order_id?: string | null
          related_vendor_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_enabled: boolean
          open_time: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_enabled?: boolean
          open_time?: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_enabled?: boolean
          open_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      operation_dictionary: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          is_active: boolean | null
          op_key: string
          parent_key: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          op_key: string
          parent_key?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          op_key?: string
          parent_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orch_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          id: string
          is_critical: boolean | null
          satoshi_hash: string | null
          source_asset_id: string | null
          source_name: string
          source_type: string
          target_name: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          id?: string
          is_critical?: boolean | null
          satoshi_hash?: string | null
          source_asset_id?: string | null
          source_name: string
          source_type: string
          target_name: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          id?: string
          is_critical?: boolean | null
          satoshi_hash?: string | null
          source_asset_id?: string | null
          source_name?: string
          source_type?: string
          target_name?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "orch_dependencies_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "orch_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      orch_versions: {
        Row: {
          asset_name: string
          asset_type: string
          avg_execution_time_ms: number | null
          content: string
          content_hash: string
          created_at: string | null
          execution_count: number | null
          id: string
          is_production: boolean | null
          is_validated: boolean | null
          last_execution_at: string | null
          last_execution_status: string | null
          promoted_at: string | null
          promoted_by: string | null
          satoshi_hash: string | null
          timeout_ms: number | null
          validated_at: string | null
          validated_by: string | null
          version_number: number
        }
        Insert: {
          asset_name: string
          asset_type: string
          avg_execution_time_ms?: number | null
          content: string
          content_hash: string
          created_at?: string | null
          execution_count?: number | null
          id?: string
          is_production?: boolean | null
          is_validated?: boolean | null
          last_execution_at?: string | null
          last_execution_status?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          satoshi_hash?: string | null
          timeout_ms?: number | null
          validated_at?: string | null
          validated_by?: string | null
          version_number?: number
        }
        Update: {
          asset_name?: string
          asset_type?: string
          avg_execution_time_ms?: number | null
          content?: string
          content_hash?: string
          created_at?: string | null
          execution_count?: number | null
          id?: string
          is_production?: boolean | null
          is_validated?: boolean | null
          last_execution_at?: string | null
          last_execution_status?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          satoshi_hash?: string | null
          timeout_ms?: number | null
          validated_at?: string | null
          validated_by?: string | null
          version_number?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_accuracy_radius: number | null
          client_heading: number | null
          client_id: string
          client_latitude: number | null
          client_location_timestamp: string | null
          client_longitude: number | null
          client_speed: number | null
          created_at: string
          distance_at_checkout: number | null
          id: string
          location_auth_hash: string | null
          message: string | null
          payment_status: string | null
          proximity_verified: boolean | null
          proximity_verified_at: string | null
          satoshi_hash: string | null
          status: string
          total_amount: number | null
          updated_at: string
          vendor_accuracy_radius: number | null
          vendor_heading: number | null
          vendor_id: string
          vendor_latitude: number | null
          vendor_location_timestamp: string | null
          vendor_longitude: number | null
        }
        Insert: {
          client_accuracy_radius?: number | null
          client_heading?: number | null
          client_id: string
          client_latitude?: number | null
          client_location_timestamp?: string | null
          client_longitude?: number | null
          client_speed?: number | null
          created_at?: string
          distance_at_checkout?: number | null
          id?: string
          location_auth_hash?: string | null
          message?: string | null
          payment_status?: string | null
          proximity_verified?: boolean | null
          proximity_verified_at?: string | null
          satoshi_hash?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          vendor_accuracy_radius?: number | null
          vendor_heading?: number | null
          vendor_id: string
          vendor_latitude?: number | null
          vendor_location_timestamp?: string | null
          vendor_longitude?: number | null
        }
        Update: {
          client_accuracy_radius?: number | null
          client_heading?: number | null
          client_id?: string
          client_latitude?: number | null
          client_location_timestamp?: string | null
          client_longitude?: number | null
          client_speed?: number | null
          created_at?: string
          distance_at_checkout?: number | null
          id?: string
          location_auth_hash?: string | null
          message?: string | null
          payment_status?: string | null
          proximity_verified?: boolean | null
          proximity_verified_at?: string | null
          satoshi_hash?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          vendor_accuracy_radius?: number | null
          vendor_heading?: number | null
          vendor_id?: string
          vendor_latitude?: number | null
          vendor_location_timestamp?: string | null
          vendor_longitude?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          satoshi_hash: string | null
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          satoshi_hash?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          satoshi_hash?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_wallet: {
        Row: {
          balance: number | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cpf_responsavel: string | null
          created_at: string
          currency: string | null
          email_corporativo: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          razao_social: string | null
          regime_tributario: string | null
          responsavel_legal: string | null
          telefone_corporativo: string | null
          updated_at: string
          wallet_name: string
        }
        Insert: {
          balance?: number | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf_responsavel?: string | null
          created_at?: string
          currency?: string | null
          email_corporativo?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_legal?: string | null
          telefone_corporativo?: string | null
          updated_at?: string
          wallet_name: string
        }
        Update: {
          balance?: number | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf_responsavel?: string | null
          created_at?: string
          currency?: string | null
          email_corporativo?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_legal?: string | null
          telefone_corporativo?: string | null
          updated_at?: string
          wallet_name?: string
        }
        Relationships: []
      }
      praieiro_chats: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          metadata?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      price_drift_history: {
        Row: {
          agent_id: string
          change_percent: number
          created_at: string
          cumulative_drift: number
          entity_id: string | null
          entity_type: string
          id: string
          new_value: number
          old_value: number
          satoshi_hash: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          agent_id: string
          change_percent: number
          created_at?: string
          cumulative_drift?: number
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value: number
          old_value: number
          satoshi_hash?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          agent_id?: string
          change_percent?: number
          created_at?: string
          cumulative_drift?: number
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: number
          old_value?: number
          satoshi_hash?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          shop_id: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          shop_id?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          shop_id?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "vendor_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_types: Database["public"]["Enums"]["account_type"][] | null
          cpf: string
          created_at: string
          current_youtube_id: string | null
          daily_access_count: number | null
          data_nascimento: string | null
          email: string
          full_name: string
          god_mode_bypass: boolean | null
          id: string
          last_access_date: string | null
          linear_meters: number | null
          location: unknown
          metadata: Json | null
          mother_name: string | null
          music_artist: string | null
          music_title: string | null
          phone: string | null
          profile_photo_url: string | null
          sexo: string | null
          shell_balance: number | null
          updated_at: string
          user_id: string
          user_type: string | null
          wallet_public_key: string | null
        }
        Insert: {
          account_types?: Database["public"]["Enums"]["account_type"][] | null
          cpf: string
          created_at?: string
          current_youtube_id?: string | null
          daily_access_count?: number | null
          data_nascimento?: string | null
          email: string
          full_name: string
          god_mode_bypass?: boolean | null
          id?: string
          last_access_date?: string | null
          linear_meters?: number | null
          location?: unknown
          metadata?: Json | null
          mother_name?: string | null
          music_artist?: string | null
          music_title?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          sexo?: string | null
          shell_balance?: number | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          wallet_public_key?: string | null
        }
        Update: {
          account_types?: Database["public"]["Enums"]["account_type"][] | null
          cpf?: string
          created_at?: string
          current_youtube_id?: string | null
          daily_access_count?: number | null
          data_nascimento?: string | null
          email?: string
          full_name?: string
          god_mode_bypass?: boolean | null
          id?: string
          last_access_date?: string | null
          linear_meters?: number | null
          location?: unknown
          metadata?: Json | null
          mother_name?: string | null
          music_artist?: string | null
          music_title?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          sexo?: string | null
          shell_balance?: number | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          wallet_public_key?: string | null
        }
        Relationships: []
      }
      profit_compatibility_checks: {
        Row: {
          check_date: string
          cognitive_neutrality_score: number
          corrective_actions: Json | null
          created_at: string
          id: string
          incompatibility_reasons: Json | null
          is_compatible: boolean
          operational_cost_brl: number
          power_asymmetry_index: number
          profit_margin_percentage: number
          resilience_index: number
          revenue_brl: number
          satoshi_hash: string
        }
        Insert: {
          check_date?: string
          cognitive_neutrality_score: number
          corrective_actions?: Json | null
          created_at?: string
          id?: string
          incompatibility_reasons?: Json | null
          is_compatible: boolean
          operational_cost_brl: number
          power_asymmetry_index: number
          profit_margin_percentage: number
          resilience_index: number
          revenue_brl: number
          satoshi_hash: string
        }
        Update: {
          check_date?: string
          cognitive_neutrality_score?: number
          corrective_actions?: Json | null
          created_at?: string
          id?: string
          incompatibility_reasons?: Json | null
          is_compatible?: boolean
          operational_cost_brl?: number
          power_asymmetry_index?: number
          profit_margin_percentage?: number
          resilience_index?: number
          revenue_brl?: number
          satoshi_hash?: string
        }
        Relationships: []
      }
      protocol_parameters: {
        Row: {
          ai_adjustment_reason: string | null
          category: string
          checksum: string | null
          created_at: string
          description: string | null
          is_ai_adjustable: boolean | null
          last_ai_adjustment: string | null
          max_value: number | null
          min_value: number | null
          param_id: string
          param_key: string
          param_name: string
          param_unit: string | null
          param_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_adjustment_reason?: string | null
          category: string
          checksum?: string | null
          created_at?: string
          description?: string | null
          is_ai_adjustable?: boolean | null
          last_ai_adjustment?: string | null
          max_value?: number | null
          min_value?: number | null
          param_id?: string
          param_key: string
          param_name: string
          param_unit?: string | null
          param_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_adjustment_reason?: string | null
          category?: string
          checksum?: string | null
          created_at?: string
          description?: string | null
          is_ai_adjustable?: boolean | null
          last_ai_adjustment?: string | null
          max_value?: number | null
          min_value?: number | null
          param_id?: string
          param_key?: string
          param_name?: string
          param_unit?: string | null
          param_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      protocol_state: {
        Row: {
          anchor_reference: string | null
          btc_context: Json | null
          checksum: string
          created_at: string
          created_by: string | null
          entity_id: string
          is_anchored: boolean | null
          is_archived: boolean | null
          key_structure: string
          metadata: Json
          operation: string
          payload: Json
          previous_checksum: string | null
          tx_id: string
          version: number
        }
        Insert: {
          anchor_reference?: string | null
          btc_context?: Json | null
          checksum: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          is_anchored?: boolean | null
          is_archived?: boolean | null
          key_structure: string
          metadata?: Json
          operation?: string
          payload?: Json
          previous_checksum?: string | null
          tx_id?: string
          version?: number
        }
        Update: {
          anchor_reference?: string | null
          btc_context?: Json | null
          checksum?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          is_anchored?: boolean | null
          is_archived?: boolean | null
          key_structure?: string
          metadata?: Json
          operation?: string
          payload?: Json
          previous_checksum?: string | null
          tx_id?: string
          version?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      registration_milestones: {
        Row: {
          admin_approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          milestone_name: string
          notified_admin: boolean | null
          phase_to_activate: number | null
          reached_at: string | null
          satoshi_hash: string | null
          target_count: number
        }
        Insert: {
          admin_approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          milestone_name: string
          notified_admin?: boolean | null
          phase_to_activate?: number | null
          reached_at?: string | null
          satoshi_hash?: string | null
          target_count: number
        }
        Update: {
          admin_approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          milestone_name?: string
          notified_admin?: boolean | null
          phase_to_activate?: number | null
          reached_at?: string | null
          satoshi_hash?: string | null
          target_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_milestones_phase_to_activate_fkey"
            columns: ["phase_to_activate"]
            isOneToOne: false
            referencedRelation: "monetization_phases"
            referencedColumns: ["phase_number"]
          },
        ]
      }
      responsibility_chain: {
        Row: {
          agent_identifier: string
          agent_name: string | null
          agent_type: Database["public"]["Enums"]["responsibility_agent_type"]
          appeal_outcome: string | null
          appeal_submitted: boolean | null
          consequence: Database["public"]["Enums"]["consequence_type"]
          consequence_details: Json | null
          consequence_duration_hours: number | null
          consequence_executed_at: string | null
          created_at: string
          failure_id: string
          id: string
          responsibility_percentage: number
          satoshi_hash: string
        }
        Insert: {
          agent_identifier: string
          agent_name?: string | null
          agent_type: Database["public"]["Enums"]["responsibility_agent_type"]
          appeal_outcome?: string | null
          appeal_submitted?: boolean | null
          consequence: Database["public"]["Enums"]["consequence_type"]
          consequence_details?: Json | null
          consequence_duration_hours?: number | null
          consequence_executed_at?: string | null
          created_at?: string
          failure_id: string
          id?: string
          responsibility_percentage: number
          satoshi_hash: string
        }
        Update: {
          agent_identifier?: string
          agent_name?: string | null
          agent_type?: Database["public"]["Enums"]["responsibility_agent_type"]
          appeal_outcome?: string | null
          appeal_submitted?: boolean | null
          consequence?: Database["public"]["Enums"]["consequence_type"]
          consequence_details?: Json | null
          consequence_duration_hours?: number | null
          consequence_executed_at?: string | null
          created_at?: string
          failure_id?: string
          id?: string
          responsibility_percentage?: number
          satoshi_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibility_chain_failure_id_fkey"
            columns: ["failure_id"]
            isOneToOne: false
            referencedRelation: "systemic_failures"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          vendor_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          vendor_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_mode_state: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          auto_deactivate_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          satoshi_hash: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          auto_deactivate_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          satoshi_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          auto_deactivate_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          satoshi_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      satoshi_events: {
        Row: {
          created_at: string
          currency: string
          event_hash: string | null
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          payload: Json
          previous_event_hash: string | null
          sequence: number
        }
        Insert: {
          created_at?: string
          currency?: string
          event_hash?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          payload: Json
          previous_event_hash?: string | null
          sequence: number
        }
        Update: {
          created_at?: string
          currency?: string
          event_hash?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          payload?: Json
          previous_event_hash?: string | null
          sequence?: number
        }
        Relationships: []
      }
      satoshi_honeytokens: {
        Row: {
          access_count: number | null
          created_at: string | null
          generation_date: string
          id: string
          is_active: boolean | null
          satoshi_hash: string | null
          token_name: string
          token_value: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          generation_date?: string
          id?: string
          is_active?: boolean | null
          satoshi_hash?: string | null
          token_name: string
          token_value: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          generation_date?: string
          id?: string
          is_active?: boolean | null
          satoshi_hash?: string | null
          token_name?: string
          token_value?: string
        }
        Relationships: []
      }
      satoshi_metrics: {
        Row: {
          created_at: string | null
          id: string
          integrity_score: number | null
          metric_date: string
          total_audited: number | null
          total_verified: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          integrity_score?: number | null
          metric_date?: string
          total_audited?: number | null
          total_verified?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          integrity_score?: number | null
          metric_date?: string
          total_audited?: number | null
          total_verified?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      search_intents: {
        Row: {
          created_at: string
          device_info: Json | null
          error_type: string | null
          flow_success: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          place_id: string | null
          place_name: string | null
          place_type: string | null
          query: string
          result_count: number | null
          search_source: string | null
          selected: boolean | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          error_type?: string | null
          flow_success?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
          place_name?: string | null
          place_type?: string | null
          query: string
          result_count?: number | null
          search_source?: string | null
          selected?: boolean | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          error_type?: string | null
          flow_success?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
          place_name?: string | null
          place_type?: string | null
          query?: string
          result_count?: number | null
          search_source?: string | null
          selected?: boolean | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          identifier: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          identifier: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shadow_audits: {
        Row: {
          action_type: string
          created_at: string
          drift_detected: boolean | null
          drift_severity: string | null
          id: string
          original_decision: Json | null
          risk_level: string
          satoshi_hash: string | null
          strategist_review: Json | null
        }
        Insert: {
          action_type: string
          created_at?: string
          drift_detected?: boolean | null
          drift_severity?: string | null
          id?: string
          original_decision?: Json | null
          risk_level: string
          satoshi_hash?: string | null
          strategist_review?: Json | null
        }
        Update: {
          action_type?: string
          created_at?: string
          drift_detected?: boolean | null
          drift_severity?: string | null
          id?: string
          original_decision?: Json | null
          risk_level?: string
          satoshi_hash?: string | null
          strategist_review?: Json | null
        }
        Relationships: []
      }
      site_evaluations: {
        Row: {
          comment: string | null
          created_at: string
          design_rating: number | null
          ease_of_use: number | null
          functionality_rating: number | null
          id: string
          page_evaluated: string | null
          rating: number
          suggestion: string | null
          user_id: string | null
          user_type: string | null
          would_recommend: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          design_rating?: number | null
          ease_of_use?: number | null
          functionality_rating?: number | null
          id?: string
          page_evaluated?: string | null
          rating: number
          suggestion?: string | null
          user_id?: string | null
          user_type?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          design_rating?: number | null
          ease_of_use?: number | null
          functionality_rating?: number | null
          id?: string
          page_evaluated?: string | null
          rating?: number
          suggestion?: string | null
          user_id?: string | null
          user_type?: string | null
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          author_btc_lastro: number | null
          author_id: string
          author_trust_at_post: number | null
          comment_count: number | null
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          like_count: number | null
          media_urls: string[] | null
          repost_count: number | null
          updated_at: string | null
          visibility: string | null
          weighted_score: number | null
        }
        Insert: {
          author_btc_lastro?: number | null
          author_id: string
          author_trust_at_post?: number | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          media_urls?: string[] | null
          repost_count?: number | null
          updated_at?: string | null
          visibility?: string | null
          weighted_score?: number | null
        }
        Update: {
          author_btc_lastro?: number | null
          author_id?: string
          author_trust_at_post?: number | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          media_urls?: string[] | null
          repost_count?: number | null
          updated_at?: string | null
          visibility?: string | null
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "social_feed_with_lastro"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "social_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "social_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          btc_lastro: number | null
          btc_trust_score: number | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          post_count: number | null
          profile_id: string
          reputation_level: number | null
          satoshi_lastro: number | null
          updated_at: string | null
          username: string | null
          verification_type: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          btc_lastro?: number | null
          btc_trust_score?: number | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          post_count?: number | null
          profile_id: string
          reputation_level?: number | null
          satoshi_lastro?: number | null
          updated_at?: string | null
          username?: string | null
          verification_type?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          btc_lastro?: number | null
          btc_trust_score?: number | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          post_count?: number | null
          profile_id?: string
          reputation_level?: number | null
          satoshi_lastro?: number | null
          updated_at?: string | null
          username?: string | null
          verification_type?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_code_snapshots: {
        Row: {
          content: string
          created_by: string | null
          file_path: string
          id: string
          snapshot_date: string
        }
        Insert: {
          content: string
          created_by?: string | null
          file_path: string
          id?: string
          snapshot_date?: string
        }
        Update: {
          content?: string
          created_by?: string | null
          file_path?: string
          id?: string
          snapshot_date?: string
        }
        Relationships: []
      }
      sovereign_actions: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string | null
          id: string
          justification: string | null
          payload: Json | null
          satoshi_hash: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string | null
          id?: string
          justification?: string | null
          payload?: Json | null
          satoshi_hash?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          justification?: string | null
          payload?: Json | null
          satoshi_hash?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      sovereign_metrics: {
        Row: {
          ai_cost: number | null
          ai_operations_percent: number | null
          created_at: string
          current_revenue: number | null
          human_cost: number | null
          human_operations_percent: number | null
          id: string
          laws_compliance: Json | null
          metric_date: string
          next_hire_threshold: number | null
          pending_conflicts: number | null
          total_operational_cost: number | null
        }
        Insert: {
          ai_cost?: number | null
          ai_operations_percent?: number | null
          created_at?: string
          current_revenue?: number | null
          human_cost?: number | null
          human_operations_percent?: number | null
          id?: string
          laws_compliance?: Json | null
          metric_date?: string
          next_hire_threshold?: number | null
          pending_conflicts?: number | null
          total_operational_cost?: number | null
        }
        Update: {
          ai_cost?: number | null
          ai_operations_percent?: number | null
          created_at?: string
          current_revenue?: number | null
          human_cost?: number | null
          human_operations_percent?: number | null
          id?: string
          laws_compliance?: Json | null
          metric_date?: string
          next_hire_threshold?: number | null
          pending_conflicts?: number | null
          total_operational_cost?: number | null
        }
        Relationships: []
      }
      sovereign_vitality: {
        Row: {
          created_at: string
          founder_id: string | null
          heartbeat_interval_days: number | null
          id: string
          is_regency_active: boolean | null
          last_heartbeat: string | null
          regency_activated_at: string | null
          regency_mode: string | null
          satoshi_hash: string | null
          successor_email_encrypted: string | null
          successor_wallet_encrypted: string | null
          testament_principles: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_id?: string | null
          heartbeat_interval_days?: number | null
          id?: string
          is_regency_active?: boolean | null
          last_heartbeat?: string | null
          regency_activated_at?: string | null
          regency_mode?: string | null
          satoshi_hash?: string | null
          successor_email_encrypted?: string | null
          successor_wallet_encrypted?: string | null
          testament_principles?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_id?: string | null
          heartbeat_interval_days?: number | null
          id?: string
          is_regency_active?: boolean | null
          last_heartbeat?: string | null
          regency_activated_at?: string | null
          regency_mode?: string | null
          satoshi_hash?: string | null
          successor_email_encrypted?: string | null
          successor_wallet_encrypted?: string | null
          testament_principles?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stress_test_results: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          records_inserted: number | null
          test_name: string
          test_phase: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          records_inserted?: number | null
          test_name: string
          test_phase: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          records_inserted?: number | null
          test_name?: string
          test_phase?: string
        }
        Relationships: []
      }
      sys_ai_guidance: {
        Row: {
          affected_assets: Json | null
          auto_executable: boolean | null
          created_at: string
          created_by_agent: string | null
          description: string
          executed_at: string | null
          executed_by: string | null
          execution_result: Json | null
          guidance_type: string
          id: string
          satoshi_hash: string | null
          severity: string
          status: string | null
          step_by_step: Json
          suggested_code: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_assets?: Json | null
          auto_executable?: boolean | null
          created_at?: string
          created_by_agent?: string | null
          description: string
          executed_at?: string | null
          executed_by?: string | null
          execution_result?: Json | null
          guidance_type: string
          id?: string
          satoshi_hash?: string | null
          severity?: string
          status?: string | null
          step_by_step?: Json
          suggested_code?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_assets?: Json | null
          auto_executable?: boolean | null
          created_at?: string
          created_by_agent?: string | null
          description?: string
          executed_at?: string | null
          executed_by?: string | null
          execution_result?: Json | null
          guidance_type?: string
          id?: string
          satoshi_hash?: string | null
          severity?: string
          status?: string | null
          step_by_step?: Json
          suggested_code?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sys_change_history: {
        Row: {
          change_summary: string | null
          change_type: string
          changed_by: string
          changed_by_email: string
          created_at: string
          id: string
          new_content: string | null
          new_version: number | null
          orch_id: string | null
          previous_content: string | null
          previous_version: number | null
          satoshi_hash: string | null
        }
        Insert: {
          change_summary?: string | null
          change_type: string
          changed_by: string
          changed_by_email: string
          created_at?: string
          id?: string
          new_content?: string | null
          new_version?: number | null
          orch_id?: string | null
          previous_content?: string | null
          previous_version?: number | null
          satoshi_hash?: string | null
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          changed_by?: string
          changed_by_email?: string
          created_at?: string
          id?: string
          new_content?: string | null
          new_version?: number | null
          orch_id?: string | null
          previous_content?: string | null
          previous_version?: number | null
          satoshi_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sys_change_history_orch_id_fkey"
            columns: ["orch_id"]
            isOneToOne: false
            referencedRelation: "orch_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sys_critical_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_generated: boolean | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          satoshi_hash: string | null
          severity: string
          source_id: string | null
          source_table: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_generated?: boolean | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string
          source_id?: string | null
          source_table?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_generated?: boolean | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string
          source_id?: string | null
          source_table?: string | null
          title?: string
        }
        Relationships: []
      }
      sys_health_metrics: {
        Row: {
          avg_execution_time_ms: number | null
          calculated_at: string
          critical_errors: number | null
          failed_executions: number | null
          health_score: number | null
          id: string
          metric_date: string
          satoshi_hash: string | null
          successful_executions: number | null
          total_executions: number | null
          warnings: number | null
        }
        Insert: {
          avg_execution_time_ms?: number | null
          calculated_at?: string
          critical_errors?: number | null
          failed_executions?: number | null
          health_score?: number | null
          id?: string
          metric_date?: string
          satoshi_hash?: string | null
          successful_executions?: number | null
          total_executions?: number | null
          warnings?: number | null
        }
        Update: {
          avg_execution_time_ms?: number | null
          calculated_at?: string
          critical_errors?: number | null
          failed_executions?: number | null
          health_score?: number | null
          id?: string
          metric_date?: string
          satoshi_hash?: string | null
          successful_executions?: number | null
          total_executions?: number | null
          warnings?: number | null
        }
        Relationships: []
      }
      sys_orch_logs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_ip: string | null
          created_at: string
          error_stack: string | null
          execution_time_ms: number | null
          id: string
          log_id: string
          log_message: string
          log_payload: Json | null
          log_severity: string
          log_stage: string
          orch_id: string | null
          satoshi_hash: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: string | null
          created_at?: string
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          log_id?: string
          log_message: string
          log_payload?: Json | null
          log_severity?: string
          log_stage?: string
          orch_id?: string | null
          satoshi_hash?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: string | null
          created_at?: string
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          log_id?: string
          log_message?: string
          log_payload?: Json | null
          log_severity?: string
          log_stage?: string
          orch_id?: string | null
          satoshi_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sys_orch_logs_orch_id_fkey"
            columns: ["orch_id"]
            isOneToOne: false
            referencedRelation: "orch_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_blackbox: {
        Row: {
          context: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          origin: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          satoshi_hash: string | null
          severity: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          origin: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          origin?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      system_cycle_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_unit: string | null
          metric_value: number
          period_end: string
          period_start: string
          satoshi_hash: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_unit?: string | null
          metric_value: number
          period_end: string
          period_start: string
          satoshi_hash?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_unit?: string | null
          metric_value?: number
          period_end?: string
          period_start?: string
          satoshi_hash?: string | null
        }
        Relationships: []
      }
      system_governance: {
        Row: {
          ads_active: boolean
          base_fixed_fee: number
          created_at: string
          current_phase: number
          dynamic_max_fee: number
          dynamic_min_fee: number
          god_mode_uids: string[] | null
          governance_frozen: boolean
          id: string
          linear_meter_fee: number
          phase_activated_at: string | null
          phase_activated_by: string | null
          safe_mode_activated_at: string | null
          safe_mode_reason: string | null
          satoshi_hash: string | null
          sentinel_chat_active: boolean
          st_safe_mode: boolean | null
          updated_at: string
          withdrawal_blocked: boolean
        }
        Insert: {
          ads_active?: boolean
          base_fixed_fee?: number
          created_at?: string
          current_phase?: number
          dynamic_max_fee?: number
          dynamic_min_fee?: number
          god_mode_uids?: string[] | null
          governance_frozen?: boolean
          id?: string
          linear_meter_fee?: number
          phase_activated_at?: string | null
          phase_activated_by?: string | null
          safe_mode_activated_at?: string | null
          safe_mode_reason?: string | null
          satoshi_hash?: string | null
          sentinel_chat_active?: boolean
          st_safe_mode?: boolean | null
          updated_at?: string
          withdrawal_blocked?: boolean
        }
        Update: {
          ads_active?: boolean
          base_fixed_fee?: number
          created_at?: string
          current_phase?: number
          dynamic_max_fee?: number
          dynamic_min_fee?: number
          god_mode_uids?: string[] | null
          governance_frozen?: boolean
          id?: string
          linear_meter_fee?: number
          phase_activated_at?: string | null
          phase_activated_by?: string | null
          safe_mode_activated_at?: string | null
          safe_mode_reason?: string | null
          satoshi_hash?: string | null
          sentinel_chat_active?: boolean
          st_safe_mode?: boolean | null
          updated_at?: string
          withdrawal_blocked?: boolean
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          satoshi_hash: string | null
          severity: string
          source_component: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity: string
          source_component?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          satoshi_hash?: string | null
          severity?: string
          source_component?: string | null
          title?: string
        }
        Relationships: []
      }
      system_vaults: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          vault_name: string
          vault_type: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          vault_name: string
          vault_type: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          vault_name?: string
          vault_type?: string
        }
        Relationships: []
      }
      systemic_failures: {
        Row: {
          affected_users_count: number | null
          created_at: string
          detected_at: string
          detected_by: string | null
          detection_method: string | null
          failure_description: string
          failure_vector: string
          financial_impact_brl: number | null
          id: string
          impact_assessment: Json | null
          resolution_summary: string | null
          resolved_at: string | null
          satoshi_hash: string
          severity_level: number
        }
        Insert: {
          affected_users_count?: number | null
          created_at?: string
          detected_at?: string
          detected_by?: string | null
          detection_method?: string | null
          failure_description: string
          failure_vector: string
          financial_impact_brl?: number | null
          id?: string
          impact_assessment?: Json | null
          resolution_summary?: string | null
          resolved_at?: string | null
          satoshi_hash: string
          severity_level: number
        }
        Update: {
          affected_users_count?: number | null
          created_at?: string
          detected_at?: string
          detected_by?: string | null
          detection_method?: string | null
          failure_description?: string
          failure_vector?: string
          financial_impact_brl?: number | null
          id?: string
          impact_assessment?: Json | null
          resolution_summary?: string | null
          resolved_at?: string | null
          satoshi_hash?: string
          severity_level?: number
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          created_at: string | null
          event_name: string
          event_type: string
          id: string
          properties: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          event_type: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          event_type?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      threat_summary_daily: {
        Row: {
          blocked_attempts: number | null
          cfo_analysis: string | null
          created_at: string | null
          estimated_savings: number | null
          id: string
          satoshi_hash: string | null
          summary_date: string
          top_attack_type: string | null
          total_attempts: number | null
          unique_ips: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_attempts?: number | null
          cfo_analysis?: string | null
          created_at?: string | null
          estimated_savings?: number | null
          id?: string
          satoshi_hash?: string | null
          summary_date?: string
          top_attack_type?: string | null
          total_attempts?: number | null
          unique_ips?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_attempts?: number | null
          cfo_analysis?: string | null
          created_at?: string | null
          estimated_savings?: number | null
          id?: string
          satoshi_hash?: string | null
          summary_date?: string
          top_attack_type?: string | null
          total_attempts?: number | null
          unique_ips?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          data_transacao: string
          descricao: string | null
          id: string
          status: string
          tipo: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_transacao?: string
          descricao?: string | null
          id?: string
          status?: string
          tipo: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_transacao?: string
          descricao?: string | null
          id?: string
          status?: string
          tipo?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_pins: {
        Row: {
          address: string | null
          created_at: string
          google_place_id: string | null
          id: string
          last_searched_at: string | null
          latitude: number
          longitude: number
          mapbox_feature_id: string | null
          metadata: Json | null
          name: string
          place_type: string | null
          search_count: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          last_searched_at?: string | null
          latitude: number
          longitude: number
          mapbox_feature_id?: string | null
          metadata?: Json | null
          name: string
          place_type?: string | null
          search_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          last_searched_at?: string | null
          latitude?: number
          longitude?: number
          mapbox_feature_id?: string | null
          metadata?: Json | null
          name?: string
          place_type?: string | null
          search_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_daily_access: {
        Row: {
          access_count: number | null
          access_date: string
          conchas_earned: number | null
          created_at: string | null
          id: string
          satoshi_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_count?: number | null
          access_date?: string
          conchas_earned?: number | null
          created_at?: string | null
          id?: string
          satoshi_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_count?: number | null
          access_date?: string
          conchas_earned?: number | null
          created_at?: string | null
          id?: string
          satoshi_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_data_exports: {
        Row: {
          created_at: string
          downloaded_at: string | null
          encryption_key_hash: string | null
          expires_at: string | null
          export_status: string
          export_type: string
          export_url: string | null
          id: string
          satoshi_hash: string | null
          tables_exported: string[] | null
          total_records: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          downloaded_at?: string | null
          encryption_key_hash?: string | null
          expires_at?: string | null
          export_status?: string
          export_type: string
          export_url?: string | null
          id?: string
          satoshi_hash?: string | null
          tables_exported?: string[] | null
          total_records?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          downloaded_at?: string | null
          encryption_key_hash?: string | null
          expires_at?: string | null
          export_status?: string
          export_type?: string
          export_url?: string | null
          id?: string
          satoshi_hash?: string | null
          tables_exported?: string[] | null
          total_records?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_types: {
        Row: {
          created_at: string | null
          id: string
          onboarding_completed: boolean | null
          tutorial_step: number | null
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          tutorial_step?: number | null
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          tutorial_step?: number | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      vendor_beach_link: {
        Row: {
          beach_id: string | null
          created_at: string | null
          id: string
          is_listed: boolean | null
          vendor_id: string | null
        }
        Insert: {
          beach_id?: string | null
          created_at?: string | null
          id?: string
          is_listed?: boolean | null
          vendor_id?: string | null
        }
        Update: {
          beach_id?: string | null
          created_at?: string | null
          id?: string
          is_listed?: boolean | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_beach_link_beach_id_fkey"
            columns: ["beach_id"]
            isOneToOne: false
            referencedRelation: "beaches"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_shops: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_open: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          profile_id: string
          rating: number | null
          shop_name: string
          status: string | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_open?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          profile_id: string
          rating?: number | null
          shop_name: string
          status?: string | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_open?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          profile_id?: string
          rating?: number | null
          shop_name?: string
          status?: string | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_shops_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_received: number
          total_withdrawn: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_received?: number
          total_withdrawn?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_received?: number
          total_withdrawn?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          accuracy_radius: number | null
          altitude: number | null
          altitude_accuracy: number | null
          created_at: string | null
          establishment_type:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          exposure_plan_expires_at: string | null
          exposure_plan_id: string | null
          heading: number | null
          linear_meters: number | null
          location: unknown
          location_source: string | null
          location_updated_at: string | null
          product_category: string
          product_description: string | null
          profile_id: string
          speed: number | null
          status: string | null
          updated_at: string | null
          vendor_size: string | null
          whatsapp_number: string
        }
        Insert: {
          accuracy_radius?: number | null
          altitude?: number | null
          altitude_accuracy?: number | null
          created_at?: string | null
          establishment_type?:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          exposure_plan_expires_at?: string | null
          exposure_plan_id?: string | null
          heading?: number | null
          linear_meters?: number | null
          location?: unknown
          location_source?: string | null
          location_updated_at?: string | null
          product_category: string
          product_description?: string | null
          profile_id: string
          speed?: number | null
          status?: string | null
          updated_at?: string | null
          vendor_size?: string | null
          whatsapp_number: string
        }
        Update: {
          accuracy_radius?: number | null
          altitude?: number | null
          altitude_accuracy?: number | null
          created_at?: string | null
          establishment_type?:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          exposure_plan_expires_at?: string | null
          exposure_plan_id?: string | null
          heading?: number | null
          linear_meters?: number | null
          location?: unknown
          location_source?: string | null
          location_updated_at?: string | null
          product_category?: string
          product_description?: string | null
          profile_id?: string
          speed?: number | null
          status?: string | null
          updated_at?: string | null
          vendor_size?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_exposure_plan_id_fkey"
            columns: ["exposure_plan_id"]
            isOneToOne: false
            referencedRelation: "exposure_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_new_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_humans: {
        Row: {
          anti_fraud_score: number | null
          biometric_hash: string | null
          created_at: string
          id: string
          is_unique_biological: boolean | null
          last_verification_check: string | null
          satoshi_hash: string | null
          updated_at: string
          user_id: string
          verification_factors: Json | null
          verification_level: Database["public"]["Enums"]["human_verification_level"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          anti_fraud_score?: number | null
          biometric_hash?: string | null
          created_at?: string
          id?: string
          is_unique_biological?: boolean | null
          last_verification_check?: string | null
          satoshi_hash?: string | null
          updated_at?: string
          user_id: string
          verification_factors?: Json | null
          verification_level?: Database["public"]["Enums"]["human_verification_level"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          anti_fraud_score?: number | null
          biometric_hash?: string | null
          created_at?: string
          id?: string
          is_unique_biological?: boolean | null
          last_verification_check?: string | null
          satoshi_hash?: string | null
          updated_at?: string
          user_id?: string
          verification_factors?: Json | null
          verification_level?: Database["public"]["Enums"]["human_verification_level"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      wallet_transfers: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          recipient_profile_id: string
          sender_profile_id: string
          status: string | null
          transaction_hash: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          recipient_profile_id: string
          sender_profile_id: string
          status?: string | null
          transaction_hash?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          recipient_profile_id?: string
          sender_profile_id?: string
          status?: string | null
          transaction_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transfers_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transfers_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_brl: number | null
          balance_conchas: number | null
          btc_equivalent: number | null
          created_at: string | null
          id: string
          last_btc_sync: string | null
          profile_id: string
          satoshi_equivalent: number | null
          trust_level: number | null
          updated_at: string | null
          wallet_status: string | null
        }
        Insert: {
          balance_brl?: number | null
          balance_conchas?: number | null
          btc_equivalent?: number | null
          created_at?: string | null
          id?: string
          last_btc_sync?: string | null
          profile_id: string
          satoshi_equivalent?: number | null
          trust_level?: number | null
          updated_at?: string | null
          wallet_status?: string | null
        }
        Update: {
          balance_brl?: number | null
          balance_conchas?: number | null
          btc_equivalent?: number | null
          created_at?: string | null
          id?: string
          last_btc_sync?: string | null
          profile_id?: string
          satoshi_equivalent?: number | null
          trust_level?: number | null
          updated_at?: string | null
          wallet_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_clicks: {
        Row: {
          beach_id: string | null
          clicked_at: string
          id: string
          vendor_id: string
        }
        Insert: {
          beach_id?: string | null
          clicked_at?: string
          id?: string
          vendor_id: string
        }
        Update: {
          beach_id?: string | null
          clicked_at?: string
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_clicks_beach_id_fkey"
            columns: ["beach_id"]
            isOneToOne: false
            referencedRelation: "beaches"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_links: {
        Row: {
          clicked: boolean | null
          clicked_at: string | null
          created_at: string
          generated_link: string
          id: string
          map_link: string | null
          message_template: string | null
          pin_id: string | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          clicked?: boolean | null
          clicked_at?: string | null
          created_at?: string
          generated_link: string
          id?: string
          map_link?: string | null
          message_template?: string | null
          pin_id?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          clicked?: boolean | null
          clicked_at?: string | null
          created_at?: string
          generated_link?: string
          id?: string
          map_link?: string | null
          message_template?: string | null
          pin_id?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_links_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "unified_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_channels: {
        Row: {
          banner_url: string | null
          btc_lastro_from_youtube: number | null
          channel_id: string
          channel_title: string
          channel_trust_score: number | null
          created_at: string | null
          custom_url: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_synced_at: string | null
          profile_id: string | null
          social_profile_id: string | null
          subscriber_count: number | null
          thumbnail_url: string | null
          updated_at: string | null
          video_count: number | null
          view_count: number | null
        }
        Insert: {
          banner_url?: string | null
          btc_lastro_from_youtube?: number | null
          channel_id: string
          channel_title: string
          channel_trust_score?: number | null
          created_at?: string | null
          custom_url?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_synced_at?: string | null
          profile_id?: string | null
          social_profile_id?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_count?: number | null
          view_count?: number | null
        }
        Update: {
          banner_url?: string | null
          btc_lastro_from_youtube?: number | null
          channel_id?: string
          channel_title?: string
          channel_trust_score?: number | null
          created_at?: string | null
          custom_url?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_synced_at?: string | null
          profile_id?: string | null
          social_profile_id?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_count?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_channels_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_channels_social_profile_id_fkey"
            columns: ["social_profile_id"]
            isOneToOne: false
            referencedRelation: "social_feed_with_lastro"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "youtube_channels_social_profile_id_fkey"
            columns: ["social_profile_id"]
            isOneToOne: false
            referencedRelation: "social_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_sync_log: {
        Row: {
          beach_id: string | null
          channel_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          quota_used: number | null
          response_data: Json | null
          status: string | null
          sync_type: string
          video_id: string | null
        }
        Insert: {
          beach_id?: string | null
          channel_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          quota_used?: number | null
          response_data?: Json | null
          status?: string | null
          sync_type: string
          video_id?: string | null
        }
        Update: {
          beach_id?: string | null
          channel_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          quota_used?: number | null
          response_data?: Json | null
          status?: string | null
          sync_type?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_sync_log_beach_id_fkey"
            columns: ["beach_id"]
            isOneToOne: false
            referencedRelation: "beaches"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_videos: {
        Row: {
          beach_id: string | null
          btc_equivalent: number | null
          cache_expires_at: string | null
          category_id: string | null
          channel_id: string
          channel_title: string | null
          comment_count: number | null
          created_at: string | null
          default_language: string | null
          description: string | null
          duration: string | null
          engagement_score: number | null
          id: string
          is_active: boolean | null
          is_live: boolean | null
          is_verified: boolean | null
          last_synced_at: string | null
          like_count: number | null
          live_broadcast_content: string | null
          profile_id: string | null
          published_at: string | null
          satoshi_equivalent: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          trust_multiplier: number | null
          updated_at: string | null
          vendor_id: string | null
          verified_at: string | null
          verified_by: string | null
          video_id: string
          video_type: string | null
          view_count: number | null
        }
        Insert: {
          beach_id?: string | null
          btc_equivalent?: number | null
          cache_expires_at?: string | null
          category_id?: string | null
          channel_id: string
          channel_title?: string | null
          comment_count?: number | null
          created_at?: string | null
          default_language?: string | null
          description?: string | null
          duration?: string | null
          engagement_score?: number | null
          id?: string
          is_active?: boolean | null
          is_live?: boolean | null
          is_verified?: boolean | null
          last_synced_at?: string | null
          like_count?: number | null
          live_broadcast_content?: string | null
          profile_id?: string | null
          published_at?: string | null
          satoshi_equivalent?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          trust_multiplier?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          video_id: string
          video_type?: string | null
          view_count?: number | null
        }
        Update: {
          beach_id?: string | null
          btc_equivalent?: number | null
          cache_expires_at?: string | null
          category_id?: string | null
          channel_id?: string
          channel_title?: string | null
          comment_count?: number | null
          created_at?: string | null
          default_language?: string | null
          description?: string | null
          duration?: string | null
          engagement_score?: number | null
          id?: string
          is_active?: boolean | null
          is_live?: boolean | null
          is_verified?: boolean | null
          last_synced_at?: string | null
          like_count?: number | null
          live_broadcast_content?: string | null
          profile_id?: string | null
          published_at?: string | null
          satoshi_equivalent?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          trust_multiplier?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          video_id?: string
          video_type?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_videos_beach_id_fkey"
            columns: ["beach_id"]
            isOneToOne: false
            referencedRelation: "beaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_videos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_balances: {
        Row: {
          balance: number | null
          currency: string | null
          last_updated: string | null
          profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      current_state: {
        Row: {
          checksum: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          is_anchored: boolean | null
          key_structure: string | null
          metadata: Json | null
          operation: string | null
          payload: Json | null
          tx_id: string | null
          version: number | null
        }
        Relationships: []
      }
      ecosystem_health: {
        Row: {
          active_vendors: number | null
          current_displacement_fee: number | null
          current_phase: number | null
          current_service_fee: number | null
          gmv_30d: number | null
          new_users_30d: number | null
          orders_30d: number | null
          total_clients: number | null
        }
        Relationships: []
      }
      genre_analytics: {
        Row: {
          color_class: string | null
          genre_emoji: string | null
          genre_key: string | null
          genre_name: string | null
          last_played: string | null
          play_count: number | null
          webhook_events: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      protocol_parameters_current: {
        Row: {
          category: string | null
          description: string | null
          is_ai_adjustable: boolean | null
          last_ai_adjustment: string | null
          max_value: number | null
          min_value: number | null
          param_key: string | null
          param_name: string | null
          param_unit: string | null
          param_value: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          is_ai_adjustable?: boolean | null
          last_ai_adjustment?: string | null
          max_value?: number | null
          min_value?: number | null
          param_key?: string | null
          param_name?: string | null
          param_unit?: string | null
          param_value?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          is_ai_adjustable?: boolean | null
          last_ai_adjustment?: string | null
          max_value?: number | null
          min_value?: number | null
          param_key?: string | null
          param_name?: string | null
          param_unit?: string | null
          param_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      satoshi_audit_view: {
        Row: {
          hash_value: string | null
          integrity_valid: boolean | null
          record_created: string | null
          record_id: string | null
          source_table: string | null
        }
        Relationships: []
      }
      social_feed_with_lastro: {
        Row: {
          author_avatar: string | null
          author_btc_lastro: number | null
          author_current_trust: number | null
          author_display_name: string | null
          author_id: string | null
          author_reputation: number | null
          author_trust_at_post: number | null
          author_username: string | null
          author_verified: boolean | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          current_btc_parity: number | null
          like_count: number | null
          media_urls: string[] | null
          post_id: string | null
          repost_count: number | null
          weighted_relevance: number | null
          weighted_score: number | null
        }
        Relationships: []
      }
      v_compliance_audit: {
        Row: {
          audit_timestamp: string | null
          currency: string | null
          first_transaction: string | null
          last_transaction: string | null
          net_balance: number | null
          system_status: string | null
          total_credits: number | null
          total_debits: number | null
          transaction_count: number | null
          unique_accounts: number | null
        }
        Relationships: []
      }
      v_concha_supply: {
        Row: {
          available_to_mint: number | null
          current_supply: number | null
          hard_cap: number | null
          total_burned: number | null
          total_minted: number | null
        }
        Relationships: []
      }
      v_user_transaction_security: {
        Row: {
          amount: number | null
          balance_after: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          entry_type: string | null
          hash_display: string | null
          id: string | null
          profile_id: string | null
          signature_hash: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          balance_after?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          entry_type?: string | null
          hash_display?: never
          id?: string | null
          profile_id?: string | null
          signature_hash?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          balance_after?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          entry_type?: string | null
          hash_display?: never
          id?: string | null
          profile_id?: string | null
          signature_hash?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_ratings: {
        Row: {
          average_rating: number | null
          total_reviews: number | null
          vendor_id: string | null
        }
        Relationships: []
      }
      vendors_location_precise: {
        Row: {
          accuracy_radius: number | null
          freshness: string | null
          full_name: string | null
          heading: number | null
          latitude: number | null
          location_age_seconds: number | null
          location_source: string | null
          location_updated_at: string | null
          longitude: number | null
          product_category: string | null
          profile_id: string | null
          profile_photo_url: string | null
          speed: number | null
          status: string | null
          whatsapp_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_new_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors_public: {
        Row: {
          created_at: string | null
          email: string | null
          establishment_type:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          full_name: string | null
          latitude: number | null
          location: unknown
          longitude: number | null
          phone: string | null
          product_category: string | null
          product_description: string | null
          profile_id: string | null
          profile_photo_url: string | null
          status: string | null
          whatsapp_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_new_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      activate_monetization_phase: {
        Args: { p_admin_id: string; p_phase_number: number }
        Returns: Json
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      apply_ai_dilution: { Args: never; Returns: undefined }
      audit_log_integrity: {
        Args: { p_hours?: number }
        Returns: {
          created_at: string
          is_valid: boolean
          log_id: string
          log_severity: string
        }[]
      }
      bulk_sync_profiles: { Args: { p_profiles: Json }; Returns: Json }
      calculate_btc_equivalent: {
        Args: { p_brl_amount: number }
        Returns: number
      }
      calculate_daily_health_score: { Args: never; Returns: Json }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_satoshi_equivalent: {
        Args: { p_brl_amount: number }
        Returns: number
      }
      calculate_transaction_fee: {
        Args: {
          p_linear_meters?: number
          p_transaction_amount: number
          p_user_id: string
        }
        Returns: Json
      }
      calculate_video_engagement: {
        Args: {
          p_comment_count: number
          p_like_count: number
          p_view_count: number
        }
        Returns: number
      }
      calculate_vincenty_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_youtube_trust_multiplier: {
        Args: {
          p_like_count: number
          p_subscriber_count?: number
          p_view_count: number
        }
        Returns: number
      }
      check_asset_dependencies: {
        Args: { p_asset_name: string; p_asset_type: string }
        Returns: {
          dependencies: Json
          dependency_count: number
          has_dependencies: boolean
        }[]
      }
      check_auth_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      classify_risk: {
        Args: {
          p_action_type: string
          p_global_scope?: boolean
          p_touches_money?: boolean
          p_touches_security?: boolean
        }
        Returns: string
      }
      cleanup_expired_content: {
        Args: never
        Returns: {
          deleted_images: string[]
          deleted_news: number
          deleted_posts: number
        }[]
      }
      cleanup_expired_feed_content: { Args: never; Returns: undefined }
      cleanup_old_location_history: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_ai_council_proposal: {
        Args: {
          p_agent_key: string
          p_ecosystem_analysis: Json
          p_justification: string
          p_proposal_type: string
          p_proposed_value: number
          p_target_param: string
        }
        Returns: string
      }
      create_ai_guidance: {
        Args: {
          p_affected_assets?: Json
          p_auto_executable?: boolean
          p_created_by_agent?: string
          p_description: string
          p_guidance_type: string
          p_severity: string
          p_step_by_step: Json
          p_suggested_code?: string
          p_title: string
        }
        Returns: Json
      }
      create_protocol_state: {
        Args: {
          p_btc_context?: Json
          p_entity_id?: string
          p_key_structure: string
          p_metadata?: Json
          p_operation?: string
          p_payload: Json
        }
        Returns: string
      }
      detect_orphan_operations: {
        Args: never
        Returns: {
          created_at: string
          event_id: string
          event_type: string
          idempotency_key: string
          is_orphan: boolean
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      execute_ai_guidance: {
        Args: { p_admin_id: string; p_guidance_id: string }
        Returns: Json
      }
      execute_guidance: { Args: { p_guidance_id: string }; Returns: Json }
      execute_secure_transfer: {
        Args: {
          p_amount: number
          p_currency?: string
          p_description?: string
          p_from_profile_id: string
          p_idempotency_key?: string
          p_reference_id?: string
          p_reference_type?: string
          p_to_profile_id: string
        }
        Returns: Json
      }
      execute_sovereign_action: {
        Args: {
          p_action_type: string
          p_justification?: string
          p_payload?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      find_nearby_profiles: {
        Args: {
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_radius_km?: number
        }
        Returns: {
          distance_km: number
          profile_full_name: string
          profile_id: string
          profile_photo_url: string
        }[]
      }
      find_nearby_vendors: {
        Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
        Returns: {
          distance_meters: number
          email: string
          full_name: string
          phone: string
          product_category: string
          profile_id: string
          profile_photo_url: string
          whatsapp_number: string
        }[]
      }
      find_nearby_vendors_precise: {
        Args: {
          p_lat: number
          p_lng: number
          p_min_accuracy?: number
          p_radius_meters?: number
        }
        Returns: {
          accuracy_radius: number
          distance_meters: number
          email: string
          full_name: string
          heading: number
          location_age_seconds: number
          phone: string
          product_category: string
          profile_id: string
          profile_photo_url: string
          speed: number
          whatsapp_number: string
        }[]
      }
      fn_ban_ip: {
        Args: {
          p_expires_days?: number
          p_ip_address: string
          p_is_permanent?: boolean
          p_reason?: string
        }
        Returns: string
      }
      fn_report_hacker_attempt: {
        Args: {
          p_city?: string
          p_country_code?: string
          p_country_name?: string
          p_honeypot_triggered: string
          p_ip_address: string
          p_latitude?: number
          p_longitude?: number
          p_request_path?: string
          p_user_agent?: string
        }
        Returns: string
      }
      generate_event_checksum: {
        Args: {
          p_event_data: Json
          p_event_type: string
          p_previous_checksum?: string
        }
        Returns: string
      }
      generate_satoshi_checksum: {
        Args: {
          p_metadata: Json
          p_payload: Json
          p_previous_checksum?: string
        }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_balance: {
        Args: { p_currency?: string; p_profile_id: string }
        Returns: number
      }
      get_beach_videos_with_lastro: {
        Args: {
          p_beach_id: string
          p_include_lives?: boolean
          p_limit?: number
        }
        Returns: {
          author_btc_lastro: number
          author_trust_score: number
          channel_title: string
          is_live: boolean
          like_count: number
          thumbnail_url: string
          title: string
          video_id: string
          view_count: number
          weighted_relevance: number
        }[]
      }
      get_btc_parity: { Args: never; Returns: number }
      get_daily_honeytoken: {
        Args: never
        Returns: {
          token_name: string
          token_value: string
        }[]
      }
      get_last_entity_checksum: {
        Args: { p_entity_id: string }
        Returns: string
      }
      get_mass_metrics: { Args: never; Returns: Json }
      get_operation_telemetry: {
        Args: { p_category?: string; p_hours?: number }
        Returns: {
          category: string
          description: string
          event_count: number
          op_key: string
          total_zimbu: number
        }[]
      }
      get_orchestrator_logs: {
        Args: {
          p_limit?: number
          p_orch_id?: string
          p_search_payload?: string
          p_severity?: string
          p_stage?: string
        }
        Returns: {
          actor_email: string
          created_at: string
          error_stack: string
          execution_time_ms: number
          id: string
          log_id: string
          log_message: string
          log_payload: Json
          log_severity: string
          log_stage: string
          orch_id: string
          satoshi_hash: string
        }[]
      }
      get_profile_by_user_id: {
        Args: { p_user_id: string }
        Returns: {
          current_youtube_id: string
          email: string
          full_name: string
          id: string
          music_artist: string
          music_title: string
          user_id: string
        }[]
      }
      get_profile_with_assets: {
        Args: { p_user_id: string }
        Returns: {
          balance_brl: number
          balance_conchas: number
          btc_equivalent: number
          btc_parity_last: number
          btc_trust_score: number
          email: string
          full_name: string
          profile_id: string
          profile_photo_url: string
          reputation_level: number
          satoshi_equivalent: number
          trust_level: number
          wallet_status: string
        }[]
      }
      get_sync_status: { Args: { p_user_id: string }; Returns: Json }
      get_user_balance: {
        Args: { p_currency?: string; p_profile_id: string }
        Returns: number
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_positive_content: {
        Args: { description: string; title: string }
        Returns: boolean
      }
      is_sovereign: { Args: { check_user_id?: string }; Returns: boolean }
      is_vendor: { Args: { _user_id: string }; Returns: boolean }
      log_blackbox_error: {
        Args: {
          p_context?: Json
          p_error_code: string
          p_error_message: string
          p_idempotency_key?: string
          p_origin: string
          p_severity?: string
        }
        Returns: string
      }
      log_engineering_error: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_risk_level?: string
          p_source_component?: string
        }
        Returns: Json
      }
      log_health_alert: {
        Args: {
          p_alert_type: string
          p_message: string
          p_metadata?: Json
          p_severity: string
          p_source?: string
          p_title: string
        }
        Returns: string
      }
      log_ledger_event: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_event_data: Json
          p_event_type: string
        }
        Returns: string
      }
      log_notification_activity: {
        Args: {
          p_activity_data?: Json
          p_activity_type: string
          p_actor_id?: string
          p_actor_type?: string
          p_notification_id: string
        }
        Returns: string
      }
      log_orchestrator_event: {
        Args: {
          p_error_stack?: string
          p_execution_time_ms?: number
          p_message?: string
          p_orch_id?: string
          p_payload?: Json
          p_severity?: string
          p_stage?: string
        }
        Returns: Json
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_identifier: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mine_activity_hash: {
        Args: { p_action: string; p_metadata?: Json; p_user_id: string }
        Returns: string
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_music_webhook: {
        Args: {
          p_event_type: string
          p_genre?: string
          p_metadata?: Json
          p_music_query?: string
          p_session_id: string
          p_source?: string
          p_user_id?: string
          p_video_id?: string
        }
        Returns: string
      }
      promote_to_production: {
        Args: { p_admin_id: string; p_version_id: string }
        Returns: Json
      }
      record_ledger_entry: {
        Args: {
          p_amount: number
          p_currency: string
          p_description?: string
          p_entry_type: string
          p_metadata?: Json
          p_profile_id: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
      register_daily_access: { Args: { p_user_id: string }; Returns: Json }
      register_information_flow: {
        Args: {
          p_flow_data?: Json
          p_flow_type: string
          p_source_id?: string
          p_source_table: string
        }
        Returns: string
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      switch_governance_phase: {
        Args: { p_admin_id: string; p_new_phase: number }
        Returns: Json
      }
      sync_profile_from_external: {
        Args: {
          p_cpf?: string
          p_data_nascimento?: string
          p_email?: string
          p_full_name?: string
          p_metadata?: Json
          p_mother_name?: string
          p_phone?: string
          p_profile_photo_url?: string
          p_sexo?: string
          p_user_id: string
          p_user_type?: string
        }
        Returns: Json
      }
      sync_social_lastro: { Args: { p_profile_id: string }; Returns: undefined }
      sync_youtube_to_social_lastro: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      toggle_kill_switch: {
        Args: { p_admin_id: string; p_freeze: boolean }
        Returns: Json
      }
      toggle_safe_mode: {
        Args: { p_activate: boolean; p_admin_id: string; p_reason?: string }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_satoshi_daily_metrics: { Args: never; Returns: undefined }
      update_vendor_location: {
        Args: { p_latitude: number; p_longitude: number; p_profile_id: string }
        Returns: undefined
      }
      update_vendor_location_precise: {
        Args: {
          p_accuracy_radius?: number
          p_altitude?: number
          p_altitude_accuracy?: number
          p_heading?: number
          p_latitude: number
          p_longitude: number
          p_profile_id: string
          p_source?: string
          p_speed?: number
        }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_checkout_balance: {
        Args: { p_amount: number; p_currency?: string; p_profile_id: string }
        Returns: boolean
      }
      validate_cpf: { Args: { cpf_value: string }; Returns: boolean }
      validate_version: {
        Args: { p_admin_id: string; p_version_id: string }
        Returns: Json
      }
      verify_satoshi_hash: {
        Args: {
          p_record_id: string
          p_stored_hash: string
          p_table_name: string
        }
        Returns: boolean
      }
      verify_satoshi_integrity: {
        Args: { p_hash: string }
        Returns: {
          details: Json
          is_valid: boolean
          record_id: string
          source_table: string
        }[]
      }
      verify_satoshi_integrity_v2: {
        Args: { p_entity_id?: string; p_full_chain?: boolean }
        Returns: Json
      }
      verify_transaction_proximity: {
        Args: {
          p_client_accuracy: number
          p_client_lat: number
          p_client_lng: number
          p_max_distance_meters?: number
          p_order_id: string
          p_vendor_accuracy: number
          p_vendor_lat: number
          p_vendor_lng: number
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "client" | "vendor" | "admin"
      ai_decision_scope:
        | "user_impact"
        | "price_modification"
        | "visibility_change"
        | "access_control"
        | "global_parameter"
      amendment_status:
        | "draft"
        | "simulation"
        | "public_review"
        | "voting"
        | "approved"
        | "rejected"
        | "implemented"
        | "revoked"
      app_role: "admin" | "user" | "vendor" | "employee"
      arbitration_status:
        | "submitted"
        | "under_review"
        | "panel_assigned"
        | "deliberating"
        | "decision_made"
        | "appealed"
        | "final"
        | "closed"
      consequence_type:
        | "rollback"
        | "scope_limitation"
        | "privilege_reduction"
        | "public_record"
        | "suspension"
        | "audit_required"
      critical_state_category:
        | "financial_loss"
        | "rights_violation"
        | "systemic_instability"
        | "reputation_damage"
      dissolution_status:
        | "operational"
        | "warning"
        | "preparing_dissolution"
        | "dissolving"
        | "dissolved"
        | "archived"
      establishment_type:
        | "ambulante"
        | "barraca"
        | "restaurante"
        | "bar"
        | "deposito"
      human_verification_level:
        | "unverified"
        | "basic"
        | "standard"
        | "verified"
        | "sovereign"
      predatory_practice:
        | "cognitive_bias_exploitation"
        | "psychological_dependency"
        | "exit_penalty"
        | "asymmetric_power"
        | "growth_at_all_costs"
      responsibility_agent_type:
        | "ai_agent"
        | "human_operator"
        | "founder"
        | "system"
      transaction_type: "compra" | "venda"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      account_type: ["client", "vendor", "admin"],
      ai_decision_scope: [
        "user_impact",
        "price_modification",
        "visibility_change",
        "access_control",
        "global_parameter",
      ],
      amendment_status: [
        "draft",
        "simulation",
        "public_review",
        "voting",
        "approved",
        "rejected",
        "implemented",
        "revoked",
      ],
      app_role: ["admin", "user", "vendor", "employee"],
      arbitration_status: [
        "submitted",
        "under_review",
        "panel_assigned",
        "deliberating",
        "decision_made",
        "appealed",
        "final",
        "closed",
      ],
      consequence_type: [
        "rollback",
        "scope_limitation",
        "privilege_reduction",
        "public_record",
        "suspension",
        "audit_required",
      ],
      critical_state_category: [
        "financial_loss",
        "rights_violation",
        "systemic_instability",
        "reputation_damage",
      ],
      dissolution_status: [
        "operational",
        "warning",
        "preparing_dissolution",
        "dissolving",
        "dissolved",
        "archived",
      ],
      establishment_type: [
        "ambulante",
        "barraca",
        "restaurante",
        "bar",
        "deposito",
      ],
      human_verification_level: [
        "unverified",
        "basic",
        "standard",
        "verified",
        "sovereign",
      ],
      predatory_practice: [
        "cognitive_bias_exploitation",
        "psychological_dependency",
        "exit_penalty",
        "asymmetric_power",
        "growth_at_all_costs",
      ],
      responsibility_agent_type: [
        "ai_agent",
        "human_operator",
        "founder",
        "system",
      ],
      transaction_type: ["compra", "venda"],
    },
  },
} as const
