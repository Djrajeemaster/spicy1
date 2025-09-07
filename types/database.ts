export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: string;
          is_verified_business: boolean | null;
          join_date: string | null;
          status: string | null;
          reputation: number | null;
          total_posts: number | null;
          avatar_url: string | null;
          location: string | null;
          created_at: string | null;
          updated_at: string | null;
          is_banned: boolean | null;
          ban_expiry: string | null;
          suspend_expiry: string | null;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: string;
          is_verified_business?: boolean | null;
          join_date?: string | null;
          status?: string | null;
          reputation?: number | null;
          total_posts?: number | null;
          avatar_url?: string | null;
          location?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          is_banned?: boolean | null;
          ban_expiry?: string | null;
          suspend_expiry?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          role?: string;
          is_verified_business?: boolean | null;
          join_date?: string | null;
          status?: string | null;
          reputation?: number | null;
          total_posts?: number | null;
          avatar_url?: string | null;
          location?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          is_banned?: boolean | null;
          ban_expiry?: string | null;
          suspend_expiry?: string | null;
        };
      };
      deals: {
        Row: {
          id: string;
          title: string;
          description: string;
          price: number;
          original_price: number | null;
          discount_percentage: number | null;
          category_id: string;
          store_id: string;
          tags: string[] | null;
          deal_url: string | null;
          coupon_code: string | null;
          images: string[] | null;
          city: string;
          state: string;
          country: string | null;
          is_online: boolean | null;
          start_date: string | null;
          expiry_date: string | null;
          status: string | null;
          created_by: string;
          votes_up: number | null;
          votes_down: number | null;
          comment_count: number | null;
          view_count: number | null;
          click_count: number | null;
          save_count: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          price: number;
          original_price?: number | null;
          discount_percentage?: number | null;
          category_id: string;
          store_id: string;
          tags?: string[] | null;
          deal_url?: string | null;
          coupon_code?: string | null;
          images?: string[] | null;
          city: string;
          state: string;
          country?: string | null;
          is_online?: boolean | null;
          start_date?: string | null;
          expiry_date?: string | null;
          status?: string | null;
          created_by: string;
          votes_up?: number | null;
          votes_down?: number | null;
          comment_count?: number | null;
          view_count?: number | null;
          click_count?: number | null;
          save_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          original_price?: number | null;
          discount_percentage?: number | null;
          category_id?: string;
          store_id?: string;
          tags?: string[] | null;
          deal_url?: string | null;
          coupon_code?: string | null;
          images?: string[] | null;
          city?: string;
          state?: string;
          country?: string | null;
          is_online?: boolean | null;
          start_date?: string | null;
          expiry_date?: string | null;
          status?: string | null;
          created_by?: string;
          votes_up?: number | null;
          votes_down?: number | null;
          comment_count?: number | null;
          view_count?: number | null;
          click_count?: number | null;
          save_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          emoji: string;
          is_active: boolean | null;
          deal_count: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          emoji: string;
          is_active?: boolean | null;
          deal_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          emoji?: string;
          is_active?: boolean | null;
          deal_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          description: string | null;
          website_url: string | null;
          verified: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          description?: string | null;
          website_url?: string | null;
          verified?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          description?: string | null;
          website_url?: string | null;
          verified?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string;
          reported_content_id: string | null;
          content_type: string | null;
          reason: string;
          description: string | null;
          status: string;
          admin_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id: string;
          reported_content_id?: string | null;
          content_type?: string | null;
          reason: string;
          description?: string | null;
          status?: string;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string;
          reported_content_id?: string | null;
          content_type?: string | null;
          reason?: string;
          description?: string | null;
          status?: string;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      affiliate_settings: {
        Row: {
          id: string;
          store_name: string;
          country_code: string;
          affiliate_id: string | null;
          affiliate_tag: string | null;
          commission_rate: number | null;
          tracking_template: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          store_name: string;
          country_code?: string;
          affiliate_id?: string | null;
          affiliate_tag?: string | null;
          commission_rate?: number | null;
          tracking_template?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          store_name?: string;
          country_code?: string;
          affiliate_id?: string | null;
          affiliate_tag?: string | null;
          commission_rate?: number | null;
          tracking_template?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
      };
      saved_deals: {
        Row: {
          id: string;
          user_id: string;
          deal_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deal_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          deal_id?: string;
          created_at?: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
          expires_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
          expires_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          content: string;
          parent_id?: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          user_id: string;
          content: string;
          parent_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          content?: string;
          parent_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id?: string;
          reported_deal_id?: string;
          reported_comment_id?: string;
          type: string;
          reason: string;
          description?: string;
          status: string;
          created_at: string;
          resolved_at?: string;
          resolved_by?: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string;
          reported_deal_id?: string;
          reported_comment_id?: string;
          type?: string;
          reason?: string;
          description?: string;
          status?: string;
          created_at?: string;
          resolved_at?: string;
          resolved_by?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string;
          reported_deal_id?: string;
          reported_comment_id?: string;
          type?: string;
          reason?: string;
          description?: string;
          status?: string;
          created_at?: string;
          resolved_at?: string;
          resolved_by?: string;
        };
      };
      user_activities: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          description: string;
          metadata?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type?: string;
          description?: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          description?: string;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
}