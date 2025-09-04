module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: { '@': './' },
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
      }],
      'expo-router/babel',
      'react-native-reanimated/plugin' // keep LAST
    ],
  };
};
