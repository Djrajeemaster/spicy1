// services/reportService.ts
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Report = Database['public']['Tables']['reports']['Row'];
type ReportInsert = Database['public']['Tables']['reports']['Insert'];
type ReportUpdate = Database['public']['Tables']['reports']['Update'];

export type ReportReason =
  | 'spam'
  | 'expired'
  | 'misleading'
  | 'offensive'
  | 'duplicate'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

class ReportService {
  async createReport(params: {
    reporter_id: string;
    target_type: 'deal';
    target_id: string;
    reason: ReportReason;
    description?: string | null;
  }): Promise<{ data: Report | null; error: any }> {
    try {
      const payload: ReportInsert = {
        reporter_id: params.reporter_id,
        target_type: params.target_type,
        target_id: params.target_id,
        reason: params.reason,
        description: params.description || null,
        status: 'pending',
      };
      const { data, error } = await supabase
        .from('reports')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('createReport error', error);
      return { data: null, error };
    }
  }

  async getPendingReports(): Promise<{ data: Report[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('getPendingReports error', error);
      return { data: [], error };
    }
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus
  ): Promise<{ data: Report | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({ status } satisfies ReportUpdate)
        .eq('id', reportId)
        .select('*')
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('updateReportStatus error', error);
      return { data: null, error };
    }
  }
}

export const reportService = new ReportService();
