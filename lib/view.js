'use strict';

const fs = require('fs');
const ejs = require('ejs');
const path = require('path');

exports.render = function (node, view, data) {
  let p = path.join(__dirname, '../view/', view);
  node.innerHTML = ejs.render(fs.readFileSync(p).toString(), data, {
    filename: p,
    cache: false
  });
};
