'use strict';

const Storage = require('./storage');
const path = require('path');
const fs = require('fs');


class Bookspace {
  setBookspace(bookspacePath) {
    if (this.bookspaceJson.bookspacePath) return;

    this.bookspaceJson.bookspacePath = bookspacePath;
    fs.writeFileSync(path.join(Bookspace.RESOURCE_DIR, 'bookspace.json'), JSON.stringify(this.bookspaceJson, null, 2));
    this.fileStorage.resolve(path.join(bookspacePath, 'bookspace.json'));
    this.setBooks(() => {
      this.fileStorage.save(this.data);
    });
  }

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

  constructor() {
    this.bookspaceJson = JSON.parse(fs.readFileSync(path.join(Bookspace.RESOURCE_DIR, 'bookspace.json')));
    this.dirStorage = new Storage(this.bookspaceJson.bookspacePath);

    this.fileStorage = new Storage(path.join(this.bookspaceJson.bookspacePath, 'bookspace.json'), {
      name: 'Mbook',
      description: '',
      bookspaces: {},
      historyBookspaces: {}
    });

    this.data = this.fileStorage.getData();
    this.books = [];
    if (this.bookspaceJson.bookspacePath) {
      this.setBooks();
    }
  }

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
        if (!fs.existsSync(bookspacePath) || !fs.lstatSync(bookspacePath).isDirectory()) {
          this.dirStorage.save(bookspacePath)
        }
        this.books.push(branch);
        this.data.bookspaces[branch.name] = bookspacePath;
        return branch;
      }
    }
  }

  remove(bookspace) {
    this.pack(bookspace, true);
    this.fileStorage.save(this.data);
  }

  retrieve(type) {
    if (type) {
      return this.books.filter(item => item.type === type);
    } else {
      return this.books;
    }
  }

  save(bookspace) {
    let branch = this.pack(bookspace);
    this.fileStorage.save(this.data);
    return branch;
  }
}

Bookspace.RESOURCE_DIR = path.resolve('./resources');

Bookspace.TYPES = {
  history: 'history',
  local: 'local',
  delete: 'delete'
};

module.exports = Bookspace;
