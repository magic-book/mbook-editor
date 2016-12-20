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

const path = require('path');
const CodeMirror = require('codemirror');
const log = require('../../lib/log');
const UIBase = require('./ui_base');
const co = require('co');
const $ = require('jquery');

const listRE = /^(\s*)(>[> ]*|[*+-]\s|(\d+)\.)(\s*)/;
const emptyListRE = /^(\s*)(>[> ]*|[*+-]|(\d+)\.)(\s*)$/;
const unorderedListRE = /[*+-]\s/;

CodeMirror.commands.newlineAndIndentContinueMarkdownList = function (cm) {
  if (cm.getOption('disableInput')) {
    return CodeMirror.Pass;
  }

  let ranges = cm.listSelections();
  let replacements = [];

  for (var i = 0; i < ranges.length; i++) {
    let pos = ranges[i].head;
    let eolState = cm.getStateAfter(pos.line);
    let inList = eolState.list !== false;
    let inQuote = eolState.quote !== 0;
    let line = cm.getLine(pos.line);
    let match = listRE.exec(line);

    if (!ranges[i].empty() || (!inList && !inQuote) || !match) {
      cm.execCommand('newlineAndIndent');
      return;
    }
    if (emptyListRE.test(line)) {
      cm.replaceRange('', {
        line: pos.line, ch: 0
      }, {
        line: pos.line, ch: pos.ch + 1
      });
      replacements[i] = '\n';
    } else {
      let indent = match[1];
      let after = match[4];
      let bullet = unorderedListRE.test(match[2]) || match[2].indexOf('>') >= 0 ?
        match[2] : (parseInt(match[3], 10) + 1) + '.';

      replacements[i] = '\n' + indent + bullet + after;
    }
  }

  cm.replaceSelections(replacements);
};

/**
 * 编辑文件类
 */
