export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; callsign: string; created_at: string };
        Insert: { id: string; callsign: string; created_at?: string };
        Update: { callsign?: string };
        Relationships: [];
      };
      saves: {
        Row: { id: string; user_id: string; slot: number; payload: unknown; updated_at: string };
        Insert: { id?: string; user_id: string; slot?: number; payload: unknown; updated_at?: string };
        Update: { payload?: unknown; updated_at?: string; slot?: number };
        Relationships: [];
      };
      economy_ledger: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          amount: number;
          reason: string;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          amount: number;
          reason: string;
          balance_after: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      owned_properties: {
        Row: { user_id: string; property_id: string; purchased_at: string };
        Insert: { user_id: string; property_id: string; purchased_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      inventory_items: {
        Row: { id: string; user_id: string; item_id: string; quantity: number };
        Insert: { id?: string; user_id: string; item_id: string; quantity: number };
        Update: { quantity?: number };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
