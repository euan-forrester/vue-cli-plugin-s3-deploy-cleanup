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
        return s3Objects.map(object => object['Key']);
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
          Bucket:       this.bucketName,
          Prefix:       this.deployPrefix,
          FetchOwner:   false,
          EncodingType: "url",
          RequestPayer: "requester",
        };

        let moreObjects = true;
        let s3Objects = [];

        while (moreObjects) {

            const listObjectsResult = await s3.listObjectsV2(params).promise();

            if (listObjectsResult['IsTruncated']) {
                params.ContinuationToken = listObjectsResult['NextContinuationToken'];
            } else {
                moreObjects = false;
            }

            s3Objects = s3Objects.concat(listObjectsResult['Contents']);
        }

        return this.getListOfKeysFromS3Bucket(s3Objects);
    }

    async addTag(tag, s3Paths) {

        // We can only add tags to one S3 object at a time, so do them all in parallel
        const addTagPromises = s3Paths.map(basePath => {
            const params = {
              Bucket:   this.bucketName, 
              Key:      this.deployPrefix + basePath, 
              Tagging: {
                TagSet: [ tag ]
              }
            };
            return s3.putObjectTagging(params).promise();
        });

        return Promise.all(addTagPromises);
    }

    async updateObjectModifiedDate(s3Paths, acl) {

        // Lifecycle rules in S3 only work based off of the object's last modified date,
        // which is not updated when adding (or removing) a tag. We can force the update of this date
        // by copying the object onto itself: https://stackoverflow.com/questions/13455168/is-there-a-way-to-touch-file-in-amazon-s3
        // (thus the need for passing in an ACL: it's the only attribute of the object that isn't copied by default)
        // Npte the need to update the object's metadata.
        // Also we will just copy all of the object's tags. We could save a call by setting the tag here rather than with addTag() above,
        // but that would mean overwriting the existing tags on the object. Better to be safe by copying them all and adding ours later.
        const copyObjectPromises = s3Paths.map(basePath => {
            const params = {
              Bucket:       this.bucketName, 
              CopySource:   encodeURI(this.bucketName + '/' + this.deployPrefix + basePath),
              Key:          this.deployPrefix + basePath, 
              ACL:          acl,
              MetadataDirective: "REPLACE",
              Metadata: {
                "IsCopy": "true"
              }
            };
            return s3.copyObject(params).promise();
        });

        return Promise.all(copyObjectPromises);
    }
}

module.exports = S3Bucket;
