var assert = require('assert');
const request = require('supertest');
const chai = require('chai')
const expect = chai.expect;
const bcrypt = require("bcrypt");
const fs = require('fs');
const path = require('path');

const { whiteList,adminWhiteList,onlyLetters, firstLetterUpperCase,notAcceptedFileType,modelsList,modelAssesment,Document, User, History,app } = require('../app');
const {findItem,getItemIndexToActive} = require('../public/scripts/compare.js');

let user = new User({
  firstname: "tester",
  lastname: "testing",
  email: "t@t.com",
  password: bcrypt.hashSync("test",10),
  usertype: "user"
});

let document = new Document({
  name: "testDoc",
  userID: "",
  img:
  {
      data: fs.readFileSync(path.join(__dirname + '/../public/Document2.png')),
      contentType: 'image/png'
  }
})

before((done) => {
  user.save()
     .then(() => {
       document.userID = user._id;
       // document.save();
       done()
     });
});



describe('whiteList', function() {
  it('should return true if the path is not require a validation', function() {
    assert.equal(whiteList('/signUp'), true);
  });
  it('should return true if the path is not require a validation', function() {
    assert.equal(whiteList('/add-new-user'), true);
  });
  it('should return true if the path is not require a validation', function() {
    assert.equal(whiteList('/confirm-login'), true);
  });
  it('should return true if the path is not require a validation', function() {
    assert.equal(whiteList('/my-documents'), false);
  });
  it('should return true if the path is not require a validation', function() {
    assert.equal(whiteList('/model'), false);
  });
});

describe('adminWhiteList', function() {
  it('should return true if the path is an admins path', function() {
    assert.equal(adminWhiteList('/users'), true);
  });
  it('should return true if the path is an admins path', function() {
    assert.equal(adminWhiteList('/admin-menu'), true);
  });
  it('should return true if the path is an admins path', function() {
    assert.equal(adminWhiteList('/delete-user'), true);
  });
  it('should return true if the path is an admins path', function() {
    assert.equal(adminWhiteList('/my-documents'), false);
  });
  it('should return true if the path is an admins path', function() {
    assert.equal(adminWhiteList('/model'), false);
  });
});

describe('onlyLetters', function() {
  it('should return true if firstname and lastname contains only letters', function() {
    assert.equal(onlyLetters("nadav","cohen"), true);

  });
  it('should return true if firstname and lastname contains only letters', function() {
    assert.equal(onlyLetters("liel8","san4anes"), false);
  });
  it('should return true if firstname and lastname contains only letters', function() {
    assert.equal(onlyLetters("or","6cohen"), false);
  });
  it('should return true if firstname and lastname contains only letters', function() {
    assert.equal(onlyLetters("o5r","cohen"), false);
  });
});

describe('firstLetterUpperCase', function() {
  it('should return the same string with the first letter in upper case', function() {
    assert.equal(firstLetterUpperCase("nadav"), "Nadav");
  });
  it('should return the same string with the first letter in upper case', function() {
    assert.notEqual(firstLetterUpperCase("liel"), "lieL");
  });
  it('should return the same string with the first letter in upper case', function() {
    assert.equal(firstLetterUpperCase("nADAV"), "Nadav");
  });
});

describe('modelsList', function(){
  it('should return a list with default-model in first index', function(){
    var list = modelsList(["modelA","modelB"]);
    assert.equal(list[0],"Default-model");
    assert.equal(list.length,3)
  });
  it('should return a list with default-model in first index', function(){
    var list = modelsList([]);
    assert.equal(list[0],"Default-model");
    assert.equal(list.length,1)
  });
});

describe('modelsAssesment', function(){
  it("should return an assesment of 'Same Writer' according to model result", function(){
    var result = modelAssesment(78);
    assert.equal(result,"Same Writer");
  });
  it("should return an assesment of 'Not Same Writer' according to model result", function(){
    var result = modelAssesment(48);
    assert.equal(result,"Not Same Writer");
  });
  it("should return an assesment of 'Could Be Same Writer' according to model result", function(){
    var result = modelAssesment(64);
    assert.equal(result,"Could Be Same Writer");
  });
});

describe('notAcceptedFileType', function(){
  it("should return true if filetype is not .h5 or keras", function(){
    var result = notAcceptedFileType("newModel.h5");
    assert.equal(result,false);
  });
  it("should return true if filetype is not .h5 or keras", function(){
    var result = notAcceptedFileType("newModel.png");
    assert.equal(result,true);
  });
  it("should return true if filetype is not .h5 or keras", function(){
    var result = notAcceptedFileType("newModel.keras");
    assert.equal(result,false);
  });
});

describe('findItem', function(){
  it("should return the correct item according to items list and item id", function(){
    var item = findItem([{id: 1,name:"doc1"},{id: 2,name: "doc2"},{id: 3,name: "doc3"}],2);
    assert.equal(item.name,"doc2");
  });
});

describe('getItemIndexToActive', function(){
  it("should return the correct index according to items list and item to delete", function(){
    var items = [{id: 1,name:"doc1"},{id: 2,name: "doc2"},{id: 3,name: "doc3"}];
    var item = findItem(items,2);
    var index = getItemIndexToActive(items,item);
    assert.equal(index,0);
  });
  it("should return the correct index according to items list and item to delete", function(){
    var items = [{id: 1,name:"doc1"},{id: 2,name: "doc2"},{id: 3,name: "doc3"}];
    var item = findItem(items,1);
    var index = getItemIndexToActive(items,item);
    assert.equal(index,1);
  });
});

describe('post /confirm-login', () => {
  it('should login the user', (done) => {
    request(app)
    .post('/confirm-login')
    .send({
        email: user.email,
        password: "test"
     })
    .end((err, res) => {
      expect(res.status).to.eq(302);
      done();
    });
  });

  it('should not login the user', (done) => {
    request(app)
    .post('/confirm-login')
    .send({
        email: user.email,
        password: "tesr"
     })
    .end((err, res) => {
      expect(res.status).to.eq(500);
      done();
    });
  });
});

describe('post /add-new-user', () => {
  it('should register the user', (done) => {
    request(app)
    .post('/add-new-user')
    .send({
        email: "test123@gmail.com",
        password: "test01",
        confirmpassword: "test01",
        firstname: "tester",
        lastname: "testing"
     })
    .end((err, res) => {
      expect(res.status).to.eq(302);
      done();
    });
  });

  it('should not register the user', (done) => {
    request(app)
    .post('/add-new-user')
    .send({
      email: "test1234@gmail.com",
      password: "test02",
      confirmpassword: "test01",
      firstname: "tester",
      lastname: "testing"
    })
    .end((err, res) => {
      expect(res.status).to.eq(500);
      done();
    });
  });
});

// describe('get /my-documents', () => {
//   it('should display the correct number of documents', (done) => {
//     request(app)
//     .get('/my-documents')
//     .send({
//         id: user._id
//      })
//     .end((err, res) => {
//       console.log(res.body);
//       expect(res.status).to.eq(200);
//       done();
//     });
//   });
// });

after((done) => {
  User.deleteMany({}).exec();
  Document.deleteMany({}).exec();
  done();
});
