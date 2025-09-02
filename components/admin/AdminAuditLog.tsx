import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Search, Activity, Shield, Eye, Trash2, User } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_id: string;
  admin_username: string;
  details: any;
  created_at: string;
  description?: string;
}

export default function AdminAuditLog() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      // Load recent admin activities from backend API
      let activities: AuditLog[] = [];
      // Load real audit logs from backend
      try {
        const res = await fetch('http://localhost:3000/api/audit_logs');
        if (res.ok) {
          const realAuditLogs = await res.json();
          realAuditLogs.forEach((log: any) => {
            activities.push({
              id: log.id,
              action: log.action,
              entity_type: log.entity_type,
              entity_id: log.entity_id,
              admin_id: log.admin_id,
              admin_username: log.admin_username || 'Unknown Admin',
              details: log.details || {},
              created_at: log.created_at,
              description: log.description || `${log.action} performed on ${log.entity_type}`,
            });
          });
        }
      } catch (err) {
        console.log('Audit logs API may not exist yet:', err);
      }
      // Track deal moderation activities
      try {
        const res = await fetch('http://localhost:3000/api/deals?status!=active');
        if (res.ok) {
          const dealUpdates = await res.json();
          dealUpdates.forEach((deal: any) => {
            activities.push({
              id: `deal_${deal.id}`,
              action: `deal_${deal.status}`,
              entity_type: 'deal',
              entity_id: deal.id,
              admin_id: profile?.id || 'system',
              admin_username: profile?.username || 'System',
              details: { 
                deal_title: deal.title,
                status: deal.status,
                user_id: deal.created_by
              },
              created_at: deal.updated_at,
              description: `Deal "${deal.title}" was ${deal.status}`,
            });
          });
        }
      } catch (err) {
        console.log('Could not load deal activities:', err);
      }
      // Sort activities by date
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(activities);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      Alert.alert('Error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'user_banned':
        return <Shield size={16} color="#ef4444" />;
      case 'user_verified':
        return <Shield size={16} color="#10b981" />;
      case 'deal_approved':
        return <Eye size={16} color="#10b981" />;
      case 'deal_rejected':
        return <Trash2 size={16} color="#ef4444" />;
      default:
        return <User size={16} color="#64748b" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.admin_username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderLogItem = ({ item }: { item: AuditLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.actionContainer}>
          {getActionIcon(item.action)}
          <Text style={styles.actionText}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
        <Text style={styles.timestampText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <Text style={styles.descriptionText}>
        {item.description || `${item.action} on ${item.entity_type}`}
      </Text>
      
      <View style={styles.logFooter}>
        <Text style={styles.adminText}>By: {item.admin_username}</Text>
        <Text style={styles.entityText}>
          {item.entity_type}: {item.entity_id.substring(0, 8)}...
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Activity size={24} color="#4f46e5" />
        <Text style={styles.title}>Audit Log</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredLogs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Activity size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No audit logs found</Text>
            <Text style={styles.emptySubtext}>Admin activities will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 8,
    color: '#1e293b',
  },
  listContainer: {
    paddingBottom: 20,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  timestampText: {
    fontSize: 12,
    color: '#64748b',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  entityText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});