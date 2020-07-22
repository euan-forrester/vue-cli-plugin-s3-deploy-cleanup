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

      const env_override_prefix = 'VUE_APP_S3D';

      options.awsProfile  = process.env[`${env_override_prefix}_AWS_PROFILE`] || options.awsProfile;
      options.region      = process.env[`${env_override_prefix}_REGION`]      || options.region;
      options.endpoint    = process.env[`${env_override_prefix}_ENDPOINT`]    || options.endpoint;
      options.bucket      = process.env[`${env_override_prefix}_BUCKET`]      || options.bucket;
      options.deployPath  = process.env[`${env_override_prefix}_DEPLOY_PATH`] || options.deployPath;
      options.assetPath   = process.env[`${env_override_prefix}_ASSET_PATH`]  || options.assetPath;
      options.assetMatch  = process.env[`${env_override_prefix}_ASSET_MATCH`] || options.assetMatch;
      options.acl         = process.env[`${env_override_prefix}_ACL`]         || options.acl;

      const override_cleanup_tag_key    = process.env[`${env_override_prefix}_CLEANUP_TAG_KEY`];
      const override_cleanup_tag_value  = process.env[`${env_override_prefix}_CLEANUP_TAG_VALUE`];

      if (override_cleanup_tag_key && override_cleanup_tag_value) {
        options.cleanupTag = {
          Key:    override_cleanup_tag_key,
          Value:  override_cleanup_tag_value
        };
      }

      if (!options.awsProfile) {
        options.awsProfile = 'default';
      }

      if (!options.bucket) {
        error('Bucket name must be specified with `bucket` in vue.config.js!');
      } else if (!options.deployPath) {
        error('Deploy path must be specified with `deployPath` in vue.config.js!');
      } else if (!options.assetPath) {
        error('Asset path must be specified with `assetPath` in vue.config.js!');
      } else if (!options.assetMatch) {
        error('Asset match must be specified with `assetMatch` in vue.config.js!');
      } else if (!options.acl) {
        error('Access control list must be specified with `acl` in vue.config.js!');
      } else if (!options.cleanupTag) {
        error('Tag must be specified with `cleanupTag` in vue.config.js!');
      } 

      const cleanBucket = new CleanBucket(options);

      await cleanBucket.clean();
    }
  );
}