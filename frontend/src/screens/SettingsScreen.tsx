/**
 * Settings Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { UserAPI } from '../services/api';
import CallDetectionService from '../services/CallDetectionService';
import SMSDetectionService from '../services/SMSDetectionService';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const [settings, setSettings] = useState({
    auto_block_spam: true,
    auto_block_threshold: 0.8,
    notifications_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [callDetectionEnabled, setCallDetectionEnabled] = useState(false);
  const [smsDetectionEnabled, setSmsDetectionEnabled] = useState(false);
  const [smsAutoBlock, setSmsAutoBlock] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCallDetectionStatus();
    loadSMSDetectionStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await UserAPI.getSettings();
      setSettings({
        auto_block_spam: data.auto_block_spam,
        auto_block_threshold: data.auto_block_threshold,
        notifications_enabled: data.notifications_enabled,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCallDetectionStatus = async () => {
    try {
      const enabled = await CallDetectionService.isEnabled();
      setCallDetectionEnabled(enabled);
    } catch (error) {
      console.error('Failed to load call detection status:', error);
    }
  };

  const toggleCallDetection = async (value: boolean) => {
    try {
      // Request notification permissions if enabling
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications to receive spam warnings for incoming calls.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await CallDetectionService.setEnabled(value);
      setCallDetectionEnabled(value);

      Alert.alert(
        value ? 'Call Detection Enabled' : 'Call Detection Disabled',
        value
          ? 'You will now receive automatic spam warnings for incoming calls.'
          : 'Call detection has been turned off.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to toggle call detection:', error);
      Alert.alert('Error', 'Failed to update call detection settings.');
    }
  };

  const loadSMSDetectionStatus = async () => {
    try {
      const [enabled, autoBlock] = await Promise.all([
        SMSDetectionService.isEnabled(),
        SMSDetectionService.isAutoBlockEnabled(),
      ]);
      setSmsDetectionEnabled(enabled);
      setSmsAutoBlock(autoBlock);
    } catch (error) {
      console.error('Failed to load SMS detection status:', error);
    }
  };

  const toggleSMSDetection = async (value: boolean) => {
    try {
      // Request notification permissions if enabling
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications to receive spam warnings for incoming SMS.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await SMSDetectionService.setEnabled(value);
      setSmsDetectionEnabled(value);

      Alert.alert(
        value ? 'SMS Detection Enabled' : 'SMS Detection Disabled',
        value
          ? 'Incoming SMS messages will now be automatically analyzed for spam.'
          : 'SMS detection has been turned off.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to toggle SMS detection:', error);
      Alert.alert('Error', 'Failed to update SMS detection settings.');
    }
  };

  const toggleSMSAutoBlock = async (value: boolean) => {
    try {
      await SMSDetectionService.setAutoBlock(value);
      setSmsAutoBlock(value);

      Alert.alert(
        value ? 'Auto-Block Enabled' : 'Auto-Block Disabled',
        value
          ? 'Spam SMS messages will be automatically blocked.'
          : 'Spam SMS will be detected but not automatically blocked.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to toggle SMS auto-block:', error);
      Alert.alert('Error', 'Failed to update auto-block settings.');
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      await UserAPI.updateSettings({ [key]: value });
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
        </View>

        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Spam Detection Settings */}
        <Text style={styles.sectionTitle}>Spam Detection</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('auto_block')}</Text>
                <Text style={styles.settingDescription}>{t('auto_block_desc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.auto_block_spam}
              onValueChange={(value) => updateSetting('auto_block_spam', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="options" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('block_threshold')}</Text>
                <Text style={styles.settingDescription}>
                  {Math.round(settings.auto_block_threshold * 100)}% confidence
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>50%</Text>
            <View style={styles.sliderWrapper}>
              <View
                style={[
                  styles.sliderTrack,
                  { backgroundColor: colors.border }
                ]}
              />
              <View
                style={[
                  styles.sliderFill,
                  {
                    width: `${(settings.auto_block_threshold - 0.5) * 200}%`,
                    backgroundColor: colors.primary
                  }
                ]}
              />
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${(settings.auto_block_threshold - 0.5) * 200}%`,
                    backgroundColor: colors.primary
                  }
                ]}
              />
            </View>
            <Text style={styles.sliderLabel}>100%</Text>
          </View>
        </View>

        {/* Call Detection */}
        <Text style={styles.sectionTitle}>Call Detection</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="call" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Auto Spam Detection</Text>
                <Text style={styles.settingDescription}>
                  Get instant spam warnings for incoming calls
                </Text>
              </View>
            </View>
            <Switch
              value={callDetectionEnabled}
              onValueChange={toggleCallDetection}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* SMS Detection */}
        <Text style={styles.sectionTitle}>SMS Detection</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Auto SMS Analysis</Text>
                <Text style={styles.settingDescription}>
                  Automatically analyze incoming SMS for spam
                </Text>
              </View>
            </View>
            <Switch
              value={smsDetectionEnabled}
              onValueChange={toggleSMSDetection}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {smsDetectionEnabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="ban" size={24} color={colors.error} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Auto-Block Spam SMS</Text>
                  <Text style={styles.settingDescription}>
                    Automatically block detected spam messages
                  </Text>
                </View>
              </View>
              <Switch
                value={smsAutoBlock}
                onValueChange={toggleSMSAutoBlock}
                trackColor={{ false: colors.border, true: colors.error }}
                thumbColor="#fff"
              />
            </View>
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>{t('notifications')}</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('notifications')}</Text>
                <Text style={styles.settingDescription}>{t('notifications_desc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications_enabled}
              onValueChange={(value) =>
                updateSetting('notifications_enabled', value)
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name={theme === 'dark' ? 'moon' : 'sunny'}
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  {theme === 'dark' ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="language" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('language')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Türkçe' : 'English'}
                </Text>
              </View>
            </View>
            <View style={styles.languageToggle}>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  language === 'tr' && styles.langButtonActive,
                ]}
                onPress={() => setLanguage('tr')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    language === 'tr' && styles.langButtonTextActive,
                  ]}
                >
                  TR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  language === 'en' && styles.langButtonActive,
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    language === 'en' && styles.langButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Lists */}
        <Text style={styles.sectionTitle}>Lists</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Whitelist')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('whitelist')}</Text>
                <Text style={styles.settingDescription}>Trusted senders</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Blacklist')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('blacklist')}</Text>
                <Text style={styles.settingDescription}>Blocked senders</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color={colors.error} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>NEXURA-AI v1.0.0</Text>
      </ScrollView>
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
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 16,
    },
    profileName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginHorizontal: 20,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    section: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingText: {
      marginLeft: 16,
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    sliderWrapper: {
      flex: 1,
      height: 24,
      justifyContent: 'center',
      position: 'relative',
    },
    sliderTrack: {
      height: 6,
      borderRadius: 3,
      position: 'absolute',
      left: 0,
      right: 0,
    },
    sliderFill: {
      height: 6,
      borderRadius: 3,
      position: 'absolute',
      left: 0,
    },
    sliderThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      position: 'absolute',
      marginLeft: -10,
    },
    sliderLabel: {
      fontSize: 12,
      color: colors.textMuted,
      width: 36,
    },
    languageToggle: {
      flexDirection: 'row',
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    langButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    langButtonActive: {
      backgroundColor: colors.primary,
    },
    langButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    langButtonTextActive: {
      color: '#fff',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.error + '15',
      gap: 8,
      marginBottom: 16,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
    },
    version: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 24,
    },
  });
