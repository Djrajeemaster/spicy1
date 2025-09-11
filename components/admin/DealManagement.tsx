import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminDeal } from '@/hooks/useAdminData';
import { CircleCheck as CheckCircle, Circle as XCircle, Flag, Edit2, Trash2, Square, CheckSquare, Trash } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiClient } from '@/utils/apiClient';
import { useCurrency } from '@/contexts/CurrencyProvider';

interface DealManagementProps {
  deals: AdminDeal[];
  onDealAction: (dealId: string, action: 'Approve' | 'Reject' | 'Delete' | 'HardDelete') => Promise<void>;
  onRefresh?: () => void;
}

// Custom Confirmation Modal Component
const ConfirmationModal: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
}> = ({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmStyle = 'default' }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={dealStyles.modalOverlay}>
      <View style={dealStyles.modalContent}>
        <Text style={dealStyles.modalTitle}>{title}</Text>
        <Text style={dealStyles.modalMessage}>{message}</Text>
        <View style={dealStyles.modalButtons}>
          <TouchableOpacity
            style={[dealStyles.modalButton, dealStyles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={dealStyles.cancelButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dealStyles.modalButton, confirmStyle === 'destructive' ? dealStyles.destructiveButton : dealStyles.confirmButton]}
            onPress={onConfirm}
          >
            <Text style={confirmStyle === 'destructive' ? dealStyles.destructiveButtonText : dealStyles.confirmButtonText}>
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const DealItem: React.FC<{ 
  deal: AdminDeal; 
  onDealAction: (dealId: string, action: 'Approve' | 'Reject' | 'Delete' | 'HardDelete') => void;
  isSelected: boolean;
  onSelect: (dealId: string) => void;
  onRefresh?: () => void;
  formatPrice: (price: number) => string;
}> = ({ deal, onDealAction, isSelected, onSelect, onRefresh, formatPrice }) => {
  
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmStyle?: 'default' | 'destructive';
  } | null>(null);
  
  const handleAction = async (action: 'Approve' | 'Reject' | 'Delete' | 'HardDelete') => {
    const actionText = action === 'HardDelete' ? 'permanently delete' : action.toLowerCase();
    const title = 'Confirm Action';
    const message = `Are you sure you want to ${actionText} "${deal.title}"?${action === 'HardDelete' ? ' This action cannot be undone!' : ''}`;
    
    setConfirmationModal({
      visible: true,
      title,
      message,
      confirmStyle: action === 'HardDelete' ? 'destructive' : 'default',
      onConfirm: async () => {
        // Close modal immediately when user confirms
        setConfirmationModal(null);
        
        try {
          await onDealAction(deal.id, action);
          // Refresh data after action
          if (onRefresh) onRefresh();
        } catch (error) {
          console.error('Action failed:', error);
          // Show error modal
          setConfirmationModal({
            visible: true,
            title: 'Error',
            message: `Failed to ${actionText} deal`,
            onConfirm: () => setConfirmationModal(null),
          });
        }
      }
    });
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
    <View>
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
            {formatPrice(deal.price)}{deal.original_price ? ` (was ${formatPrice(deal.original_price)})` : ''}
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
          <TouchableOpacity onPress={() => handleAction('HardDelete')} style={dealStyles.actionButton}>
            <Trash size={18} color="#7f1d1d" />
          </TouchableOpacity>
        </View>
      </View>
      
      {confirmationModal && (
        <ConfirmationModal
          visible={confirmationModal.visible}
          title={confirmationModal.title}
          message={confirmationModal.message}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
          confirmStyle={confirmationModal.confirmStyle}
        />
      )}
    </View>
  );
};

export const DealManagement: React.FC<DealManagementProps> = ({ deals, onDealAction, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'live' | 'expired' | 'deleted' | 'flagged'>('all');
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [allDeals, setAllDeals] = useState<AdminDeal[]>([]);
  const [allSystemDeals, setAllSystemDeals] = useState<AdminDeal[]>([]);
  const [allDealsData, setAllDealsData] = useState<AdminDeal[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'price'>('newest');
  const [bulkConfirmationModal, setBulkConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmStyle?: 'default' | 'destructive';
  } | null>(null);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    // Use the deals prop for pending deals
    setAllDeals(deals || []);
    
    // If we're on the 'all' filter, refresh the system deals too
    // This ensures newly inserted deals appear immediately
    if (filter === 'all') {
      fetchAllSystemDeals();
    }
  }, [deals, filter]);

  // Fetch all system deals and all deals when component mounts
  useEffect(() => {
    fetchAllSystemDeals();
    fetchAllDeals();
  }, []);

  // Refresh data when screen comes into focus (after returning from edit)
  useFocusEffect(
    React.useCallback(() => {
      // The parent component (admin screen) handles refreshing data
      // We just need to update our local state with the new deals prop
      setAllDeals(deals || []);
      fetchAllSystemDeals(); // Always refresh moderation deals
      fetchAllDeals(); // Also refresh all deals
    }, [deals])
  );

  const fetchAllSystemDeals = async () => {
    try {
      const dealsData = await apiClient.get<AdminDeal[]>('/deals?moderation=true&limit=1000'); // Get all deals needing moderation with high limit
      setAllSystemDeals(dealsData);
    } catch (error) {
      console.error('Error fetching all system deals:', error);
      setAllSystemDeals([]);
    }
  };

  const fetchAllDeals = async () => {
    try {
      const dealsData = await apiClient.get<AdminDeal[]>('/deals?limit=1000'); // Get all deals with high limit
      setAllDealsData(dealsData);
    } catch (error) {
      console.error('Error fetching all deals:', error);
      setAllDealsData([]);
    }
  };

  const filteredDeals = (() => {
    let deals: AdminDeal[] = [];
    
    // For 'all' filter, show all deals from allDealsData
    if (filter === 'all') {
      deals = allDealsData;
    } 
    // For 'pending' filter, show only pending deals from the hook
    else if (filter === 'pending') {
      deals = allDeals.filter(deal => deal.status === 'pending');
    } 
    // For 'live' filter, show live deals from allDealsData
    else if (filter === 'live') {
      deals = allDealsData.filter(deal => deal.status === 'live');
    }
    // For other filters, filter from all system deals (for moderation statuses)
    else {
      const targetStatus = filter === 'deleted' ? 'draft' : filter;
      deals = allSystemDeals.filter(deal => deal.status === targetStatus);
    }
    
    // Apply sorting
    return deals.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'price':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });
  })();

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

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete' | 'harddelete') => {
    
    if (selectedDeals.length === 0) {
      setBulkConfirmationModal({
        visible: true,
        title: 'No Selection',
        message: 'Please select deals to perform bulk action.',
        onConfirm: () => setBulkConfirmationModal(null),
      });
      return;
    }

    const actionText = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : action === 'harddelete' ? 'permanently delete' : 'delete';
    const confirmMessage = action === 'harddelete' 
      ? `Are you sure you want to ${actionText} ${selectedDeals.length} deal(s)? This action cannot be undone!`
      : `Are you sure you want to ${actionText} ${selectedDeals.length} deal(s)?`;
    
    setBulkConfirmationModal({
      visible: true,
      title: 'Confirm Bulk Action',
      message: confirmMessage,
      confirmStyle: action === 'harddelete' ? 'destructive' : 'default',
      onConfirm: async () => {
        // Close modal immediately when user confirms
        setBulkConfirmationModal(null);
        
        const dealCount = selectedDeals.length;
        try {
          for (const dealId of selectedDeals) {
            try {
              if (action === 'approve') {
                await onDealAction(dealId, 'Approve');
              } else if (action === 'reject') {
                await onDealAction(dealId, 'Reject');
              } else if (action === 'harddelete') {
                await onDealAction(dealId, 'HardDelete');
              } else {
                await onDealAction(dealId, 'Delete');
              }
            } catch (error) {
              console.error('Error processing deal:', dealId, error);
              throw error;
            }
          }
          setSelectedDeals([]);
          // Show success message
          setBulkConfirmationModal({
            visible: true,
            title: 'Success',
            message: `${dealCount} deal(s) ${actionText}d successfully`,
            onConfirm: () => {
              setBulkConfirmationModal(null);
              // Refresh data by updating local state with new deals prop
              setAllDeals(deals || []);
              // Also refresh all system deals to reflect changes
              fetchAllSystemDeals();
              // Refresh all deals data for proper filtering
              fetchAllDeals();
            }
          });
        } catch (error) {
          console.error('Bulk action error:', error);
          // Show error message
          setBulkConfirmationModal({
            visible: true,
            title: 'Error',
            message: `Failed to ${actionText} some deals`,
            onConfirm: () => setBulkConfirmationModal(null),
          });
        }
      }
    });
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

      {/* Sort Options */}
      <View style={dealStyles.sortOptions}>
        <Text style={dealStyles.sortLabel}>Sort by:</Text>
        {[
          { key: 'newest', label: 'Newest' },
          { key: 'oldest', label: 'Oldest' },
          { key: 'title', label: 'Title' },
          { key: 'price', label: 'Price' }
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => setSortBy(option.key as any)}
            style={[dealStyles.sortOption, sortBy === option.key && dealStyles.activeSortOption]}
          >
            <Text style={[dealStyles.sortOptionText, sortBy === option.key && dealStyles.activeSortOptionText]}>
              {option.label}
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
              handleBulkAction('approve');
            }} style={[dealStyles.bulkButton, dealStyles.approveButton]}>
              <Text style={dealStyles.bulkButtonText}>Approve ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              handleBulkAction('reject');
            }} style={[dealStyles.bulkButton, dealStyles.rejectButton]}>
              <Text style={dealStyles.bulkButtonText}>Reject ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              handleBulkAction('delete');
            }} style={[dealStyles.bulkButton, dealStyles.deleteButton]}>
              <Text style={dealStyles.bulkButtonText}>Delete ({selectedDeals.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              handleBulkAction('harddelete');
            }} style={[dealStyles.bulkButton, dealStyles.hardDeleteButton]}>
              <Text style={dealStyles.bulkButtonText}>Hard Delete ({selectedDeals.length})</Text>
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
            onRefresh={onRefresh}
            formatPrice={formatPrice}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dealStyles.listContent}
      />
      
      {bulkConfirmationModal && (
        <ConfirmationModal
          visible={bulkConfirmationModal.visible}
          title={bulkConfirmationModal.title}
          message={bulkConfirmationModal.message}
          onConfirm={bulkConfirmationModal.onConfirm}
          onCancel={() => setBulkConfirmationModal(null)}
          confirmStyle={bulkConfirmationModal.confirmStyle}
        />
      )}
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
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  sortOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  activeSortOption: {
    backgroundColor: '#6366f1',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeSortOptionText: {
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
  hardDeleteButton: {
    backgroundColor: '#7f1d1d',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#1f2937',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});