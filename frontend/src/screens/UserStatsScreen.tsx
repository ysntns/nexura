/**
 * User Statistics Screen
 * Shows user's spam reporting statistics and contribution
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CallerAPI } from '../services/api';

interface UserStats {
  total_reports: number;
  recent_reports: any[];
  impact_score: number;
  badge: string;
  people_helped: number;
}

export default function UserStatsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await CallerAPI.getMyStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };

  const getBadgeColor = (badge: string): string => {
    switch (badge) {
      case 'Expert':
        return '#FFD700'; // Gold
      case 'Advanced':
        return '#C0C0C0'; // Silver
      case 'Contributor':
        return '#CD7F32'; // Bronze
      default:
        return colors.textMuted;
    }
  };

  const getBadgeIcon = (badge: string): any => {
    switch (badge) {
      case 'Expert':
        return 'trophy';
      case 'Advanced':
        return 'medal';
      case 'Contributor':
        return 'ribbon';
      default:
        return 'star-outline';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your statistics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Unable to load statistics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Your Contribution
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Making the community safer
          </Text>
        </View>

        {/* Badge Card */}
        <View style={[styles.badgeCard, { backgroundColor: colors.surface }]}>
          <Ionicons
            name={getBadgeIcon(stats.badge)}
            size={64}
            color={getBadgeColor(stats.badge)}
          />
          <Text style={[styles.badgeText, { color: getBadgeColor(stats.badge) }]}>
            {stats.badge}
          </Text>
          <Text style={[styles.badgeSubtext, { color: colors.textMuted }]}>
            Community Protector
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Total Reports */}
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="flag" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.total_reports}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Spam Reports
            </Text>
          </View>

          {/* People Helped */}
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="people" size={32} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.people_helped}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              People Helped
            </Text>
          </View>

          {/* Impact Score */}
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.error} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.impact_score}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Impact Score
            </Text>
          </View>
        </View>

        {/* Impact Message */}
        <View style={[styles.impactCard, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="heart" size={24} color={colors.primary} />
          <View style={styles.impactText}>
            <Text style={[styles.impactTitle, { color: colors.text }]}>
              Thank You!
            </Text>
            <Text style={[styles.impactMessage, { color: colors.textMuted }]}>
              Your reports have helped protect {stats.people_helped} people from spam calls.
              Keep up the great work!
            </Text>
          </View>
        </View>

        {/* Recent Reports */}
        {stats.recent_reports && stats.recent_reports.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Reports
            </Text>
            {stats.recent_reports.map((report, index) => (
              <View
                key={index}
                style={[styles.reportCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.reportHeader}>
                  <Ionicons name="call" size={20} color={colors.text} />
                  <Text style={[styles.reportPhone, { color: colors.text }]}>
                    {report.phone_number}
                  </Text>
                </View>
                <View style={styles.reportDetails}>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                      {report.category}
                    </Text>
                  </View>
                  {report.created_at && (
                    <Text style={[styles.reportDate, { color: colors.textMuted }]}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Progress to Next Level */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>
            Progress to Next Level
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (stats.total_reports % 10) * 10)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {stats.total_reports < 10
              ? `${10 - stats.total_reports} more reports to Contributor`
              : stats.total_reports < 20
              ? `${20 - stats.total_reports} more reports to Advanced`
              : stats.total_reports < 50
              ? `${50 - stats.total_reports} more reports to Expert`
              : 'You are at max level!'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  badgeCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  badgeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  badgeSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  impactCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  impactText: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  impactMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  reportCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportPhone: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 12,
  },
  progressCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
  },
});
