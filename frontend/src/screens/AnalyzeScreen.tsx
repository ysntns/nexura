/**
 * Analyze Screen
 * Main spam detection interface
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageAPI, Message } from '../services/api';

export default function AnalyzeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [message, setMessage] = useState('');
  const [sender, setSender] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<Message | null>(null);

  const handleAnalyze = async () => {
    if (!message.trim()) {
      Alert.alert(t('error'), 'Please enter a message to analyze');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await MessageAPI.analyze({
        content: message,
        sender: sender || undefined,
        source: 'manual',
      });
      setResult(response);
    } catch (error: any) {
      Alert.alert(t('error'), t('error_analyze'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setMessage('');
    setSender('');
    setResult(null);
  };

  const handleFeedback = async (feedback: 'correct' | 'incorrect' | 'unsure') => {
    if (!result) return;

    try {
      await MessageAPI.provideFeedback(result.id, feedback);
      Alert.alert(t('success'), t('feedback_thanks'));
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="scan" size={28} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>{t('analyze')}</Text>
            <Text style={styles.headerSubtitle}>
              AI-Powered Spam Detection
            </Text>
          </View>

          {/* Input Form */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('sender_optional')}</Text>
            <TextInput
              style={styles.senderInput}
              placeholder="+90 555 123 4567"
              placeholderTextColor={colors.textMuted}
              value={sender}
              onChangeText={setSender}
            />

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder={t('enter_message')}
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                <Text style={styles.clearButtonText}>{t('delete')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
                onPress={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.analyzeButtonText}>
                      {t('analyze_button')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Result */}
          {result && (
            <View style={styles.resultSection}>
              {/* Status Banner */}
              <View
                style={[
                  styles.statusBanner,
                  result.analysis.is_spam
                    ? styles.statusSpam
                    : styles.statusSafe,
                ]}
              >
                <Ionicons
                  name={result.analysis.is_spam ? 'warning' : 'checkmark-circle'}
                  size={32}
                  color="#fff"
                />
                <Text style={styles.statusText}>
                  {result.analysis.is_spam
                    ? t('spam_detected')
                    : t('message_safe')}
                </Text>
              </View>

              {/* Details */}
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('confidence')}</Text>
                  <View style={styles.confidenceContainer}>
                    <View style={styles.confidenceBar}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${result.analysis.confidence * 100}%`,
                            backgroundColor: result.analysis.is_spam
                              ? colors.secondary
                              : colors.success,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.confidenceText}>
                      {Math.round(result.analysis.confidence * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('category')}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {t(`cat_${result.analysis.category}`) || result.analysis.category}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('risk_level')}</Text>
                  <Text
                    style={[
                      styles.riskText,
                      { color: getRiskColor(result.analysis.risk_level, colors) },
                    ]}
                  >
                    {t(`risk_${result.analysis.risk_level}`)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('action')}</Text>
                  <Text style={styles.actionText}>
                    {t(`action_${result.analysis.recommended_action}`)}
                  </Text>
                </View>

                <View style={styles.explanationSection}>
                  <Text style={styles.detailLabel}>{t('explanation')}</Text>
                  <Text style={styles.explanationText}>
                    {result.analysis.explanation}
                  </Text>
                </View>

                {result.analysis.detected_patterns.length > 0 && (
                  <View style={styles.patternsSection}>
                    <Text style={styles.detailLabel}>{t('patterns_detected')}</Text>
                    <View style={styles.patternsList}>
                      {result.analysis.detected_patterns.map((pattern, index) => (
                        <View key={index} style={styles.patternBadge}>
                          <Text style={styles.patternText}>{pattern}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Feedback */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>{t('feedback')}</Text>
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    style={[styles.feedbackButton, styles.feedbackCorrect]}
                    onPress={() => handleFeedback('correct')}
                  >
                    <Ionicons name="thumbs-up" size={18} color={colors.success} />
                    <Text style={[styles.feedbackText, { color: colors.success }]}>
                      {t('feedback_correct')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.feedbackButton, styles.feedbackIncorrect]}
                    onPress={() => handleFeedback('incorrect')}
                  >
                    <Ionicons name="thumbs-down" size={18} color={colors.error} />
                    <Text style={[styles.feedbackText, { color: colors.error }]}>
                      {t('feedback_incorrect')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.feedbackButton}
                    onPress={() => handleFeedback('unsure')}
                  >
                    <Ionicons name="help-circle" size={18} color={colors.textMuted} />
                    <Text style={styles.feedbackText}>{t('feedback_unsure')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    content: {
      flex: 1,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    headerIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    inputSection: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    senderInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      color: colors.text,
      fontSize: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      color: colors.text,
      fontSize: 16,
      minHeight: 150,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonRow: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 12,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    clearButtonText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    analyzeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    analyzeButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    resultSection: {
      marginTop: 24,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      borderRadius: 16,
      gap: 12,
      marginBottom: 16,
    },
    statusSpam: {
      backgroundColor: colors.secondary,
    },
    statusSafe: {
      backgroundColor: colors.success,
    },
    statusText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    detailsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
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
    confidenceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    confidenceBar: {
      width: 100,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    confidenceFill: {
      height: '100%',
      borderRadius: 4,
    },
    confidenceText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      width: 50,
      textAlign: 'right',
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
    explanationSection: {
      paddingTop: 16,
    },
    explanationText: {
      marginTop: 8,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    patternsSection: {
      paddingTop: 16,
    },
    patternsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
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
    feedbackSection: {
      marginTop: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    feedbackTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    feedbackButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },
    feedbackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    feedbackCorrect: {},
    feedbackIncorrect: {},
    feedbackText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
