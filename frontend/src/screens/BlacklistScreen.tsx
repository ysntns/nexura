/**
 * Blacklist Screen
 * Manage blocked contacts that will always be marked as spam
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserAPI } from '../services/api';

interface BlacklistEntry {
  value: string;
  type: string;
  reason?: string;
  created_at: string;
}

export default function BlacklistScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    value: '',
    type: 'phone',
    reason: '',
  });

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      const settings = await UserAPI.getSettings();
      setBlacklist(settings.blacklist || []);
    } catch (error) {
      console.error('Failed to load blacklist:', error);
      Alert.alert('Error', 'Failed to load blacklist');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBlacklist();
  };

  const handleAddEntry = async () => {
    if (!newEntry.value.trim()) {
      Alert.alert('Error', 'Please enter a phone number or email');
      return;
    }

    try {
      await UserAPI.addToBlacklist(
        newEntry.value.trim(),
        newEntry.type,
        newEntry.reason.trim() || undefined
      );

      setShowAddModal(false);
      setNewEntry({ value: '', type: 'phone', reason: '' });
      loadBlacklist();

      Alert.alert('Success', 'Entry added to blacklist');
    } catch (error: any) {
      console.error('Failed to add to blacklist:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add entry');
    }
  };

  const handleRemoveEntry = (value: string) => {
    Alert.alert(
      'Remove from Blacklist',
      `Are you sure you want to remove "${value}" from your blacklist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserAPI.removeFromBlacklist(value);
              loadBlacklist();
              Alert.alert('Success', 'Entry removed from blacklist');
            } catch (error) {
              console.error('Failed to remove from blacklist:', error);
              Alert.alert('Error', 'Failed to remove entry');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading blacklist...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Blacklist</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {blacklist.length} blocked {blacklist.length === 1 ? 'contact' : 'contacts'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.error }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.error + '15' }]}>
        <Ionicons name="ban" size={20} color={colors.error} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          Contacts in your blacklist will always be marked as spam and can be automatically blocked.
        </Text>
      </View>

      {/* Blacklist Items */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {blacklist.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ban-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No blocked contacts yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Add phone numbers or emails you want to block
            </Text>
          </View>
        ) : (
          blacklist.map((item, index) => (
            <View
              key={index}
              style={[styles.entryCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.entryLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}
                >
                  <Ionicons
                    name={item.type === 'phone' ? 'call' : 'mail'}
                    size={20}
                    color={colors.error}
                  />
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryValue, { color: colors.text }]}>
                    {item.value}
                  </Text>
                  {item.reason && (
                    <Text style={[styles.entryReason, { color: colors.textMuted }]}>
                      {item.reason}
                    </Text>
                  )}
                  <Text style={[styles.entryDate, { color: colors.textMuted }]}>
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveEntry(item.value)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add to Blacklist
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={styles.typeSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      newEntry.type === 'phone' ? colors.error : colors.background,
                  },
                ]}
                onPress={() => setNewEntry({ ...newEntry, type: 'phone' })}
              >
                <Ionicons
                  name="call"
                  size={20}
                  color={newEntry.type === 'phone' ? '#fff' : colors.text}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: newEntry.type === 'phone' ? '#fff' : colors.text },
                  ]}
                >
                  Phone
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      newEntry.type === 'email' ? colors.error : colors.background,
                  },
                ]}
                onPress={() => setNewEntry({ ...newEntry, type: 'email' })}
              >
                <Ionicons
                  name="mail"
                  size={20}
                  color={newEntry.type === 'email' ? '#fff' : colors.text}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: newEntry.type === 'email' ? '#fff' : colors.text },
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Value Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {newEntry.type === 'phone' ? 'Phone Number' : 'Email Address'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder={
                  newEntry.type === 'phone' ? '+905551234567' : 'spam@example.com'
                }
                placeholderTextColor={colors.textMuted}
                value={newEntry.value}
                onChangeText={(value) => setNewEntry({ ...newEntry, value })}
                keyboardType={newEntry.type === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
              />
            </View>

            {/* Reason Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Reason (Optional)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="e.g., Spam calls, Harassment, Scam"
                placeholderTextColor={colors.textMuted}
                value={newEntry.reason}
                onChangeText={(reason) => setNewEntry({ ...newEntry, reason })}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleAddEntry}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  entryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryReason: {
    fontSize: 13,
    marginTop: 2,
  },
  entryDate: {
    fontSize: 12,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
