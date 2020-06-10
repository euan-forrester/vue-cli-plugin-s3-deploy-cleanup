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

  // It's a bit inconvenient to have 2 different npm scripts to deploy: one to deploy and one to cleanup.
  // So give the user the option of making the deploy script do both.
  if (options.overwriteDeployScript) {
    api.extendPackage({
      // Goes into package.json
      scripts: { 
        'deploy': 'vue-cli-service s3-deploy && vue-cli-service s3-deploy-cleanup'
      }
    }); 
  }
}