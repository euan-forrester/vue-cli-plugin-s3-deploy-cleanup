import { S3Bucket } from './s3-bucket.mjs';
import { FileSystem } from './file-system.mjs';
import config from '../vue.config.js';

const s3DeployConfig = config.pluginOptions.s3Deploy;

const deleteMeTag = {
    Key: "DeployLifecycle",
    Value: "DeleteMe"
};

(async () => {

    try {
        const s3Bucket = new S3Bucket(s3DeployConfig.bucket, s3DeployConfig.deployPath);
        const fileSystem = new FileSystem(s3DeployConfig.assetPath);

        const [s3Objects, fileSystemObjects] = await Promise.all([
            s3Bucket.getBucketContents(), 
            fileSystem.getDirectoryContents(s3DeployConfig.assetMatch)]);
  
        console.log('Found these files in S3:');
        console.log(s3Objects);

        console.log('Found these files on the local machine:');
        console.log(fileSystemObjects);

        // Note that S3 paths are case-sensitive. This check is case-sensitive too. Not sure if this will cause issues in practice.
        const s3ObjectsNotOnLocalFileSystem = s3Objects.filter(x => fileSystemObjects.indexOf(x) < 0); // Note that fileSystemObjects should be fairly short, so even though this is O(N*M), M is at least small

        console.log('Going to tag these S3 objects that are not on the local machine:');
        console.log(s3ObjectsNotOnLocalFileSystem);

        await s3Bucket.addTag(deleteMeTag, s3ObjectsNotOnLocalFileSystem);

        console.log('Finished tagging');

    } catch (e) {
        console.log(e);
    }

})();