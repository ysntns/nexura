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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CallerAPI, CallerInfo } from '../services/api';

export default function CallerIDScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CallerInfo | null>(null);

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

  const handleReportSpam = async () => {
    if (!result?.phone_number) return;

    try {
      await CallerAPI.reportSpam(result.phone_number);
      Alert.alert(t('success'), 'Phone number reported as spam');
    } catch (error: any) {
      Alert.alert(t('error'), 'Failed to report spam');
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
              onPress={handleReportSpam}
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
});
