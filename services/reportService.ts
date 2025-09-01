
import { Database } from '@/types/database';

type Report = Database['public']['Tables']['reports']['Row'];
type ReportInsert = Database['public']['Tables']['reports']['Insert'];

export const reportService = {
  // Get all pending reports
  async getPendingReports() {
    try {
      const response = await fetch('http://localhost:3000/api/reports?status=pending', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch pending reports');
      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching pending reports:', err);
      return { data: null, error: err };
    }
  },

  // Get all reports (for admin)
  async getAllReports() {
    try {
      const response = await fetch('http://localhost:3000/api/reports', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch all reports');
      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching all reports:', err);
      return { data: null, error: err };
    }
  },

  // Create a new report
  async createReport(reportData: ReportInsert) {
    try {
      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to create report');
      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating report:', err);
      return { data: null, error: err };
    }
  },

  // Update report status
  async updateReportStatus(reportId: string, status: 'pending' | 'resolved' | 'dismissed', adminNotes?: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update report status');
      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.error('Error updating report status:', err);
      return { data: null, error: err };
    }
  },

  // Get reports for a specific deal
  async getReportsForDeal(dealId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/reports/deal/${dealId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch reports for deal');
      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching reports for deal:', err);
      return { data: null, error: err };
    }
  },

  // Delete a report (admin only)
  async deleteReport(reportId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete report');
      return { error: null };
    } catch (err) {
      console.error('Error deleting report:', err);
      return { error: err };
    }
  }
};