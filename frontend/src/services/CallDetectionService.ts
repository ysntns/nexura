/**
 * Call Detection Service
 * Monitors incoming calls and performs automatic spam lookups
 */
import CallDetectorManager from 'react-native-call-detection';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CallerAPI, CallerInfo } from './api';

const CALL_DETECTION_ENABLED_KEY = 'call_detection_enabled';
const LAST_CHECKED_NUMBER_KEY = 'last_checked_number';

class CallDetectionService {
  private callDetector: any = null;
  private isListening: boolean = false;
  private lastCheckedNumber: string = '';

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
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Check if call detection is enabled in settings
   */
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(CALL_DETECTION_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check call detection status:', error);
      return false;
    }
  }

  /**
   * Enable or disable call detection
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(CALL_DETECTION_ENABLED_KEY, enabled.toString());

      if (enabled) {
        await this.startListening();
      } else {
        this.stopListening();
      }
    } catch (error) {
      console.error('Failed to update call detection status:', error);
    }
  }

  /**
   * Start listening for incoming calls
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('Call detection already running');
      return;
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      console.log('Call detection is disabled in settings');
      return;
    }

    try {
      this.callDetector = new CallDetectorManager(
        async (event: string, phoneNumber: string) => {
          await this.handleCallEvent(event, phoneNumber);
        },
        true, // Read phone number
        () => {
          console.log('Call detection initialized');
        },
        (error: any) => {
          console.error('Call detection error:', error);
        }
      );

      this.isListening = true;
      console.log('Call detection started');
    } catch (error) {
      console.error('Failed to start call detection:', error);
      this.isListening = false;
    }
  }

  /**
   * Stop listening for calls
   */
  stopListening(): void {
    if (this.callDetector) {
      try {
        this.callDetector.dispose();
        this.callDetector = null;
        this.isListening = false;
        console.log('Call detection stopped');
      } catch (error) {
        console.error('Failed to stop call detection:', error);
      }
    }
  }

  /**
   * Handle incoming call events
   */
  private async handleCallEvent(event: string, phoneNumber: string): Promise<void> {
    console.log('Call event:', event, phoneNumber);

    // Only process incoming calls
    if (event === 'Incoming') {
      await this.checkIncomingCall(phoneNumber);
    } else if (event === 'Disconnected') {
      // Reset last checked number when call ends
      this.lastCheckedNumber = '';
    }
  }

  /**
   * Check incoming call against spam database
   */
  private async checkIncomingCall(phoneNumber: string): Promise<void> {
    // Avoid duplicate checks for the same number
    if (this.lastCheckedNumber === phoneNumber) {
      console.log('Number already checked:', phoneNumber);
      return;
    }

    this.lastCheckedNumber = phoneNumber;

    // Don't check empty or invalid numbers
    if (!phoneNumber || phoneNumber === 'Unknown') {
      return;
    }

    try {
      console.log('Looking up incoming call:', phoneNumber);

      // Lookup the number using our API
      const callerInfo = await CallerAPI.lookupNumber(phoneNumber);

      // Store lookup result
      await this.storeCallLookup(phoneNumber, callerInfo);

      // Show notification if spam
      if (callerInfo.is_spam) {
        await this.showSpamWarning(phoneNumber, callerInfo);
      } else if (callerInfo.name) {
        // Show caller name for identified numbers
        await this.showCallerInfo(phoneNumber, callerInfo);
      }
    } catch (error) {
      console.error('Failed to lookup incoming call:', error);
      // Don't show error notification to avoid disturbing user
    }
  }

  /**
   * Show spam warning notification
   */
  private async showSpamWarning(phoneNumber: string, callerInfo: CallerInfo): Promise<void> {
    const riskLevel = this.getRiskLevel(callerInfo.spam_score || 0);
    const communityText = callerInfo.community_reports
      ? `\n${callerInfo.community_reports} people reported this number`
      : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ ${riskLevel} SPAM RISK`,
        body: `${phoneNumber}${callerInfo.name ? ` - ${callerInfo.name}` : ''}${communityText}\nSpam Score: ${callerInfo.spam_score}%`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#FF3B30',
        data: {
          phoneNumber,
          isSpam: true,
          callerInfo,
        },
      },
      trigger: null, // Show immediately
    });

    console.log('Spam warning shown for:', phoneNumber);
  }

  /**
   * Show caller info notification for safe numbers
   */
  private async showCallerInfo(phoneNumber: string, callerInfo: CallerInfo): Promise<void> {
    const name = callerInfo.name || 'Unknown Caller';
    const location = callerInfo.addresses && callerInfo.addresses[0]?.city
      ? `, ${callerInfo.addresses[0].city}`
      : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📞 ${name}`,
        body: `${phoneNumber}${location}\n✓ Safe Number`,
        sound: false, // Don't disturb for safe calls
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        color: '#34C759',
        data: {
          phoneNumber,
          isSpam: false,
          callerInfo,
        },
      },
      trigger: null,
    });

    console.log('Caller info shown for:', phoneNumber);
  }

  /**
   * Store call lookup result for history
   */
  private async storeCallLookup(phoneNumber: string, callerInfo: CallerInfo): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const lookup = {
        phoneNumber,
        callerInfo,
        timestamp,
      };

      // Store in AsyncStorage for call history
      const historyKey = `call_lookup_${timestamp}`;
      await AsyncStorage.setItem(historyKey, JSON.stringify(lookup));
    } catch (error) {
      console.error('Failed to store call lookup:', error);
    }
  }

  /**
   * Get risk level text
   */
  private getRiskLevel(spamScore: number): string {
    if (spamScore >= 70) return 'HIGH';
    if (spamScore >= 40) return 'MODERATE';
    if (spamScore >= 20) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Get recent call lookups
   */
  async getRecentLookups(limit: number = 20): Promise<any[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const lookupKeys = keys
        .filter(key => key.startsWith('call_lookup_'))
        .sort()
        .reverse()
        .slice(0, limit);

      const lookups = await Promise.all(
        lookupKeys.map(async key => {
          const data = await AsyncStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        })
      );

      return lookups.filter(Boolean);
    } catch (error) {
      console.error('Failed to get recent lookups:', error);
      return [];
    }
  }

  /**
   * Clear call lookup history
   */
  async clearHistory(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const lookupKeys = keys.filter(key => key.startsWith('call_lookup_'));
      await AsyncStorage.multiRemove(lookupKeys);
      console.log('Call lookup history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }
}

// Export singleton instance
export default new CallDetectionService();
