'use strict';

const fsp = require('fs-promise');
const path = require('path');
const marked = require('marked');

const EventEmitter = require('events').EventEmitter;

/**
 * @class Book
 */
class BookMenu extends EventEmitter {
  /**
   * [constructor description]
   * @param  {Object} option
   *         - root {String} book abs root
   */
  constructor(options) {
    super();
    this.root = options.root;
    this.menuFile = path.join(options.root, './SUMMARY.md');
  }
  * load() {
    let data = yield fsp.readFile(this.menuFile);
    let tokens = marked.lexer(data.toString());
    let res = this.parse(tokens);
    return res;
  }
  * save(data) {
    if (typeof data === 'object') {
      data = this.stringify(data);
    }
    yield fsp.writeFile(this.menuFile, data);
  }
  parse(tokens) {
    let stack = [];
    var root = {
      id: 'root',
      text: 'root'
    };
    let currentItem = root;
    let currentList;
    let self = this;
    let tmp;
    if (!tokens.length) {
      return [];
    }
    tokens.forEach(function (n) {
      switch (n.type) {
        case 'heading':
          break;
        case 'list_start':
          currentItem.children = [];
          currentList = currentItem.children;
          break;
        case 'list_item_start':
          stack.push(currentItem);
          currentItem = {};
          currentList.push(currentItem);
          break;
        case 'text':
          tmp = self.parseText(n.text);
          currentItem.text = tmp.name;
          currentItem.id = tmp.link;
          break;
        case 'list_item_end':
          currentItem = stack.pop();
          currentList = currentItem.children;
          break;
        case 'list_end':
          break;
      }
    });
    return root.children;
  }
  stringify(data, indent) {
    let res = [];
    let self = this;
    if (indent === undefined) {
      indent = 0;
    }
    function _indent(n) {
      let str = '';
      for (let i = 0; i < n; i++) {
        str += '  ';
      }
      return str;
    }
    data.forEach(function (n) {
      res.push(_indent(indent) + '* [' + n.text + '](' + n.id + ')');
      if (n.children) {
        res = res.concat(self.stringify(n.children, indent + 1));
      }
    });
    return indent === 0 ? res.join('\n') : res;
  }
  parseText(txt) {
    let len = txt.length;
    let i;
    for (i = 1; i < len; i++) {
      if (txt[i] === ']' && txt[i - 1] !== '\\') {
        break;
      }
    }
    let name = txt.substr(1, i - 1);
    let link = txt.substr(i + 2, len - i - 3);
    return {name: name, link: link};
  }
}

module.exports = BookMenu;
