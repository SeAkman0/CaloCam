module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Eğer 'react-native-reanimated' kullanıyorsanız bu plugin'i ekleyin:
            // 'react-native-reanimated/plugin',
        ],
    };
};
