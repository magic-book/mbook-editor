'use strict';

const fsp = require('fs-promise');
const path = require('path');
const Events = require('events');
const BookMenu = require('./book_menu');
const BookRes = require('./book_res');
const log = require('../../lib/log');

/**
 * @class Book
 */
class Book extends Events {
  /**
   * @param  {Object} options
   *         - root {String} book abs root
   */
  constructor(options) {
    super();
    this.root = options.root;
    this.loadBookInfo();
    this.src = path.join(options.root, this.bookInfo.root);
    /**
     * 菜单
     * @type {BookMenu}
     */
    this.menu = new BookMenu({
      root: this.src
    });
    /**
     * 资源管理
     * @type {BookRes}
     */
    this.res = new BookRes({
      root: this.src
    });
  }
  loadBookInfo() {
    let file = path.join(this.root, 'book.json');
    let bookInfo;
    try {
      bookInfo = require(file);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        log.warn('book.json not found');
      } else {
        log.error('book.json error:', e.message);
      }
      bookInfo = {
        root: './src'
      };
    }
    this.bookInfo = bookInfo;
  }
  * loadFile(file) {
    let fpath = path.join(this.src, file);
    let data = yield fsp.readFile(fpath);
    return data.toString();
  }
  * saveFile(file, data) {
    if (!path.extname(file)) {
      return log.error('file should have .md ext');
    }
    let fpath = path.join(this.src, file);
    let dpath = path.dirname(fpath);
    let exists = yield fsp.exists(dpath);
    if (!exists) {
      yield fsp.mkdirs(dpath);
    }
    yield fsp.writeFile(fpath, data);
  }
  * deleteFile(file) {
    let fpath = path.join(this.src, file);
    yield fsp.unlink(fpath);
  }
  * renameFile(src, dest) {
    if (src === dest) {
      return;
    }
    src = path.join(this.src, src);
    dest = path.join(this.src, dest);
    let exists = yield fsp.exists(src);
    if (!exists) {
      return;
    }
    yield fsp.mkdirs(path.dirname(dest));
    yield fsp.rename(src, dest);
  }
}

module.exports = Book;
