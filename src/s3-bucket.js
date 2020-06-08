const S3 = require('aws-sdk/clients/s3');

const s3 = new S3();

class S3Bucket {
    #bucketName = '';
    #deployPrefix = '';

    constructor(bucketName, deployPath) {
        this.bucketName = bucketName;
        this.deployPrefix = this.getDeployPrefix(deployPath);
    }

    getListOfKeysFromS3Bucket(s3Objects) {
        return s3Objects['Contents'].map(object => object['Key']);
    }

    getDeployPrefix(deployPath) {
        // Massage the prefix on our files in the S3 bucket: 
        //  - If it begins with a '/' then we need to remove it: '/euan' => 'euan'
        //  - If there's a prefix it needs to end with a '/': 'euan' => 'euan/'
        //  - If it's just a '/' then it should be empty: '/' = ''

        let deployPrefix = (' ' + deployPath).slice(1); // Force a copy: https://stackoverflow.com/questions/31712808/how-to-force-javascript-to-deep-copy-a-string

        if (!deployPrefix.endsWith('/')) {
            deployPrefix += '/';
        }

        if (deployPrefix.startsWith('/')) {
            deployPrefix = deployPrefix.substr(1);
        }

        return deployPrefix;
    }

    async getBucketContents() {

        const params = {
          Bucket: this.bucketName,
          Prefix: this.deployPrefix,
          FetchOwner: false,
          EncodingType: "url",
          RequestPayer: "requester",
        };

        const s3Objects = await s3.listObjectsV2(params).promise();

        return this.getListOfKeysFromS3Bucket(s3Objects);
    }

    async addTag(tag, s3Paths) {

        // We can only add tags to one S3 object at a time, so do them all in parallel
        const addTagPromises = s3Paths.map(basePath => {
            const params = {
              Bucket: this.bucketName, 
              Key: this.deployPrefix + basePath, 
              Tagging: {
                TagSet: [ tag ]
              }
            };
            return s3.putObjectTagging(params).promise();
        });

        return Promise.all(addTagPromises);
    }
}

module.exports = S3Bucket;
