/**
 * Caller ID Screen
 * Phone number lookup and identification (Truecaller-like)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CallerAPI, CallerInfo } from '../services/api';
import { useNavigation } from '@react-navigation/native';

// Spam categories matching backend enum
const SPAM_CATEGORIES = [
  { value: 'telemarketing', label: 'Telemarketing' },
  { value: 'scam', label: 'Scam / Dolandırıcılık' },
  { value: 'fraud', label: 'Fraud / Sahtecilik' },
  { value: 'robocall', label: 'Robocall / Otomatik Arama' },
  { value: 'phishing', label: 'Phishing / Kimlik Avı' },
  { value: 'harassment', label: 'Harassment / Taciz' },
  { value: 'political', label: 'Political / Siyasi' },
  { value: 'debt_collector', label: 'Debt Collector / Borç Tahsilat' },
  { value: 'survey', label: 'Survey / Anket' },
  { value: 'prank', label: 'Prank / Şaka' },
  { value: 'other', label: 'Other / Diğer' },
];

export default function CallerIDScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CallerInfo | null>(null);

  // Spam report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('scam');
  const [reportReason, setReportReason] = useState('');
  const [callerName, setCallerName] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleLookup = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert(t('error'), 'Please enter a phone number');
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const response = await CallerAPI.lookupNumber(phoneNumber, 'TR');
      setResult(response);
    } catch (error: any) {
      Alert.alert(
        t('error'),
        error.response?.data?.detail || 'Failed to lookup phone number'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenReportModal = () => {
    if (!result?.phone_number) return;
    setCallerName(result.name || '');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!result?.phone_number) return;

    setIsReporting(true);
    try {
      await CallerAPI.reportSpam(
        result.phone_number,
        selectedCategory,
        reportReason || undefined,
        callerName || undefined
      );

      setShowReportModal(false);
      setReportReason('');
      setSelectedCategory('scam');

      Alert.alert(
        t('success'),
        'Thank you! Your report helps protect the community.'
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to report spam';
      Alert.alert(t('error'), message);
    } finally {
      setIsReporting(false);
    }
  };

  const getSpamLevelColor = (score?: number): string => {
    if (!score) return colors.success;
    if (score < 30) return colors.success;
    if (score < 70) return '#FFA500';
    return colors.error;
  };

  const getSpamLevelText = (score?: number): string => {
    if (!score) return 'Safe';
    if (score < 30) return 'Low Risk';
    if (score < 70) return 'Moderate Risk';
    return 'High Risk';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="call" size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Caller ID Lookup
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Identify unknown callers instantly
          </Text>
        </View>

        {/* Top Spam Numbers Button */}
        <TouchableOpacity
          style={[styles.topSpamButton, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
          onPress={() => navigation.navigate('TopSpam')}
        >
          <Ionicons name="shield-outline" size={20} color={colors.error} />
          <Text style={[styles.topSpamButtonText, { color: colors.error }]}>
            View Most Reported Spam Numbers
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.error} />
        </TouchableOpacity>

        {/* My Contribution Button */}
        <TouchableOpacity
          style={[styles.topSpamButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
          onPress={() => navigation.navigate('UserStats')}
        >
          <Ionicons name="stats-chart" size={20} color={colors.primary} />
          <Text style={[styles.topSpamButtonText, { color: colors.primary }]}>
            My Contribution & Statistics
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Call History Button */}
        <TouchableOpacity
          style={[styles.topSpamButton, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
          onPress={() => navigation.navigate('CallHistory')}
        >
          <Ionicons name="time" size={20} color={colors.success} />
          <Text style={[styles.topSpamButtonText, { color: colors.success }]}>
            Call Detection History
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.success} />
        </TouchableOpacity>

        {/* Phone Number Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="call-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Enter phone number (+90...)"
            placeholderTextColor={colors.textMuted}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          {phoneNumber.length > 0 && (
            <TouchableOpacity onPress={() => setPhoneNumber('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Lookup Button */}
        <TouchableOpacity
          style={[
            styles.lookupButton,
            { backgroundColor: colors.primary },
            isSearching && styles.buttonDisabled,
          ]}
          onPress={handleLookup}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.lookupButtonText}>Search</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <View style={[styles.resultContainer, { backgroundColor: colors.surface }]}>
            {/* Caller Name */}
            <View style={styles.resultRow}>
              <Ionicons name="person" size={24} color={colors.primary} />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                  Name
                </Text>
                <Text style={[styles.resultValue, { color: colors.text }]}>
                  {result.name || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.resultRow}>
              <Ionicons name="call" size={24} color={colors.primary} />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                  Phone Number
                </Text>
                <Text style={[styles.resultValue, { color: colors.text }]}>
                  {result.phone_number}
                </Text>
              </View>
            </View>

            {/* Spam Status */}
            <View style={styles.resultRow}>
              <Ionicons
                name={result.is_spam ? 'warning' : 'shield-checkmark'}
                size={24}
                color={getSpamLevelColor(result.spam_score)}
              />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                  Spam Risk
                </Text>
                <View style={styles.spamRow}>
                  <Text
                    style={[
                      styles.resultValue,
                      { color: getSpamLevelColor(result.spam_score) },
                    ]}
                  >
                    {getSpamLevelText(result.spam_score)}
                  </Text>
                  {result.spam_score !== undefined && (
                    <View
                      style={[
                        styles.scoreBadge,
                        { backgroundColor: getSpamLevelColor(result.spam_score) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          { color: getSpamLevelColor(result.spam_score) },
                        ]}
                      >
                        {result.spam_score}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Community Reports */}
            {result.community_reports !== undefined && result.community_reports > 0 && (
              <View style={[styles.communityBox, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={[styles.communityText, { color: colors.text }]}>
                  <Text style={{ fontWeight: 'bold' }}>{result.community_reports}</Text>
                  {result.community_reports === 1
                    ? ' person reported this as spam'
                    : ' people reported this as spam'}
                </Text>
              </View>
            )}

            {/* Email */}
            {result.email && (
              <View style={styles.resultRow}>
                <Ionicons name="mail" size={24} color={colors.primary} />
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                    Email
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {result.email}
                  </Text>
                </View>
              </View>
            )}

            {/* Location */}
            {result.addresses && result.addresses.length > 0 && (
              <View style={styles.resultRow}>
                <Ionicons name="location" size={24} color={colors.primary} />
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                    Location
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {result.addresses[0].city}, {result.addresses[0].countryCode}
                  </Text>
                </View>
              </View>
            )}

            {/* Carrier */}
            {result.carrier && (
              <View style={styles.resultRow}>
                <Ionicons name="business" size={24} color={colors.primary} />
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                    Carrier
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {result.carrier}
                  </Text>
                </View>
              </View>
            )}

            {/* Report Spam Button */}
            <TouchableOpacity
              style={[styles.reportButton, { backgroundColor: colors.error + '20' }]}
              onPress={handleOpenReportModal}
            >
              <Ionicons name="flag" size={20} color={colors.error} />
              <Text style={[styles.reportButtonText, { color: colors.error }]}>
                Report as Spam
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Powered by Truecaller database. Results may vary based on community reports.
          </Text>
        </View>
      </ScrollView>

      {/* Spam Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Report Spam Number
              </Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Phone Number Display */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Phone Number
                </Text>
                <Text style={[styles.modalPhoneNumber, { color: colors.text }]}>
                  {result?.phone_number}
                </Text>
              </View>

              {/* Category Selection */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Category *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryRow}>
                    {SPAM_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.value}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor:
                              selectedCategory === category.value
                                ? colors.primary
                                : colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setSelectedCategory(category.value)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            {
                              color:
                                selectedCategory === category.value
                                  ? '#fff'
                                  : colors.text,
                            },
                          ]}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Caller Name */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Caller Name (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="e.g., XYZ Bank, Unknown"
                  placeholderTextColor={colors.textMuted}
                  value={callerName}
                  onChangeText={setCallerName}
                  maxLength={100}
                />
              </View>

              {/* Reason */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Reason (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    styles.modalTextArea,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Describe why this is spam..."
                  placeholderTextColor={colors.textMuted}
                  value={reportReason}
                  onChangeText={setReportReason}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={[styles.characterCount, { color: colors.textMuted }]}>
                  {reportReason.length}/500
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.error },
                  isReporting && styles.buttonDisabled,
                ]}
                onPress={handleSubmitReport}
                disabled={isReporting}
              >
                {isReporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flag" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  topSpamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  topSpamButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
  lookupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 30,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  lookupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 15,
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  spamRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    marginLeft: 10,
    lineHeight: 18,
  },
  communityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  communityText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalPhoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInput: {
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalTextArea: {
    height: 100,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 20,
    elevation: 3,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
