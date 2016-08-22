'use strict';

const TestMod = require('../../lib/book');
const path = require('path');
const should = require('should');

const testBook = new TestMod(path.join(__dirname, '../mock_book'));

describe('lib/book', function () {

  describe('create book', function () {

  });


  describe('list book', function () {
    it('should list the book base', function (done) {
      testBook.getMenu(function (err, result) {
        should.not.exists(err);
        result.length.should.eql(4);
        result[0].text.should.eql('README');
        result[0].id.should.eql('README.md');
        result[1].children.length.should.eql(3);
        result[1].children[0].text.should.eql('when');
        result[1].children[0].id.should.eql('chapter_1/when.md');
        done();
      });
    });
  });

  describe('delete book', function () {

  });


});