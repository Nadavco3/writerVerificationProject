var assert = require('assert');
const request = require('supertest');
const chai = require('chai')
const expect = chai.expect;

const { whiteList,adminWhiteList,onlyLetters, firstLetterUpperCase,Document, User, History,app } = require('../app');

let user;
before((done) => {
  user = User.create({
     firstname: "tester",
     lastname: "testing",
     email: "t@t.com",
     password: "test"})
     .then(() => done())
});

describe('whiteList', function() {
  it('should return true if the path is not require a validation', function() {
    assert.equal(whiteList('/signUp'), true);
    assert.equal(whiteList('/add-new-user'), true);
    assert.equal(whiteList('/confirm-login'), true);
    assert.equal(whiteList('/my-documents'), false);
    assert.equal(whiteList('/model'), false);
  });
});

describe('adminWhiteList', function() {
  it('should return true if the path is an admins path', function() {
    assert.equal(adminWhiteList('/users'), true);
    assert.equal(adminWhiteList('/admin-menu'), true);
    assert.equal(adminWhiteList('/delete-user'), true);
    assert.equal(adminWhiteList('/my-documents'), false);
    assert.equal(adminWhiteList('/model'), false);
  });
});

describe('onlyLetters', function() {
  it('should return true if firstname and lastname contains only letters', function() {
    assert.equal(onlyLetters("nadav","cohen"), true);
    assert.equal(onlyLetters("liel8","san4anes"), false);
    assert.equal(onlyLetters("or","6cohen"), false);
    assert.equal(onlyLetters("o5r","cohen"), false);
  });
});

describe('firstLetterUpperCase', function() {
  it('should return the same string with the first letter in upper case', function() {
    assert.equal(firstLetterUpperCase("nadav"), "Nadav");
    assert.notEqual(firstLetterUpperCase("liel"), "lieL");
  });
});

describe('post /confirm-login', () => {
  it('should login the user', (done) => {
    request(app)
    .post('/confirm-login')
    .send({
        email: user.email,
        password: '555'
     })
    .end((err, res) => {
      expect(res.status).to.eq(200);
      done()
    });
  });
});
