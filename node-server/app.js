// require("dotenv").config();
//import libries
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const request = require('request');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Jimp = require("jimp");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(bodyParser.json());

//for image sending from server to python model server
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now())
  }
});

const upload = multer({ storage: storage });

const saltRounds = 10;

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 60000}
}));


//mongo db connection
mongoDBurl = "mongodb+srv://admin-nadav:123@cluster0.x9oen.mongodb.net/testDB";
mongoose.connect(mongoDBurl, {useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex",true);


//<--------data base collections schema--------->

//image schema for mongo db
const imageSchema = new mongoose.Schema({
    name: String,
    userID: String,
    img:
    {
        data: Buffer,
        contentType: String
    }
});
const imgModel = new mongoose.model('Image', imageSchema);

//users schema for mongo db

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname:String,
  email:String,
  password: String
});

const User = new mongoose.model('User',userSchema);

app.get('/', (req, res) => {
    res.render('login');
});

app.post('/upload',upload.single('image'),(req, res, next) => {
    var obj = {
        name: "test2",
        desc: "desc",
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    }
    Jimp.read(__dirname + '/uploads/' + req.file.filename, function (err, file) {
      if (err) {
        console.log(err)
      } else {
        file.write(__dirname + '/uploads/' + req.file.filename + ".png" , function(){
          obj.img.data = fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename + ".png"));
          imgModel.create(obj, (err, item) => {
              if (err) {
                  console.log(err);
              }
              else {
                  item.save();
                  deleteAllFilesInDirectory("uploads");
                  res.redirect('/my-documents');
              }
          });
         });
       }
     });
});

app.get('/my-documents', function(req,res){
  if(typeof req.session.User === 'undefined'){
        res.render("login");
  } else {
    console.log(req.session.User);
    imgModel.find({}, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
          items.forEach(function(item){
            filepath  = "public/userDocs/" + item.name + ".png"
            fileContent = item.img.data.toString('base64');
            try{
              fs.writeFileSync(filepath, new Buffer(fileContent, "base64"));
              var file = new Buffer(fileContent, "base64");
            } catch (e){
              console.log("Cannot write file ", e);
              return;
            }
            console.log("file succesfully saved.");
          });
            res.render('myDocuments', { items: items });
        }
    });
  }
});

app.get('/login', function(req,res){
  res.render("login");
});

app.post('/confirm-login' ,function(req,res){
  var email = req.body.email;
  var password = req.body.password;
  User.findOne({email: email}, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/login");
    } else {
      if(user){
        bcrypt.compare(password, user.password, function(err, result) {
          if(result === true){
            req.session.User = user._id;
            res.redirect("/my-documents");
          } else {
            res.redirect("/login");
          }
        });
      }
    }
  });
});

app.get('/signup', function(req,res){
  res.render("signUp");
});

app.post('/add-new-user',function(req,res){
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    var newUser = new User({
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      password: hash
    });
    newUser.save();
    req.session.User = newUser._id;
    res.redirect("/my-documents");
  });

});

app.get('/compare', function(req,res){
  fs.readdir(__dirname + '/public/userDocs', (err, files) => {
         if (err) console.log(err);
         res.render("compare",{docs: files});
     });
});

app.post('/send-to-model', function(req,res){
  console.log(req.body);
  var docs = JSON.stringify(req.body);
  docs = JSON.parse(docs);
  var compareDocsArray = [];
  for(var i=0; i<docs.compare.length; i++){
    compareDocsArray.push(fs.createReadStream(__dirname + '/public/userDocs/' + docs.compare[i]));
  };
  options = {
    targetDoc: fs.createReadStream(__dirname + '/public/userDocs/' + docs.target),
    compareDocs: compareDocsArray
  }
  //'http://127.0.0.1:5000/flask'
  request.post({url:'http://127.0.0.1:5000/flask', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    // res.render("compare",{docs: documents, results: result}); //Display the response on the website
    res.send(body);
  });

});

app.get('/history', function(req,res){
  res.render("history");
});

app.get('/model', function(req,res){
  res.render("model");
});

app.get('/documents', function(req, res){
  imgModel.find({name: "Document2"}, (err, item) => {
      if (err) {
          console.log(err);
          res.status(500).send('An error occurred', err);
      }
      else {
        filepath  = "sendApi/" + item[0].name + ".png"
        fileContent = item[0].img.data.toString('base64');
        try{
          fs.writeFileSync(filepath, new Buffer(fileContent, "base64"));
          var file = new Buffer(fileContent, "base64");
        } catch (e){
          console.log("Cannot write file ", e);
          return;
        }
        console.log("file succesfully saved.");
        options = {
          targetDoc: bufferToStream(__dirname + '/' + filepath),
          compareDocs: fs.createReadStream(__dirname + '/BRN3C2AF4AEB56C_0000000015.tif')
        }
        request.post({url:'http://127.0.0.1:5000/flask', formData: options}, function(error, response, body) {
          console.error('error:', error); // Print the error
          console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
          console.log('body:', body); // Print the data received
          deleteAllFilesInDirectory("sendApi");
          res.send(body); //Display the response on the website
        });
      }
  });
});


function deleteAllFilesInDirectory(dirName){
  fs.readdir(__dirname + '/' + dirName, (err, files) => {
         if (err) console.log(err);
         for (const file of files) {
             fs.unlink(__dirname + '/' + dirName + '/' + file, err => {
                 if (err) console.log(err);
             });
         }
     });
}

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
