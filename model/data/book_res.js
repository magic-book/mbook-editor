'use strict';
const fsp = require('fs-promise');
const path = require('path');
const Events = require('events');
/**
 * @class BookRes
 */
class BookResource extends Events {
  /**
   * [constructor description]
   * @param  {Object} options
   *         - root {String} book abs root
   */
  constructor(options) {
    super();
    this.root = path.join(options.root, '_res');
  }
  /**
   * 保存文件
   * @param {String} referer 基于bookroot的路径，资源文件的引用
   * @param {String} file 基于bookroot的路径
   * @param {Buffer|String} data  文件内容
   * @param {Object} 其他参数，暂时无用
   */
  * saveFile(fileName, data, options) {
    let filePath = yield this.genFileName(fileName);
    yield fsp.mkdirs(path.dirname(filePath));
    yield fsp.writeFile(filePath, data);
  }
  * genFileName(filename) {
    let ext = path.extname(filename);
    let nameWithoutExt = filename.substr(0, filename.length - ext.length);
    let p = path.join(this.root, filename);
    let count = 1;
    while (yield fsp.exists(p)) {
      p = path.join(this.root, nameWithoutExt, '_' + count, ext);
      count++;
    }
    return p;
  }
  /**
   * ====== 请勿删除 =====
   * 罗列文件
   * @param  {[type]}   tmp [description]
   * @param  {Function} cb  [description]
   * @return {[type]}       [description]
   *
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
  */
}

module.exports = BookResource;
