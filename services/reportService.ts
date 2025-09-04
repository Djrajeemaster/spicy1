
import { Database } from '@/types/database';
import { apiClient } from '@/utils/apiClient';

type Report = Database['public']['Tables']['reports']['Row'];
type ReportInsert = Database['public']['Tables']['reports']['Insert'];

export const reportService = {
  // Get all pending reports
  async getPendingReports() {
    try {
      const data = await apiClient.get('/reports?status=pending');
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching pending reports:', err);
      return { data: null, error: err };
    }
  },

  // Get all reports (for admin)
  async getAllReports() {
    try {
      const data = await apiClient.get('/reports');
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching all reports:', err);
      return { data: null, error: err };
    }
  },

  // Create a new report
  async createReport(reportData: ReportInsert) {
    try {
      const data = await apiClient.post('/reports', reportData);
      return { data, error: null };
    } catch (err) {
      console.error('Error creating report:', err);
      return { data: null, error: err };
    }
  },

  // Update report status
  async updateReportStatus(reportId: string, status: 'pending' | 'resolved' | 'dismissed', adminNotes?: string) {
    try {
      const data = await apiClient.put(`/reports/${reportId}`, { status, adminNotes });
      return { data, error: null };
    } catch (err) {
      console.error('Error updating report status:', err);
      return { data: null, error: err };
    }
  },

  // Get reports for a specific deal
  async getReportsForDeal(dealId: string) {
    try {
      const data = await apiClient.get(`/reports/deal/${dealId}`);
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching reports for deal:', err);
      return { data: null, error: err };
    }
  },

  // Delete a report (admin only)
  async deleteReport(reportId: string) {
    try {
      await apiClient.delete(`/reports/${reportId}`);
      return { error: null };
    } catch (err) {
      console.error('Error deleting report:', err);
      return { error: err };
    }
  }
};
