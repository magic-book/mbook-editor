'use strict';

const $ = require('jquery');
const view = require('../../lib/view');
const log = require('../../lib/log');
const path = require('path');
const BaseCtrl = require('../base_controller');
const {dialog} = require('electron').remote;
require('jqmodal');


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
        return `<li class="${item.icon ? '' : 'cover-failed'}">
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
                        <label>Name</label>
                        <input type="text" placeholder="My Awesome Book"/>
                        <p class="help-block">It will create a new local book on this computer</p>
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
      defaultPath: this.bookspace.getDefaultRoot()
    }));
  }
  bindUI() {
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
    this.container.on('click', '.j-trigger-createBook', e => {
      let inp = this.modalbox.find('input');
      let val = inp.val().trim();
      if (val) {
        let bookInfo = this.bookspace.createBook({
          name: val
        });
        this.container.find('.bookspaces .book-opt').before(this.tplOpt.getBookspaceTpl(bookInfo));
        this.modalbox.jqmHide();
        inp.val('');
      } else {
        // TODO: 提醒用户，book名字必填
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
        try {
          bookInfo = require(path.join(bookRoot, './book.json'));
        } catch (e) {
          log.error('loading book.json failed', e.message);
          return;
        }
        bookInfo.title && this.bookspace.importBook({
          name: bookInfo.title,
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
      this.bookspace.remove(path.resolve(bookPath));
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
        this.container.find('.elem-choiceinp').text(bookspaceDir[0]);
      }
    });
    /**
     * 设置bookspace root
     */
    this.container.on('click', '.j-trigger-bookspace', e => {
      let val = this.container.find('.elem-choiceinp').text().trim();
      if (val) {
        this.bookspace.setRoot(val);
        this.container.find('.j-trigger-bookspacemodal').jqmHide();

        this.container.find('.bookspaces').remove();
        this.container.prepend(this.tplOpt.getBookspacesTpl(this.bookspace.retrieve()));
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
