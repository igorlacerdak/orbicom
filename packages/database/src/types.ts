export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          document: string;
          state_registration: string;
          phone: string;
          address: string;
          zip_code: string;
          city: string;
          state: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          document: string;
          state_registration?: string;
          phone: string;
          address: string;
          zip_code: string;
          city: string;
          state: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          document: string;
          state_registration: string;
          phone: string;
          address: string;
          zip_code: string;
          city: string;
          state: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          document: string;
          state_registration?: string;
          phone: string;
          address: string;
          zip_code: string;
          city: string;
          state: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          owner_id: string;
          quote_number: string;
          issue_date: string;
          company_id: string;
          client_id: string;
          discount_type: "fixed" | "percent";
          discount_value: number;
          freight: number;
          tax_rate: number;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total: number;
          notes: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          quote_number: string;
          issue_date: string;
          company_id: string;
          client_id: string;
          discount_type: "fixed" | "percent";
          discount_value: number;
          freight: number;
          tax_rate: number;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total: number;
          notes: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
        Relationships: [];
      };
      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          code: string;
          name: string;
          unit: "UN" | "KG" | "TON";
          quantity: number;
          unit_price: number;
          line_total: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          code: string;
          name: string;
          unit: "UN" | "KG" | "TON";
          quantity: number;
          unit_price: number;
          line_total: number;
          position: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quote_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
