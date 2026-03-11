// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // هذا هو السطر الأهم لتشغيل القائمة الجانبية
      'react-native-reanimated/plugin',
    ],
  };
};
