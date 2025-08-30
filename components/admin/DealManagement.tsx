import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AdminDeal } from '@/hooks/useAdminData';
import { CircleCheck as CheckCircle, Circle as XCircle, Flag, Edit2 } from 'lucide-react-native';
import { router } from 'expo-router';

interface DealManagementProps {
  deals: AdminDeal[];
  onDealAction: (dealId: string, action: 'Approve' | 'Reject') => void;
}

const DealItem: React.FC<{ deal: AdminDeal; onDealAction: (dealId: string, action: 'Approve' | 'Reject') => void }> = ({ deal, onDealAction }) => (
  <View style={dealStyles.dealCard}>
    <View style={dealStyles.dealInfo}>
      <Text style={dealStyles.dealTitle}>{deal.title}</Text>
      <Text style={dealStyles.dealMeta}>
        {deal.created_by_user?.username || 'Unknown'} • {deal.category?.name || 'Unknown'} • {deal.store?.name || 'Unknown'}
      </Text>
      <Text style={dealStyles.dealPrice}>
        ${deal.price}{deal.original_price ? ` (was $${deal.original_price})` : ''}
      </Text>
    </View>
    <View style={dealStyles.dealActions}>
      <TouchableOpacity 
        onPress={() => router.push(`/edit-deal/${deal.id}`)} 
        style={[dealStyles.actionButton, dealStyles.editButton]}
      >
        <Edit2 size={18} color="#3b82f6" />
      </TouchableOpacity>
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
  dealPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  dealActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
});
