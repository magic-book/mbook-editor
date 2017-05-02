/**
 * webworker file, run in window.Worker
 * and wrap by webworkify
 */
'use strict';

const path = require('path');
const marked = require('../../lib/marked');
const G = typeof window !== 'undefined' ? window : global;
const renderer = new marked.Renderer();

console.log('[worker] init');

let resRoot;

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

function resolvePath(base, file) {
  if (file.startsWith('/')) {
    return file;
  } else {
    return path.join(path.dirname(base), file);
  }
}

function resolveRes(file, md) {
  let regImg = /(\!\[[^\]]*\]\()([^\)]*)(\))/g;
  return md.replace(regImg, function (m0, m1, m2, m3) {
    m2 = resolvePath(file, m2);
    return m1 + m2 + m3;
  });
}

G.onmessage = function (msg) {
  let data = msg.data;
  console.log('[worker] receive data', data); // eslint-disable-line
  let file = data.file;
  let md = data.md;
  let title = data.title;
  resRoot = data.resRoot;
  marked(resolveRes(file, md) || '', (err, data) => {
    if (err) {
      return this.postMessage({
        error: err
      });
    }
    // console.log('>>>>', data);
    this.postMessage({
      data: {
        title: title,
        body: data
      }
    });
  });
};
