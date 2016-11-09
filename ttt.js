'use strict';

const marked = require('./lib/marked');

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});

let markdown = `

## Test

\`\`\`
this is code
\`\`\`

| name | test |
| -- | -- |
| test | asd |

`;

marked(markdown, function (err, content) {
  if (err) throw err;
  console.log(content);
});