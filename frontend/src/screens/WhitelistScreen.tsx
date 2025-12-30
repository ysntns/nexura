/**
 * Whitelist Screen
 * Manage trusted contacts that will never be marked as spam
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

interface WhitelistEntry {
  value: string;
  type: string;
  note?: string;
  created_at: string;
}

export default function WhitelistScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    value: '',
    type: 'phone',
    note: '',
  });

  useEffect(() => {
    loadWhitelist();
  }, []);

  const loadWhitelist = async () => {
    try {
      const settings = await UserAPI.getSettings();
      setWhitelist(settings.whitelist || []);
    } catch (error) {
      console.error('Failed to load whitelist:', error);
      Alert.alert('Error', 'Failed to load whitelist');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadWhitelist();
  };

  const handleAddEntry = async () => {
    if (!newEntry.value.trim()) {
      Alert.alert('Error', 'Please enter a phone number or email');
      return;
    }

    try {
      await UserAPI.addToWhitelist(
        newEntry.value.trim(),
        newEntry.type,
        newEntry.note.trim() || undefined
      );

      setShowAddModal(false);
      setNewEntry({ value: '', type: 'phone', note: '' });
      loadWhitelist();

      Alert.alert('Success', 'Entry added to whitelist');
    } catch (error: any) {
      console.error('Failed to add to whitelist:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add entry');
    }
  };

  const handleRemoveEntry = (value: string) => {
    Alert.alert(
      'Remove from Whitelist',
      `Are you sure you want to remove "${value}" from your whitelist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserAPI.removeFromWhitelist(value);
              loadWhitelist();
              Alert.alert('Success', 'Entry removed from whitelist');
            } catch (error) {
              console.error('Failed to remove from whitelist:', error);
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
            Loading whitelist...
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
          <Text style={[styles.title, { color: colors.text }]}>Whitelist</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {whitelist.length} trusted {whitelist.length === 1 ? 'contact' : 'contacts'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.success }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          Contacts in your whitelist will never be marked as spam, even if detected by our AI.
        </Text>
      </View>

      {/* Whitelist Items */}
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
        {whitelist.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No trusted contacts yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Add phone numbers or emails that you trust
            </Text>
          </View>
        ) : (
          whitelist.map((item, index) => (
            <View
              key={index}
              style={[styles.entryCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.entryLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}
                >
                  <Ionicons
                    name={item.type === 'phone' ? 'call' : 'mail'}
                    size={20}
                    color={colors.success}
                  />
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryValue, { color: colors.text }]}>
                    {item.value}
                  </Text>
                  {item.note && (
                    <Text style={[styles.entryNote, { color: colors.textMuted }]}>
                      {item.note}
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
                Add to Whitelist
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
                      newEntry.type === 'phone' ? colors.primary : colors.background,
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
                      newEntry.type === 'email' ? colors.primary : colors.background,
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
                  newEntry.type === 'phone' ? '+905551234567' : 'name@example.com'
                }
                placeholderTextColor={colors.textMuted}
                value={newEntry.value}
                onChangeText={(value) => setNewEntry({ ...newEntry, value })}
                keyboardType={newEntry.type === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
              />
            </View>

            {/* Note Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Note (Optional)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="e.g., Family, Work, Friend"
                placeholderTextColor={colors.textMuted}
                value={newEntry.note}
                onChangeText={(note) => setNewEntry({ ...newEntry, note })}
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
                style={[styles.modalButton, { backgroundColor: colors.success }]}
                onPress={handleAddEntry}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add</Text>
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
  entryNote: {
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
