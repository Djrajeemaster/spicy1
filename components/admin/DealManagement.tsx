import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AdminDeal } from '@/hooks/useAdminData';
import { CircleCheck as CheckCircle, Circle as XCircle, Flag } from 'lucide-react-native';

interface DealManagementProps {
  deals: AdminDeal[];
  onDealAction: (dealId: string, action: 'Approve' | 'Reject') => void;
}

const DealItem: React.FC<{ deal: AdminDeal; onDealAction: (dealId: string, action: 'Approve' | 'Reject') => void }> = ({ deal, onDealAction }) => (
  <View style={dealStyles.dealCard}>
    <View style={dealStyles.dealInfo}>
      <Text style={dealStyles.dealTitle}>{deal.title}</Text>
      <Text style={dealStyles.dealMeta}>
        {deal.created_by_user?.username || 'Unknown'} • {deal.category?.name || 'Unknown'}
      </Text>
    </View>
    <View style={dealStyles.dealActions}>
      {deal.flagged && (
        <View style={dealStyles.flaggedBadge}>
          <Flag size={16} color="#ef4444" />
          <Text style={dealStyles.flaggedText}>{deal.reportCount}</Text>
        </View>
      )}
      <TouchableOpacity onPress={() => onDealAction(deal.id, 'Approve')} style={dealStyles.actionButton}>
        <CheckCircle size={20} color="#10b981" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDealAction(deal.id, 'Reject')} style={dealStyles.actionButton}>
        <XCircle size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  </View>
);

export const DealManagement: React.FC<DealManagementProps> = ({ deals, onDealAction }) => {
  return (
    <View style={dealStyles.container}>
      <Text style={dealStyles.headerTitle}>Pending Deals ({deals.length})</Text>
      <FlatList
        data={deals}
        renderItem={({ item }) => <DealItem deal={item} onDealAction={onDealAction} />}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dealStyles.listContent}
      />
    </View>
  );
};

const dealStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dealInfo: {
    flex: 1,
    marginRight: 10,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  dealMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  dealActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flaggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  flaggedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
});
