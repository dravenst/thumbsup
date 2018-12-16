var fs          = require('fs-extra');
var path        = require('path');
var async       = require('async');
var make        = require('./utils/make');
var metadata    = require('./input/metadata');
var thumbs      = require('./output-media/thumbs');
var website     = require('./output-website/generator');
var util        = require('util');

exports.build = function(opts) {

  thumbs.sizes.thumb = opts.thumbSize;
  thumbs.sizes.large = opts.largeSize;

  fs.mkdirpSync(opts.output);
  var media = path.join(opts.output, 'media');
  var meta  = null;

  function buildStep(options) {
    return function(callback) {
//      util.log("CONDITION = " + util.inspect(options)); 
//      util.log("OPTIONS=" + util.inspect(opts));

      if (options.condition !== false) {
        make.exec(opts.input, media, meta, options, callback);
      } else {
        callback();
      }
    }
  }

  function copyFile(task, callback) {
    //copy file only if timestamps are different
    fs.copy(task.src, task.dest, {preserveTimestamps: true}, callback);
  }

  async.series([

    function updateMetadata(callback) {
      metadata.update(opts, function(err, data) {
        meta = data;
        callback(err);
      });
    },

    buildStep({
      condition: opts.originalPhotos,
      message: 'Original photos',
      ext:     replaceAll(opts.photoExtensions,',', '|'),      
      dest:    '/original/$path/$name.$ext',
      func:    copyFile
    }),

    buildStep({
      condition: opts.originalVideos,
      message: 'Original videos',
      ext:     replaceAll(opts.videoExtensions,',', '|'),
      dest:    '/original/$path/$name.$ext',
      func:    copyFile
    }),

    buildStep({
      message: 'Photos (large)',
      ext:     replaceAll(opts.photoExtensions,',', '|'),      
      dest:    '/large/$path/$name.$ext',
      func:    thumbs.photoLarge
    }),

    buildStep({
      message: 'Photos (thumbs)',
      ext:     replaceAll(opts.photoExtensions,',', '|'),      
      dest:    '/thumbs/$path/$name.$ext',
      func:    thumbs.photoSquare
    }),

    buildStep({
      condition: opts.videoConversion,
      message: 'Videos (resized)',
      ext:     replaceAll(opts.videoExtensions,',', '|'),
      dest:    '/large/$path/$name.mp4',
      func:    thumbs.videoWeb
    }),

    buildStep({
      condition: (!opts.videoConversion),
      message: 'Videos (copy)',
      ext:     replaceAll(opts.videoExtensions,',', '|'),
      dest:    '/large/$path/$name.mp4',
      func:    copyFile
    }),

    buildStep({
      message: 'Videos (poster)',
      ext:     replaceAll(opts.videoExtensions,',', '|'),
      dest:    '/large/$path/$name.jpg',
      func:    thumbs.videoLarge
    }),

    buildStep({
      message: 'Videos (thumbs)',
      ext:     replaceAll(opts.videoExtensions,',', '|'),
      dest:    '/thumbs/$path/$name.jpg',
      func:    thumbs.videoSquare
    }),

    function staticWebsite(callback) {
      website.build(meta, opts, callback);
    }

  ], finish);

};

function finish(err) {
  console.log();
  console.log(err || 'Gallery generated successfully');
  console.log();
  process.exit(err ? 1 : 0)
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}