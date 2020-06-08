module.exports = api => {
  api.extendPackage({
    scripts: {
      s3-deploy-cleanup: 'vue-cli-service s3-deploy-cleanup'
    }
  })
}