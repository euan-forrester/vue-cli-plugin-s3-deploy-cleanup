const S3Bucket = require('./s3-bucket.js');
const FileSystem = require('./file-system.js');

class CleanBucket {
    
    #s3DeployConfig = null;

    constructor(s3DeployConfig) {
        this.s3DeployConfig = s3DeployConfig;
    }

    async clean() {

        try {
            console.log(`Using AWS profile '${this.s3DeployConfig.awsProfile}'`);

            const s3Bucket = new S3Bucket(this.s3DeployConfig.bucket, this.s3DeployConfig.deployPath, this.s3DeployConfig.awsProfile, this.s3DeployConfig.region, this.s3DeployConfig.endpoint);
            const fileSystem = new FileSystem(this.s3DeployConfig.assetPath);

            const [s3Objects, fileSystemObjects] = await Promise.all([
                s3Bucket.getBucketContents(), 
                fileSystem.getDirectoryContents(this.s3DeployConfig.assetMatch)]);
      
            console.log(`Found these files in S3 in bucket '${this.s3DeployConfig.bucket}' in the path '${this.s3DeployConfig.deployPath}':`);
            console.log(s3Objects);

            console.log(`Found these files on the local machine in the directory '${this.s3DeployConfig.assetPath}':`);
            console.log(fileSystemObjects);

            // Note that S3 paths are case-sensitive. This check is case-sensitive too. Not sure if this will cause issues in practice.
            const s3ObjectsNotOnLocalFileSystem = s3Objects.filter(x => fileSystemObjects.indexOf(x) < 0); // Note that fileSystemObjects should be fairly short, so even though this is O(N*M), M is at least small

            console.log('These S3 objects are not on the local machine:');
            console.log(s3ObjectsNotOnLocalFileSystem);

            // Note that we don't want to keep re-tagging the same objects over and over. That'll keep updating the last modified date,
            // and if we do this often enough then the object will never be deleted by S3 because it'll never be "old enough".

            const s3ObjectsThatNeedTagged = await s3Bucket.filterOutObjectsWithTag(s3ObjectsNotOnLocalFileSystem, this.s3DeployConfig.cleanupTag);

            console.log('Of those, these S3 objects are not yet tagged and will be tagged:');
            console.log(s3ObjectsThatNeedTagged);

            await s3Bucket.updateObjectModifiedDate(s3ObjectsThatNeedTagged, this.s3DeployConfig.acl);
            await s3Bucket.addTag(s3ObjectsThatNeedTagged, this.s3DeployConfig.cleanupTag);

            console.log('Finished tagging');

        } catch (e) {
            console.log(e);
        }
    }
}

module.exports = CleanBucket;
