/**
 * Login Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert(t('error'), t('error_login'));
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={50} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{t('app_name')}</Text>
          <Text style={styles.tagline}>AI-Powered Spam Detection</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={t('email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={t('password')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('login')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.linkText}>{t('forgot_password')}</Text>
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('no_account')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>{t('register')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    appName: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 2,
    },
    tagline: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
    form: {
      gap: 16,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      height: 50,
      color: colors.text,
      fontSize: 16,
      marginLeft: 12,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    forgotPassword: {
      alignItems: 'center',
      marginTop: 8,
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
      gap: 8,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    registerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
