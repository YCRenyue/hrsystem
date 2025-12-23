module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.forEach((rule) => {
        if (!rule.oneOf) return;

        rule.oneOf.forEach((loader) => {
          if (
            loader.loader &&
            loader.loader.includes('source-map-loader')
          ) {
            loader.exclude = /node_modules/;
          }
        });
      });

      return webpackConfig;
    },
  },
};
