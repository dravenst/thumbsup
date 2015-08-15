var fs      = require('fs');
var async   = require('async');
var exif    = require('exif-parser');
var im      = require('imagemagick');
var exec    = require('child_process').exec;
var util    = require('util');

// convert video rotation in degrees
// to the standard EXIF rotation number
var ROTATION_TABLE = {
  '0': 1,
  '90': 6,
  '180': 3,
  '270': 8
};

var FFPROBE_DATE   = /creation_time\s*:\s*(.*)\n/;
var FFPROBE_ROTATE = /rotate\s*:\s*(.*)\n/;

exports.read = function(filePath, callback) {
  if (filePath.match(/\.(jpg|jpeg|png)$/i)) {
    photo(filePath, callback);
  } else if (filePath.match(/\.(mp4|mov|mts|m2ts)$/i)) {
    video(filePath, callback);
  } else {
    callback(new Error('Unknown format: '+ filePath));
  }
};

function photo(filePath, callback) {

  async.series([
    
    function(callback) {
      fs.readFile(filePath, function(err, contents) {
        if (err) return callback(new Error('Failed to read file ' + err + filePath));
        
        try {
          var result = exif.create(contents).parse();
        }
        catch(e) {
          return callback(new Error('Failed to read file ' + filePath + e));
        }
        
        callback(null, {
          date: result.tags.DateTimeOriginal ? (result.tags.DateTimeOriginal * 1000) : null,
          orientation: result.tags.Orientation || null
        });
      });
    },

    function(callback){

        im.identify(['-format', '%[IPTC:2:120]', filePath ], function(err, metadata){

        if (err) return callback(new Error('Failed to read caption ' + err + filePath));
        
        callback(null, { 
          mycaption: metadata ? metadata.trimRight() : ''
        });
      });
    }

  ],
  function(err, results){

    if (err) util.log(util.inspect(err));

    callback(err, results);
  });
}


function video(filePath, callback) {
  var ffprobe = 'ffprobe "' + filePath + '"';
  exec(ffprobe, function(err, stdout, stderr) {
    var dateMatch = FFPROBE_DATE.exec(stderr);
    var rotateMatch = FFPROBE_ROTATE.exec(stderr);
    callback(null, {
      date: dateMatch ? Date.parse(dateMatch[1]) : null,
      orientation: rotateMatch ? ROTATION_TABLE[rotateMatch[1]] : null
    });
  });
}
