import { dealService } from '@/services/dealService';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { reportService } from '@/services/reportService';

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reporter_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  deal?: {
    id: string;
    title: string;
    description?: string;
    price?: number;
    original_price?: number;
    created_at: string;
    status: string;
  } | null;
  reporter?: {
    id: string;
    username?: string;
    email?: string;
    role?: string;
  } | null;
}

export default function ReportManagement() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await reportService.getPendingReports();
      
      if (fetchError) {
        console.error('Error fetching reports:', fetchError);
        setError('Failed to load reports. Please try again.');
        setReports([]);
      } else {
        setReports(data || []);
      }
    } catch (e) {
      console.error('Unexpected error:', e);
      setError('An unexpected error occurred. Please try again.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const markReviewed = async (id: string) => {
    try {
      const { error } = await reportService.updateReportStatus(id, 'resolved');
      if (error) {
        Alert.alert('Error', 'Could not update report status');
      } else {
        Alert.alert('Success', 'Report marked as reviewed');
        refresh();
      }
    } catch (e) {
      console.error('Error marking report as reviewed:', e);
      Alert.alert('Error', 'Could not update report status');
    }
  };

  const archiveDeal = async (dealId: string, reportId: string) => {
    try {
      const { error: dealError } = await dealService.updateDeal(dealId, { status: 'archived' } as any);
      if (dealError) {
        Alert.alert('Error', 'Could not archive deal');
        return;
      }
      
      const { error: reportError } = await reportService.updateReportStatus(reportId, 'resolved', 'Deal archived');
      if (reportError) {
        console.error('Error updating report status:', reportError);
        // Don't show error to user since deal was archived successfully
      }
      
      Alert.alert('Success', 'Deal archived and report resolved');
      refresh();
    } catch (e) {
      console.error('Error archiving deal:', e);
      Alert.alert('Error', 'Could not archive deal');
    }
  };

  const banUser = async (userId: string, reportId: string) => {
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({ status: 'banned' } as any)
        .eq('id', userId);
        
      if (userError) {
        Alert.alert('Error', 'Could not ban user');
        return;
      }
      
      const { error: reportError } = await reportService.updateReportStatus(reportId, 'resolved', 'User banned');
      if (reportError) {
        console.error('Error updating report status:', reportError);
        // Don't show error to user since user was banned successfully
      }
      
      Alert.alert('Success', 'User banned and report resolved');
      refresh();
    } catch (e) {
      console.error('Error banning user:', e);
      Alert.alert('Error', 'Could not ban user');
    }
  };

  const dismissReport = async (reportId: string) => {
    try {
      const { error } = await reportService.updateReportStatus(reportId, 'dismissed', 'Report dismissed by admin');
      if (error) {
        Alert.alert('Error', 'Could not dismiss report');
      } else {
        Alert.alert('Success', 'Report dismissed');
        refresh();
      }
    } catch (e) {
      console.error('Error dismissing report:', e);
      Alert.alert('Error', 'Could not dismiss report');
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ textAlign: 'center', marginTop: 8, color: '#475569' }}>Loading reports…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ textAlign: 'center', color: '#ef4444', fontWeight: '600', marginBottom: 16 }}>
          {error}
        </Text>
        <TouchableOpacity 
          onPress={refresh}
          style={{ 
            backgroundColor: '#6366f1', 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            borderRadius: 8 
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!reports.length) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ 
          textAlign: 'center', 
          color: '#10b981', 
          fontWeight: '700', 
          fontSize: 18,
          marginBottom: 8 
        }}>
          🎉 No pending reports
        </Text>
        <Text style={{ 
          textAlign: 'center', 
          color: '#64748b', 
          marginBottom: 16 
        }}>
          All reports have been reviewed. Great job keeping the community safe!
        </Text>
        <TouchableOpacity 
          onPress={refresh}
          style={{ 
            backgroundColor: '#f1f5f9', 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0'
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '600' }}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1e293b' }}>
          Pending Reports ({reports.length})
        </Text>
        <TouchableOpacity 
          onPress={refresh}
          style={{ 
            backgroundColor: '#f1f5f9', 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#e2e8f0'
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '600', fontSize: 12 }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {reports.map((r) => (
        <View 
          key={r.id} 
          style={{ 
            backgroundColor: '#fff', 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 12, 
            borderWidth: 1, 
            borderColor: '#e2e8f0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 4, color: '#1e293b' }}>
              {r.deal?.title || '(Deal not found)'}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 2 }}>
              Report ID: {r.id.slice(0, 8)}...
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 2 }}>
              Reason: <Text style={{ fontWeight: '600', color: '#ef4444' }}>{r.reason}</Text>
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>
              Reported by: <Text style={{ fontWeight: '600' }}>{r.reporter?.username || 'Unknown'}</Text>
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              Date: {new Date(r.created_at).toLocaleDateString()}
            </Text>
          </View>

          {r.description && (
            <View style={{ 
              backgroundColor: '#f8fafc', 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 12,
              borderLeftWidth: 3,
              borderLeftColor: '#6366f1'
            }}>
              <Text style={{ color: '#334155', fontStyle: 'italic' }}>"{r.description}"</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity 
              onPress={() => markReviewed(r.id)} 
              style={{ 
                paddingVertical: 8, 
                paddingHorizontal: 12, 
                borderRadius: 8, 
                backgroundColor: '#f1f5f9',
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <Text style={{ color: '#334155', fontWeight: '600', fontSize: 12 }}>Mark Reviewed</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => dismissReport(r.id)} 
              style={{ 
                paddingVertical: 8, 
                paddingHorizontal: 12, 
                borderRadius: 8, 
                backgroundColor: '#fef3c7',
                borderWidth: 1,
                borderColor: '#fbbf24'
              }}
            >
              <Text style={{ color: '#92400e', fontWeight: '600', fontSize: 12 }}>Dismiss</Text>
            </TouchableOpacity>

            {r.deal?.id && (
              <TouchableOpacity 
                onPress={() => archiveDeal(r.deal!.id, r.id)} 
                style={{ 
                  paddingVertical: 8, 
                  paddingHorizontal: 12, 
                  borderRadius: 8, 
                  backgroundColor: '#fed7aa',
                  borderWidth: 1,
                  borderColor: '#f59e0b'
                }}
              >
                                <Text style={{ color: '#9a3412', fontWeight: '600', fontSize: 12 }}>Archive Deal</Text>
              </TouchableOpacity>
            )}

            {r.reporter?.id && (
              <TouchableOpacity 
                onPress={() => banUser(r.reporter!.id, r.id)} 
                style={{ 
                  paddingVertical: 8, 
                  paddingHorizontal: 12, 
                  borderRadius: 8, 
                  backgroundColor: '#fecaca',
                  borderWidth: 1,
                  borderColor: '#ef4444'
                }}
              >
                <Text style={{ color: '#991b1b', fontWeight: '600', fontSize: 12 }}>Ban User</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}