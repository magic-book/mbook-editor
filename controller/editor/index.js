'use strict';

require('jstree');
require('ace-builds/src/ace');
require('ace-builds/src/mode-markdown');

const $ = require('jquery');
const co = require('co');
const view = require('../../lib/view');
const log = require('../../lib/log');
const BookRes = require('../../lib/book_file.js');

const Book = require('../../model/data/book');
const Menu = require('../../model/ui/menu');
const Editor = require('../../model/ui/editor');
const Preview = require('../../model/ui/preview');

const clipboard = require('electron').clipboard;
const {BrowserWindow} = require('electron').remote;

class AppEditor {
  constructor(options) {
    let self = this;

    this.init(options);
    log.info('app_editor inited');

    co(function *() {
      yield self.load();
    }).catch(function (err) {
      log.error('book init error', err.stack);
    });
  }

  init(option) {
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
      root: option.bookRoot
    });
    this.book = book;

    let menu = new Menu({
      book: book,
      container: $('.menu .inner')
    });
    this.menu = menu;

    let editor = new Editor({
      book: book,
      container: $('#editor')
    });
    this.editor = editor;

    let bookres = new BookRes(option.bookRoot);
    this.bookres = bookres;

    /**
     * preview
     * @type {Preview}
     */
    let preview = new Preview({
      book: book,
      container: $('#preview')
    });
    this.preview = preview;


    this.menu.on('open_file', function (file) {
      editor.createTab(file);
    });


    this.editor.on('change', function (file, value) {
      /*

       if (self.menu.isMenuFile(file)) {
        co(function *() {
          yield self.menu.render();
        }).catch(function (err) {
          log.error(err);
        });

      } else {
        */
        preview.render(value);
      // }
    });
    this.editor.on('save', function (file, value) {
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
      console.log(e);
      console.log(clipboard.availableFormats());
      console.log(clipboard.readText());

      function * pasteImage(img) {
        let cursor = self.editor.editor.getCursor();
        let path = yield self.bookres.saveImage(self.editor.currentTab.file, img);
        self.editor.paste('![](' + path + ')', cursor);
      }

      let dataFormats = clipboard.availableFormats();
      
      // TODO: use system tools to paste
      if (dataFormats.length == 0) {
      
      } else if (dataFormats.lastIndexOf('image/png') != -1) {
        co(pasteImage(clipboard.readImage())).catch(function(e) {
          console.log(e.stack);
          log.error('save image to local error', e);
        });
      /* TODO:in gnome, file in clipboard is saved as x-special/gnome-copied-files.
       * electron clipboard can use readText to get its adsolute path.
       * but i dont know how to find the difference between the plain text and the image
       */
      } else if (dataFormats.lastIndexOf('text/plain') != -1) {
        let data = clipboard.readText();
        if (data.match(/\.(bmp|gif|jpeg|jpg|tif|tiff|ico)/)) {
          if (confirm('Paste image?')) {
            e.preventDefault();
            co(pasteImage(data)).catch(function(e) {
              console.log(e.stack);
              log.error('copy local image to project error', e);    
            });
          }
        }
      }
    }, true);
  }
  * load() {
    yield this.menu.render();
    log.debug('menu ok');
  }
  resize() {
    $('#editor').height($(window).height() - 2);
    this.menu.resize();
    this.editor.resize();
    this.preview.resize();
  }
  destroy() {

  }
}

module.exports = AppEditor;
