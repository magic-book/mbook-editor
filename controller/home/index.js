'use strict';

const $ = require('jquery');
const fs = require('fs');
const view = require('../../lib/view');
const log = require('../../lib/log');
const msg = require('../../model/ui/message');
const path = require('path');
const simpleGit = require('simple-git');
const BaseCtrl = require('../base_controller');
const {dialog} = require('electron').remote;
require('jqmodal');

function isEmptyDir(p) {
  let dir = fs.readdirSync(p);
  dir = dir.filter(function (v) {
    if (/^\./.test(v)) {
      return false;
    }
    return true;
  });
  return dir.length === 0;
}

const Bookspace = require('../../model/data/bookspace');

class Home extends BaseCtrl {
  constructor(options) {
    super();
    this._sync();
    this.init(options);
    log.info('app_home inited');
  }

  init(options) {
    let self = this;
    view.render(options.container, 'home.html');
    self.renderUI();
  }

  resize() {
    $('.j-con-home').height($(window).height());
  }

  destroy() {
    super.destroy();
  }
  _sync() {
    this.container = null;
    this.bookspace = null;
    this.modalbox = null;
    let tplOpt = this.tplOpt = {
      getBookspaceTpl(item) {
        return `<li class="${item.icon ? '' : 'cover-failed'}" title="${item.path}">
                  <div class="cover j-trigger-openBook" data-path="${item.path}">
                    <img src="">
                    <div class="close j-trigger-removebook">
                      <i class="icon-close"></i>
                    </div>
                  </div>
                  <div class="titles">
                    <p class="name">${item.name}</p>
                    <p class="owner">${item.owner}</p>
                  </div>
                </li>`;
      },
      trigerTpl: `<li class="book-opt">
                    <div class="cover">
                      <div class="triggers">
                        <button class="j-trigger-newBook">[+] Create New Book</button>
                        <button class="j-trigger-openBook">[+] [~] Open Book</button>
                      </div>
                      <div class="close">
                        <i class="icon-close"></i>
                      </div>
                    </div>
                  </li>`
      ,
      getBookspacesTpl(bookspaces) {
        let tpls = bookspaces.map(tplOpt.getBookspaceTpl);
        tpls.push(tplOpt.trigerTpl);
        return `<ul class="bookspaces">${tpls.join('')}</ul>`;
      },
      dialogTpl(data) {
        return `<div class="modalContainer j-trigger-createmodal">
                  <div class="modal j-trigger-createmodal">
                    <div class="modal-heading">
                      <h4>Create New Book</h4><a href="javascript:;" class="modal-close j-trigger-closemodal">×</a>
                    </div>
                    <div class="modal-body">
                      <div class="modal-form">
                        <label>new book name, or git repository address: </label>
                        <input type="text" placeholder="My Awesome Book" onkeyup="document.querySelector('#preview_book_name').innerText = this.value.replace(/.*?([^:\/]+)\.git$/, '$1'); console.log(this.value)"/>
                        <p class="help-block">book will be stored at : ${data.root}/<span id="preview_book_name"></span></p>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="j-trigger-createBook">Create Book</button>
                      <button class="j-trigger-closemodal">Cancel</button>
                    </div>
                  </div>
                </div>
                <div class="modalContainer j-trigger-bookspacemodal">
                  <div class="modal j-trigger-createmodal">
                    <div class="modal-heading">
                      <h4>Setup Bookspace</h4>
                    </div>
                    <div class="modal-body">
                      <div class="modal-form">
                        <label>setup bookspace Path</label>
                        <div class="elem-choice">
                          <p type="text" class="elem-choiceinp" style="background:#eee; text-align:left; font-weight:bolder;">
                            ${data.defaultPath}
                          </p>
                          <p>
                          <button class="j-trigger-choicedir">change path</button>
                          </p>
                        </div>
                        <p class="help-block">new book will be created into this path.</p>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="j-trigger-bookspace">Submit</button>
                    </div>
                  </div>
                </div>
              `;
      }
    };
  }

