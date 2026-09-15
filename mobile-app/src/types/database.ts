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
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_interactions: {
        Row: {
          created_at: string
          id: string
          input_context: Json | null
          interaction_type: Database["public"]["Enums"]["ai_interaction_type"]
          profile_id: string
          suggestion: Json | null
          was_accepted: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_context?: Json | null
          interaction_type: Database["public"]["Enums"]["ai_interaction_type"]
          profile_id: string
          suggestion?: Json | null
          was_accepted?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          input_context?: Json | null
          interaction_type?: Database["public"]["Enums"]["ai_interaction_type"]
          profile_id?: string
          suggestion?: Json | null
          was_accepted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_assistant_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_profiles: {
        Row: {
          created_at: string
          current_company: string | null
          current_position: string | null
          faculty: string | null
          graduation_year: number | null
          industry_id: string | null
          is_mentor: boolean
          profile_id: string
          program: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_company?: string | null
          current_position?: string | null
          faculty?: string | null
          graduation_year?: number | null
          industry_id?: string | null
          is_mentor?: boolean
          profile_id: string
          program?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_company?: string | null
          current_position?: string | null
          faculty?: string | null
          graduation_year?: number | null
          industry_id?: string | null
          is_mentor?: boolean
          profile_id?: string
          program?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_profiles_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "alumni_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean
          published_at: string | null
          target_audience: Database["public"]["Enums"]["announcement_audience"]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          target_audience?: Database["public"]["Enums"]["announcement_audience"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          target_audience?: Database["public"]["Enums"]["announcement_audience"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_id: string
          applied_at: string
          cover_letter: string | null
          id: string
          opportunity_id: string
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          cover_letter?: string | null
          id?: string
          opportunity_id: string
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          cover_letter?: string | null
          id?: string
          opportunity_id?: string
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "company_opportunity_analytics"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_pathway_steps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pathway_id: string
          recommended_skill_ids: string[]
          resources: Json
          step_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pathway_id: string
          recommended_skill_ids?: string[]
          resources?: Json
          step_order: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pathway_id?: string
          recommended_skill_ids?: string[]
          resources?: Json
          step_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_pathway_steps_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "career_pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      career_pathways: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          industry_id: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          industry_id?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          industry_id?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_pathways_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "career_pathways_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_pathways_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          profile_id: string
          title: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          profile_id: string
          title: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          profile_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          profile_id: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "comment_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          banner_url: string | null
          company_size: string | null
          created_at: string
          created_by: string | null
          description: string | null
          founded_year: number | null
          id: string
          industry_id: string | null
          location: string | null
          logo_url: string | null
          name: string
          search_vector: unknown
          slug: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry_id?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          search_vector?: unknown
          slug?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry_id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          search_vector?: unknown
          slug?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "companies_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["company_member_role"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          profile_id: string
          role?: Database["public"]["Enums"]["company_member_role"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["company_member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean
          joined_at: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_documents: {
        Row: {
          extracted_data: Json | null
          extraction_status: Database["public"]["Enums"]["cv_extraction_status"]
          file_name: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_primary: boolean
          processed_at: string | null
          profile_id: string
          uploaded_at: string
        }
        Insert: {
          extracted_data?: Json | null
          extraction_status?: Database["public"]["Enums"]["cv_extraction_status"]
          file_name?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_primary?: boolean
          processed_at?: string | null
          profile_id: string
          uploaded_at?: string
        }
        Update: {
          extracted_data?: Json | null
          extraction_status?: Database["public"]["Enums"]["cv_extraction_status"]
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_primary?: boolean
          processed_at?: string | null
          profile_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "cv_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          event_id: string
          id: string
          profile_id: string
          rsvp_at: string
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          event_id: string
          id?: string
          profile_id: string
          rsvp_at?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          event_id?: string
          id?: string
          profile_id?: string
          rsvp_at?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_rsvps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_url: string | null
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_virtual: boolean
          location: string | null
          rsvp_count: number
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_virtual?: boolean
          location?: string | null
          rsvp_count?: number
          start_time: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_virtual?: boolean
          location?: string | null
          rsvp_count?: number
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experience: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean
          job_title: string
          location: string | null
          profile_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title: string
          location?: string | null
          profile_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title?: string
          location?: string | null
          profile_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "experience_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          media_type: Database["public"]["Enums"]["media_type"] | null
          media_url: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          profile_id: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          application_count: number
          application_deadline: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          currency: string
          description: string
          duration_months: number | null
          id: string
          location: string | null
          min_year_of_study: number | null
          opportunity_type: Database["public"]["Enums"]["opportunity_type"]
          posted_by: string | null
          qualifications_required: string | null
          rejection_reason: string | null
          search_vector: unknown
          start_date: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          stipend_max: number | null
          stipend_min: number | null
          title: string
          updated_at: string
          view_count: number
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        Insert: {
          application_count?: number
          application_deadline?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          currency?: string
          description: string
          duration_months?: number | null
          id?: string
          location?: string | null
          min_year_of_study?: number | null
          opportunity_type: Database["public"]["Enums"]["opportunity_type"]
          posted_by?: string | null
          qualifications_required?: string | null
          rejection_reason?: string | null
          search_vector?: unknown
          start_date?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          stipend_max?: number | null
          stipend_min?: number | null
          title: string
          updated_at?: string
          view_count?: number
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Update: {
          application_count?: number
          application_deadline?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          description?: string
          duration_months?: number | null
          id?: string
          location?: string | null
          min_year_of_study?: number | null
          opportunity_type?: Database["public"]["Enums"]["opportunity_type"]
          posted_by?: string | null
          qualifications_required?: string | null
          rejection_reason?: string | null
          search_vector?: unknown
          start_date?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          stipend_max?: number | null
          stipend_min?: number | null
          title?: string
          updated_at?: string
          view_count?: number
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "opportunities_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "opportunities_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_matches: {
        Row: {
          generated_at: string
          id: string
          is_dismissed: boolean
          is_viewed: boolean
          match_score: number | null
          matched_skill_ids: string[]
          opportunity_id: string
          profile_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          is_dismissed?: boolean
          is_viewed?: boolean
          match_score?: number | null
          matched_skill_ids?: string[]
          opportunity_id: string
          profile_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          is_dismissed?: boolean
          is_viewed?: boolean
          match_score?: number | null
          matched_skill_ids?: string[]
          opportunity_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "company_opportunity_analytics"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "opportunity_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "opportunity_matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_skills: {
        Row: {
          is_required: boolean
          opportunity_id: string
          skill_id: string
        }
        Insert: {
          is_required?: boolean
          opportunity_id: string
          skill_id: string
        }
        Update: {
          is_required?: boolean
          opportunity_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_skills_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "company_opportunity_analytics"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "opportunity_skills_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_views: {
        Row: {
          id: string
          opportunity_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          opportunity_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_views_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "company_opportunity_analytics"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "opportunity_views_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "opportunity_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          duration_seconds: number | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          position: number
          post_id: string
          thumbnail_url: string | null
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          position?: number
          post_id: string
          thumbnail_url?: string | null
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string
          position?: number
          post_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          profile_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          profile_id: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          profile_id?: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "post_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comment_count: number
          content: string | null
          created_at: string
          id: string
          is_deleted: boolean
          like_count: number
          post_type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          author_id: string
          comment_count?: number
          content?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          like_count?: number
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          author_id?: string
          comment_count?: number
          content?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          like_count?: number
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_pathway_progress: {
        Row: {
          completed_at: string | null
          current_step_order: number
          id: string
          pathway_id: string
          profile_id: string
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          current_step_order?: number
          id?: string
          pathway_id: string
          profile_id: string
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          current_step_order?: number
          id?: string
          pathway_id?: string
          profile_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_pathway_progress_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "career_pathways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_pathway_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_pathway_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          created_at: string
          id: string
          proficiency_level: string | null
          profile_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          profile_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          profile_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          source: string | null
          viewed_at: string
          viewed_profile_id: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          source?: string | null
          viewed_at?: string
          viewed_profile_id: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          source?: string | null
          viewed_at?: string
          viewed_profile_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_profile_id_fkey"
            columns: ["viewed_profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_views_viewed_profile_id_fkey"
            columns: ["viewed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          headline: string | null
          id: string
          is_active: boolean
          last_active_at: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          search_vector: unknown
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          headline?: string | null
          id: string
          is_active?: boolean
          last_active_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
        }
        Relationships: []
      }
      project_skills: {
        Row: {
          project_id: string
          skill_id: string
        }
        Insert: {
          project_id: string
          skill_id: string
        }
        Update: {
          project_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_urls: string[]
          is_current: boolean
          profile_id: string
          project_url: string | null
          repo_url: string | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_urls?: string[]
          is_current?: boolean
          profile_id: string
          project_url?: string | null
          repo_url?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_urls?: string[]
          is_current?: boolean
          profile_id?: string
          project_url?: string | null
          repo_url?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          expo_push_token: string
          id: string
          is_active: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          expo_push_token: string
          id?: string
          is_active?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          expo_push_token?: string
          id?: string
          is_active?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "push_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          created_at: string
          endorsed_by: string
          id: string
          profile_skill_id: string
        }
        Insert: {
          created_at?: string
          endorsed_by: string
          id?: string
          profile_skill_id: string
        }
        Update: {
          created_at?: string
          endorsed_by?: string
          id?: string
          profile_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_endorsed_by_fkey"
            columns: ["endorsed_by"]
            isOneToOne: false
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "skill_endorsements_endorsed_by_fkey"
            columns: ["endorsed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_skill_id_fkey"
            columns: ["profile_skill_id"]
            isOneToOne: false
            referencedRelation: "profile_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string
          expected_graduation_date: string | null
          faculty: string | null
          profile_id: string
          program: string | null
          student_number: string | null
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          created_at?: string
          expected_graduation_date?: string | null
          faculty?: string | null
          profile_id: string
          program?: string | null
          student_number?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          created_at?: string
          expected_graduation_date?: string | null
          faculty?: string | null
          profile_id?: string
          program?: string | null
          student_number?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profile_analytics_summary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_opportunity_analytics: {
        Row: {
          application_count: number | null
          company_id: string | null
          offered_count: number | null
          opportunity_id: string | null
          shortlisted_count: number | null
          status: Database["public"]["Enums"]["opportunity_status"] | null
          title: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_analytics_summary: {
        Row: {
          connection_count: number | null
          post_count: number | null
          profile_id: string | null
          total_views: number | null
          views_last_30_days: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_resolve_report: {
        Args: {
          new_status: Database["public"]["Enums"]["report_status"]
          notes?: string
          target_report_id: string
        }
        Returns: undefined
      }
      admin_review_alumni_verification: {
        Args: {
          new_status: Database["public"]["Enums"]["verification_status"]
          note?: string
          target_profile_id: string
        }
        Returns: undefined
      }
      admin_review_company_verification: {
        Args: {
          new_status: Database["public"]["Enums"]["verification_status"]
          note?: string
          target_company_id: string
        }
        Returns: undefined
      }
      admin_review_opportunity: {
        Args: { approve: boolean; note?: string; target_opportunity_id: string }
        Returns: undefined
      }
      admin_set_user_active: {
        Args: { active: boolean; note?: string; target_profile_id: string }
        Returns: undefined
      }
      block_connection: {
        Args: { other_profile_id: string }
        Returns: undefined
      }
      close_opportunity: {
        Args: { mark_filled?: boolean; target_opportunity_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_body?: string
          p_profile_id: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_company_member: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_connected_to: { Args: { other_profile_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { target_conversation_id: string }
        Returns: boolean
      }
      submit_opportunity_for_approval: {
        Args: { target_opportunity_id: string }
        Returns: undefined
      }
      update_application_status: {
        Args: {
          new_status: Database["public"]["Enums"]["application_status"]
          note?: string
          target_application_id: string
        }
        Returns: undefined
      }
      withdraw_application: {
        Args: { target_application_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_interaction_type:
        | "profile_suggestion"
        | "skill_suggestion"
        | "career_guidance"
        | "cv_extraction"
        | "bio_generation"
        | "opportunity_match_explainer"
      announcement_audience:
        | "all"
        | "students"
        | "alumni"
        | "business"
        | "admin"
      application_status:
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "interview"
        | "offered"
        | "rejected"
        | "withdrawn"
        | "accepted"
      company_member_role: "owner" | "recruiter" | "member"
      connection_status: "pending" | "accepted" | "declined" | "blocked"
      cv_extraction_status: "pending" | "processing" | "completed" | "failed"
      event_status: "draft" | "published" | "cancelled"
      event_type:
        | "workshop"
        | "career_fair"
        | "webinar"
        | "networking"
        | "info_session"
        | "other"
      media_type: "image" | "video" | "document"
      notification_type:
        | "connection_request"
        | "connection_accepted"
        | "new_message"
        | "post_reaction"
        | "post_comment"
        | "opportunity_match"
        | "application_update"
        | "event_reminder"
        | "announcement"
        | "mention"
        | "system"
      opportunity_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "closed"
        | "filled"
      opportunity_type:
        | "internship"
        | "learnership"
        | "graduate_program"
        | "part_time"
        | "full_time"
        | "contract"
      post_type: "text" | "image" | "video" | "article"
      post_visibility: "public" | "connections" | "private"
      reaction_type: "like" | "celebrate" | "support" | "insightful" | "curious"
      report_status: "pending" | "reviewed" | "actioned" | "dismissed"
      report_target_type: "post" | "comment" | "profile" | "message" | "company"
      rsvp_status: "interested" | "going" | "attended" | "cancelled"
      user_role: "student" | "alumni" | "business" | "admin"
      verification_status: "pending" | "verified" | "rejected"
      work_mode: "on_site" | "remote" | "hybrid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][CompositeTypeName]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_interaction_type: [
        "profile_suggestion",
        "skill_suggestion",
        "career_guidance",
        "cv_extraction",
        "bio_generation",
        "opportunity_match_explainer",
      ],
      announcement_audience: ["all", "students", "alumni", "business", "admin"],
      application_status: [
        "submitted",
        "under_review",
        "shortlisted",
        "interview",
        "offered",
        "rejected",
        "withdrawn",
        "accepted",
      ],
      company_member_role: ["owner", "recruiter", "member"],
      connection_status: ["pending", "accepted", "declined", "blocked"],
      cv_extraction_status: ["pending", "processing", "completed", "failed"],
      event_status: ["draft", "published", "cancelled"],
      event_type: [
        "workshop",
        "career_fair",
        "webinar",
        "networking",
        "info_session",
        "other",
      ],
      media_type: ["image", "video", "document"],
      notification_type: [
        "connection_request",
        "connection_accepted",
        "new_message",
        "post_reaction",
        "post_comment",
        "opportunity_match",
        "application_update",
        "event_reminder",
        "announcement",
        "mention",
        "system",
      ],
      opportunity_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "closed",
        "filled",
      ],
      opportunity_type: [
        "internship",
        "learnership",
        "graduate_program",
        "part_time",
        "full_time",
        "contract",
      ],
      post_type: ["text", "image", "video", "article"],
      post_visibility: ["public", "connections", "private"],
      reaction_type: ["like", "celebrate", "support", "insightful", "curious"],
      report_status: ["pending", "reviewed", "actioned", "dismissed"],
      report_target_type: ["post", "comment", "profile", "message", "company"],
      rsvp_status: ["interested", "going", "attended", "cancelled"],
      user_role: ["student", "alumni", "business", "admin"],
      verification_status: ["pending", "verified", "rejected"],
      work_mode: ["on_site", "remote", "hybrid"],
    },
  },
} as const
