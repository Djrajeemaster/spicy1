import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { shouldUseStoreModal, getStoreModalConfig, extractUrlData } from '../services/urlService';

interface StoreModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (dealData: any) => void;
  url: string;
}

const StoreModal: React.FC<StoreModalProps> = ({ visible, onClose, onSubmit, url }) => {
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    salePrice: '',
    originalPrice: '',
    imageUrl: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (visible && url) {
      const { useModal, store } = shouldUseStoreModal(url);
      if (useModal && store) {
        const config = getStoreModalConfig(store);
        setStoreConfig(config);
        
        // Auto-extract data when modal opens
        autoExtractData();
      }
    }
  }, [visible, url]);

  const autoExtractData = async () => {
    setExtracting(true);
    try {
      console.log('🤖 Auto-extracting data from URL...');
      const extractedData = await extractUrlData(url);
      
      if (extractedData) {
        setFormData({
          title: extractedData.title || '',
          salePrice: extractedData.price || '',
          originalPrice: extractedData.originalPrice || '',
          imageUrl: extractedData.image || '',
          description: extractedData.description || ''
        });
        
        console.log('✅ Auto-extraction successful:', extractedData);
      }
    } catch (error) {
      console.log('⚠️ Auto-extraction failed:', error);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a product title');
      return;
    }

    setLoading(true);
    
    try {
      const dealData = {
        title: formData.title,
        description: formData.description || `Great ${storeConfig?.name} deal! ${formData.title}`,
        url: url,
        price: formData.salePrice,
        originalPrice: formData.originalPrice,
        imageUrl: formData.imageUrl,
        store: storeConfig?.name,
        category: 'Electronics' // Default category
      };

      await onSubmit(dealData);
      
      // Reset form
      setFormData({
        title: '',
        salePrice: '',
        originalPrice: '',
        imageUrl: '',
        description: ''
      });
      
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryExtraction = () => {
    autoExtractData();
  };

  if (!storeConfig) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: storeConfig.color }]}>
          <View style={styles.headerContent}>
            <Image 
              source={{ uri: storeConfig.logo }} 
              style={styles.storeLogo}
              defaultSource={require('../assets/icon.png')}
            />
            <Text style={styles.headerTitle}>{storeConfig.name} Deal</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* AI Extraction Status */}
          {extracting && (
            <View style={styles.extractingContainer}>
              <MaterialIcons name="auto-awesome" size={20} color={storeConfig.color} />
              <Text style={styles.extractingText}>AI is extracting product data...</Text>
            </View>
          )}

          {/* Retry Extraction Button */}
          <TouchableOpacity 
            style={[styles.retryButton, { borderColor: storeConfig.color }]}
            onPress={handleRetryExtraction}
            disabled={extracting}
          >
            <MaterialIcons name="refresh" size={20} color={storeConfig.color} />
            <Text style={[styles.retryText, { color: storeConfig.color }]}>
              Re-extract with AI
            </Text>
          </TouchableOpacity>

          {/* Product Title */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Product Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter product title"
              multiline={true}
              numberOfLines={2}
            />
          </View>

          {/* Prices */}
          <View style={styles.priceRow}>
            <View style={[styles.fieldContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.fieldLabel}>Sale Price</Text>
              <TextInput
                style={styles.textInput}
                value={formData.salePrice}
                onChangeText={(text) => setFormData(prev => ({ ...prev, salePrice: text }))}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
            
            <View style={[styles.fieldContainer, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.fieldLabel}>Original Price</Text>
              <TextInput
                style={styles.textInput}
                value={formData.originalPrice}
                onChangeText={(text) => setFormData(prev => ({ ...prev, originalPrice: text }))}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Image URL */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Product Image URL</Text>
            <TextInput
              style={styles.textInput}
              value={formData.imageUrl}
              onChangeText={(text) => setFormData(prev => ({ ...prev, imageUrl: text }))}
              placeholder="https://..."
              keyboardType="url"
            />
            
            {/* Image Preview */}
            {formData.imageUrl && (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: formData.imageUrl }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Product description..."
              multiline={true}
              numberOfLines={4}
            />
          </View>

          {/* Store Info */}
          <View style={styles.storeInfoContainer}>
            <MaterialIcons name="store" size={16} color="#666" />
            <Text style={styles.storeInfoText}>
              This deal will be marked as from {storeConfig.name}
            </Text>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: storeConfig.color }]}
            onPress={handleSubmit}
            disabled={loading || extracting}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Deal...' : 'Create Deal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  storeLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#fff'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  closeButton: {
    padding: 5
  },
  content: {
    flex: 1,
    paddingHorizontal: 20
  },
  extractingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 15
  },
  extractingText: {
    marginLeft: 8,
    color: '#0369a1',
    fontSize: 14
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  retryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500'
  },
  fieldContainer: {
    marginBottom: 20
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center'
  },
  imagePreview: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0'
  },
  storeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  storeInfoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  submitButton: {
    flex: 1,
    padding: 15,
    marginLeft: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default StoreModal;
