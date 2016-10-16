'use strict';
const marked = require('marked');
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
    });
  }
}

module.exports = Preview;
