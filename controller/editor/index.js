'use strict';

const $ = require('jquery');
const co = require('co');
const fs = require('fs');
const path = require('path');
const mmm = require('mmmagic');
const Magic = mmm.Magic;
const view = require('../../lib/view');
const log = require('../../lib/log');

const BaseCtrl = require('../base_controller');
const Book = require('../../model/data/book');
const Menu = require('../../model/ui/menu');
const Editor = require('../../model/ui/editor');
const Preview = require('../../model/ui/preview');
const ClipBoard = require('../../model/data/clipboard');

class AppEditor extends BaseCtrl {
  /**
   * @param  {Object} options
   *         - bookRoot
   */
  constructor(options) {
    super(options);
    let self = this;

    this.init(options);
    log.info('app_editor inited');

    co(function *() {
      yield self.load();
    }).catch(function (err) {
      log.error('book init error', err.stack);
    });
  }

  init(options) {
    let self = this;
    // init layout
    view.render(options.container, 'editor.html', {
      autosave: false,
      keyboardShortcut: function (str) {
        return str;
      }
    });
    let book = new Book({
      root: options.bookRoot
    });
    this.book = book;
    log.info('init book model');

    let menu = new Menu({
      book: book,
      container: $('#menu')
    });
    this.menu = menu;
    log.info('init book menu');

    let editor = new Editor({
      book: book,
      container: $('#editor')
    });
    this.editor = editor;
    log.info('init book editor');

    let magic = new Magic(mmm.MAGIC_MIME_TYPE);
    this.magic = magic;

    let clipboard = new ClipBoard({
      book: book,
      editor: editor,
      magic: magic
    });
    this.clipboard = clipboard;
    /**
     * preview
     * @type {Preview}
     */
    let preview = new Preview({
      book: book,
      container: $('#preview')
    });
    this.preview = preview;
    log.info('init book preview');


    this.menu.on('open_file', function (title, file) {
      if (!file || !path.extname(file)) {
        log.error('can not openfile when file is unknow or file without .md ext');
      }
      editor.openFile({
        file: file,
        title: title
      });
    });

    this.menu.on('rename_file', function (data, done) {
      self.editor.renameFile(data);
      co(function* () {
        if (!Array.isArray(data)) {
          data = [data];
        }
        for (let i = 0; i < data.length; i++) {
          yield self.book.renameFile(data[i].src, data[i].dest);
        }
        done && done();
      }).catch(function (e) {
        log.error('rename file error', e);
        done && done(e.message);
      });
    });

    this.editor.on('change', function (file, value) {
      preview.render(value);
    });

    this.editor.on('save', function (file) {
      if (self.menu.isMenuFile(file)) {
        log.info('menu file saved, reload menu');
        co(function *() {
          yield self.menu.render();
        }).catch(function (err) {
          log.error(err);
        });
      }
    });
    // 绑定黏贴事件
    window.addEventListener('paste', function (e) {
      self.clipboard.paste(e);
    }, true);
  }
  * load() {
    yield this.menu.render();
    log.debug('menu ok');
  }
  resize() {
    $('#main').height($(window).height() - 40);
    this.menu.resize();
    this.editor.resize();
    this.preview.resize();
  }
  destroy() {
    super.destroy();
  }
}

module.exports = AppEditor;
