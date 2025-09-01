import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { AdminDeal } from '@/hooks/useAdminData';
import { CircleCheck as CheckCircle, Circle as XCircle, Flag, Edit2, Trash2, Square, CheckSquare } from 'lucide-react-native';
import { router } from 'expo-router';

interface DealManagementProps {
  deals: AdminDeal[];
  onDealAction: (dealId: string, action: 'Approve' | 'Reject' | 'Delete') => void;
}

const DealItem: React.FC<{ 
  deal: AdminDeal; 
  onDealAction: (dealId: string, action: 'Approve' | 'Reject' | 'Delete') => void;
  isSelected: boolean;
  onSelect: (dealId: string) => void;
}> = ({ deal, onDealAction, isSelected, onSelect }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'flagged': return '#dc2626';
      default: return '#64748b';
    }
  };

  return (
    <View style={dealStyles.dealCard}>
      <TouchableOpacity onPress={() => onSelect(deal.id)} style={dealStyles.checkbox}>
        {isSelected ? <CheckSquare size={20} color="#6366f1" /> : <Square size={20} color="#64748b" />}
      </TouchableOpacity>
      <View style={dealStyles.dealInfo}>
        <Text style={dealStyles.dealTitle}>{deal.title}</Text>
        <Text style={dealStyles.dealMeta}>
          {deal.created_by_user?.username || 'Unknown'} • {deal.category?.name || 'Unknown'} • {deal.store?.name || 'Unknown'}
        </Text>
        <Text style={dealStyles.dealPrice}>
          ${deal.price}{deal.original_price ? ` (was $${deal.original_price})` : ''}
        </Text>
        <View style={[dealStyles.statusBadge, { backgroundColor: getStatusColor(deal.status) }]}>
          <Text style={dealStyles.statusText}>{deal.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={dealStyles.dealActions}>
        <TouchableOpacity 
          onPress={() => router.push(`/edit-deal/${deal.id}`)} 
          style={[dealStyles.actionButton, dealStyles.editButton]}
        >
          <Edit2 size={18} color="#3b82f6" />
        </TouchableOpacity>
        {deal.status === 'pending' && (
          <TouchableOpacity onPress={() => onDealAction(deal.id, 'Approve')} style={dealStyles.actionButton}>
            <CheckCircle size={20} color="#10b981" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDealAction(deal.id, 'Reject')} style={dealStyles.actionButton}>
          <XCircle size={20} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDealAction(deal.id, 'Delete')} style={dealStyles.actionButton}>
          <Trash2 size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const DealManagement: React.FC<DealManagementProps> = ({ deals, onDealAction }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'live' | 'rejected' | 'flagged'>('all');
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [allDeals, setAllDeals] = useState<AdminDeal[]>([]);

  useEffect(() => {
    fetchAllDeals();
  }, []);

  const fetchAllDeals = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/deals', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAllDeals(data);
      }
    } catch (error) {
      console.error('Error fetching all deals:', error);
    }
  };

  const filteredDeals = filter === 'all' ? allDeals : allDeals.filter(deal => deal.status === filter);

  const handleSelectDeal = (dealId: string) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDeals.length === filteredDeals.length) {
      setSelectedDeals([]);
    } else {
      setSelectedDeals(filteredDeals.map(deal => deal.id));
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject' | 'delete') => {
    if (selectedDeals.length === 0) {
      Alert.alert('No Selection', 'Please select deals to perform bulk action.');
      return;
    }

    const actionText = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'delete';
    Alert.alert(
      'Confirm Bulk Action',
      `Are you sure you want to ${actionText} ${selectedDeals.length} deal(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            selectedDeals.forEach(dealId => {
              if (action === 'approve') onDealAction(dealId, 'Approve');
              else if (action === 'reject') onDealAction(dealId, 'Reject');
              else onDealAction(dealId, 'Delete');
            });
            setSelectedDeals([]);
            setTimeout(fetchAllDeals, 500);
          }
        }
      ]
    );
  };

  return (
    <View style={dealStyles.container}>
      <Text style={dealStyles.headerTitle}>Deal Management ({filteredDeals.length})</Text>
      
      {/* Filter Tabs */}
      <View style={dealStyles.filterTabs}>
        {['all', 'pending', 'live', 'rejected', 'flagged'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilter(status as any)}
            style={[dealStyles.filterTab, filter === status && dealStyles.activeFilterTab]}
          >
            <Text style={[dealStyles.filterTabText, filter === status && dealStyles.activeFilterTabText]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bulk Actions */}
      {selectedDeals.length > 0 && (
        <View style={dealStyles.bulkActions}>
          <TouchableOpacity onPress={handleSelectAll} style={dealStyles.selectAllButton}>
            <Text style={dealStyles.selectAllText}>
              {selectedDeals.length === filteredDeals.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <View style={dealStyles.bulkActionButtons}>
            <TouchableOpacity onPress={() => handleBulkAction('approve')} style={[dealStyles.bulkButton, dealStyles.approveButton]}>
              <Text style={dealStyles.bulkButtonText}>Approve ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBulkAction('reject')} style={[dealStyles.bulkButton, dealStyles.rejectButton]}>
              <Text style={dealStyles.bulkButtonText}>Reject ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBulkAction('delete')} style={[dealStyles.bulkButton, dealStyles.deleteButton]}>
              <Text style={dealStyles.bulkButtonText}>Delete ({selectedDeals.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filteredDeals}
        renderItem={({ item }) => (
          <DealItem 
            deal={item} 
            onDealAction={(dealId, action) => {
              onDealAction(dealId, action);
              setTimeout(fetchAllDeals, 500);
            }}
            isSelected={selectedDeals.includes(item.id)}
            onSelect={handleSelectDeal}
          />
        )}
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
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#6366f1',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterTabText: {
    color: '#ffffff',
  },
  bulkActions: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectAllButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
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
