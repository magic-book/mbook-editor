const Storage = require('./storage');
const path = require('path');
const fs = require('fs');


class Bookspace{
  constructor(){
    this.dirStorage = new Storage(Bookspace.DIR);
    this.fileStorage = new Storage(path.join(Bookspace.DIR, 'bookspace.json'));

    this.data = this.fileStorage.getData();
  }

  pack(bookspace, isRemove){
    let bookspacePath = Object(bookspace) === bookspace ? bookspace.path : bookspace;

    if(isRemove){ 
      this.data.bookspaces = this.data.bookspaces.filter(item => {
        if(item.path === bookspacePath){
          // 是否考虑删除本地目录
          return false;
        }else{
          return true;
        }
      });
    }else{
      let branch = this.data.bookspaces.find(item => item.path === bookspacePath);
      
      if(branch){
        let oldType = branch.type;
        if(bookspacePath === bookspace){ // type default to local 
          branch.type = Bookspace.TYPES.local;
        }else{
          Object.assign(branch, bookspace);
        }
        // form history to local
        if(oldType === Bookspace.TYPES.history && branch.type === !Bookspace.TYPES.history){
          return Object.assign(branch, bookspace);
        }
      }else{
        if(bookspacePath === bookspace){ //bookspace is not an Object
          branch = {
            name: bookspacePath.split(path.sep).pop(),
            path: bookspacePath,
            type: Bookspace.TYPES.local,
            icon: '',
            owner: 'import'
          } 
        }else{
          branch = Object.assign({
            type: Bookspace.TYPES.local,
            owner: 'import'
          }, bookspace)
        }
        // todo: bookspace.path is remote url
        if(!fs.existsSync(bookspacePath) || !fs.lstatSync(bookspacePath).isDirectory()){ 
          this.dirStorage.save(bookspacePath)
        }
        this.data.bookspaces.push(branch);

        return branch;
      }
    }
    
  }

  remove(bookspace){
    this.pack(bookspace, true);
    this.fileStorage.save(this.data);
  }

  retrieve(type){
    if(type){
      return this.data.bookspaces.filter(item => item.type === type);
    }else{
      return this.data.bookspaces;
    }
  }

  save(bookspace){
    let branch = this.pack(bookspace);
    this.fileStorage.save(this.data);
    return branch;
  }
}

Bookspace.DIR = path.resolve('./bookspace');

Bookspace.TYPES = {
  history: 'history',
  local: 'local'
}

module.exports = Bookspace; 