class File extends UIBase {
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
    this.loaded = false;
    this._unsaved = false;
    this.editor.on('change', this._change.bind(this));
  }
  load() {
    let self = this;
    if (!this.file) {
      log.info('empty file');
      this.value = '';
      this.editor.setOption('readOnly', true);
      setTimeout(function () {
        self.loaded = true;
        self.emit('load');
      }, 0);
      return;
    }
    this.editor.setOption('readOnly', this.book.readOnly);

    co(function *() {
      let v = yield self.book.loadFile(self.file);
      self.value = v;
      self.editor.getDoc().clearHistory();
      setTimeout(function () {
        self.loaded = true;
        self.emit('load');
      }, 0);
    }).catch(function (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
        self.value = '';
        self.editor.getDoc().clearHistory();
        setTimeout(function () {
          self.loaded = true;
          self.emit('load');
        }, 0);
      } else {
        log.error('editor loading file content failed:', e.stack);
      }
    });
  }
  _change() {
    if (!this.loaded) {
      return;
    }
    this._unsaved = true;
  }
  * save() {
    let self = this;
    if (!this.file || !this._unsaved) {
      return;
    }
    this._unsaved = false;
    log.debug('write file content into disk');
    yield self.book.saveFile(self.file, self.value);
  }
  get value() {
    return this.editor.getValue();
  }
  set value(v) {
    this.editor.setValue(v);
  }
  * close(doNotSave) {
    clearInterval(this.interval);
    if (!doNotSave) {
      yield this.save();
      log.debug(`file saved before close: ${this.file}`);
    }
    this.interval = null;
    this.file = null;
    this.title = null;
    this.book = null;
    this.editor.off('change', this._change);
    this.editor = null;
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

    this.book = options.book;
    this.editCnt = editorContainer.find('.editor-cnt');

    var editor = new CodeMirror(this.editCnt[0], {
      lineNumbers: false,
      lineWrapping: true,
      lineSeparator: '\n',
      mode: 'gfm',
      theme: 'base16-light',
      indentUnit: 2,
      tabSize: 2,
      styleActiveLine: true,
      showCursorWhenSelecting: true,
      matchBrackets: true,
      readOnly: true,
      viewportMargin: 20,
      extraKeys: {
        'Cmd-S': function () {
          log.debug('[hot-key]save file');
          self.saveFile();
        },
        'Ctrl-S': function () {
          log.debug('[hot-key]save file');
          self.saveFile();
        },
        'Alt-X': function () {
          self.emit('cut');
        },
        'Enter': 'newlineAndIndentContinueMarkdownList',
        'Home': 'goLineLeft',
        'End': 'goLineRight'
      }
    });
    editor.on('change', function () {
      if (!self.currentFile || !self.currentFile.loaded) {
        return;
      }
      saveBtn.addClass('file-change');
      self.emit('change', {
        title: self.currentFile.title,
        file: self.currentFile.file,
        value: self.currentFile.value
      });
      // save file delay 3's
      if (self.intervalDelaySave) {
        return; // clearTimeout(self.intervalDelaySave);
      }
      self.intervalDelaySave = setTimeout(function () {
        self.intervalDelaySave = null;
        log.info('auto_save', self.currentFile.file);
        self.saveFile();
      }, 3000);
    });

    editor.on('scroll', function (cm) {
      let top = cm.display.scroller.scrollTop;
      let lineNum = cm.lineAtHeight(top, 'local');
      // log.debug('editor scroll to line:', lineNum, 'height', top);
      self.emit('scroll', {
        top: top,
        line: lineNum
      });
    });

    $('#edit_btn_cut').on('click', function () {
      self.emit('cut');
    });

    let saveBtn = $('#edit_btn_save');
    saveBtn.on('click', function () {
      log.debug('[toolbar]save file');
      self.saveFile();
    });
    this.on('save', function () {
      saveBtn.removeClass('file-change');
    });
    this.editor = editor;
  }
  renameFile(data) {
    if (!this.currentFile) {
      return;
    }
    if (this.currentFile.file === data.src) {
      this.currentFile.file = data.dest;
    }
  }
  openFile(data) {
    let self = this;
    let fileName = data.file;
    co(function* () {
      if (self.currentFile) {
        log.info('close old file:', self.currentFile.file);
        yield self.currentFile.close();
      }
      log.info('load new file:', fileName);
      data = data || {};
      let file = new File({
        file: fileName,
        title: data.title || 'untitled',
        book: self.book,
        editor: self.editor
      });
      file.once('load', function () {
        self.emit('load', {
          title: file.title,
          file: file.file,
          value: file.value
        });
      });
      self.currentFile = file;

      file.load();
      self.editor.focus();
    }).catch(function (e) {
      log.error(e);
    });
  }
  saveFile() {
    let self = this;
    if (!self.currentFile) {
      return;
    }
    co(function* () {
      yield self.currentFile.save();
      self.emit('save', self.currentFile.file, self.currentFile.value);
    }).catch(function (e) {
      log.error('save file error:', e.message);
    });
  }

  insertCurrent(type, content) {
    if (!this.currentFile) {
      return;
    }
    let cursor = this.editor.getCursor();
    switch (type) {
      case 'image':
        content = '![](' + this.resolvePathToRelative(content) + ')';
        break;
    }
    this.editor.replaceRange(content || '', cursor);
  }

  resize() {
    let cnt = this.editCnt;
    let parent = cnt.parent();
    cnt.css({
      height: (parent.height() - 36 - 20) + 'px'
    });

    this.editor.refresh();
  }
  resolvePathToRelative(file) {
    let curFileName = this.currentFile.file;
    //  /abc/test.md
    let tmp = curFileName.split(path.sep);
    let depth = tmp.length - 2;
    let reltoRoot = [];
    for (let i = 0; i < depth; i++) {
      reltoRoot.push('..');
    }
    return path.join(reltoRoot.join(path.sep), file);
  }
}

module.exports = Editor;
