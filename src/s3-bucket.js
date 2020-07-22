const S3 = require('aws-sdk/clients/s3');
const AWS = require('aws-sdk');

class S3Bucket {
    #bucketName = '';
    #deployPrefix = '';
    #s3 = null;

    constructor(bucketName, deployPath, awsProfile, region, endpoint) {
        this.bucketName = bucketName;
        this.deployPrefix = this.getDeployPrefix(deployPath);
        
        if (awsProfile !== 'default') {
            // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
            const credentials = new AWS.SharedIniFileCredentials({
                profile: awsProfile
            });

            AWS.config.credentials = credentials;
        }

        const s3Config = {}; // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property

        if (region) {
            s3Config.region = region;
        }

        if (endpoint) {
            s3Config.endpoint = endpoint;
        }

        this.s3 = new S3(s3Config);
    }

    getListOfKeysFromS3Bucket(s3Objects) {
        return s3Objects.map(object => object['Key']);
    }

    getDeployPrefix(deployPath) {
        // Massage the prefix on our files in the S3 bucket: 
        //  - If it begins with a '/' then we need to remove it: '/euan' => 'euan'
        //  - If there's a prefix it needs to end with a '/': 'euan' => 'euan/'
        //  - If it's just a '/' then it should be empty: '/' = ''

        let deployPrefix = deployPath;

        if (!deployPrefix.endsWith('/')) {
            deployPrefix += '/';
        }

        if (deployPrefix.startsWith('/')) {
            deployPrefix = deployPrefix.substr(1);
        }

        return deployPrefix;
    }

    removeDeployPrefixFromKeys(listOfKeys) {
        return listOfKeys.map(key => {
            if (key.startsWith(this.deployPrefix)) {
                return key.substr(this.deployPrefix.length);
            } else {
                return key;
            }
        });
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

            const listObjectsResult = await this.s3.listObjectsV2(params).promise();

            if (listObjectsResult['IsTruncated']) {
                params.ContinuationToken = listObjectsResult['NextContinuationToken'];
            } else {
                moreObjects = false;
            }

            s3Objects = s3Objects.concat(listObjectsResult['Contents']);
        }

        const s3Keys = this.getListOfKeysFromS3Bucket(s3Objects);

        return this.removeDeployPrefixFromKeys(s3Keys);
    }

    async filterOutObjectsWithTag(s3Paths, tag) {

        const keepObjectPromises = s3Paths.map(async basePath => {
            const params = {
                Bucket:   this.bucketName, 
                Key:      this.deployPrefix + basePath,
            };

            const s3ObjectTags = await this.s3.getObjectTagging(params).promise();

            let keepObject = true;

            s3ObjectTags['TagSet'].forEach(objectTag => {
                if ((objectTag['Key'].localeCompare(tag.Key) === 0) && (objectTag['Value'].localeCompare(tag.Value) === 0)) {
                    keepObject = false;
                }
            });

            return keepObject;
        });

        const keepObjectResults = await Promise.all(keepObjectPromises);

        return s3Paths.filter((basePath, index) => keepObjectResults[index]);
    }

    async addTag(s3Paths, tag) {

        const addTagPromises = s3Paths.map(basePath => {
            const params = {
                Bucket:   this.bucketName, 
                Key:      this.deployPrefix + basePath, 
                Tagging: {
                    TagSet: [ tag ]
                }
            };
            return this.s3.putObjectTagging(params).promise();
        });

        return Promise.all(addTagPromises);
    }

    async updateObjectModifiedDate(s3Paths, acl) {

        // Lifecycle rules in S3 only work based off of the object's last modified date,
        // which is not updated when adding (or removing) a tag. We can force the update of this date
        // by copying the object onto itself: https://stackoverflow.com/questions/13455168/is-there-a-way-to-touch-file-in-amazon-s3
        // (thus the need for passing in an ACL: it's the only attribute of the object that isn't copied by default)
        //
        // Note the need to update the object's metadata (to copy an object over itself we must change one of 
        // the object's metadata, storage class, website redirect location or encryption attributes)
        //
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
            return this.s3.copyObject(params).promise();
        });

        return Promise.all(copyObjectPromises);
    }

    // Debug method to get the expiration information about each object
    async getObject(s3Paths) {

        const getObjectPromises = s3Paths.map(basePath => {
            const params = {
                Bucket:   this.bucketName, 
                Key:      this.deployPrefix + basePath, 
            };
            return this.s3.getObject(params).promise();
        });

        return Promise.all(getObjectPromises);
    }
}

module.exports = S3Bucket;
