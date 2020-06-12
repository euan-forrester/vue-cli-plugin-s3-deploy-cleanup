module.exports = (api, options) => {
  api.extendPackage({
    // Goes into package.json
    scripts: { 
      'deploy:cleanup': 'vue-cli-service s3-deploy-cleanup'
    },
    // Goes into vue.config.js
    vue: { 
      pluginOptions: {
        s3DeployCleanup: {
          cleanupTag: {
            Key: options.tagKey,
            Value: options.tagValue
          }
        }
      }
    }
  });
}