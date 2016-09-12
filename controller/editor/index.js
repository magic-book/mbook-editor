'use strict';

const $ = require('jquery');
const co = require('co');
const view = require('../../lib/view');
const log = require('../../lib/log');
const BaseCtrl = require('../base_controller');
const Book = require('../../model/data/book');
const Menu = require('../../model/ui/menu');
const Editor = require('../../model/ui/editor');
const Preview = require('../../model/ui/preview');
const clipboard = require('electron').clipboard;
const {BrowserWindow} = require('electron').remote;

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
    let body = document.querySelector('body');
    // init layout
    view.render(body, 'editor.html', {
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
      editor.createTab({
        file: file,
        title: title
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
    window.addEventListener('paste', function () {
      log.info('clipboard availableFormat:', clipboard.availableFormats());
      log.info('clipboard content:', clipboard.readText());
    });
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
