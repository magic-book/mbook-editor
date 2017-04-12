'use strict';

const $ = require('jquery');
const log = require('../../lib/log');
const co = require('co');
const path = require('path');
const contextMenu = require('./contextmenu');
const dialogs = require('dialogs');
const dialog = dialogs({});
const Git = require('./git');

function nextLevel(name) {
  name = currentLevel(name);
  let n = name[name.length - 1];
  return name.substr(0, name.length - 1) + (Number(n) + 1);
}
function currentLevel(name) {
  let names = name.split(/\s+/);
  for (let i = 0, len = names.length; i < len; i++) {
    if (/level\d+/.test(names[i])) {
      return names[i];
    }
  }
}

function resolveLevel(node, name) {
  let aNode = $(node).find('> a');
  let cls = aNode.attr('class');
  aNode.attr('class', cls.replace(/level\d+/, name));
  $(node).find('> ul > li').each(function () {
    resolveLevel(this, nextLevel(name));
  });
}

const UIBase = require('./ui_base');

class Menu extends UIBase {
  /**
   * [constructor description]
   * @param  {Object} option
   *         - book {Book} book model instance
   *         - container {JQueryNode}
   * @return {[type]}        [description]
   */
  constructor(options) {
    super();
    let self = this;
    this.book = options.book;
    this.container = options.container;
    this.container.find('.treeview').html(`
      <div class="bookmenu"></div>
      <div class="contextmenu"></div>
    `);
    this.git = new Git({
      container: options.container.find('.git'),
      bookRoot: options.book.root
    });
    this.container.find('.book-title').html(options.book.getBookTitle());
    let menuList = options.container.find('.bookmenu');

    $(window).on('click', this.hideContextMenu.bind(this));

    this.cnt = menuList;

    menuList.on('click', function (e) {
      if (e.which === 2) {
        // log.warn('menu right click');
        return;
      }
      let target = e.target;
      if (target.tagName === 'I' && $(target).hasClass('icon')) {
        $(target).toggleClass('icon_open');
        while (target.tagName !== 'LI') {
          target = target.parentNode;
        }
        $(target).find('ul.list').toggle().toggle;
        return;
      }
      while (target.tagName !== 'A') {
        target = target.parentNode;
      }
      let file = target.dataset.id;
      let text = $(target).find('.name').text();
      if (self.activeMenuItem(target)) {
        log.info('menu clicked:', text, '>', file);
        self.emit('open_file', text, file);
      }
    });

    this.container.find('.treeview').on('contextmenu', function (e) {
      // if (e.target.tagName === 'A') {
      self.activeMenuItem(e.target);
      // }
      self.showContextMenu(e);
    });

    menuList.on('mousedown', function (e) {
      if (e.which !== 1 || e.target.tagName !== 'A') {
        return;
      }
      let node = e.target;
      let dragee = node.cloneNode(true);
      let pos = $(node).position();
      let parentPos = $(self.cnt).position();
      let parentWidth = $(self.cnt).width();
      var parentHeight = $(self.cnt).height();
      let offset = {
        x: e.offsetX,
        y: e.offsetY
      };
      self.dragee = $(dragee);
      self.dragee.inited = false;
      self.dragee.origin = node;

      /** 移动边界 **/
      let bound = {
        top: parentPos.top,
        bottom: parentPos.top + parentHeight,
        left: parentPos.left,
        right: parentPos.left + $(node).width(),
        minX: parentPos.left,
        minY: parentPos.top - $(node).height(),
        maxX: parentPos.left,
        maxY: parentPos.top + parentHeight
      };
      $(dragee).css({
        position: 'absolute',
        lineHeight: '220%',
        zIndex: 100,
        backgroundColor: '#3f0',
        left: pos.left + 'px',
        top: pos.top + 'px',
        opacity: 0.5,
        width: $(node).width() + 'px',
        height: $(node).height() + 'px'
      });

      function _move(e) {
        self.mousemove(e, offset, bound);
      }
      function _up() {
        $(document).unbind('mousemove', _move)
          .unbind('losecapture')
          .unbind('mouseup', _up);
        self.dragee.remove();
        $(self.dragee.origin).removeClass('dragging');
        self.dragee.origin = null;
        self.dragee = null;
      }
      $(document).on('mousemove', _move)
        .on('losecapture', function () {
          self.cnt.trigger('mouseup');
        })
        .on('mouseup', _up);
    });

    this.on('change', function (data) {
      log.debug('save menu', data);
      co(function* () {
        yield self.save(data);
      }).catch(function (e) {
        log.error('save menu error', e.message);
      });
    });

    options.container.find('.tools').on('click', 'a', function () {
      let id = this.id;
      let cmd;
      switch (id) {
        case 'explorer':
          log.info('open book dir', 'open ' + self.book.src);
          cmd = require('os').platform() === 'win32' ? 'start' : 'open';
          require('child_process').exec(cmd + ' ' + self.book.src);
          break;
        case 'export_pdf':
          self.emit('export-pdf');
          break;
        case 'git':
          self.git.show();
          break;
        default:
          log.error('not support now');
      }
    });
  }
  * render() {
    let data = yield this.book.menu.load();
    this.cnt.html(this.genHTML(data));
  }
  * save(data) {
    yield this.book.menu.save(data);
  }
  activeMenuItem(target) {
    if (target.tagName === 'SPAN') {
      target = target.parentNode;
    }
    if (target.tagName !== 'A') {
      return false;
    }
    this.container.find('.bookmenu .active').removeClass('active');
    $(target).addClass('active');
    return true;
  }
  /**
   * 检查文件是否为菜单文件
   * @return {Boolean} [description]
   */
  isMenuFile(file) {
    return file === '/SUMMARY.md';
  }
  showContextMenu(e) {
    let menu;
    let self = this;
    let target = e.target;
    if (target.tagName === 'SPAN') {
      target = target.parentNode;
    }
    if (target.tagName === 'A') {
      menu = `
        <a action="new_child">新建子章节</a>
        <a action="new_sibling">新建章节</a>
        <a action="rename">重命名</a>
        <a action="delete">删除</a>
      `;
      this.ctxMenuTarget = target;
    } else {
      menu = `
        <a action="new_sibling">新建章节</a>
      `;
    }

    contextMenu.show(menu, {x: e.clientX, y: e.clientY}, function (action) {
      self.menuAction(action);
    });
    e.preventDefault();
    e.stopPropagation();
  }
  hideContextMenu() {
    this.container.find('.contextmenu').hide();
    this.ctxMenuTarget = null;
  }
  /**
   * 文件名转换，过滤, name中不包含空格, 统一小写，以减小出问题的概率
   */
  safeFileName(name)  {
    name = name.trim().replace(/\s/g, '_').toLowerCase();

    if (name === 'readme' || name === 'summary') {
      name = '_' + name;
    }
    return name;
  }
  /** 文件名检查 */
  genFileName(ref, name, ids) {
    let id = path.join(ref, this.safeFileName(name) + '.md');
    let count = 0;
    if (ids) {
      while (ids[id]) {
        id = path.join(ref, this.safeFileName(name) + '_' + count + '.md');
        count++;
      }
    }
    return id;
  }
  menuAction(action) {
    let ctxMenuTarget = this.ctxMenuTarget || this.container.find('.bookmenu > ul > li:last > a')[0];
    let list;
    let node;
    let flag = false;
    let self = this;
    switch (action) {
      case 'new_child':
        list = $(ctxMenuTarget).next('ul.list');
        if (!list.length) {
          list = $('<ul class="list"></ul>');
          list.insertAfter(ctxMenuTarget);
          flag = true;
        }
        dialog.prompt('新子章节名称', function (name) {
          if (!name) {
            return;
          }
          name = name.trim();
          let className = nextLevel($(ctxMenuTarget).attr('class'));
          let cwd = path.join(ctxMenuTarget.dataset.cwd, self.safeFileName(ctxMenuTarget.getAttribute('title')));
          let ids = {};
          list.find('li > a').each(function () {
            ids[this.dataset.id] = true;
          });
          let id = self.genFileName(cwd, name, ids);
          node = $('<li></li>');
          node.append(self.genNode({
            id: id,
            cwd: cwd,
            className: className,
            text: name
          }));
          list.append(node);

          if (flag) {
            let origin = ctxMenuTarget.dataset.id;
            let newId = path.join(cwd, 'README.md');
            ctxMenuTarget.dataset.id = newId;
            self.emit('rename_file', {
              src: origin,
              dest: newId
            });
          }

          self.emit('change', self.getMenuData());
          $(node.children()[0]).trigger('click');
        });
        break;
      case 'new_sibling':
        dialog.prompt('新章节名称', function (name) {
          if (!name) {
            return;
          }
          if (name.toLowerCase() === 'readme' || name.toLowerCase() === 'summary') {
            return dialog.alert('章节名不能叫:' + name);
          }
          name = name.trim();
          let className;
          if (ctxMenuTarget) {
            className = currentLevel($(ctxMenuTarget).attr('class'));
          } else {
            className = 'level0';
          }
          let cwd = ctxMenuTarget ? ctxMenuTarget.dataset.cwd : '';
          let id = self.genFileName(cwd, name);
          node = $('<li></li>');
          node.append(self.genNode({
            cwd: cwd,
            id: id,
            className: className,
            text: name
          }));
          if (ctxMenuTarget) {
            node.insertAfter($(ctxMenuTarget).parent());
          } else {
            self.container.find('.bookmenu > ul').append(node);
          }
          self.emit('change', self.getMenuData());
          // switch to the new article
          $(node.children()[0]).trigger('click');
        });
        break;
      case 'rename':
        dialog.prompt('更改章节名称', ctxMenuTarget.getAttribute('title'), function (name) {
          if (!name) {
            return;
          }
          if (name === 'README' || name === 'SUMMARY') {
            return dialog.alert('系统保留名，章节名不能叫:' + name);
          }
          name = name.trim();
          // 检查同级目录下，名字是否已经存在
          let siblings = $(ctxMenuTarget).parent().parent().find('> li > a');
          let flagName;
          siblings.each(function () {
            if (this.getAttribute('title') === name) {
              flagName = true;
            }
          });
          if (flagName) {
            dialog.alert('章节名重复，相同目录下章节不能重名!');
            return false;
          }
          $(ctxMenuTarget).text(name).attr('title', name);

          self.emit('change', self.getMenuData());
        });
        break;
      case 'delete':
        dialog.confirm(`确定删除章节: ${ctxMenuTarget.getAttribute('title')} ?`, function (bool) {
          if (bool) {
            $(ctxMenuTarget).parent().remove();
            self.emit('change', self.getMenuData());
          }
        });
        break;
    }
  }
  mousemove(e, offset, bound) {
    if (!this.dragee.inited) {
      $('.menu').append(this.dragee);
      $(this.dragee.origin).addClass('dragging');
      this.dragee.inited = true;
    }
    let self = this;
    let d = this.dragee;
    let left = e.pageX - offset.x;
    let top = e.pageY - offset.y;

    let list = self.cnt.find('a');

    // 约束上下左右的极值
    if (bound) {
      if (left < bound.minX) {
        left = bound.minX;
      } else if (left > bound.maxX) {
        left = bound.maxX;
      }

      if (top < bound.minY) {
        top = bound.minY;
      } else if (top > bound.maxY) {
        top = bound.maxY;
      }
    }

    d.css({
      left: left,
      top: top
    });

    // 判断节点位置
    let origin = d.origin;
    let h = $(d).height();
    let offsetY = e.pageY - bound.top - offset.y;
    let offsetN = Math.floor(offsetY / h); // 计算偏移节点index
    // console.log('::', offsetY, h, offsetN);

    if (offsetN < 0) {
      offsetN = 0;
    } else if (offsetN > list.length - 1) {
      offsetN = list.length - 1;
    }
    let tmpNode = list[offsetN];
    let tmpPos = $(tmpNode).position();

    let cmd = null;

    if (top < tmpPos.top - 3) { // previewSibling
      cmd = {
        target: tmpNode,
        action: 'prev'
      };
      // console.log('>>>', $(tmpNode).text(), 'prev');
    } else if (top >= tmpPos.top - 3 && top <= tmpPos.top + 3) { // child
      cmd = {
        target: tmpNode,
        action: 'child'
      };
      // console.log('>>>', $(tmpNode).text(), 'child');
    } else if (top > tmpPos.top + 3) { // nextSibling
      let nextTmpNode = list[offsetN + 1];
      if (nextTmpNode) {
        // switch node
        let tmpPos2 = $(nextTmpNode).position();
        if (top >= tmpPos2.top - 3) {
          cmd = {
            target: nextTmpNode,
            action: 'prev'
          };
        } else {
          cmd = {
            target: tmpNode,
            action: 'next'
          };
        }
      } else {
        cmd = {
          target: tmpNode,
          action: 'next'
        };
        // console.log('>>>', $(tmpNode).text(), 'next');
      }
    }

    if (cmd) {
      let p;
      let ll;

      if (cmd.target === origin) {
        return;
      }
      p = cmd.target.parentNode;
      while (p) {
        if (p === origin.parentNode) {
          return;
        }
        p = p.parentNode;
      }
      // console.log('>>>>', origin.parentNode);
      $(origin.parentNode).remove();
      switch (cmd.action) {
        case 'prev':
          $(origin.parentNode).insertBefore(cmd.target.parentNode);
          origin.dataset.cwd = cmd.target.dataset.cwd;
          resolveLevel(origin.parentNode, currentLevel(cmd.target.className));
          break;
        case 'next':
          $(origin.parentNode).insertAfter(cmd.target.parentNode);
          origin.dataset.cwd = cmd.target.dataset.cwd;
          resolveLevel(origin.parentNode, currentLevel(cmd.target.className));
          break;
        case 'child':
          p = cmd.target.parentNode;
          ll = $(p).find('> ul.list');
          if (!ll.length) {
            ll = $('<ul class="list"></ul');
            $(p).append(ll);
          }
          $(origin.parentNode).prependTo(ll);
          origin.dataset.cwd = path.join(cmd.target.dataset.cwd, self.safeFileName(cmd.target.getAttribute('title')));
          resolveLevel(origin.parentNode, nextLevel(cmd.target.className));
          break;
        default:
          // do nothing
      }
      self.emit('change', self.getMenuData());
    }

    e.stopPropagation();
    e.preventDefault();
  }
  resize(obj) {
    this.container.find('.treeview').height(obj.height - 72);
  }
  genHTML(data, indent, cwd) {
    let html = ['<ul class="list">'];
    let self = this;
    data = data || [];
    indent = indent || 0;
    cwd = cwd || '/';
    data.forEach(function (node) {
      let isDir = node.children && node.children.length;
      html.push('<li>');
      html.push(self.genNode({
        id: node.id,
        cwd: cwd,
        text: node.text,
        className: 'level' + indent,
        isDir: isDir
      }));
      if (isDir) {
        html = html.concat(
          self.genHTML(node.children, indent + 1, path.join(cwd, self.safeFileName(node.text)))
        );
      }
      html.push('</li>');
    });
    html.push('</ul>');
    return html.join('');
  }
  genNode(obj) {
    return `
        <a
          data-id="${obj.id}"
          data-cwd="${obj.cwd}"
          class="${obj.className}"
          title="${obj.text}" >` +
          (obj.isDir ? '<i class="icon">▽</i>' : '') +
          `<span class="name">${obj.text}</span>
        </a>
      `;
  }
  // 遍历菜单，返回数据
  getMenuData() {
    let bookmenu = this.container.find('.bookmenu');
    return this._getMenuList(bookmenu.find('> ul.list'));
  }
  _getMenuList(list) {
    let res = [];
    let self = this;
    list.find('> li > a').each(function () {
      let tmp = {
        id: this.dataset.id,
        text: this.getAttribute('title')
      };
      let children = $(this).next('ul.list');
      if (children) {
        tmp.children = self._getMenuList(children);
      }
      res.push(tmp);
    });
    return res;
  }
}

module.exports = Menu;
