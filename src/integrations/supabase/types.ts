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
      active_sessions: {
        Row: {
          created_at: string
          id: string
          target_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      build_history: {
        Row: {
          build_id: string
          completed_at: string | null
          created_at: string
          id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          build_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          build_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_dm: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_dm?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_dm?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_id: string
          body: string
          channel_id: string
          created_at: string
          edited_at: string | null
          id: string
          mentions: string[]
          tenant_id: string
        }
        Insert: {
          author_id: string
          body: string
          channel_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          tenant_id: string
        }
        Update: {
          author_id?: string
          body?: string
          channel_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing: {
        Row: {
          channel_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_vault: {
        Row: {
          created_at: string
          file_url: string
          id: string
          target_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          target_id: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          target_id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_vault_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_devices: {
        Row: {
          arch: string | null
          id: string
          last_seen: string | null
          nickname: string | null
          os_info: string | null
          public_ip: string | null
          status: string
          target_id: string
          tenant_id: string
        }
        Insert: {
          arch?: string | null
          id?: string
          last_seen?: string | null
          nickname?: string | null
          os_info?: string | null
          public_ip?: string | null
          status?: string
          target_id: string
          tenant_id: string
        }
        Update: {
          arch?: string | null
          id?: string
          last_seen?: string | null
          nickname?: string | null
          os_info?: string | null
          public_ip?: string | null
          status?: string
          target_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "managed_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          build_finished: boolean
          created_at: string
          device_enrolled: boolean
          device_offline: boolean
          org_requests: boolean
          task_completed: boolean
          task_failed: boolean
          toast_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          build_finished?: boolean
          created_at?: string
          device_enrolled?: boolean
          device_offline?: boolean
          org_requests?: boolean
          task_completed?: boolean
          task_failed?: boolean
          toast_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          build_finished?: boolean
          created_at?: string
          device_enrolled?: boolean
          device_offline?: boolean
          org_requests?: boolean
          task_completed?: boolean
          task_failed?: boolean
          toast_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      org_join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requester_email: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requester_email: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requester_email?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          steps: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          steps?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          steps?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      relay_nodes: {
        Row: {
          addr: string
          client_count: number
          id: string
          last_seen: string | null
          status: string
          tenant_id: string
          throughput: string | null
          uptime: number
        }
        Insert: {
          addr: string
          client_count?: number
          id?: string
          last_seen?: string | null
          status?: string
          tenant_id: string
          throughput?: string | null
          uptime?: number
        }
        Update: {
          addr?: string
          client_count?: number
          id?: string
          last_seen?: string | null
          status?: string
          tenant_id?: string
          throughput?: string | null
          uptime?: number
        }
        Relationships: [
          {
            foreignKeyName: "relay_nodes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_tasks: {
        Row: {
          command: string
          created_at: string
          id: string
          result: string | null
          status: string
          target_id: string
          tenant_id: string
        }
        Insert: {
          command: string
          created_at?: string
          id?: string
          result?: string | null
          status?: string
          target_id: string
          tenant_id: string
        }
        Update: {
          command?: string
          created_at?: string
          id?: string
          result?: string | null
          status?: string
          target_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_commands: {
        Row: {
          category: string
          command: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          command: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          command?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_tasks: {
        Row: {
          command: string
          created_at: string
          created_by: string
          cron_expression: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          target_ids: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          command: string
          created_at?: string
          created_by: string
          cron_expression: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          target_ids?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          command?: string
          created_at?: string
          created_by?: string
          cron_expression?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          target_ids?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      server_announcements: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          tenant_id: string
          title: string
          type: string
          user_id: string
          version: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          tenant_id: string
          title: string
          type?: string
          user_id: string
          version?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          api_key: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_join_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      chat_channel_tenant: { Args: { _channel_id: string }; Returns: string }
      cleanup_stale_sessions: { Args: never; Returns: undefined }
      create_organization: {
        Args: { org_name: string }
        Returns: {
          name: string
          tenant_id: string
        }[]
      }
      create_team_channel: {
        Args: { _description?: string; _name: string }
        Returns: string
      }
      detect_offline_devices: { Args: never; Returns: undefined }
      get_or_create_dm_channel: {
        Args: { _other_user: string }
        Returns: string
      }
      get_tenant_api_key: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      is_chat_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      list_tenant_members: {
        Args: never
        Returns: {
          email: string
          role: string
          user_id: string
        }[]
      }
      log_audit_event: {
        Args: {
          _action: string
          _actor_id: string
          _entity_id?: string
          _entity_type: string
          _metadata?: Json
          _tenant_id: string
        }
        Returns: undefined
      }
      notify_tenant_admins: {
        Args: {
          _category: string
          _message: string
          _tenant_id: string
          _title: string
          _type?: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _category: string
          _message: string
          _tenant_id: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      reject_join_request: { Args: { _request_id: string }; Returns: undefined }
      request_join_organization: {
        Args: { _message?: string; _tenant_id: string }
        Returns: string
      }
      search_organizations: {
        Args: { search_text: string }
        Returns: {
          has_pending_request: boolean
          member_count: number
          name: string
          tenant_id: string
        }[]
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
