/**
 * 编辑器，支持多文件同时打开(tab形式)
 */
require('codemirror/mode/markdown/markdown');
const CodeMirror = require('codemirror');
const log = require('../../lib/log');
const UIBase = require('./ui_base');
const co = require('co');

class TabEditor extends UIBase {
  /**
   * [constructor description]
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

    this.editor.on('change', function (evt) {
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
    log.info('>> load file to editor');
    co(function *() {
      let v = yield self.book.loadFile(self.file);
      self.value = v;
    }).catch(function (e) {
      log.error(e);
    });
  }
  save() {
    let self = this;
    this._unsaved = false;
    if (this.file === 'untitled') {
      // popup rename dialog
      return;
    }
    co(function *() {
      yield self.book.saveFile(self.file, self.value);
    }).catch(function (e) {
      console.log(e.stack);
      log.error('save file error', e);
    });
  }
  get value() {
    return this.editor.getValue();
  }
  set value(v) {
    this.editor.setValue(v);
  }
}

class Editor extends UIBase {
  constructor(options) {
    super();
    let self = this;
    let editorContainer = options.container;

    this.tabs = {};
    this.book = options.book;
    this.editCnt = editorContainer;
    // editorContainer.css;

    var editor = new CodeMirror(editorContainer[0], {
      lineNumbers: false,
      lineSeparator: '\n',
      mode: 'markdown',
      indentUnit: 2,
      tabSize: 2,
      extraKeys: {
        'Cmd-S': function () {
          if (!self.currentTab) {
            return;
          }
          self.currentTab.save();
          self.emit('save', self.currentTab.file, self.currentTab.value);
        }
      }
    });

    editor.on('change', function (evt) {
      if (!self.currentTab) {
        return;
      }
      self.emit('change', self.currentTab.file, self.editor.getValue());
    });

    this.editor = editor;
    this.createTab();
  }
  createTab(file) {
    file = file || 'untitled';
    let self = this;
    let tab = this.getTabByFile(file || 'untitled');
    if (!tab) {
      log.info('create new tab', file);
      tab = new TabEditor({
        file: file,
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
    log.warn('>>>> editor resize');
    let cnt = this.editCnt;
    let parent = cnt.parent();
    cnt.css({
      height: parent.height() + 'px'
    });

    this.editor.refresh();
  }
}

module.exports = Editor;
