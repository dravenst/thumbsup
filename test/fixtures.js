const fs = require('node:fs')
const path = require('node:path')
const _ = require('lodash')
const moment = require('moment')
const tmp = require('tmp')
const File = require('../src/model/file')
const Metadata = require('../src/model/metadata')

exports.exiftool = function (opts) {
  opts = opts || {}
  return {
    SourceFile: opts.path || 'path/image.jpg',
    File: {
      FileModifyDate: opts.date || '2016:08:24 14:51:36',
      MIMEType: opts.mimeType || 'image/jpg'
    },
    EXIF: {},
    IPTC: {
      Keywords: opts.keywords
    },
    XMP: {
      PersonInImage: opts.people,
      Subject: opts.subjects
    },
    H264: {},
    QuickTime: {}
  }
}

exports.metadata = function (opts) {
  return new Metadata(exports.exiftool(opts))
}

exports.file = function (fileOpts, opts) {
  const exiftool = exports.exiftool(fileOpts)
  const meta = new Metadata(exiftool, undefined, opts)
  return new File(exiftool, meta)
}

exports.date = function (str) {
  return new Date(moment(str, 'YYYYMMDD HHmmss').valueOf())
  // return new Date(Date.parse(str))
}

exports.photo = function (photoOpts, opts) {
  if (typeof photoOpts === 'string') {
    photoOpts = { path: photoOpts }
  } else {
    photoOpts = photoOpts || {}
  }
  photoOpts.mimeType = 'image/jpg'
  return exports.file(photoOpts, opts)
}

exports.video = function (opts) {
  opts = opts || {}
  opts.mimeType = 'video/mp4'
  return exports.file(opts)
}

exports.fromDisk = function (filename) {
  const filepath = path.join(__dirname, '..', 'test-fixtures', filename)
  return fs.readFileSync(filepath)
}

exports.createTempStructure = function (files) {
  const tmpdir = tmp.dirSync({ unsafeCleanup: true }).name
  writeFiles(tmpdir, files)
  return tmpdir
}

// Runs each test of the current <describe> block inside its own empty temporary folder,
// so tests can create and read files using relative paths
exports.useTempCwd = function () {
  let originalCwd = null
  beforeEach(() => {
    originalCwd = process.cwd()
    process.chdir(tmp.dirSync({ unsafeCleanup: true }).name)
  })
  afterEach(() => {
    process.chdir(originalCwd)
  })
}

// Creates files relative to the current folder, e.g. { 'media/IMG_0001.jpg': '...' }
exports.createFiles = function (files) {
  writeFiles('.', files)
}

function writeFiles (root, files) {
  _.each(files, (content, filepath) => {
    const fullpath = path.join(root, filepath)
    fs.mkdirSync(path.dirname(fullpath), { recursive: true })
    fs.writeFileSync(fullpath, content)
  })
}

exports.deleteTempFile = function (tmpdir, filepath) {
  fs.unlinkSync(path.join(tmpdir, filepath))
}

// convert to OS-dependent style paths for testing
exports.ospath = function (filepath) {
  return filepath.replace(/\//g, path.sep)
}
