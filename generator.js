module.exports = (api, options) => {
  api.extendPackage({
    scripts: {
      'deploy:cleanup': 'vue-cli-service s3-deploy-cleanup'
    },
    vue: {
      pluginOptions: {
        s3Deploy: {
          cleanupTag: {
            Key: options.tagKey,
            Value: options.tagValue
          }
        }
      }
    }
  })
}