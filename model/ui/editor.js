/**
 * 编辑器，支持多文件同时打开(tab形式)
 */
'use strict';

require('codemirror/mode/gfm/gfm');
require('codemirror/mode/markdown/markdown');
require('codemirror/mode/stex/stex');
require('codemirror/addon/mode/overlay');
require('codemirror/addon/mode/multiplex');
require('codemirror/addon/scroll/simplescrollbars');
require('codemirror/addon/selection/active-line');

const CodeMirror = require('codemirror');
const log = require('../../lib/log');
const UIBase = require('./ui_base');
const co = require('co');

/**
 * 编辑器Tab
 */
class TabEditor extends UIBase {
  /**
   * @param  {Object} options
   *         - file {String}
   *         - book {Book}
   *         - editor {Editor}
   */
  constructor(options) {
    super();
    this.file = options.file;
    this.title = options.title;
    this.book = options.book;
    this.editor = options.editor;
    this._unsaved = false;

    let self = this;

    this.editor.on('change', function () {
      self._unsaved = true;
    });
  }
  load() {
    let self = this;
    if (!self.file || self.file === 'untitled') {
      log.info('empty file');
      self.value = '';
      return;
    }
    log.info('load file to editor');
    co(function *() {
      let v = yield self.book.loadFile(self.file);
      self.value = v;
    }).catch(function (e) {
      if (e.code === 'ENOENT') {
        self.value = '';
      } else {
        log.error(e);
      }
    });
  }
  * save() {
    let self = this;
    this._unsaved = false;
    if (this.file === 'untitled') {
      // popup rename dialog
      return;
    }
    yield self.book.saveFile(self.file, self.value);
    log.info();
  }
  get value() {
    return this.editor.getValue();
  }
  set value(v) {
    this.editor.setValue(v);
  }
}
/**
 * 主编辑器
 */
class Editor extends UIBase {
  constructor(options) {
    super();
    let self = this;
    let editorContainer = options.container;

    this.tabs = {};
    this.book = options.book;
    this.editCnt = editorContainer;
    // editorContainer.css;
    //
    CodeMirror.defineMode('mathdown', function (config) {
      var options = [];
      var ref = [['$$', '$$'], ['$', '$'], ['\\[', '\\]'], ['\\(', '\\)']];
      for (var i = 0, len = ref.length; i < len; i++) {
        var x = ref[i];
        options.push({
          open: x[0],
          close: x[1],
          mode: CodeMirror.getMode(config, 'stex')
        });
      }
      return CodeMirror.multiplexingMode.apply(CodeMirror, [CodeMirror.getMode(config, 'gfm')].concat([].slice.call(options)));
    });

    var editor = new CodeMirror(editorContainer[0], {
      lineNumbers: false,
      lineSeparator: '\n',
      mode: 'mathdown',
      theme: 'base16-light',
      indentUnit: 2,
      tabSize: 2,
      styleActiveLine: true,
      showCursorWhenSelecting: true,
      matchBrackets: true,
      extraKeys: {
        'Cmd-S': function () {
          if (!self.currentTab) {
            return;
          }
          co(function* () {
            yield self.currentTab.save();
            self.emit('save', self.currentTab.file, self.currentTab.value);
          }).catch(function (e) {
            log.error('save file error:', e.message);
          });
        }
      }
    });

    editor.on('change', function () {
      if (!self.currentTab) {
        return;
      }
      self.emit('change', self.currentTab.file, self.editor.getValue());
    });

    this.editor = editor;
    this.createTab();
  }
  createTab(data) {
    data = data || {};
    let file = data.file || 'untitled';
    let self = this;
    let tab = this.getTabByFile(file);
    if (!tab) {
      log.info('create new tab', data);
      tab = new TabEditor({
        file: file,
        title: data.title,
        book: self.book,
        editor: self.editor
      });
    }
    this.tabs[file] = tab;
    this.currentTab = tab;
    tab.load();
    return tab;
  }
  getTabByFile(file) {
    return this.tabs[file];
  }
  paste(content, pos) {
    this.editor.replaceRange(content, pos);
    this.editor.setCursor({
      line: pos.line,
      ch: pos.ch + 2
    });
  }
  resize() {
    log.warn('editor resize');
    let cnt = this.editCnt;
    let parent = cnt.parent();
    cnt.css({
      height: parent.height() + 'px'
    });

    this.editor.refresh();
  }
}

module.exports = Editor;
