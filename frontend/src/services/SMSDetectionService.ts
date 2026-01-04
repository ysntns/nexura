/**
 * SMS Detection Service
 * Monitors incoming SMS messages and performs automatic spam analysis
 * Note: SMS listening requires bare React Native workflow or expo-sms module
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageAPI, Message } from './api';
import { Platform } from 'react-native';

// Conditional import for SMS listener (only works in bare workflow)
let SmsListener: any = null;
try {
  if (Platform.OS === 'android') {
    SmsListener = require('react-native-android-sms-listener').default;
  }
} catch (error) {
  console.warn('SMS Listener not available. SMS detection will be disabled.');
}

const SMS_DETECTION_ENABLED_KEY = 'sms_detection_enabled';
const SMS_AUTO_BLOCK_KEY = 'sms_auto_block';

interface SMSMessage {
  originatingAddress: string;
  body: string;
  timestamp: number;
}

interface DetectedSMS {
  id: string;
  sender: string;
  content: string;
  analysis: Message;
  timestamp: string;
  blocked: boolean;
}

class SMSDetectionService {
  private subscription: any = null;
  private isListening: boolean = false;

  constructor() {
    this.setupNotifications();
  }

  /**
   * Configure notification handler
   */
  private setupNotifications() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Check if SMS detection is enabled in settings
   */
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(SMS_DETECTION_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check SMS detection status:', error);
      return false;
    }
  }

  /**
   * Check if auto-block is enabled
   */
  async isAutoBlockEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(SMS_AUTO_BLOCK_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check auto-block status:', error);
      return false;
    }
  }

  /**
   * Enable or disable SMS detection
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(SMS_DETECTION_ENABLED_KEY, enabled.toString());

      if (enabled) {
        await this.startListening();
      } else {
        this.stopListening();
      }
    } catch (error) {
      console.error('Failed to update SMS detection status:', error);
    }
  }

  /**
   * Enable or disable auto-block
   */
  async setAutoBlock(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(SMS_AUTO_BLOCK_KEY, enabled.toString());
    } catch (error) {
      console.error('Failed to update auto-block status:', error);
    }
  }

  /**
   * Start listening for incoming SMS
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('SMS detection already running');
      return;
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      console.log('SMS detection is disabled in settings');
      return;
    }

    try {
      this.subscription = SmsListener.addListener((message: SMSMessage) => {
        this.handleIncomingSMS(message).catch(error => {
          console.error('Failed to handle incoming SMS:', error);
        });
      });

      this.isListening = true;
      console.log('SMS detection started');
    } catch (error) {
      console.error('Failed to start SMS detection:', error);
      this.isListening = false;
    }
  }

  /**
   * Stop listening for SMS
   */
  stopListening(): void {
    if (this.subscription) {
      try {
        this.subscription.remove();
        this.subscription = null;
        this.isListening = false;
        console.log('SMS detection stopped');
      } catch (error) {
        console.error('Failed to stop SMS detection:', error);
      }
    }
  }

  /**
   * Handle incoming SMS message
   */
  private async handleIncomingSMS(sms: SMSMessage): Promise<void> {
    console.log('Incoming SMS from:', sms.originatingAddress);

    try {
      // Analyze the message using our backend API
      const analysis = await MessageAPI.analyze({
        content: sms.body,
        sender: sms.originatingAddress,
        sender_phone: sms.originatingAddress,
        source: 'sms_auto',
      });

      // Store the detected SMS
      const detectedSMS: DetectedSMS = {
        id: `sms_${sms.timestamp}`,
        sender: sms.originatingAddress,
        content: sms.body,
        analysis: analysis,
        timestamp: new Date(sms.timestamp).toISOString(),
        blocked: false,
      };

      // Check if auto-block is enabled
      const autoBlockEnabled = await this.isAutoBlockEnabled();
      if (autoBlockEnabled && analysis.analysis.is_spam) {
        detectedSMS.blocked = true;
      }

      // Store in history
      await this.storeDetectedSMS(detectedSMS);

      // Show notification
      if (analysis.analysis.is_spam) {
        await this.showSpamWarning(detectedSMS);
      } else {
        // Optionally show notification for safe messages
        // await this.showSafeMessageNotification(detectedSMS);
      }
    } catch (error) {
      console.error('Failed to analyze incoming SMS:', error);
    }
  }

  /**
   * Show spam warning notification
   */
  private async showSpamWarning(sms: DetectedSMS): Promise<void> {
    const riskLevel = sms.analysis.analysis.risk_level.toUpperCase();
    const category = sms.analysis.analysis.category;
    const confidence = Math.round(sms.analysis.analysis.confidence * 100);

    const title = sms.blocked
      ? `🚫 SPAM BLOCKED - ${riskLevel} RISK`
      : `⚠️ SPAM DETECTED - ${riskLevel} RISK`;

    const body = `From: ${sms.sender}\nCategory: ${category}\nConfidence: ${confidence}%\n\n"${sms.content.substring(0, 100)}${sms.content.length > 100 ? '...' : ''}"`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#FF3B30',
        data: {
          type: 'sms_spam',
          smsId: sms.id,
          sender: sms.sender,
          isSpam: true,
          blocked: sms.blocked,
        },
      },
      trigger: null, // Show immediately
    });

    console.log('Spam warning shown for SMS from:', sms.sender);
  }

  /**
   * Show safe message notification (optional)
   */
  private async showSafeMessageNotification(sms: DetectedSMS): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `✓ Safe Message`,
        body: `From: ${sms.sender}\n\n"${sms.content.substring(0, 100)}${sms.content.length > 100 ? '...' : ''}"`,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        color: '#34C759',
        data: {
          type: 'sms_safe',
          smsId: sms.id,
          sender: sms.sender,
          isSpam: false,
        },
      },
      trigger: null,
    });
  }

  /**
   * Store detected SMS in history
   */
  private async storeDetectedSMS(sms: DetectedSMS): Promise<void> {
    try {
      const historyKey = `sms_detected_${sms.id}`;
      await AsyncStorage.setItem(historyKey, JSON.stringify(sms));
      console.log('Detected SMS stored:', sms.id);
    } catch (error) {
      console.error('Failed to store detected SMS:', error);
    }
  }

  /**
   * Get detected SMS history
   */
  async getDetectedSMS(limit: number = 50): Promise<DetectedSMS[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const smsKeys = keys
        .filter(key => key.startsWith('sms_detected_'))
        .sort()
        .reverse()
        .slice(0, limit);

      const smsData = await Promise.all(
        smsKeys.map(async key => {
          const data = await AsyncStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        })
      );

      return smsData.filter(Boolean) as DetectedSMS[];
    } catch (error) {
      console.error('Failed to get detected SMS:', error);
      return [];
    }
  }

  /**
   * Get spam SMS count
   */
  async getSpamCount(): Promise<number> {
    try {
      const allSMS = await this.getDetectedSMS(1000);
      return allSMS.filter(sms => sms.analysis.analysis.is_spam).length;
    } catch (error) {
      console.error('Failed to get spam count:', error);
      return 0;
    }
  }

  /**
   * Get blocked SMS count
   */
  async getBlockedCount(): Promise<number> {
    try {
      const allSMS = await this.getDetectedSMS(1000);
      return allSMS.filter(sms => sms.blocked).length;
    } catch (error) {
      console.error('Failed to get blocked count:', error);
      return 0;
    }
  }

  /**
   * Delete detected SMS from history
   */
  async deleteDetectedSMS(smsId: string): Promise<void> {
    try {
      const historyKey = `sms_detected_${smsId}`;
      await AsyncStorage.removeItem(historyKey);
      console.log('Detected SMS deleted:', smsId);
    } catch (error) {
      console.error('Failed to delete detected SMS:', error);
    }
  }

  /**
   * Clear all SMS history
   */
  async clearHistory(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const smsKeys = keys.filter(key => key.startsWith('sms_detected_'));
      await AsyncStorage.multiRemove(smsKeys);
      console.log('SMS detection history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Get SMS statistics
   */
  async getStatistics(): Promise<{
    total: number;
    spam: number;
    safe: number;
    blocked: number;
    spamByCategory: Record<string, number>;
  }> {
    try {
      const allSMS = await this.getDetectedSMS(1000);
      const spam = allSMS.filter(sms => sms.analysis.analysis.is_spam);
      const safe = allSMS.filter(sms => !sms.analysis.analysis.is_spam);
      const blocked = allSMS.filter(sms => sms.blocked);

      const spamByCategory: Record<string, number> = {};
      spam.forEach(sms => {
        const category = sms.analysis.analysis.category;
        spamByCategory[category] = (spamByCategory[category] || 0) + 1;
      });

      return {
        total: allSMS.length,
        spam: spam.length,
        safe: safe.length,
        blocked: blocked.length,
        spamByCategory,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        total: 0,
        spam: 0,
        safe: 0,
        blocked: 0,
        spamByCategory: {},
      };
    }
  }
}

// Export singleton instance
export default new SMSDetectionService();
export type { DetectedSMS };
