// require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const request = require('request');
const fs = require('fs');
var path = require('path');
var multer = require('multer');
const Jimp = require("jimp");

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

mongoDBurl = "mongodb+srv://admin-nadav:123@cluster0.x9oen.mongodb.net/testDB";
mongoose.connect(mongoDBurl, {useNewUrlParser: true, useUnifiedTopology: true });

var imageSchema = new mongoose.Schema({
    name: String,
    userID: String,
    img:
    {
        data: Buffer,
        contentType: String
    }
});

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });
var imgModel = new mongoose.model('Image', imageSchema);

app.get('/', (req, res) => {
    imgModel.find({}, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
            res.render('imagesPage', { items: items });
        }
    });
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
  imgModel.find({}, (err, items) => {
      if (err) {
          console.log(err);
          res.status(500).send('An error occurred', err);
      }
      else {
          res.render('myDocuments', { items: items });
      }
  });
});

app.get('/compare', function(req,res){
  res.render("compare");
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
