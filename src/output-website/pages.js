var ld = require('lodash');
var _  = ld.noConflict();
var path = require('path');
var moment = require('moment');

/*
  Common page data shared by all models
*/
exports.common = function(opts) {
  var titleParts = opts.title.split(' ');
  return {
    css: opts.css ? path.basename(opts.css) : null,
    title: titleParts[0],
    subtitle: titleParts.slice(1).join(' '),
    googleAnalytics: opts.googleAnalytics
  };

};

/*
  Homepage data
*/
exports.homepage = function(structure, index) {
   var links = structure.map(function(folder, i) {
    return {
      name: folder.name,
      url: folder.name + '.html',
      active: (i === index)
    };
  });
  var galleries = structure.map(function(folder) {
    return {
      name:     folder.name,
      url:      folder.name + '.html',
      stats:    stats(folder.media),
      fromDate: date(_.min(folder.media, 'date').date),
      toDate:   date(_.max(folder.media, 'date').date),
      grid:     grid(folder.media),
      media:    folder.media
    };
  });
  return {
    links: links,
    galleries: galleries
  };
};

/*
  Single gallery page
*/
exports.gallery = function(structure, index) {
  var links = structure.map(function(folder, i) {
    return {
      name: folder.name,
      url: folder.name + '.html',
      active: (i === index)
    };
  });
  return {
    links: links,
    gallery: structure[index]
  };
};

function stats(media) {
  var results = [];
  var photos =  _.filter(media, {video: false}).length;
  var videos =  _.filter(media, {video: true}).length;
  if (photos > 0) results.push(photos + ' photos');
  if (videos > 0) results.push(videos + ' videos');
  return results.join(', ');
}

function date(timestamp) {
  return moment(timestamp).format('MMM D YY');
}

function grid(media) {
  return [
    (media.length > 0) ? media[0].urls.thumb : 'public/missing.png',
    (media.length > 1) ? media[1].urls.thumb : 'public/missing.png',
    (media.length > 2) ? media[2].urls.thumb : 'public/missing.png',
    (media.length > 3) ? media[3].urls.thumb : 'public/missing.png'
  ];
}
