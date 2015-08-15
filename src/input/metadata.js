var _           = require('lodash');
var fs          = require('fs');
var path        = require('path');
var glob        = require('glob');
var async       = require('async');
var pad         = require('pad');
var progress    = require('../utils/progress');
var exif        = require('./exif');
var util        = require('util');

exports.update = function(opts, callback) {

  var metadataPath = path.join(opts.output, 'metadata.json');
  var existing = null;
  var existingDate = null;

  try {
    existing = require(metadataPath);
    existingDate = fs.statSync(metadataPath).mtime;
  } catch (ex) {
    existing = {};
    existingDate = 0;
  }

  function findFiles(opts, callback) {
    var globOptions = {
      cwd: opts.input,
      nonull: false,
      nocase: true
    };
    
    //search for files but ignore additional subdirs, use input params to determine extensions
    var searchExt = "{,*/}*.{" + opts.photoExtensions + "," + opts.videoExtensions + "}";
    glob(searchExt, globOptions, callback);
  }

  function pathAndDate(filePath, next) {
    var absolute = path.join(opts.input, filePath);
    fs.stat(absolute, function(err, stats) {
      next(null, {
        absolute: absolute,
        relative: filePath,
        fileDate: Math.max(stats.ctime.getTime(), stats.mtime.getTime())
      });
    });
  }

  function newer(fileInfo) {
    var found = existing[fileInfo.relative];
    if (!found) return true;
    return fileInfo.fileDate > existingDate;
  }

  function removeDeletedFiles(allFiles) {
    var existingPaths = _.keys(existing);
    var actualPaths   = _.pluck(allFiles, 'relative');
    var deleted = _.difference(existingPaths, actualPaths);
    deleted.forEach(function(key) {
      delete existing[key];
    });
    return deleted.length > 0;
  }

  function metadata(fileInfo, callback) {
    exif.read(fileInfo.absolute, function(err, exifData) {

      // If we don't have any exif data passed in, populate accordingly
      if (!exifData) {
        callback(null, {
          path: fileInfo.relative,
          fileDate: fileInfo.fileDate,
          mediaType: mediaType(fileInfo),
          exif: {
            date: fileInfo.fileDate,
            orientation: null,
            mycaption: ''
          }
        });
      }
      else
      {
        callback(null, {
          path: fileInfo.relative,
          fileDate: fileInfo.fileDate,
          mediaType: mediaType(fileInfo),
          exif: {
            date: exifData[0] ? exifData[0].date : null,
            orientation: exifData[0] ? exifData[0].orientation : null,
            mycaption: exifData[1] ? exifData[1].mycaption : ''
          }
        });
      }
    });
  }

  function mediaType(fileInfo) {
    return fileInfo.relative.match(/\.(mp4|mov|mts|m2ts)$/i) ? 'video' : 'photo';
  }

  function writeToDisk() {
    fs.writeFileSync(metadataPath, JSON.stringify(existing, null, '  '));
  }

  findFiles(opts, function(err, files) {
    var bar = progress.create('List all files', files.length);
    bar.tick(files.length);
    async.mapLimit(files, 50, pathAndDate, function (err, allFiles) {
      var deleted = removeDeletedFiles(allFiles);
      var toProcess = allFiles.filter(newer);
      var count = toProcess.length;
      var bar = progress.create('Update metadata', count);
      if (count > 0) {
        bar.tick(0);

        async.mapLimit(toProcess, 50, function(fileInfo, next) {
          bar.tick();

          // Add metadata to each file in the list
          metadata(fileInfo, next);
        }, 

        // Process array of files with updated metadata to remove path variable and remove no caption photos
        function(err, update) {
          update.forEach(function(fileInfo) {
            existing[fileInfo.path] = _.omit(fileInfo, 'path');

            // delete photos from list with no caption if caption only setting
            if (opts.photosCaption)
            {
              if (   (fileInfo.exif.mycaption == '')
                  && (fileInfo.mediaType == 'photo'))
              { 
                delete existing[fileInfo.path];
                //util.log("Deleting: " + util.inspect(fileInfo));
              }
          }
          });

          // Capture json file of each of the photo we have looked at
          writeToDisk();

          callback(null, existing);
        });

      } else {
        bar.tick(1);
        if (deleted) writeToDisk();
        callback(null, existing);
      }
    });
  });

};
