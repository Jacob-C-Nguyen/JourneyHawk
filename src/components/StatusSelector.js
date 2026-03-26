// src/components/StatusSelector.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import LocationService from '../services/location';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', emoji: '✅', color: '#34c759' },
  { value: 'away-restroom', label: 'Restroom', emoji: '🚻', color: '#ff9500' },
  { value: 'away-switching', label: 'Switching Groups', emoji: '👥', color: '#ff9500' },
  { value: 'away-other', label: 'Other', emoji: '⚠️', color: '#ff3b30' },
];

export default function StatusSelector({ currentStatus = 'present', onStatusChange }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [customReason, setCustomReason] = useState('');
  const [displayStatus, setDisplayStatus] = useState(currentStatus);

  // Update display status when prop changes
  useEffect(() => {
    setDisplayStatus(currentStatus);
  }, [currentStatus]);

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === displayStatus) || STATUS_OPTIONS[0];

  const handleStatusSelect = async (status) => {
    if (status === 'away-other') {
      // Show custom reason input
      setSelectedStatus(status);
    } else {
      // Update immediately
      await LocationService.updateStatus(status, '');
      if (onStatusChange) {
        onStatusChange(status, '');
      }
      setModalVisible(false);
    }
  };

  const handleCustomStatusSubmit = async () => {
    if (!customReason.trim()) {
      Alert.alert('Required', 'Please enter a reason');
      return;
    }

    await LocationService.updateStatus('away-other', customReason);
    if (onStatusChange) {
      onStatusChange('away-other', customReason);
    }
    setCustomReason('');
    setSelectedStatus('present');
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.statusButton, { backgroundColor: currentStatusOption.color + '20' }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.statusEmoji}>{currentStatusOption.emoji}</Text>
        <Text style={[styles.statusText, { color: currentStatusOption.color }]}>
          {currentStatusOption.label}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Let the host know if you need to step away
            </Text>

            {selectedStatus !== 'away-other' ? (
              <View style={styles.statusList}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      displayStatus === option.value && styles.statusOptionActive,
                    ]}
                    onPress={() => handleStatusSelect(option.value)}
                  >
                    <Text style={styles.statusOptionEmoji}>{option.emoji}</Text>
                    <Text style={styles.statusOptionLabel}>{option.label}</Text>
                    {displayStatus === option.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.customReasonContainer}>
                <Text style={styles.label}>Reason:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Getting food, Making a call"
                  value={customReason}
                  onChangeText={setCustomReason}
                  autoFocus
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setSelectedStatus('present');
                      setCustomReason('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.submitButton]}
                    onPress={handleCustomStatusSubmit}
                  >
                    <Text style={styles.submitButtonText}>Update Status</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
    fontWeight: '300',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statusList: {
    gap: 10,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  statusOptionEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  customReasonContainer: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
