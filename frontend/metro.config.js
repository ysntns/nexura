const { getDefaultConfig } = require('expo/metro-config');

// Extend @react-native/metro-config as required by RN 0.73+
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'],
};

module.exports = config;
