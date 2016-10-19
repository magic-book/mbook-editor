const fs = require('fs');
const log = require('../../lib/log');
const path = require('path');

const file_types = {
  'md': ['.md', '.MD', '.readme', '.README']
}

class Storage{
  _sync(){
    this.resolvePath = null;
    this.isDirectory = null;
    this.data = null;
  }

  constructor(fileOrDirectory){
    this._sync();

    this.resolvePath = path.resolve(fileOrDirectory);
    
    try{
      let stats = fs.lstatSync(this.resolvePath);
      this.isDirectory = stats.isDirectory(); 
      if (this.isDirectory) {
        this.data = this.iterateDirectory(fileOrDirectory.split(path.sep).pop(), this.resolvePath);
      }else{
        this.data = JSON.parse(fs.readFileSync(this.resolvePath));
      }
    }catch(e){
      log.error(e.stack);
    }
  }

  checkFileType(filename){
    let extname = path.extname(filename);
    switch(true){
      case file_types.md.indexOf(extname) > -1:
        return 'md';
      default: 
        return '';
    }
  }

  pack(relativePath, isDirectory){
    if(isDirectory){
      return {
        name: relativePath,
        type: 1,
        objectType: null,
        children: []
      }
    }else{
      if(relativePath[0] !== '.'){
        return {
          name: relativePath,
          type: 2,
          objectType: this.checkFileType(relativePath)
        }
      }
    }
  }

  // see: http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
  iterateDirectory(fileOrDirectory, resolvePath){
    let branch = this.pack(fileOrDirectory, true);
    fs.readdirSync(resolvePath).forEach(_fileOrDirectory => {
      let _path = path.join(resolvePath, _fileOrDirectory);
      let stats = fs.lstatSync(_path);
      if(stats.isDirectory()){
        this.iterateDirectory(_fileOrDirectory, _path);
      }else{
        let item = this.pack(_fileOrDirectory);
        item && branch.children.push(item);
      }
    });
    return branch;
  }

  save(data){
    if(this.isDirectory){
      fs.mkdirSync(data);
      let relativePath = data.split(path.sep).pop();
      this.data.children.push(this.pack(relativePath, true));
    }else{
      fs.writeFileSync(this.resolvePath, JSON.stringify(data, null, 2));
    }
  }

  getData(){
    return this.data;
  }
}

module.exports = Storage;
