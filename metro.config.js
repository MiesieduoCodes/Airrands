const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all assets are included
config.resolver.assetExts.push('wav', 'mp3', 'mp4', 'pdf');

// Optimize asset handling
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Ensure all source files are included
config.resolver.platforms = ['android', 'ios', 'web'];

module.exports = config;
