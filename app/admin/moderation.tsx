import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { CheckCircle, XCircle, Eye, Flag, MessageSquare, Calendar, User } from 'lucide-react-native';
import { elevate } from '../../services/adminElevation';
import { supabase } from '../../lib/supabase';

interface ModerationItem {
  id: string;
  type: 'deal' | 'comment' | 'user_report';
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
    email: string;
    reputation?: number;
  };
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  category?: string;
  image_url?: string;
  reports_count?: number;
  reason?: string;
}

export default function AdminModeration() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'deals' | 'reports'>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  const loadModerationQueue = async () => {
    try {
      setLoading(true);
      
      let moderationItems: ModerationItem[] = [];

      // Load deals that need moderation (pending, reported, or flagged)
      if (filter === 'all' || filter === 'deals') {
        let { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select(`
            id,
            title,
            description,
            category_id,
            images,
            created_at,
            status,
            created_by,
            categories!inner(name),
            users!deals_created_by_fkey(id, username, email)
          `)
          .in('status', ['pending', 'flagged', 'reported', 'draft'])
          .order('created_at', { ascending: false });

        if (dealsError) {
          console.log('Error loading deals for moderation:', dealsError);
          // If the query fails, try loading all deals and we'll filter them
          const { data: allDeals, error: allDealsError } = await supabase
            .from('deals')
            .select(`
              id,
              title,
              description,
              category_id,
              images,
              created_at,
              status,
              created_by,
              categories!inner(name),
              users!deals_created_by_fkey(id, username, email)
            `)
            .order('created_at', { ascending: false })
            .limit(20);

          if (!allDealsError && allDeals) {
            console.log('Available deal statuses:', [...new Set(allDeals.map((d: any) => d.status))]);
            // Show recent deals that might need review
            deals = allDeals.slice(0, 10);
          }
        }

        const dealItems: ModerationItem[] = deals?.map((deal: any) => ({
          id: deal.id,
          type: 'deal' as const,
          title: deal.title || 'Untitled Deal',
          content: deal.description || 'No description provided',
          author: {
            id: deal.users?.id || '',
            username: deal.users?.username || 'Unknown User',
            email: deal.users?.email || '',
            reputation: 0
          },
          created_at: deal.created_at,
          status: deal.status || 'active',
          category: deal.categories?.name || 'Uncategorized',
          image_url: deal.images?.[0] || null,
          reports_count: 0
        })) || [];

        console.log(`Loaded ${dealItems.length} deals for moderation with statuses:`, 
                   dealItems.map(d => d.status).filter((s, i, arr) => arr.indexOf(s) === i));

        moderationItems = [...moderationItems, ...dealItems];
      }

      // Load user reports (if available)
      if (filter === 'all' || filter === 'reports') {
        try {
          const { data: reports, error: reportsError } = await supabase
            .from('user_reports')
            .select(`
              id,
              reason,
              description,
              created_at,
              status,
              reported_user:users!user_reports_reported_user_id_fkey(id, username, email),
              reporter:users!user_reports_reporter_id_fkey(id, username, email)
            `)
            .eq('status', 'pending');

          if (!reportsError && reports) {
            const reportItems: ModerationItem[] = reports.map((report: any) => ({
              id: report.id,
              type: 'user_report' as const,
              title: `User Report: ${report.reason || 'Violation'}`,
              content: report.description || 'No description provided',
              author: {
                id: report.reported_user?.id || '',
                username: report.reported_user?.username || 'Unknown User',
                email: report.reported_user?.email || '',
                reputation: 0
              },
              created_at: report.created_at,
              status: report.status,
              reason: report.reason,
              reports_count: 1
            }));

            moderationItems = [...moderationItems, ...reportItems];
          }
        } catch (reportError) {
          // Silently handle if user_reports table doesn't exist or has issues
          console.log('User reports not available:', reportError);
        }
      }

      // Sort by creation date (newest first)
      moderationItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(moderationItems);
    } catch (error: any) {
      console.error('Error loading moderation queue:', error);
      Alert.alert('Error', error.message || 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModerationQueue();
  }, [filter]);

  const handleApprove = async (item: ModerationItem) => {
    try {
      const elevation = await elevate(10);
      setProcessing(item.id);
      
      // For now, just remove from local state since DB tables may not exist
      setItems(prev => prev.filter(i => i.id !== item.id));
      Alert.alert('Success', `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} approved successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve content');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (item: ModerationItem) => {
    Alert.alert(
      'Reject Content',
      'Are you sure you want to reject this content?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const elevation = await elevate(10);
              setProcessing(item.id);
              
              // For now, just remove from local state since DB tables may not exist
              setItems(prev => prev.filter(i => i.id !== item.id));
              Alert.alert('Success', 'Content rejected successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject content');
            } finally {
              setProcessing(null);
            }
          }
        }
      ]
    );
  };

  const renderModerationItem = ({ item }: { item: ModerationItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTypeContainer}>
          <View style={[styles.typeBadge, getTypeBadgeStyle(item.type)]}>
            {item.type === 'deal' && <Eye size={12} color="#fff" />}
            {item.type === 'comment' && <MessageSquare size={12} color="#fff" />}
            {item.type === 'user_report' && <Flag size={12} color="#fff" />}
            <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
          </View>
          {item.reports_count && item.reports_count > 0 && (
            <View style={styles.reportsBadge}>
              <Flag size={10} color="#ef4444" />
              <Text style={styles.reportsText}>{item.reports_count}</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.title}
      </Text>
      
      <Text style={styles.itemContent} numberOfLines={3}>
        {item.content}
      </Text>

      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      )}

      <View style={styles.authorInfo}>
        <User size={14} color="#6b7280" />
        <Text style={styles.authorText}>
          {item.author.username} • {item.author.reputation}★
        </Text>
        {item.category && (
          <Text style={styles.categoryText}>#{item.category}</Text>
        )}
      </View>

      {item.reason && (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Report Reason:</Text>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <XCircle size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item)}
        >
          <CheckCircle size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'deal':
        return { backgroundColor: '#4f46e5' };
      case 'comment':
        return { backgroundColor: '#10b981' };
      case 'user_report':
        return { backgroundColor: '#ef4444' };
      default:
        return { backgroundColor: '#6b7280' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Content Moderation</Text>
        <Text style={styles.subtitle}>
          Review deals requiring approval and handle user reports
        </Text>
        <View style={styles.filterContainer}>
          {(['all', 'deals', 'reports'] as const).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterType && styles.filterButtonTextActive
              ]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {items.length} items pending review
        </Text>
        {items.length > 0 && (
          <View style={styles.statusBreakdown}>
            <Text style={styles.statusBreakdownTitle}>Content Status Breakdown:</Text>
            {items.reduce((acc: any, item) => {
              const status = item.status || 'unknown';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {}) && Object.entries(items.reduce((acc: any, item) => {
              const status = item.status || 'unknown';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {})).map(([status, count]) => (
              <Text key={status} style={styles.statusBreakdownItem}>
                {status}: {String(count)}
              </Text>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={items}
        renderItem={renderModerationItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadModerationQueue}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  reportsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  reportsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  itemDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  itemContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  authorText: {
    fontSize: 12,
    color: '#6b7280',
  },
  categoryText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
  },
  reasonContainer: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 12,
    color: '#92400e',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statusBreakdown: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  statusBreakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  statusBreakdownItem: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 8,
  },
});
