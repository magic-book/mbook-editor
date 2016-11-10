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
    this._unsaved = false;

    this._change = (function () {
      this._unsaved = true;
    }).bind(this);
    this.editor.on('change', this._change);
    this.interval = setInterval(function () {
      if (!this._unsaved) {
        return;
      }
      co(this.save);
    }, 5000);
  }
  load() {
    let self = this;
    if (!this.file) {
      log.info('empty file');
      this.value = '';
      this.editor.setOption('readOnly', true);
      return;
    }
    this.editor.setOption('readOnly', false);

    co(function *() {
      let v = yield self.book.loadFile(self.file);
      self.value = v;
    }).catch(function (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
        self.value = '';
      } else {
        log.error('editor loading file content failed:', e.stack);
      }
    });
  }
  * save() {
    let self = this;
    this._unsaved = false;
    if (!this.file) {
      return;
    }
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
      log.info(`file saved: ${this.file}`);
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
    this.editCnt = editorContainer;
    // editorContainer.css;
    /**
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
    **/

    console.log(CodeMirror.keyNames);

    var editor = new CodeMirror(editorContainer[0], {
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
      extraKeys: {
        'Cmd-S': function () {
          if (!self.currentFile) {
            return;
          }
          co(function* () {
            yield self.currentFile.save();
            self.emit('save', self.currentFile.file, self.currentFile.value);
          }).catch(function (e) {
            log.error('save file error:', e.message);
          });
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
      if (!self.currentFile) {
        return;
      }
      self.emit('change', self.currentFile.file, self.editor.getValue());
    });

    editor.on('scroll', function (cm) {
      let top = cm.display.scroller.scrollTop;
      let lineNum = cm.lineAtHeight(top, 'local');
      log.debug('editor scroll to line:', lineNum, 'height', top);
      self.emit('scroll', {
        top: top,
        line: lineNum
      });
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
      self.currentFile = file;

      file.load();
    }).catch(function (e) {
      log.error(e);
    });
  }

  insertCurrent(content) {
    let cursor = this.editor.getCursor();
    this.editor.replaceRange(content, cursor);
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
