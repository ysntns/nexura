/**
 * Home Screen
 * Dashboard with stats and quick actions
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { MessageAPI, MessageStats } from '../services/api';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();

  const [stats, setStats] = useState<MessageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await MessageAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
      refreshUser();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    await refreshUser();
    setRefreshing(false);
  };

  const styles = createStyles(colors);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings', { screen: 'Profile' })}
          >
            <Ionicons name="person-circle" size={44} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="analytics" size={28} color={colors.primary} />
            <Text style={styles.statNumber}>
              {stats?.total_analyzed || user?.total_messages_analyzed || 0}
            </Text>
            <Text style={styles.statLabel}>{t('total_analyzed')}</Text>
          </View>

          <View style={[styles.statCard, styles.statCardDanger]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.secondary} />
            <Text style={[styles.statNumber, { color: colors.secondary }]}>
              {stats?.total_spam || user?.total_spam_blocked || 0}
            </Text>
            <Text style={styles.statLabel}>{t('spam_blocked')}</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {stats?.total_safe || 0}
            </Text>
            <Text style={styles.statLabel}>{t('safe_messages')}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t('quick_scan')}</Text>
        <TouchableOpacity
          style={styles.quickScanButton}
          onPress={() => navigation.navigate('Analyze')}
        >
          <View style={styles.quickScanIcon}>
            <Ionicons name="scan" size={32} color="#fff" />
          </View>
          <View style={styles.quickScanText}>
            <Text style={styles.quickScanTitle}>{t('analyze_button')}</Text>
            <Text style={styles.quickScanSubtitle}>
              Paste or type a message to check for spam
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Spam Categories */}
        {stats && Object.keys(stats.spam_by_category).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Spam Categories</Text>
            <View style={styles.categoriesContainer}>
              {Object.entries(stats.spam_by_category).map(([category, count]) => (
                <View key={category} style={styles.categoryItem}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: getCategoryColor(category, colors) },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(category)}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.categoryName}>
                    {t(`cat_${category}`) || category}
                  </Text>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent Activity Banner */}
        <TouchableOpacity
          style={styles.activityBanner}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="time-outline" size={24} color={colors.primary} />
          <Text style={styles.activityText}>View message history</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    betting: 'dice',
    phishing: 'fish',
    scam: 'warning',
    malware: 'bug',
    promotional: 'megaphone',
    fraud: 'finger-print',
    lottery: 'gift',
    investment: 'trending-up',
    other: 'help-circle',
  };
  return icons[category] || 'help-circle';
}

function getCategoryColor(category: string, colors: any): string {
  const categoryColors: Record<string, string> = {
    betting: colors.betting,
    phishing: colors.phishing,
    scam: colors.scam,
    promotional: colors.promotional,
    fraud: colors.error,
    lottery: colors.warning,
    investment: colors.secondary,
    other: colors.textMuted,
  };
  return categoryColors[category] || colors.textMuted;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    greeting: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 4,
    },
    profileButton: {
      padding: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCardPrimary: {},
    statCardDanger: {},
    statCardSuccess: {},
    statNumber: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    quickScanButton: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickScanIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickScanText: {
      flex: 1,
      marginLeft: 16,
    },
    quickScanTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    quickScanSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    categoriesContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryName: {
      flex: 1,
      marginLeft: 12,
      fontSize: 15,
      color: colors.text,
    },
    categoryCount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    activityBanner: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
  });
