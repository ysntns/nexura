/**
 * Language Context
 * Manages app localization (Turkish/English)
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Translations
const translations = {
  tr: {
    // Common
    app_name: 'NEXURA-AI',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    cancel: 'İptal',
    save: 'Kaydet',
    delete: 'Sil',
    confirm: 'Onayla',
    back: 'Geri',

    // Auth
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    logout: 'Çıkış Yap',
    email: 'E-posta',
    password: 'Şifre',
    confirm_password: 'Şifreyi Onayla',
    full_name: 'Ad Soyad',
    phone: 'Telefon',
    forgot_password: 'Şifremi Unuttum',
    no_account: 'Hesabınız yok mu?',
    have_account: 'Zaten hesabınız var mı?',

    // Navigation
    home: 'Ana Sayfa',
    analyze: 'Analiz',
    history: 'Geçmiş',
    settings: 'Ayarlar',
    profile: 'Profil',

    // Home
    welcome: 'Hoş Geldiniz',
    total_analyzed: 'Toplam Analiz',
    spam_blocked: 'Engellenen Spam',
    safe_messages: 'Güvenli Mesaj',
    quick_scan: 'Hızlı Tarama',

    // Analyze
    enter_message: 'Mesajı buraya yazın veya yapıştırın...',
    analyze_button: 'Mesajı Analiz Et',
    analyzing: 'Analiz ediliyor...',
    sender_optional: 'Gönderen (Opsiyonel)',

    // Results
    result: 'Sonuç',
    spam_detected: 'SPAM TESPİT EDİLDİ',
    message_safe: 'MESAJ GÜVENLİ',
    confidence: 'Güven Oranı',
    category: 'Kategori',
    risk_level: 'Risk Seviyesi',
    explanation: 'Açıklama',
    patterns_detected: 'Tespit Edilen Kalıplar',
    action: 'Önerilen İşlem',

    // Categories
    cat_safe: 'Güvenli',
    cat_betting: 'Yasadışı Bahis',
    cat_phishing: 'Oltalama',
    cat_scam: 'Dolandırıcılık',
    cat_malware: 'Zararlı Yazılım',
    cat_promotional: 'Reklam',
    cat_fraud: 'Kimlik Hırsızlığı',
    cat_lottery: 'Sahte Çekiliş',
    cat_investment: 'Sahte Yatırım',
    cat_other: 'Diğer',

    // Risk levels
    risk_low: 'Düşük',
    risk_medium: 'Orta',
    risk_high: 'Yüksek',
    risk_critical: 'Kritik',

    // Actions
    action_allow: 'İzin Ver',
    action_warn: 'Uyar',
    action_block: 'Engelle',

    // Settings
    auto_block: 'Otomatik Engelleme',
    auto_block_desc: 'Spam mesajları otomatik engelle',
    block_threshold: 'Engelleme Eşiği',
    notifications: 'Bildirimler',
    notifications_desc: 'Spam uyarıları için bildirim al',
    language: 'Dil',
    whitelist: 'Güvenilir Liste',
    blacklist: 'Engelli Liste',
    block_categories: 'Engellenen Kategoriler',

    // History
    no_messages: 'Henüz mesaj yok',
    filter_all: 'Tümü',
    filter_spam: 'Sadece Spam',
    filter_safe: 'Sadece Güvenli',

    // Feedback
    feedback: 'Geri Bildirim',
    feedback_correct: 'Doğru',
    feedback_incorrect: 'Yanlış',
    feedback_unsure: 'Emin Değilim',
    feedback_thanks: 'Geri bildiriminiz için teşekkürler!',

    // Errors
    error_login: 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.',
    error_register: 'Kayıt başarısız. Bu e-posta zaten kullanılıyor olabilir.',
    error_network: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
    error_analyze: 'Mesaj analiz edilemedi. Lütfen tekrar deneyin.',
  },
  en: {
    // Common
    app_name: 'NEXURA-AI',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',

    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm Password',
    full_name: 'Full Name',
    phone: 'Phone',
    forgot_password: 'Forgot Password',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',

    // Navigation
    home: 'Home',
    analyze: 'Analyze',
    history: 'History',
    settings: 'Settings',
    profile: 'Profile',

    // Home
    welcome: 'Welcome',
    total_analyzed: 'Total Analyzed',
    spam_blocked: 'Spam Blocked',
    safe_messages: 'Safe Messages',
    quick_scan: 'Quick Scan',

    // Analyze
    enter_message: 'Enter or paste message here...',
    analyze_button: 'Analyze Message',
    analyzing: 'Analyzing...',
    sender_optional: 'Sender (Optional)',

    // Results
    result: 'Result',
    spam_detected: 'SPAM DETECTED',
    message_safe: 'MESSAGE IS SAFE',
    confidence: 'Confidence',
    category: 'Category',
    risk_level: 'Risk Level',
    explanation: 'Explanation',
    patterns_detected: 'Detected Patterns',
    action: 'Recommended Action',

    // Categories
    cat_safe: 'Safe',
    cat_betting: 'Illegal Betting',
    cat_phishing: 'Phishing',
    cat_scam: 'Scam',
    cat_malware: 'Malware',
    cat_promotional: 'Promotional',
    cat_fraud: 'Identity Fraud',
    cat_lottery: 'Fake Lottery',
    cat_investment: 'Fake Investment',
    cat_other: 'Other',

    // Risk levels
    risk_low: 'Low',
    risk_medium: 'Medium',
    risk_high: 'High',
    risk_critical: 'Critical',

    // Actions
    action_allow: 'Allow',
    action_warn: 'Warn',
    action_block: 'Block',

    // Settings
    auto_block: 'Auto Block',
    auto_block_desc: 'Automatically block spam messages',
    block_threshold: 'Block Threshold',
    notifications: 'Notifications',
    notifications_desc: 'Get notified about spam alerts',
    language: 'Language',
    whitelist: 'Whitelist',
    blacklist: 'Blacklist',
    block_categories: 'Blocked Categories',

    // History
    no_messages: 'No messages yet',
    filter_all: 'All',
    filter_spam: 'Spam Only',
    filter_safe: 'Safe Only',

    // Feedback
    feedback: 'Feedback',
    feedback_correct: 'Correct',
    feedback_incorrect: 'Incorrect',
    feedback_unsure: 'Not Sure',
    feedback_thanks: 'Thanks for your feedback!',

    // Errors
    error_login: 'Login failed. Please check your credentials.',
    error_register: 'Registration failed. Email may already be in use.',
    error_network: 'Connection error. Please check your internet.',
    error_analyze: 'Failed to analyze message. Please try again.',
  },
};

// Create i18n instance
const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  t: (key: string, options?: object) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Get device locale, default to Turkish
  const deviceLocale = Localization.locale.split('-')[0];
  const defaultLang: Language = deviceLocale === 'tr' ? 'tr' : 'en';

  const [language, setLanguage] = useState<Language>(defaultLang);

  // Update i18n locale when language changes
  i18n.locale = language;

  const t = (key: string, options?: object): string => {
    return i18n.t(key, options);
  };

  const value: LanguageContextType = {
    language,
    t,
    setLanguage,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
