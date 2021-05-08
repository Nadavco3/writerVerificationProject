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
const busboy = require('connect-busboy');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ObjectsToCsv = require('objects-to-csv');
const { format } = require('@fast-csv/format');
const app = express();
const fs_extra = require('fs-extra');




app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(busboy({highWaterMark: 2 * 1024 * 1024,}));
app.use(session({secret: 'keyboard cat',resave: false,saveUninitialized: false,cookie: {maxAge: 600000}}));//, expires:false}
app.use(function (req, res, next) {
  if( whiteList(req.path) || typeof req.session.User !== 'undefined'){
      next();
  }
  else {
      //Return a response immediately
      res.render('login');
  }
});


//for image sending from server to python model server
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
      cb(null, file.originalname.split('.')[0])
  }
});

const upload = multer({ storage: storage });
const saltRounds = 10;


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

//history schema for mongo db

const historySchema = new mongoose.Schema({
  userID: String,
  date: String,
  target: String,
  compare: [{
    name: String,
    compatibility: Number,
    assessment: String
  }]
});

const History = new mongoose.model('History', historySchema);

app.get('/', (req, res) => {req.session.User==='undefined'?res.render('login'):res.redirect('/my-documents')});
app.get('/login', function(req,res){req.session.User==='undefined'?res.render('login'):res.redirect('/my-documents')});
app.get('/signUp', function(req,res){res.render("signUp");});

app.get('/my-documents', function(req,res){
    imgModel.find({}, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
            res.render('myDocuments', { items: items,name:req.session.name });
        }
    });
});

app.get('/compare', function(req,res){
  imgModel.find({userID: req.session.User}, (err, items) => {
      if (err) {
          console.log(err);
          res.status(500).send('An error occurred', err);
      }
      else {
        options = {
          id: req.session.User,
        }
        request.post({url:'http://127.0.0.1:5000/get-user-models', formData: options}, function(error, response, body) {
          console.error('error:', error); // Print the error
          console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
          console.log('body:',body); // Print the data received
          modelsNames = JSON.parse(body)
          modelsNames.push("Defualt-model");
          modelsNames.reverse()
          res.render('compare', { docs: items ,models : modelsNames,name:req.session.name});
        });
      }
  });
});

app.get('/history', async function(req,res){
  userDocs = await imgModel.find({userID: req.session.User}).exec();
  History.find({userID: req.session.User}, async function(err, recordsFound){
    if (err) {
        console.log(err);
        res.status(500).send('An error occurred', err);
    }
    else {
      res.render("history",{docs: userDocs, records: recordsFound,name:req.session.name});
    }
  });
});

app.get('/model', function(req,res){
  options = {
    id: req.session.User,
  }
  request.post({url:'http://127.0.0.1:5000/get-user-models', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    res.render("model",{models :JSON.parse(body),name:req.session.name});
  });

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


app.get('/LogOut', async function(req,res){
    req.session.destroy();
    res.redirect('/');
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
            req.session.name = user.firstname + " " + user.lastname;
            res.redirect("/my-documents");
          } else {
            res.redirect("/login");
          }
        });
      }
    }
  });
});

