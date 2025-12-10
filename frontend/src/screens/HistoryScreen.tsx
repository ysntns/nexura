/**
 * History Screen
 * Message history with filtering
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageAPI, Message } from '../services/api';

type FilterType = 'all' | 'spam' | 'safe';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMessages = async (spamOnly?: boolean) => {
    try {
      const data = await MessageAPI.getHistory({
        limit: 100,
        spam_only: spamOnly,
      });
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadMessages(filter === 'spam' ? true : undefined);
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages(filter === 'spam' ? true : undefined);
    setRefreshing(false);
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'all') return true;
    if (filter === 'spam') return msg.analysis.is_spam;
    if (filter === 'safe') return !msg.analysis.is_spam;
    return true;
  });

  const styles = createStyles(colors);

  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity
      style={styles.messageCard}
      onPress={() => navigation.navigate('MessageDetail', { message: item })}
    >
      <View style={styles.messageHeader}>
        <View
          style={[
            styles.statusIndicator,
            item.analysis.is_spam ? styles.statusSpam : styles.statusSafe,
          ]}
        >
          <Ionicons
            name={item.analysis.is_spam ? 'warning' : 'checkmark'}
            size={16}
            color="#fff"
          />
        </View>
        <View style={styles.messageInfo}>
          <Text style={styles.messageSender}>
            {item.sender || item.sender_phone || 'Unknown'}
          </Text>
          <Text style={styles.messageDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {t(`cat_${item.analysis.category}`) || item.analysis.category}
          </Text>
        </View>
      </View>
      <Text style={styles.messageContent} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.messageFooter}>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>{t('confidence')}:</Text>
          <Text
            style={[
              styles.confidenceValue,
              {
                color: item.analysis.is_spam ? colors.secondary : colors.success,
              },
            ]}
          >
            {Math.round(item.analysis.confidence * 100)}%
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('history')}</Text>
        <Text style={styles.headerSubtitle}>
          {messages.length} messages analyzed
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            {t('filter_all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'spam' && styles.filterTabActive]}
          onPress={() => setFilter('spam')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'spam' && styles.filterTextActive,
            ]}
          >
            {t('filter_spam')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'safe' && styles.filterTabActive]}
          onPress={() => setFilter('safe')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'safe' && styles.filterTextActive,
            ]}
          >
            {t('filter_safe')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Message List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('no_messages')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 8,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: '#fff',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 16,
    },
    listContent: {
      padding: 20,
      paddingTop: 0,
    },
    messageCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusIndicator: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusSpam: {
      backgroundColor: colors.secondary,
    },
    statusSafe: {
      backgroundColor: colors.success,
    },
    messageInfo: {
      flex: 1,
      marginLeft: 12,
    },
    messageSender: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    messageDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
    },
    messageContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confidenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    confidenceLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    confidenceValue: {
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
