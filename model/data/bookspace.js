'use strict';

// const Storage = require('./storage');
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const log = require('../../lib/log');

class Bookspace {
  constructor() {
    /*
    if (!fs.existsSync(config.bookspaceConfig)) {
      fs.writeFileSync(
        config.bookspaceConfig,
        fs.readFileSync(path.join(__dirname, '../../resource/bookspace_example.json'))
      );
    }
    */
    /**
     * [bookspaceConfigPath description]
     * @type {[type]}
     */
    this.config = config.bookspace;
    this.books = this.config.books;
    this.history = this.config.history;
  }

  /*
  initStorages() {
    log.info('boosapce path: ' + path.join(this.bookspaceJson.bookspacePath, 'bookspace.json'));
    this.dirStorage = new Storage(this.bookspaceJson.bookspacePath);
    this.fileStorage = new Storage(path.join(this.bookspaceJson.bookspacePath, 'bookspace.json'), {
      name: 'Mbook',
      description: '',
      bookspaces: {},
      historyBookspaces: {}
    });
    this.data = this.fileStorage.getData();
  }
  */

  /**
   * 设置bookspace跟目录
   */
  setRoot(root) {
    this.config.root = root;
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }
    this.save();
  }
  getRoot() {
    return this.config.root;
  }
  getDefaultRoot() {
    return this.config.defaultRoot;
  }
  save() {
    config.save();
  }
  /*
  setBooks(callback) {
    let bookspaceMap = {};
    for (let key in this.data.bookspaces) {
      bookspaceMap[this.data.bookspaces[key]] = key;
    }
    fs.readdirSync(this.bookspaceJson.bookspacePath).forEach(fileOrDirectory => {
      let dirPath = path.join(this.bookspaceJson.bookspacePath, fileOrDirectory);
      let stats = fs.lstatSync(dirPath);
      if (stats.isDirectory()) {
        try {
          // 存在book.json
          let bookJson = JSON.parse(fs.readFileSync(path.join(dirPath, 'book.json')));
          // 在bookspace.json中声明过得
          if (bookspaceMap[dirPath]) {
            bookJson.path = dirPath;
            bookJson.name = bookspaceMap[dirPath];
            // 理论上path是不能改动的
            // bookJson.path = this.data.bookspaces[bookJson.name];
            this.books.push(bookJson);
          } else if (bookJson.name) {
            bookJson.path = dirPath;
            this.books.push(bookJson);
          }
        } catch (e) {
          //
        }
      }
    });

    this.data.bookspaces = {};
    this.books.forEach(item => {
      this.data.bookspaces[item.name] = item.path;
    });

    callback && callback();
  }
  */

  pack(bookspace, isRemove) {
    let bookspacePath = Object(bookspace) === bookspace ? bookspace.path : bookspace;

    if (isRemove) {
      let branch;
      this.books = this.books.filter(item => {
        if (item.path === bookspacePath) {
          // 是否考虑删除本地目录
          branch = item;
          return false;
        } else {
          return true;
        }
      });
      if (branch) {
        let dirPath = this.data.bookspaces[branch.name];
        try {
          let filePath = path.join(dirPath, 'book.json');
          let bookJson = JSON.parse(fs.readFileSync(filePath));
          bookJson.type = Bookspace.TYPES.delete;
          fs.writeFileSync(filePath, JSON.stringify(bookJson, null, 2));
        } catch (e) {
          //
        }
        delete this.data.bookspaces[branch.name];
      }
    } else {
      let branch = this.books.find(item => item.path === bookspacePath);
      log.info('book path is exist? ' + JSON.stringify(branch));
      if (branch) {
        let oldType = branch.type;
        if (bookspacePath === bookspace) {
          // type default to local
          branch.type = Bookspace.TYPES.local;
        } else {
          Object.assign(branch, bookspace);
        }
        // form history to local
        if (oldType === Bookspace.TYPES.history && branch.type === !Bookspace.TYPES.history) {
          return Object.assign(branch, bookspace);
        }
      } else {
        if (bookspacePath === bookspace) {
          // bookspace is not an Object
          branch = {
            name: bookspacePath.split(path.sep).pop(),
            path: bookspacePath,
            type: Bookspace.TYPES.local,
            icon: '',
            owner: 'import'
          };
        } else {
          branch = Object.assign({
            type: Bookspace.TYPES.local,
            owner: 'import'
          }, bookspace);
        }
        // todo: bookspace.path is remote url
        log.info('new book path: ' + bookspacePath);
        if (!fs.existsSync(bookspacePath) || !fs.lstatSync(bookspacePath).isDirectory()) {
          this.dirStorage.save(bookspacePath);
          let bookJson = this.bookspaceJson.bookJson;
          fs.writeFileSync(path.join(bookspacePath, 'book.json'), JSON.stringify(Object.assign(branch, bookJson), null, 2));
        }
        this.books.push(branch);
        this.data.bookspaces[branch.name] = bookspacePath;
        return branch;
      }
    }
  }

  remove(bookPath) {
    let books = this.books;

    books.forEach(function (book, i, a) {
      if (book.path === bookPath) {
        a.splice(i, 1);
      }
    });
    this.save();
  }

  retrieve(type) {
    if (type) {
      return this.books.filter(item => item.type === type);
    } else {
      return this.books;
    }
  }
  /**
   * 导入已经存在的book
   * @param  {Path} dir 书的绝对路径
   */
  importBook(obj) {
    let bookInfo = {
      name: obj.name,
      path: obj.path
    };
    this.books.push(bookInfo);
    this.save();
  }
  /**
   * 创建book目录
   */
  createBook(obj) {
    let name = obj.name;
    let dir = obj.path || path.join(this.config.root, name);
    let empty = obj.empty;
    let rootDir;
    // check if dir exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    if (empty) {
      fs.mkdir(path.join(dir, './src'));
      rootDir = './src';
    } else {
      rootDir = './';
    }
    let bookConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../resource/book_example.json')));
    bookConfig.title = name;
    bookConfig.root = rootDir;

    let bookJSON = path.join(dir, './book.json');
    fs.exists(bookJSON, function (exists) {
      !exists && fs.writeFile(bookJSON, JSON.stringify(bookConfig, null, 2));
    });

    let readme = path.join(dir, './src/README.md');
    fs.exists(readme, function (exists) {
      !exists && fs.writeFile(
        readme,
        fs.readFileSync(path.join(__dirname, '../../resource/readme_example.md'))
      );
    });
    let summary = path.join(dir, './src/SUMMARY.md');
    fs.exists(summary, function (exists) {
      !exists && fs.writeFile(
        summary,
        fs.readFileSync(path.join(__dirname, '../../resource/summary_example.md'))
      );
    });

    let bookInfo = {
      name: obj.name,
      path: dir
    };
    this.books.push(bookInfo);
    this.save();
    return bookInfo;
  }
}

Bookspace.TYPES = {
  history: 'history',
  local: 'local',
  delete: 'delete'
};

module.exports = Bookspace;
