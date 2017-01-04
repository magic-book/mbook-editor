'use strict';
const marked = require('../../lib/marked');
const log = require('../../lib/log');
const path = require('path');

function resolvePath(base, file) {
  return path.join(path.dirname(base), file);
}

class Renderer {
  /**
   * [constructor description]
   * @param  {Object} options
   *         bookRoot {String}
   *         type {String} 默认html，还可以是 pdf
   *
   * @return {[type]}         [description]
   */
  constructor(options) {
    const renderer = new marked.Renderer();
    const bookRoot = options.bookRoot;
    const type = options.type || 'html';

    this.type = type;

    renderer.image = function (href, title, text) {
      var out = '<img src="' + type === 'pdf' ? href : path.join(bookRoot, href) + '" alt="' + text + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out +=  '/>';
      return out;
    };
    switch (type) {
      case 'html':
        renderer.image = function (href, title, text) {
          var out = '<img src="' + type === 'pdf' ? href : path.join(bookRoot, href) + '" alt="' + text + '"';
          if (title) {
            out += ' title="' + title + '"';
          }
          out +=  '/>';
          return out;
        };
        break;

      case 'pdf':
        renderer.image = function (href, title, text) {
          var out = '<img src="' + type === 'pdf' ? href : path.join(bookRoot, href) + '" alt="' + text + '"';
          if (title) {
            out += ' title="' + title + '"';
          }
          out +=  '/>';
          return out;
        };
        renderer.heading = function (text, level) {
          return `<h${level} class="book-chapter book-chapter-${level}">${text}</h${level}>\n`;
        };
        var originLink = renderer.link;
        renderer.link = function (href, title, text) {
          if (href.startsWith('/')) {
            href = './' + href.substr(1);
          }
          href = href.replace(/\.md$/i, '.html');
          return originLink.apply(renderer, [href, title, text]);
        };
        break;
    }

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
  }
  /**
   * render markstring
   */
  render(data, cb) {
    let file = data.file;
    let mdString = data.value;
    // TODO change mdString to html
    marked(this.resolveRes(file, mdString) || '', (err, data) => {
      if (err) {
        cb(err);
      } else {
        cb(null, data);
      }
    });
  }
  /** 相对路径变绝对路径 */
  resolveRes(file, md) {
    let regImg = /(\!\[[^\]]*\]\()([^\)]*)(\))/g;
    return md.replace(regImg, function (m0, m1, m2, m3) {
      m2 = resolvePath(file, m2);
      return m1 + m2 + m3;
    });
  }
}

module.exports = Renderer;
