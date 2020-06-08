module.exports = api => {
  api.extendPackage({
    scripts: {
      'deploy:cleanup': 'vue-cli-service s3-deploy-cleanup'
    }
  })
}