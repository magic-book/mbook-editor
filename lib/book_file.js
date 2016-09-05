/**
 * 物理文件管理，主要的功能
 *
 *  资源文件写入，
 *  资源文件核对、清理
 *
 */
'use strict';

const fs = require('fs');
const fsp = require('fs-promise');
const path = require('path');
const async = require('async');

/**
 * 物理路径管理
 */
class BookDir {
  constructor(bpath) {
    this.base = bpath;
  }

  list(tmp, cb) {
    let p;
    let self = this;
    if (!cb) {
      cb = tmp;
      tmp = undefined;
    }
    if (tmp) {
      p = path.join(this.base, tmp);
    } else {
      p = this.base;
    }
    fs.readdir(p, function (err, list) {
      if (err) {
        return cb(err);
      }
      let actions = [];
      list.forEach(function (file) {
        let action = (function (f) {
          return function (done) {
            let abspath = path.join(p, f);
            fs.stat(abspath, function (err, stat) {
              if (err) {
                return done(err);
              }
              let node = {
                id: abspath.substr(self.base.length),
                text: f
              };
              if (stat.isDirectory()) {
                node.children = [];
              }
              done(null, node);
            });
          };
        })(file);
        actions.push(action);
      });
      async.parallelLimit(actions, 10, cb);
    });
  }

}

class BookRes {
  constructor(bpath) {
    this.base = bpath;
    this.resStat = {};
  }

  getImageData(img) {
    console.log(img);
    let matches = img.toDataURL().match(/^data:[A-Za-z-+]+\/([A-Za-z]+);base64,(.+)$/);

    return {
      type: matches[1],
      buffer: new Buffer(matches[2], 'base64')
    };
  }

  * saveImage (file, img) {
    let p, self = this;

    p = path.join(this.base, file, '..');
    let pathId = p.substr(this.base.length) || '.';
    p = path.join(p, '.res');
    if (!fs.existsSync(p)) {
      yield fsp.mkdir(p, '0755');
      this.resStat[pathId] = 0;
    } else if (this.resStat[pathId] == undefined) {
      let files = yield fsp.readdir(p);
      this.resStat[pathId] = files.length;
    };
    
    let imageData = this.getImageData(img);
    let imageName = (this.resStat[pathId] + 1) + '.' + imageData.type;
    yield fsp.writeFile(
      path.join(p, imageName),
      imageData.buffer
    );
    this.resStat[pathId]++;

    return path.join(p, imageName);
  }
}

module.exports = BookRes;
