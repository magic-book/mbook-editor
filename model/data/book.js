'use strict';

const fsp = require('fs-promise');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const BookMenu = require('./book_menu');

/**
 * @class Book
 */
class Book extends EventEmitter {
  /**
   * [constructor description]
   * @param  {Object} option
   *         - root {String} book abs root
   */
  constructor(option) {
    super();
    this.root = option.root;
    this.menu = new BookMenu(option);
  }
  * loadFile(file) {
    let fpath = path.join(this.root, file);
    let data = yield fsp.readFile(fpath);
    return data.toString();
  }
  * saveFile(file, data) {
    let fpath = path.join(this.root, file);
    yield fsp.mkdirs(path.dirname(fpath));
    yield fsp.writeFile(fpath, data);
  }
}

module.exports = Book;
