const glob = require('glob/glob.js');
const { promisify } = require('util');
const fs = require('fs');

const globPromise = promisify(glob); // No private static class members yet: https://github.com/tc39/proposal-static-class-features/

class FileSystem {
    #directory = '';

    constructor(assetPath) {
        this.directory = assetPath + '/';
    }

    filterOutDirectories(listOfPaths) {
        return listOfPaths.filter(path => fs.existsSync(path) && !fs.lstatSync(path).isDirectory())
    }

    removeAssetPathDirectory(listOfFiles, assetPath) {
        return listOfFiles.map(path => path.slice(this.directory.length));
    }

    async getDirectoryContents(assetMatch) {

        // Get our list of files

        const listOfPaths = await globPromise(this.directory + assetMatch);
        const listOfFiles = this.filterOutDirectories(listOfPaths);

        return this.removeAssetPathDirectory(listOfFiles);
    }
}

module.exports = FileSystem;