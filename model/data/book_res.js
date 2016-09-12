'use strict';

const fsp = require('fs-promise');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
/**
 * @class Book
 */
class Book extends EventEmitter {
  /**
   * [constructor description]
   * @param  {Object} options
   *         - root {String} book abs root
   */
  constructor(options) {
    super();
    this.root = options.root;
  }
  /**
   * 保存文件
   * @param {String} referer 基于bookroot的路径，资源文件的引用
   * @param {String} file 基于bookroot的路径
   * @param {Buffer|String} data  文件内容
   */
  * saveFile(referer, fileName, data) {
    let fileDir = path.dirname(referer);
    let filePath = path.join(fileDir, fileName);
    let fileAbsPath = path.join(this.root, filePath);
    yield fsp.mkdirs(path.dirname(fileAbsPath));
    // TODO 文件覆盖需要提醒
    yield fsp.writeFile(fileAbsPath, data);
  }
}

module.exports = Book;
