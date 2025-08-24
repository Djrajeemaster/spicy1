import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { reportService } from '@/services/reportService';
import { dealService } from '@/services/dealService';
import { Database } from '@/types/database';
import { supabase } from '@/lib/supabase';

type Report = Database['public']['Tables']['reports']['Row'];
type Deal = Database['public']['Tables']['deals']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export default function ReportManagement() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<(Report & { deal?: Deal | null; reporter?: User | null })[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await reportService.getPendingReports();
      if (error) throw error;

      const hydrated = await Promise.all(
        (data || []).map(async (r) => {
          const [dealRes, userRes] = await Promise.all([
            supabase.from('deals').select('*').eq('id', r.target_id).single(),
            supabase.from('users').select('*').eq('id', r.reporter_id).single()
          ]);
          return {
            ...r,
            deal: dealRes.data ?? null,
            reporter: userRes.data ?? null,
          };
        })
      );
      setReports(hydrated);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const markReviewed = async (id: string) => {
    const { error } = await reportService.updateReportStatus(id, 'reviewed');
    if (error) Alert.alert('Error', 'Could not update report status');
    else refresh();
  };

  const archiveDeal = async (dealId: string, reportId: string) => {
    const { error } = await dealService.updateDeal(dealId, { status: 'archived' } as any);
    if (error) {
      Alert.alert('Error', 'Could not archive deal');
      return;
    }
    await reportService.updateReportStatus(reportId, 'resolved');
    refresh();
  };

  const banUser = async (userId: string, reportId: string) => {
    const { error } = await supabase.from('users').update({ status: 'banned' } as any).eq('id', userId);
    if (error) {
      Alert.alert('Error', 'Could not ban user');
      return;
    }
    await reportService.updateReportStatus(reportId, 'resolved');
    refresh();
  };

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ textAlign: 'center', marginTop: 8, color: '#475569' }}>Loading reports…</Text>
      </View>
    );
  }

  if (!reports.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ textAlign: 'center', color: '#475569', fontWeight: '700' }}>No pending reports</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      {reports.map((r) => (
        <View key={r.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 4 }}>
            {r.deal?.title || '(deal not found)'}
          </Text>
          <Text style={{ color: '#64748b', marginBottom: 4 }}>Report ID: {r.id}</Text>
          <Text style={{ color: '#64748b', marginBottom: 4 }}>Reason: {r.reason}</Text>
          {!!r.description && <Text style={{ color: '#334155', marginBottom: 8 }}>“{r.description}”</Text>}
          <Text style={{ color: '#64748b', marginBottom: 8 }}>Reported by: {r.reporter?.username || r.reporter_id}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => markReviewed(r.id)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 10, marginBottom: 8 }}>
              <Text style={{ color: '#334155', fontWeight: '700' }}>Mark Reviewed</Text>
            </TouchableOpacity>
            {r.deal?.id && (
              <TouchableOpacity onPress={() => archiveDeal(r.deal!.id.toString(), r.id)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f59e0b', marginRight: 10, marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Archive Deal</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => banUser(r.reporter_id, r.id)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#ef4444', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Ban User</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