  createDOM(bookspaces) {
    this.container.html(this.tplOpt.getBookspacesTpl(bookspaces) + this.tplOpt.dialogTpl({
      defaultPath: this.bookspace.getDefaultRoot(),
      root: this.bookspace.getRoot()
    }));
  }
  bindUI() {
    let self = this;
    this.modalbox.jqm({
      trigger: '.j-trigger-newBook',
      closeClass: 'j-trigger-closemodal',
      onHide(hash) {
        hash.w.hide() && hash.o && hash.o.remove();
      }
    });
    /**
     * 创建book按钮
     */
    this.container.on('click', '.j-trigger-createBook', () => {
      let inp = self.modalbox.find('input');
      let val = inp.val().trim();
      function getGitDirName(gitPath) {
        let tmp = gitPath.split(':')[1];
        let dirName = path.basename(tmp);
        return dirName.replace(/.git$/, '');
      }
      if (val) {
        if (/\.git$/.test(val)) {
          // git@git-service.com:$groupName/$projectName.git
          let git = simpleGit();
          git.clone(val, self.bookspace.getRoot(), function (err) {
            if (err) {
              msg.show(err);
            } else {
              let bookInfo = self.bookspace.createBook({
                name: getGitDirName(val)
              });
              self.container.find('.bookspaces .book-opt').before(this.tplOpt.getBookspaceTpl(bookInfo));
              self.modalbox.jqmHide();
              inp.val('');
            }
          });
        } else {
          let bookInfo = self.bookspace.createBook({
            name: val
          });
          self.container.find('.bookspaces .book-opt').before(this.tplOpt.getBookspaceTpl(bookInfo));
          self.modalbox.jqmHide();
          inp.val('');
        }
      } else {
        inp.css({
          border: '1px solid #f30'
        });
      }
    });
    /**
     * 打开已经创建的book
     */
    this.container.on('click', '.j-trigger-openBook', e => {
      let tgr = $(e.currentTarget);
      let bookPath = tgr.data('path');
      let bookRoot;
      if (bookPath) {
        bookRoot = path.resolve(bookPath);
      } else {
        let bookDir = dialog.showOpenDialog({
          properties: ['openDirectory']
        });
        bookRoot = bookDir && bookDir[0];
        let bookInfo = {};
        if (!bookRoot) {
          return;
        }
        try {
          bookInfo = require(path.join(bookRoot, './book.json'));
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            self.bookspace.createBook({
              name: 'newBook',
              path: bookRoot,
              empty: isEmptyDir(bookRoot)
            });
            bookInfo = require(path.join(bookRoot, './book.json'));
          } else {
            log.error('loading book.json failed', e.code, e.message);
            return;
          }
        }
        self.bookspace.importBook({
          name: bookInfo.title || 'Untitled',
          path: bookRoot
        });
      }
      bookRoot && this.emit('scene', {
        scene: 'editor',
        options: {
          bookRoot: bookRoot
        }
      });
    });
    /**
     * 删除book
     */
    this.container.on('click', '.j-trigger-removebook', e => {
      e.stopPropagation();

      let tgr = $(e.currentTarget);
      let bookTgr = tgr.parent();
      let bookPath = bookTgr.data('path');
      self.bookspace.remove(path.resolve(bookPath));
      bookTgr.closest('li').remove();
    });
    /**
     * [description]
     * @param  {[type]} e [description]
     * @return {[type]}   [description]
     */
    this.container.on('click', '.j-trigger-choicedir', e => {
      let bookspaceDir = dialog.showOpenDialog({
        properties: ['openDirectory'], defaultPath: Bookspace.defaultBookSpace
      });
      if (bookspaceDir && bookspaceDir[0]) {
        self.container.find('.elem-choiceinp').text(bookspaceDir[0]);
      }
    });
    /**
     * 设置bookspace root
     */
    this.container.on('click', '.j-trigger-bookspace', e => {
      let val = this.container.find('.elem-choiceinp').text().trim();
      if (val) {
        self.bookspace.setRoot(val);
        self.container.find('.j-trigger-bookspacemodal').jqmHide();

        // this.container.find('.bookspaces').remove();
        // this.container.prepend(this.tplOpt.getBookspacesTpl(this.bookspace.retrieve()));
      }
    });
  }
  renderUI() {
    this.container = $('.j-con-home');
    this.bookspace = new Bookspace();
    this.createDOM(this.bookspace.retrieve());

    if (!this.bookspace.getRoot()) {
      let modal = this.container.find('.j-trigger-bookspacemodal');
      modal.jqm();
      modal.jqmShow();
    }

    this.modalbox = this.container.find('.j-trigger-createmodal');
    this.bindUI();
  }

}

module.exports = Home;
