'use strict';
const fsp = require('fs-promise');
const path = require('path');
const Events = require('events');
const log = require('../../lib/log');
/**
 * @class BookRes
 */
class BookResource extends Events {
  /**
   * [constructor description]
   * @param  {Object} options
   *         - root {String} book abs root
   *         - resDirName {String}
   */
  constructor(options) {
    super();
    if (!options.resDirName) {
      options.resDirName = '_res';
    }
    this.resDirName = options.resDirName;
    this.root = path.join(options.root, options.resDirName);
  }
  /**
   * 保存文件
   * @param {String} referer 基于bookroot的路径，资源文件的引用
   * @param {String} file 基于bookroot的路径
   * @param {Buffer|String} data  文件内容
   * @param {Object} options 其他参数，暂时无用
   */
  * saveFile(file, data) {
    let fileName = yield this.genFileName(file);
    let filePath = path.join(this.root, fileName);
    yield fsp.mkdirs(path.dirname(filePath));
    yield fsp.writeFile(filePath, data);
    return '/' + this.resDirName + '/' + fileName;
  }
  * genFileName(filename) {
    let ext = path.extname(filename);
    let nameWithoutExt = filename.substr(0, filename.length - ext.length);
    let p = path.join(this.root, filename);
    let count = 1;
    while (yield fsp.exists(p)) {
      count++;
    }
    return nameWithoutExt + '_' + count + ext;
  }
  * getImageData(img) {
    let imageBuffer;
    let imageName;
    let imageType;

    if (typeof img !== 'string') {
      let nativeImage = img.nativeImage;
      let imageHtml = img.html;
      let matches = nativeImage.toDataURL().match(/^data:[A-Za-z-+]+\/([A-Za-z]+);base64,(.+)$/);
      imageType = matches[1];
      imageBuffer = new Buffer(matches[2], 'base64');
      if (imageHtml) {
        matches = imageHtml.match(/src=\".*\/([^\/\.\"]*).*\"/);
        imageName = matches[1].replace(/[\?\;]/g, '_') + '.' + imageType;
      } else {
        imageName = new Date().getTime() + '.' + imageType;
      }
    } else {
      log.info('>>>> parse image', img);
      let matches = img.match(/\/([^\/\.]*)\.(.+)$/);
      if (matches) {
        imageName = matches[1] + '.' + matches[2];
        imageBuffer = yield fsp.readFile(img);
      } else {
        throw new Error('invalid image path: ', img);
      }
    }
    return {
      name: imageName,
      buffer: imageBuffer
    };
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
