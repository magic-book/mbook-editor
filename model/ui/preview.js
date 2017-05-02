'use strict';
const marked = require('../../lib/marked');
const UIBase = require('./ui_base');
const log = require('../../lib/log');
const path = require('path');
const request = require('request');
const qs = require('querystring');
const fs = require('fs');
const os = require('os');
const webworker = require('webworkify');

function resolvePath(base, file) {
  return path.join(path.dirname(base), file);
}

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
    this.resRoot = resRoot;
    this.cnt = options.container.find('.inner');
    this.title = options.container.find('.title');
    this.outerCnt = options.container;
    this.currentLine = 0;

    // this.worker = webworker(require('./webworker_render.js'));

    var src = fs.readFileSync(require.resolve('./webworker_render.js')).toString();
    var blob = new Blob([src], {type: 'text/javascript'});
    var workerUrl = URL.createObjectURL(blob);
    var worker = new Worker(workerUrl);
    var self = this;
    // worker.objectURL = workerUrl;
    worker.onmessage = function (msg) {
      msg = msg.data;
      if (msg.error) {
        return log.error(msg.error);
      }
      var data = msg.data;
      self.cnt.html(data.body);
      self.title.html(data.title);
      self.buildMap();
    };
    this.worker = worker;
  }
  /**
   * render markstring
   */
  render(data) {
    let self = this;
    let file = data.file;
    let title = data.title;
    let mdString = data.value;

    this.worker.postMessage({
      resRoot: self.resRoot,
      file: file,
      md: mdString,
      title: title
    });
    /*
    setTimeout(function () {
      // request.get('http://unix:' + sockPath + ':/?' + qs.stringify({
      request.get('http://127.0.0.1:43210/?' + qs.stringify({
        resRoot: self.resRoot,
        file: file,
        md: mdString
      }), function (err, data) {
        if (err) {
          log.error(err);
        } else {
          self.cnt.html(JSON.parse(data.body).data);
          self.title.html(title);
          self.buildMap();
        }
        log.info(err, data);
      });
    }, 0);
    */
    /*
    // TODO change mdString to html
    marked(this.resolveRes(file, mdString) || '', function (err, data) {
      if (err) {
        return log.error(err);
      }
      self.cnt.html(data);
      self.title.html(title);
      self.buildMap();
    });
    */
  }
  buildMap() {
    let map = {};
    this.cnt.find('line, tr').each(function () {
      let tmp = this.getAttribute('num');
      let offset = this.offsetTop;
      let node = this;
      while (node.offsetParent) {
        node = node.offsetParent;
        offset += node.offsetTop;
      }
      map[tmp] = offset;
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
    if (offset === this.cnt.scrollTop()) {
      return;
    }
    this.cnt.stop(true).animate({
      scrollTop: offset + 'px'
    }, 'fast', 'swing');
  }
  resolveRes(file, md) {
    let regImg = /(\!\[[^\]]*\]\()([^\)]*)(\))/g;
    return md.replace(regImg, function (m0, m1, m2, m3) {
      m2 = resolvePath(file, m2);
      return m1 + m2 + m3;
    });
  }
}

module.exports = Preview;
