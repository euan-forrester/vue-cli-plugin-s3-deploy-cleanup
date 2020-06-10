const CleanBucket = require('./src/clean-bucket.js');
const { error, warn } = require('@vue/cli-shared-utils');

module.exports = (api, configOptions) => {
  api.registerCommand(
    's3-deploy-cleanup',
    {
      description: 'Cleans up build artifacts in the S3 bucket we deployed to, by adding a tag to files not present in the dist directory on the local machine. S3 can then later delete all files with this tag.',
      usage: 'vue-cli-service s3-deploy-cleanup'
    },
    async () => {
      const options = {
        ...configOptions.pluginOptions.s3Deploy,
        ...configOptions.pluginOptions.s3DeployCleanup
      };

      if (!options.bucket) {
        error('Bucket name must be specified with `bucket` in vue.config.js!');
      } else if (!options.deployPath) {
        error('Deploy path must be specified with `deployPath` in vue.config.js!');
      } else if (!options.assetPath) {
        error('Asset path must be specified with `assetPath` in vue.config.js!');
      } else if (!options.assetMatch) {
        error('Asset match must be specified with `assetMatch` in vue.config.js!');
      } else if (!options.cleanupTag) {
        error('Tag must be specified with `cleanupTag` in vue.config.js!');
      }

      const cleanBucket = new CleanBucket(options);

      await cleanBucket.clean();
    }
  );
}