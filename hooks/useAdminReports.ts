
import { useState, useEffect, useCallback } from 'react';
import { reportService, ReportWithDetails } from '@/services/reportService';
import { Alert } from 'react-native';

export const useAdminReports = () => {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await reportService.getPendingReports();
      if (error) {
        console.error('Error loading reports:', error);
        Alert.alert('Error', 'Failed to load reports');
      } else {
        setReports(data);
      }
    } catch (error) {
      console.error('Unexpected error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleReportAction = useCallback(async (
    reportId: string, 
    action: 'resolve' | 'dismiss', 
    adminId: string
  ) => {
    try {
      const status = action === 'resolve' ? 'resolved' : 'dismissed';
      const { error } = await reportService.updateReportStatus(reportId, status, adminId);
      
      if (error) {
        Alert.alert('Error', `Failed to ${action} report`);
      } else {
        setReports(prev => prev.filter(r => r.id !== reportId));
        Alert.alert('Success', `Report ${action}d successfully`);
      }
    } catch (error) {
      console.error(`Error ${action}ing report:`, error);
      Alert.alert('Error', `Failed to ${action} report`);
    }
  }, []);

  return {
    reports,
    loading,
    loadReports,
    handleReportAction,
  };
};
