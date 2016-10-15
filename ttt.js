var fs = require('fs');

var stream = fs.createWriteStream('aaa.js');
stream.write('xxx');
stream.end();

var http= require('http');

http.createServer(function() {}).listen(8901);
