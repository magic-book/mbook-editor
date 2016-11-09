'use strict';
const marked = require('../../lib/marked');
const UIBase = require('./ui_base');
const log = require('../../lib/log');
const path = require('path');

class Preview extends UIBase {
  constructor(options) {
    super();
    const renderer = new marked.Renderer();
    const resRoot = options.book.src;
    renderer.image = function (href, title, text) {
      var out = '<img src="' + path.join(resRoot, href) + '" alt="' + text + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out +=  '/>';
      return out;
    };

    marked.setOptions({
      renderer: renderer,
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      highlight: function (code) {
        return require('highlight.js').highlightAuto(code).value;
      }
    });
    this.cnt = options.container.find('.inner');
    this.outerCnt = options.container;
    this.currentLine = 0;
  }
  /**
   * render markstring
   */
  render(mdString) {
    let self = this;
    // TODO change mdString to html
    marked(mdString || '', function (err, data) {
      if (err) {
        return log.error(err);
      }
      self.cnt.html(data);
      self.buildMap();
    });
  }
  buildMap() {
    let map = {};
    this.cnt.find('line').each(function () {
      let tmp = this.getAttribute('num');
      map[tmp] = this.offsetTop;
    });
    this.map = map;
  }
  findLine(line) {
    while (!this.map[line]) {
      line--;
      if (line < 0) {
        line = 0;
        break;
      }
    }
    return line;
  }
  scrollToFlag(data) {
    let line = data.line + 1;
    let targetLine = this.findLine(line);
    let offset = this.map[targetLine] || 0;
    log.debug('preview scroll:', line, targetLine, offset);
    if (offset === this.outerCnt.scrollTop()) {
      return;
    }
    this.outerCnt.stop(true).animate({
      scrollTop: offset + 'px'
    });
  }
}

module.exports = Preview;
