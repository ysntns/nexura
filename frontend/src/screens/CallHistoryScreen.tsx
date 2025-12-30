/**
 * Call History Screen
 * Shows detected incoming calls with spam information
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import CallDetectionService from '../services/CallDetectionService';
import { CallerInfo } from '../services/api';

interface CallLookup {
  phoneNumber: string;
  callerInfo: CallerInfo;
  timestamp: string;
}

export default function CallHistoryScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [callHistory, setCallHistory] = useState<CallLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'spam' | 'safe'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const history = await CallDetectionService.getRecentLookups(100);
      setCallHistory(history);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all call detection history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await CallDetectionService.clearHistory();
            loadData();
          },
        },
      ]
    );
  };

  const handleCallNumber = (phoneNumber: string) => {
    Alert.alert(
      'Call Number',
      `Do you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`);
          },
        },
      ]
    );
  };

  const getFilteredCalls = () => {
    switch (filter) {
      case 'spam':
        return callHistory.filter(call => call.callerInfo.is_spam);
      case 'safe':
        return callHistory.filter(call => !call.callerInfo.is_spam);
      default:
        return callHistory;
    }
  };

  const getStatistics = () => {
    const total = callHistory.length;
    const spam = callHistory.filter(c => c.callerInfo.is_spam).length;
    const safe = callHistory.filter(c => !c.callerInfo.is_spam).length;
    const identified = callHistory.filter(c => c.callerInfo.name).length;

    return { total, spam, safe, identified };
  };

  const getRiskColor = (spamScore: number): string => {
    if (spamScore >= 70) return colors.error;
    if (spamScore >= 40) return '#FF9500';
    if (spamScore >= 20) return '#FFCC00';
    return colors.success;
  };

  const getRiskLevel = (spamScore: number): string => {
    if (spamScore >= 70) return 'HIGH';
    if (spamScore >= 40) return 'MODERATE';
    if (spamScore >= 20) return 'LOW';
    return 'MINIMAL';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading call history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredCalls = getFilteredCalls();
  const stats = getStatistics();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Call History</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="call" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="warning" size={24} color={colors.error} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.spam}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spam</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.safe}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Safe</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="person" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.identified}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Named</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: filter === 'all' ? colors.primary : colors.surface },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'all' ? '#fff' : colors.text },
            ]}
          >
            All ({stats.total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: filter === 'spam' ? colors.error : colors.surface },
          ]}
          onPress={() => setFilter('spam')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'spam' ? '#fff' : colors.text },
            ]}
          >
            Spam ({stats.spam})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: filter === 'safe' ? colors.success : colors.surface },
          ]}
          onPress={() => setFilter('safe')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'safe' ? '#fff' : colors.text },
            ]}
          >
            Safe ({stats.safe})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Call List */}
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
        {filteredCalls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No calls detected yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Enable call detection in settings to start monitoring
            </Text>
          </View>
        ) : (
          filteredCalls.map((call, index) => (
            <View
              key={index}
              style={[
                styles.callCard,
                {
                  backgroundColor: colors.surface,
                  borderLeftColor: call.callerInfo.is_spam
                    ? getRiskColor(call.callerInfo.spam_score || 0)
                    : colors.success,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.callHeader}>
                <View style={styles.callHeaderLeft}>
                  <Ionicons
                    name={call.callerInfo.is_spam ? 'warning' : 'checkmark-circle'}
                    size={24}
                    color={
                      call.callerInfo.is_spam
                        ? getRiskColor(call.callerInfo.spam_score || 0)
                        : colors.success
                    }
                  />
                  <View style={styles.callInfo}>
                    <Text style={[styles.callNumber, { color: colors.text }]}>
                      {call.phoneNumber}
                    </Text>
                    {call.callerInfo.name && (
                      <Text style={[styles.callName, { color: colors.textMuted }]}>
                        {call.callerInfo.name}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.callHeaderRight}>
                  <Text style={[styles.callTime, { color: colors.textMuted }]}>
                    {formatDate(call.timestamp)}
                  </Text>
                  <TouchableOpacity onPress={() => handleCallNumber(call.phoneNumber)}>
                    <Ionicons name="call" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Spam Badge */}
              {call.callerInfo.is_spam && (
                <View style={styles.badgesContainer}>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: getRiskColor(call.callerInfo.spam_score || 0) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getRiskColor(call.callerInfo.spam_score || 0) },
                      ]}
                    >
                      {getRiskLevel(call.callerInfo.spam_score || 0)} RISK
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      Spam Score: {call.callerInfo.spam_score}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Community Reports */}
              {call.callerInfo.community_reports !== undefined &&
                call.callerInfo.community_reports > 0 && (
                  <View style={[styles.communityBox, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="people" size={16} color={colors.primary} />
                    <Text style={[styles.communityText, { color: colors.text }]}>
                      {call.callerInfo.community_reports}{' '}
                      {call.callerInfo.community_reports === 1 ? 'person' : 'people'} reported
                      this as spam
                    </Text>
                  </View>
                )}

              {/* Location Info */}
              {call.callerInfo.addresses && call.callerInfo.addresses.length > 0 && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color={colors.textMuted} />
                  <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    {call.callerInfo.addresses[0].city},{' '}
                    {call.callerInfo.addresses[0].countryCode}
                  </Text>
                </View>
              )}

              {/* Carrier Info */}
              {call.callerInfo.carrier && (
                <View style={styles.infoRow}>
                  <Ionicons name="business" size={16} color={colors.textMuted} />
                  <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    {call.callerInfo.carrier}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
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
  callCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  callInfo: {
    marginLeft: 12,
    flex: 1,
  },
  callNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  callName: {
    fontSize: 14,
    marginTop: 2,
  },
  callHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  callTime: {
    fontSize: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  communityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  communityText: {
    fontSize: 13,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
  },
});
