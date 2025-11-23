module.exports = {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // Custom middleware can be added here if needed
      return middlewares;
    },
  },
};
