import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminDeal } from '@/hooks/useAdminData';
import { CircleCheck as CheckCircle, Circle as XCircle, Flag, Edit2, Trash2, Square, CheckSquare } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiClient } from '@/utils/apiClient';

interface DealManagementProps {
  deals: AdminDeal[];
  onDealAction: (dealId: string, action: 'Approve' | 'Reject' | 'Delete') => Promise<void>;
}

const DealItem: React.FC<{ 
  deal: AdminDeal; 
  onDealAction: (dealId: string, action: 'Approve' | 'Reject' | 'Delete') => void;
  isSelected: boolean;
  onSelect: (dealId: string) => void;
}> = ({ deal, onDealAction, isSelected, onSelect }) => {
  
  const handleAction = async (action: 'Approve' | 'Reject' | 'Delete') => {
    const actionText = action.toLowerCase();
    if (window.confirm(`Are you sure you want to ${actionText} "${deal.title}"?`)) {
      console.log('Executing action:', action, 'for deal:', deal.id);
      try {
        await onDealAction(deal.id, action);
        console.log('Action completed successfully');
      } catch (error) {
        console.error('Action failed:', error);
        window.alert(`Failed to ${actionText} deal`);
      }
    }
  };
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
        <View style={[dealStyles.statusBadge, { backgroundColor: getStatusColor(deal.status || 'unknown') }]}>
          <Text style={dealStyles.statusText}>{(deal.status || 'UNKNOWN').toUpperCase()}</Text>
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
          <TouchableOpacity onPress={() => handleAction('Approve')} style={dealStyles.actionButton}>
            <CheckCircle size={20} color="#10b981" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleAction('Reject')} style={dealStyles.actionButton}>
          <XCircle size={20} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleAction('Delete')} style={dealStyles.actionButton}>
          <Trash2 size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const DealManagement: React.FC<DealManagementProps> = ({ deals, onDealAction }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'live' | 'expired' | 'deleted' | 'flagged'>('all');
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [allDeals, setAllDeals] = useState<AdminDeal[]>([]);
  const [allSystemDeals, setAllSystemDeals] = useState<AdminDeal[]>([]);

  useEffect(() => {
    // Use the deals prop for pending deals
    setAllDeals(deals || []);
  }, [deals]);

  // Fetch all system deals when component mounts or when switching to 'all' filter
  useEffect(() => {
    if (filter === 'all') {
      fetchAllSystemDeals();
    }
  }, [filter]);

  // Refresh data when screen comes into focus (after returning from edit)
  useFocusEffect(
    React.useCallback(() => {
      // The parent component (admin screen) handles refreshing data
      // We just need to update our local state with the new deals prop
      setAllDeals(deals || []);
      if (filter === 'all') {
        fetchAllSystemDeals();
      }
    }, [deals, filter])
  );

  const fetchAllSystemDeals = async () => {
    try {
      console.log('Fetching all system deals...');
      const dealsData = await apiClient.get<AdminDeal[]>('/deals?limit=1000'); // Get all deals with high limit
      console.log('Fetched all system deals:', dealsData.length);
      setAllSystemDeals(dealsData);
    } catch (error) {
      console.error('Error fetching all system deals:', error);
      setAllSystemDeals([]);
    }
  };

  const filteredDeals = (() => {
    if (filter === 'all') {
      return allSystemDeals;
    } else if (filter === 'pending') {
      return allDeals; // This comes from the pendingDeals prop
    } else {
      // For other filters, use all system deals and filter by status
      const targetStatus = filter === 'deleted' ? 'draft' : filter;
      return allSystemDeals.filter(deal => deal.status === targetStatus);
    }
  })();
  
  console.log('Current filter:', filter);
  console.log('Pending deals:', allDeals.map(d => ({ id: d.id, title: d.title, status: d.status })));
  console.log('All system deals:', allSystemDeals.map(d => ({ id: d.id, title: d.title, status: d.status })));
  console.log('Filtered deals:', filteredDeals.map(d => ({ id: d.id, title: d.title, status: d.status })));

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

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    console.log('handleBulkAction called with:', action, 'selectedDeals:', selectedDeals);
    
    if (selectedDeals.length === 0) {
      console.log('No deals selected');
      Alert.alert('No Selection', 'Please select deals to perform bulk action.');
      return;
    }

    const actionText = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'delete';
    console.log('Showing confirmation dialog for:', actionText);
    
    if (window.confirm(`Are you sure you want to ${actionText} ${selectedDeals.length} deal(s)?`)) {
      console.log('User confirmed bulk action');
      try {
        for (const dealId of selectedDeals) {
          console.log('Processing deal:', dealId);
          try {
            if (action === 'approve') {
              console.log('Calling onDealAction with Approve');
              await onDealAction(dealId, 'Approve');
            } else if (action === 'reject') {
              console.log('Calling onDealAction with Reject');
              await onDealAction(dealId, 'Reject');
            } else {
              console.log('Calling onDealAction with Delete');
              await onDealAction(dealId, 'Delete');
            }
            console.log('Deal action completed for:', dealId);
          } catch (error) {
            console.error('Error processing deal:', dealId, error);
            throw error;
          }
        }
        setSelectedDeals([]);
        window.alert(`${selectedDeals.length} deal(s) ${actionText}d successfully`);
        // Refresh data by updating local state with new deals prop
        setAllDeals(deals || []);
      } catch (error) {
        console.error('Bulk action error:', error);
        window.alert(`Failed to ${actionText} some deals`);
      }
    }
  };

  return (
    <View style={dealStyles.container}>
      <Text style={dealStyles.headerTitle}>Deal Management ({filteredDeals.length})</Text>
      
      {/* Filter Tabs */}
      <View style={dealStyles.filterTabs}>
        {['all', 'pending', 'live', 'expired', 'deleted', 'flagged'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilter(status as any)}
            style={[dealStyles.filterTab, filter === status && dealStyles.activeFilterTab]}
          >
            <Text style={[dealStyles.filterTabText, filter === status && dealStyles.activeFilterTabText]}>
              {status === 'expired' ? 'Rejected' : status === 'deleted' ? 'Deleted' : status.charAt(0).toUpperCase() + status.slice(1)}
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
            <TouchableOpacity onPress={() => {
              console.log('Approve button clicked');
              handleBulkAction('approve');
            }} style={[dealStyles.bulkButton, dealStyles.approveButton]}>
              <Text style={dealStyles.bulkButtonText}>Approve ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              console.log('Reject button clicked');
              handleBulkAction('reject');
            }} style={[dealStyles.bulkButton, dealStyles.rejectButton]}>
              <Text style={dealStyles.bulkButtonText}>Reject ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              console.log('Delete button clicked');
              handleBulkAction('delete');
            }} style={[dealStyles.bulkButton, dealStyles.deleteButton]}>
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
            onDealAction={async (dealId, action) => {
              try {
                await onDealAction(dealId, action);
                // Parent component will handle refreshing data
              } catch (error) {
                console.error('Deal action error:', error);
              }
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