app.post('/upload',upload.single('image'),(req, res, next) => {
  var obj = {
      name: req.file.filename,
      userID: req.session.User,
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

app.post("/delete-document", function(req,res){
  imgModel.deleteOne({_id: req.body.documentToDelete},function(err){
    if(err){
      console.log(err);
      res.status(500).send('An error occurred', err);
    } else {
      res.redirect("/my-documents");
    }
  });
});

app.post('/add-new-user',function(req,res){
  User.findOne({email: req.body.email},function(err,usr){
    if(usr){
      console.log("Error EMAIL");
      res.redirect("/signUp");
    }
    else if(!(/^[a-zA-Z]+$/.test(req.body.firstname)) ||(/^[a-zA-Z]+$/.test(req.body.lastname)))
    {
      console.log("NO LETTERS");
      res.redirect("/signUp");
    }

    else{
      bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        var newUser = new User({
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          password: hash
        });
        newUser.save();
        req.session.User = newUser._id;
        req.session.name = newUser.firstname +" "+newUser.lastname;
        res.redirect("/my-documents");
      });
    }
  });

});


app.post('/send-to-model', async function(req,res){
  var docs = JSON.stringify(req.body);
  docs = JSON.parse(docs);
  const modelName = docs.model;
  var target = await imgModel.findById(docs.target.id).exec();
  saveDocumentFile(req.session.User, target.name, target.img.data);
  var compareDocsArray = [];
  var comparePoints = [];
  var compareHistory = [];
  for(var i=0; i<docs.compare.length; i++){
    var compare = await imgModel.findById(docs.compare[i].id).exec();
    compareHistory.push({name: compare.name});
    saveDocumentFile(req.session.User, compare.name, compare.img.data);
    compareDocsArray.push(fs.createReadStream(__dirname + '/public/userDocs/' + req.session.User + '/' + compare.name + '.png'));
    comparePoints.push(docs.compare[i].points);
  };
  options = {
    targetDoc: fs.createReadStream(__dirname + '/public/userDocs/' + req.session.User + '/' + target.name + '.png'),
    targetPoints:docs.target.points,
    compareDocs: compareDocsArray,
    comparePoints: comparePoints,
    model: modelName,
    id:req.session.User
  }
  console.log(comparePoints,typeof(comparePoints[0]));
  //'http://127.0.0.1:5000/flask'
  request.post({url:'http://127.0.0.1:5000/flask', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    // res.render("compare",{docs: documents, results: result}); //Display the response on the website
    res.send(body);
    body = JSON.parse(body);
    for(var i=0; i<compareHistory.length; i++){
      var result = parseFloat(body[i])*100;
      compareHistory[i].compatibility = result;
      compareHistory[i].assessment = result < 50 ? "Not Same Writer" : result >= 50 && result < 75 ? "Could Be Same Writer" : "Same Writer";
    }
    console.log(compareHistory);
    var newRecord = new History({
      userID: req.session.User,
      date: new Date().toISOString().split('T')[0],
      target: target.name,
      compare: compareHistory
    });
    newRecord.save();
  });

});

app.get('/history', async function(req,res){
  userDocs = await imgModel.find({userID: req.session.User}, '_id name').exec();
  History.find({userID: req.session.User}, async function(err, recordsFound){
    if (err) {
        console.log(err);
        res.status(500).send('An error occurred', err);
    }
    else {
      res.render("history",{docs: userDocs, records: recordsFound});
    }
  });
});

app.post('/export-to-csv', function(req,res){
  var writeStream = fs.createWriteStream(req.session.User + ".csv");
  const csvStream = format({ headers: true });
  csvStream.pipe(writeStream).on('finish', () => {
    res.setHeader('Content-disposition', 'attachment; filename=' + req.session.User + '.csv');
    res.set('Content-Type', 'text/csv');
    // res.sendFile(__dirname + '/' + req.session.User + '.csv');
    res.download(__dirname + '/' + req.session.User + '.csv');
  });
  createCSVfile(req.body.button, csvStream);
});

app.post('/search-history', async function(req,res){
  console.log(req.body);
  userDocs = await imgModel.find({userID: req.session.User}, '_id name').exec();
  var query = {
    userID: req.session.User,
  }
  if(req.body.document != 'all'){
    query.target = req.body.document;
  }
  if(req.body.date != ''){
    query.date = req.body.date;
  }
  History.find(query, function(err,recordsFound){
    if(err){
      console.log(err);
      res.status(500).send('An error occurred', err);
    }
    else {
      res.render("history",{docs: userDocs, records: recordsFound});
    }
  });
});


app.route('/upload-model').post((req, res, next) => {
  req.pipe(req.busboy); // Pipe it trough busboy

  req.busboy.on('file', (fieldname, file, filename) => {
      const fileType = filename.split('.')[1];
      if( !(fileType === 'h5' || fileType ==='keras')){
          console.log("Error Type model");
          res.redirect('/model');
          return;

      }
      console.log(`Upload of '${filename}' started`);
      const uploadPath = path.join(__dirname,'temp-upload-model/'+ req.session.User); // Register the upload path
      fs_extra.ensureDir(uploadPath); // Make sure that he upload path exits
      // Create a write stream of the new file
      const fstream = fs.createWriteStream(path.join(uploadPath, filename));
      // Pipe it trough
      file.pipe(fstream);

      // On finish of the upload
      fstream.on('close', () => {
          console.log(`Upload of '${filename}' finished`);

          options = {
            model: fs.createReadStream(uploadPath + '/' + filename),
            id: req.session.User
          }
          request.post({url:'http://127.0.0.1:5000/upload', formData: options}, function(error, response, body) {
            console.error('error:', error); // Print the error
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the data received
            res.redirect('/model');
            deleteFileAndDirectory('temp-upload-model/'+req.session.User);
          });
      });
  });
});

app.post('/delete-model', function(req,res){
  options = {
    id: req.session.User,
    modelName: req.body.modelname
  }
  request.post({url:'http://127.0.0.1:5000/delete-model', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    res.redirect("/model");
  });

});

function whiteList(path){
  return path === '/add-new-user' || path === '/signUp' || path === '/confirm-login';
}


function createCSVfile(data,csvStream){
  data = JSON.parse(data);
  var dataToExport = [];
  if(Array.isArray(data)){
    dataToExport = data;
  } else {
    dataToExport.push(data);
  }

  dataToExport.forEach((record,i) => {
    csvStream.write({
      date: record.date,
      target: record.target,
      comparedDocumentName: '',
      compatibility: '',
      assesment: ''
      });
    record.compare.forEach(doc => {
      csvStream.write({
        comparedDocumentName: doc.name,
        compatibility: doc.compatibility,
        assesment: doc.assessment
      });
    });
    csvStream.write({});
  });
  csvStream.end();
}

function saveDocumentFile(user_id ,name, content){
  var dir = "public/userDocs/" + user_id;
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
  filepath  = dir + "/" + name + ".png"
  if (fs.existsSync(filepath)) {
    console.log("file exists");
    return;
  }
  fileContent = content.toString('base64');
  try{
    fs.writeFileSync(filepath, new Buffer(fileContent, "base64"));
    var file = new Buffer(fileContent, "base64");
  } catch (e){
    console.log("Cannot write file ", e);
    return;
  }
  console.log("file succesfully saved.");
}

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
function deleteFileAndDirectory(dirName){
  fs.readdir(__dirname + '/' + dirName, (err, files) => {
    if (err) console.log(err);
    for (const file of files) {
         fs.promises.unlink(__dirname + '/' + dirName + '/' + file, err => {
            if (err) console.log(err);
        }).then(()=>{
          fs.rmdir(__dirname + '/' + dirName, (err) => {
            if(err){console.log(err);return;}
            console.log("Folder Deleted!");
          });
        });
    }

});
}


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
