var fs      = require('fs-extra');
var path    = require('path');
var gm      = require('gm').subClass({ imageMagick: true });
var async   = require('async');
var util    = require('util');
var exec    = require('child_process').exec;

exports.sizes = {
  thumb: 120,
  large: 1000,
};

// Small square photo thumbnail
exports.photoSquare = function(task, callback) {
  var img = gm(task.src);
  img = rotatePhoto(img, task.metadata.exif.orientation);
  img.resize(exports.sizes.thumb, exports.sizes.thumb, '^')
     .gravity('Center')
     .crop(exports.sizes.thumb, exports.sizes.thumb)
     .quality(90)
     .write(task.dest, callback);
};

// Large photo
exports.photoLarge = function(task, callback) {
  var img = gm(task.src);
  img = rotatePhoto(img, task.metadata.exif.orientation);
  img.resize(null, exports.sizes.large, '>')
     .quality(90)
     .write(task.dest, callback);
};

// Web-streaming friendly video
exports.videoWeb = function(task, callback) {

  // Variable bit rate settings, quality 22, 720p max, compatible with ipad 2+
  // Constant rate quality setting is better than two pass for quality of video
  var ffmpeg = 'ffmpeg -y -i "' + task.src +'" -codec:v libx264 -movflags +faststart -preset veryslow -crf 22 -b:a 64k -vf fps=29.97,scale=1280:-1 -profile:v high -level 4.1 -f mp4 "' + task.dest +'"';
  
  exec(ffmpeg, {maxBuffer : 500 * 1024}, callback);
};

// Large video preview (before you click play)
exports.videoLarge = function(task, callback) {
  async.series([
    function(next) {
      extractFrame(task, next);
    },
    function(next) {
      exports.photoLarge({
        src: task.dest,
        dest: task.dest,
        metadata: task.metadata
      }, next);
    }
  ], callback);
};

// Small square video preview
exports.videoSquare = function(task, callback) {
  async.series([
    function(next) {
      extractFrame(task, next);
    },
    function(next) {
      exports.photoSquare({
        src: task.dest,
        dest: task.dest,
        metadata: task.metadata
      }, next);
    }
  ], callback);
};

function extractFrame(task, callback) {
  var ffmpeg = 'ffmpeg -itsoffset -1 -i "' + task.src + '" -ss 0.1 -vframes 1 -y "' + task.dest + '"';
  exec(ffmpeg, callback);
}

// Many browsers don't display EXIF orientation properly
// We need to rotate all photos so their orientation is back to 1
function rotatePhoto(img, orientation) {
  if (orientation === 1) return img;
  if (orientation === 2) return img.flop();
  if (orientation === 3) return img.rotate("black", 180);
  if (orientation === 4) return img.flip();
  if (orientation === 5) return img.rotate("black", 90).flop();
  if (orientation === 6) return img.rotate("black", 90);
  if (orientation === 7) return img.rotate("black", 270).flop();
  if (orientation === 8) return img.rotate("black", 270);
  return img;
}
