import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Report = Database['public']['Tables']['reports']['Row'];
type ReportInsert = Database['public']['Tables']['reports']['Insert'];

export const reportService = {
  // Get all pending reports with manual joins to avoid FK issues
  async getPendingReports() {
    try {
      // First get the reports
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reportsError) {
        return { data: null, error: reportsError };
      }

      if (!reports || reports.length === 0) {
        return { data: [], error: null };
      }

      // Get unique deal IDs and reporter IDs
      const dealIds = [...new Set(reports.filter(r => r.target_type === 'deal').map(r => r.target_id))];
      const reporterIds = [...new Set(reports.map(r => r.reporter_id))];

      // Fetch deals and users separately
      const [dealsResult, usersResult] = await Promise.all([
        dealIds.length > 0 ? supabase
          .from('deals')
          .select('id, title, description, price, original_price, created_at, status')
          .in('id', dealIds) : { data: [], error: null },
        
        reporterIds.length > 0 ? supabase
          .from('users')
          .select('id, username, email, role')
          .in('id', reporterIds) : { data: [], error: null }
      ]);

      if (dealsResult.error || usersResult.error) {
        return { data: null, error: dealsResult.error || usersResult.error };
      }

      // Create lookup maps
      const dealsMap = new Map(dealsResult.data?.map(deal => [deal.id, deal]) || []);
      const usersMap = new Map(usersResult.data?.map(user => [user.id, user]) || []);

      // Combine the data
      const enrichedReports = reports.map(report => ({
        ...report,
        deal: report.target_type === 'deal' ? dealsMap.get(report.target_id) || null : null,
        reporter: usersMap.get(report.reporter_id) || null
      }));

      return { data: enrichedReports, error: null };
    } catch (err) {
      console.error('Error fetching pending reports:', err);
      return { data: null, error: err };
    }
  },

  // Get all reports (for admin)
  async getAllReports() {
    try {
      // First get the reports
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) {
        return { data: null, error: reportsError };
      }

      if (!reports || reports.length === 0) {
        return { data: [], error: null };
      }

      // Get unique deal IDs and reporter IDs
      const dealIds = [...new Set(reports.filter(r => r.target_type === 'deal').map(r => r.target_id))];
      const reporterIds = [...new Set(reports.map(r => r.reporter_id))];

      // Fetch deals and users separately
      const [dealsResult, usersResult] = await Promise.all([
        dealIds.length > 0 ? supabase
          .from('deals')
          .select('id, title, description, price, original_price, created_at, status')
          .in('id', dealIds) : { data: [], error: null },
        
        reporterIds.length > 0 ? supabase
          .from('users')
          .select('id, username, email, role')
          .in('id', reporterIds) : { data: [], error: null }
      ]);

      if (dealsResult.error || usersResult.error) {
        return { data: null, error: dealsResult.error || usersResult.error };
      }

      // Create lookup maps
      const dealsMap = new Map(dealsResult.data?.map(deal => [deal.id, deal]) || []);
      const usersMap = new Map(usersResult.data?.map(user => [user.id, user]) || []);

      // Combine the data
      const enrichedReports = reports.map(report => ({
        ...report,
        deal: report.target_type === 'deal' ? dealsMap.get(report.target_id) || null : null,
        reporter: usersMap.get(report.reporter_id) || null
      }));

      return { data: enrichedReports, error: null };
    } catch (err) {
      console.error('Error fetching all reports:', err);
      return { data: null, error: err };
    }
  },

  // Create a new report
  async createReport(reportData: ReportInsert) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Error creating report:', err);
      return { data: null, error: err };
    }
  },

  // Update report status
  async updateReportStatus(reportId: string, status: 'pending' | 'resolved' | 'dismissed', adminNotes?: string) {
    try {
      const updateData: any = { 
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };
      
      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { data, error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Error updating report status:', err);
      return { data: null, error: err };
    }
  },

  // Get reports for a specific deal
  async getReportsForDeal(dealId: string) {
    try {
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('target_id', dealId)
        .eq('target_type', 'deal')
        .order('created_at', { ascending: false });

      if (reportsError) {
        return { data: null, error: reportsError };
      }

      if (!reports || reports.length === 0) {
        return { data: [], error: null };
      }

      // Get reporter information
      const reporterIds = [...new Set(reports.map(r => r.reporter_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, role')
        .in('id', reporterIds);

      if (usersError) {
        return { data: null, error: usersError };
      }

      const usersMap = new Map(users?.map(user => [user.id, user]) || []);

      const enrichedReports = reports.map(report => ({
        ...report,
        reporter: usersMap.get(report.reporter_id) || null
      }));

      return { data: enrichedReports, error: null };
    } catch (err) {
      console.error('Error fetching reports for deal:', err);
      return { data: null, error: err };
    }
  },

  // Delete a report (admin only)
  async deleteReport(reportId: string) {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      return { error };
    } catch (err) {
      console.error('Error deleting report:', err);
      return { error: err };
    }
  }
};