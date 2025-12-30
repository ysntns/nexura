/**
 * SMS History Screen
 * Shows detected spam and safe SMS messages
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import SMSDetectionService, { DetectedSMS } from '../services/SMSDetectionService';

export default function SMSHistoryScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [detectedSMS, setDetectedSMS] = useState<DetectedSMS[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    spam: 0,
    safe: 0,
    blocked: 0,
    spamByCategory: {} as Record<string, number>,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'spam' | 'safe'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sms, stats] = await Promise.all([
        SMSDetectionService.getDetectedSMS(100),
        SMSDetectionService.getStatistics(),
      ]);

      setDetectedSMS(sms);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load SMS data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleDelete = (smsId: string) => {
    Alert.alert(
      'Delete SMS',
      'Are you sure you want to remove this SMS from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await SMSDetectionService.deleteDetectedSMS(smsId);
            loadData();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all SMS detection history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await SMSDetectionService.clearHistory();
            loadData();
          },
        },
      ]
    );
  };

  const getFilteredSMS = () => {
    switch (filter) {
      case 'spam':
        return detectedSMS.filter(sms => sms.analysis.analysis.is_spam);
      case 'safe':
        return detectedSMS.filter(sms => !sms.analysis.analysis.is_spam);
      default:
        return detectedSMS;
    }
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
      case 'high':
        return colors.error;
      case 'medium':
      case 'moderate':
        return '#FF9500';
      case 'low':
        return '#FFCC00';
      default:
        return colors.success;
    }
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
      return `${days}d ago`;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading SMS history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredSMS = getFilteredSMS();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>SMS Detection</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="mail" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{statistics.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="warning" size={24} color={colors.error} />
          <Text style={[styles.statValue, { color: colors.text }]}>{statistics.spam}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spam</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{statistics.safe}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Safe</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="ban" size={24} color={colors.error} />
          <Text style={[styles.statValue, { color: colors.text }]}>{statistics.blocked}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Blocked</Text>
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
            All ({statistics.total})
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
            Spam ({statistics.spam})
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
            Safe ({statistics.safe})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SMS List */}
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
        {filteredSMS.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No SMS messages detected yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Enable SMS detection in settings to start monitoring
            </Text>
          </View>
        ) : (
          filteredSMS.map((sms) => (
            <View
              key={sms.id}
              style={[
                styles.smsCard,
                { backgroundColor: colors.surface, borderLeftColor: getRiskColor(sms.analysis.analysis.risk_level) },
              ]}
            >
              {/* Header */}
              <View style={styles.smsHeader}>
                <View style={styles.smsHeaderLeft}>
                  <Ionicons
                    name={sms.analysis.analysis.is_spam ? 'warning' : 'checkmark-circle'}
                    size={20}
                    color={sms.analysis.analysis.is_spam ? colors.error : colors.success}
                  />
                  <Text style={[styles.smsSender, { color: colors.text }]}>
                    {sms.sender}
                  </Text>
                </View>
                <View style={styles.smsHeaderRight}>
                  <Text style={[styles.smsTime, { color: colors.textMuted }]}>
                    {formatDate(sms.timestamp)}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(sms.id)}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Badges */}
              <View style={styles.badgesContainer}>
                {sms.analysis.analysis.is_spam && (
                  <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.error }]}>
                      {sms.analysis.analysis.category}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: getRiskColor(sms.analysis.analysis.risk_level) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: getRiskColor(sms.analysis.analysis.risk_level) },
                    ]}
                  >
                    {sms.analysis.analysis.risk_level.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {Math.round(sms.analysis.analysis.confidence * 100)}% confidence
                  </Text>
                </View>
                {sms.blocked && (
                  <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
                    <Ionicons name="ban" size={12} color={colors.error} />
                    <Text style={[styles.badgeText, { color: colors.error }]}>BLOCKED</Text>
                  </View>
                )}
              </View>

              {/* Message Content */}
              <Text style={[styles.smsContent, { color: colors.text }]} numberOfLines={3}>
                {sms.content}
              </Text>

              {/* Explanation */}
              {sms.analysis.analysis.explanation && (
                <View style={[styles.explanationBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={[styles.explanationText, { color: colors.textMuted }]}>
                    {sms.analysis.analysis.explanation}
                  </Text>
                </View>
              )}

              {/* Recommended Action */}
              {sms.analysis.analysis.recommended_action && (
                <View style={styles.actionBox}>
                  <Ionicons name="shield" size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    {sms.analysis.analysis.recommended_action}
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
  smsCard: {
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
  smsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smsSender: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  smsTime: {
    fontSize: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  smsContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  explanationBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  explanationText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
