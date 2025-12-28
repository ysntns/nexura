/**
 * Message Detail Screen
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageAPI, Message } from '../services/api';

export default function MessageDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute<any>();

  const message: Message = route.params?.message;
  const styles = createStyles(colors);

  if (!message) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Message not found</Text>
      </SafeAreaView>
    );
  }

  const handleFeedback = async (feedback: 'correct' | 'incorrect' | 'unsure') => {
    try {
      await MessageAPI.provideFeedback(message.id, feedback);
      Alert.alert(t('success'), t('feedback_thanks'));
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete'),
      'Are you sure you want to delete this message?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await MessageAPI.delete(message.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('error'), 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            message.analysis.is_spam ? styles.statusSpam : styles.statusSafe,
          ]}
        >
          <Ionicons
            name={message.analysis.is_spam ? 'warning' : 'checkmark-circle'}
            size={40}
            color="#fff"
          />
          <Text style={styles.statusText}>
            {message.analysis.is_spam ? t('spam_detected') : t('message_safe')}
          </Text>
          <Text style={styles.confidenceText}>
            {Math.round(message.analysis.confidence * 100)}% {t('confidence')}
          </Text>
        </View>

        {/* Message Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>

          {(message.sender || message.sender_phone) && (
            <View style={styles.senderRow}>
              <Ionicons name="person" size={18} color={colors.textMuted} />
              <Text style={styles.senderText}>
                {message.sender || message.sender_phone}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Ionicons name="time" size={18} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {new Date(message.created_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="phone-portrait" size={18} color={colors.textMuted} />
            <Text style={styles.metaText}>Source: {message.source}</Text>
          </View>
        </View>

        {/* Analysis Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('category')}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {t(`cat_${message.analysis.category}`) || message.analysis.category}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('risk_level')}</Text>
            <Text
              style={[
                styles.riskText,
                { color: getRiskColor(message.analysis.risk_level, colors) },
              ]}
            >
              {t(`risk_${message.analysis.risk_level}`)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('action')}</Text>
            <Text style={styles.actionText}>
              {t(`action_${message.analysis.recommended_action}`)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Blocked</Text>
            <Text style={styles.actionText}>
              {message.is_blocked ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>

        {/* Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('explanation')}</Text>
          <Text style={styles.explanationText}>
            {message.analysis.explanation}
          </Text>
        </View>

        {/* Detected Patterns */}
        {message.analysis.detected_patterns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('patterns_detected')}</Text>
            <View style={styles.patternsList}>
              {message.analysis.detected_patterns.map((pattern, index) => (
                <View key={index} style={styles.patternBadge}>
                  <Text style={styles.patternText}>{pattern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('feedback')}</Text>
          <Text style={styles.feedbackDescription}>
            Was this analysis accurate?
          </Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.feedbackCorrect]}
              onPress={() => handleFeedback('correct')}
            >
              <Ionicons name="thumbs-up" size={20} color={colors.success} />
              <Text style={[styles.feedbackText, { color: colors.success }]}>
                {t('feedback_correct')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.feedbackButton, styles.feedbackIncorrect]}
              onPress={() => handleFeedback('incorrect')}
            >
              <Ionicons name="thumbs-down" size={20} color={colors.error} />
              <Text style={[styles.feedbackText, { color: colors.error }]}>
                {t('feedback_incorrect')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={20} color={colors.error} />
          <Text style={styles.deleteText}>{t('delete')} Message</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getRiskColor(risk: string, colors: any): string {
  switch (risk) {
    case 'low':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'high':
      return colors.secondary;
    case 'critical':
      return colors.error;
    default:
      return colors.text;
  }
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statusBanner: {
      alignItems: 'center',
      padding: 24,
      margin: 20,
      borderRadius: 16,
    },
    statusSpam: {
      backgroundColor: colors.secondary,
    },
    statusSafe: {
      backgroundColor: colors.success,
    },
    statusText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 12,
    },
    confidenceText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      marginTop: 4,
    },
    section: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    messageBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    messageText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    senderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    senderText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    metaText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    categoryBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    categoryText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    riskText: {
      fontSize: 15,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    actionText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
    },
    explanationText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    patternsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    patternBadge: {
      backgroundColor: colors.secondary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    patternText: {
      color: colors.secondary,
      fontSize: 13,
    },
    feedbackDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    feedbackButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    feedbackButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    feedbackCorrect: {},
    feedbackIncorrect: {},
    feedbackText: {
      fontSize: 14,
      fontWeight: '600',
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginBottom: 24,
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.error + '15',
      gap: 8,
    },
    deleteText: {
      color: colors.error,
      fontSize: 16,
      fontWeight: '600',
    },
  });
