/**
 * Top Spam Numbers Screen
 * Shows the most reported spam numbers by the community
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CallerAPI } from '../services/api';

interface PhoneStats {
  phone_number: string;
  total_reports: number;
  spam_score: number;
  categories: string[];
  is_spam: boolean;
  first_reported?: string;
  last_reported?: string;
}

export default function TopSpamScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [topSpam, setTopSpam] = useState<PhoneStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTopSpam();
  }, []);

  const loadTopSpam = async () => {
    try {
      const data = await CallerAPI.getTopSpamNumbers(100, 3);
      setTopSpam(data);
    } catch (error) {
      console.error('Failed to load top spam numbers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTopSpam();
  };

  const getSpamLevelColor = (score: number): string => {
    if (score < 30) return colors.success;
    if (score < 70) return '#FFA500';
    return colors.error;
  };

  const getRiskLevel = (score: number): string => {
    if (score < 30) return 'Low';
    if (score < 70) return 'High';
    return 'Critical';
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading spam database...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="shield-outline" size={48} color={colors.error} />
        <Text style={[styles.title, { color: colors.text }]}>
          Most Reported Numbers
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Community-reported spam database
        </Text>
      </View>

      {/* Stats Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {topSpam.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Spam Numbers
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {topSpam.reduce((sum, item) => sum + item.total_reports, 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Total Reports
          </Text>
        </View>
      </View>

      {/* Spam Numbers List */}
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
        {topSpam.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No spam numbers reported yet
            </Text>
          </View>
        ) : (
          topSpam.map((item, index) => (
            <View
              key={item.phone_number}
              style={[styles.spamCard, { backgroundColor: colors.surface }]}
            >
              {/* Rank Badge */}
              <View style={[styles.rankBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>

              {/* Phone Number */}
              <View style={styles.cardHeader}>
                <Ionicons name="call" size={24} color={colors.error} />
                <Text style={[styles.phoneNumber, { color: colors.text }]}>
                  {item.phone_number}
                </Text>
              </View>

              {/* Spam Score */}
              <View style={styles.scoreRow}>
                <View
                  style={[
                    styles.scoreBar,
                    { width: `${item.spam_score}%`, backgroundColor: getSpamLevelColor(item.spam_score) },
                  ]}
                />
                <Text style={[styles.scoreText, { color: getSpamLevelColor(item.spam_score) }]}>
                  {item.spam_score}% - {getRiskLevel(item.spam_score)} Risk
                </Text>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                {/* Reports */}
                <View style={styles.statItem}>
                  <Ionicons name="flag" size={16} color={colors.textMuted} />
                  <Text style={[styles.statText, { color: colors.textMuted }]}>
                    {item.total_reports} reports
                  </Text>
                </View>

                {/* Last Reported */}
                {item.last_reported && (
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={16} color={colors.textMuted} />
                    <Text style={[styles.statText, { color: colors.textMuted }]}>
                      {formatDate(item.last_reported)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Categories */}
              {item.categories && item.categories.length > 0 && (
                <View style={styles.categoriesRow}>
                  {item.categories.slice(0, 3).map((category, idx) => (
                    <View
                      key={idx}
                      style={[styles.categoryChip, { backgroundColor: colors.primary + '20' }]}
                    >
                      <Text style={[styles.categoryText, { color: colors.primary }]}>
                        {category}
                      </Text>
                    </View>
                  ))}
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
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
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
  },
  spamCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  scoreRow: {
    marginBottom: 12,
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
