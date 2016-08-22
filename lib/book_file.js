/**
 * 物理文件管理，主要的功能
 *
 *  资源文件写入，
 *  资源文件核对、清理
 *
 */
'use strict';

const fs = require('fs');
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
