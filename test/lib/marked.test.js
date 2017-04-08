'use strict';

let marked = require('../../lib/marked');

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

describe('lib/marked', () => {
  it('should parse list with line-num fine', (done) => {
    let test = `
* list001
  * 1
* list002
  * 2

hello marked
    `

    let tokens = marked.lexer(test);
    console.log(tokens);
    done();
  });

  it('should parse table with line-num fine', (done) => {
    let test = `
| $prod | $desc |
| --- | --- |
| test0 | desc0 |
| test1 | desc1 |
| test2 | desc2 |
    `;
    let tokens = marked.lexer(test);
    console.log(JSON.stringify(tokens, null, 2));
    done();
  });
});