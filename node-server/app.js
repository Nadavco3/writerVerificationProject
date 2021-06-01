require("dotenv").config();
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


var error_model_message="";
var  admin_error_model_message="";

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(busboy({highWaterMark: 2 * 1024 * 1024,}));
app.use(session({secret: 'keyboard cat',resave: false,saveUninitialized: false,expires:false}));//, expires:false}
app.use(function (req, res, next) {
  if(whiteList(req.path)){
      next();
  }
  else if(typeof req.session.User !== 'undefined' && req.session.usertype ==='user' && !adminWhiteList(req.path)){
      next();
  }
  else if(typeof req.session.User !== 'undefined' && req.session.usertype ==='admin' && adminWhiteList(req.path)){
      next();
  }
  else if(env === 'test'){
      next();
  }
  else {
      //Return a response immediately
      res.render('login',{failed: false});
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


const env = process.env.NODE_ENV;
if(env === 'test'){
  mongoDBurl = "mongodb+srv://liels8:"+process.env.DB_PASS+"@cluster0.usywl.mongodb.net/test?retryWrites=true&w=majority"
} else {
  mongoDBurl = "mongodb+srv://liels8:"+process.env.DB_PASS+"@cluster0.usywl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
}

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
const Document = new mongoose.model('Image', imageSchema);

//users schema for mongo db

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname:String,
  email:String,
  password: String,
  usertype: String
});

const User = new mongoose.model('User',userSchema);

//history schema for mongo db

const historySchema = new mongoose.Schema({
  userID: String,
  date: String,
  model: String,
  target: String,
  compare: [{
    name: String,
    compatibility: Number,
    assessment: String
  }]
});

const History = new mongoose.model('History', historySchema);

app.get('/', (req, res) => {req.session.User==='undefined'?res.render('login',{failed: false}):res.redirect('/my-documents')});
app.get('/login', function(req,res){req.session.User==='undefined'?res.render('login',{failed: false}):res.redirect('/my-documents')});
app.get('/signUp', function(req,res){res.render("signUp",{msg: ""});});

app.get('/my-documents', function(req,res){
    Document.find({userID: req.session.User }, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
            env === 'test' ? res.json({items: items}) : res.render('myDocuments', { items: items,name:req.session.name });
        }
    });
});

app.get('/compare', function(req,res){
  Document.find({userID: req.session.User}, (err, items) => {
      if (err) {
          console.log(err);
          res.status(500).send('An error occurred', err);
      }
      else {
        options = {
          id: req.session.User,
        }
        request.post({url:'http://34.78.83.195:5000/get-user-models', formData: options}, function(error, response, body) {
          console.error('error:', error); // Print the error
          console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
          console.log('body:',body); // Print the data received
          var modelsNames = modelsList(JSON.parse(body));
          res.render('compare', { docs: items ,models : modelsNames,name:req.session.name});
        });
      }
  });
});

app.get('/history', async function(req,res){
  userDocs = await Document.find({userID: req.session.User}).exec();
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
  request.post({url:'http://34.78.83.195:5000/get-user-models', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    res.render("model",{models :JSON.parse(body),name:req.session.name,error:error_model_message});
    error_model_message="";
  });

});

app.get("/about", function(req,res){
  res.render("about",{name:req.session.name});
});

app.get("/users", function(req,res){
  User.find({usertype: "user"}, function(err, foundUsers){
    if(err){
      console.log(err);
      res.status(500).send('An error occurred', err);
    } else {
        res.render("users",{users: foundUsers, name:req.session.name});
    }
  });
});

app.post("/delete-user", async function(req,res){
  var userIdToDelete = req.body.button;
  //Delete All user's uploaded documents
  await Document.deleteMany({userID: userIdToDelete}).exec();
  //Delete All user's uploaded models
  options = {
    id: userIdToDelete
  }
  request.post({url:'http://34.78.83.195:5000/delete-user-models', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
  });
  //Delete user
  User.deleteOne({_id: userIdToDelete}, function(err){
    if(err){
      console.log(err);
      res.status(500).send('An error occurred', err);
    } else {
      res.redirect("/users");
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
            req.session.usertype = user.usertype;

            if(user.usertype==="user"){
              res.redirect("/my-documents");
            }
            else
              res.redirect("/admin-model");

          } else {
            res.status(500);
            res.render("login",{failed: true});
          }
        });
      } else {
        res.render("login",{failed: true});
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
        Document.create(obj, (err, item) => {
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
  Document.deleteOne({_id: req.body.documentToDelete},function(err){
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
      console.log("Error: EMAIL ALREADY EXIST");
      res.status(500);
      res.render("signUp",{msg: "Email is already exist."});
    }
    else if(!onlyLetters(req.body.firstname,req.body.lastname))
    {
      res.status(500);
      console.log("NO NUMBERS");
      res.render("signUp",{msg: "First and Last name must contain only letters."});
    }else if(req.body.password != req.body.confirmpassword){
      console.log("WRONG PASSWORD");
      res.status(500);
      env === 'test' ? res.json({msg: "Incorrect password"}) : res.render("signUp",{msg: "Incorrect password"});
    }
    else{
      bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        var newUser = new User({
          firstname: firstLetterUpperCase(req.body.firstname),
          lastname: firstLetterUpperCase(req.body.lastname),
          email: req.body.email,
          password: hash,
          usertype: "user"
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
  var target = await Document.findById(docs.target.id).exec();
  saveDocumentFile(req.session.User, target.name, target.img.data);
  var compareDocsArray = [];
  var comparePoints = [];
  var compareHistory = [];
  for(var i=0; i<docs.compare.length; i++){
    var compare = await Document.findById(docs.compare[i].id).exec();
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
  request.post({url:'http://34.78.83.195:5000/flask', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    // res.render("compare",{docs: documents, results: result}); //Display the response on the website
    res.send(body);
    deleteAllFilesInDirectory( 'public/userDocs/' +req.session.User);
    body = JSON.parse(body);
    for(var i=0; i<compareHistory.length; i++){
      var result = parseFloat(body[i])*100;
      compareHistory[i].compatibility = result;
      compareHistory[i].assessment = modelAssesment(result);
    }
    console.log(compareHistory);
    var newRecord = new History({
      userID: req.session.User,
      date: new Date().toISOString().split('T')[0],
      model: modelName,
      target: target.name,
      compare: compareHistory
    });
    newRecord.save();
  });

});

app.post('/export-to-csv', function(req,res){
  var writeStream = fs.createWriteStream(req.session.User + ".csv");
  const csvStream = format({ headers: true });
  csvStream.pipe(writeStream).on('finish', () => {
    res.setHeader('Content-disposition', 'attachment; filename=' + req.session.User + '.csv');
    res.set('Content-Type', 'text/csv');
    res.download(__dirname + '/' + req.session.User + '.csv',function(error){
      if(error)
        console.log(error);
      try {
        fs.unlinkSync(__dirname + '/' + req.session.User + '.csv')
        //file removed
      } catch(err) {
        console.error(err)
      }
    });
  });
  createCSVfile(req.body.button, csvStream);
});

app.post('/delete-history', async function(req,res){
  deleteHistory(req.body.button);
  res.redirect('/history');
});

app.post('/search-history', async function(req,res){
  console.log(req.body);
  userDocs = await Document.find({userID: req.session.User}, '_id name').exec();
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
      res.render("history",{docs: userDocs, records: recordsFound,name:req.session.name});
    }
  });
});


app.route('/upload-model').post((req, res, next) => {
  req.pipe(req.busboy); // Pipe it trough busboy

  req.busboy.on('file', (fieldname, file, filename) => {
      if(notAcceptedFileType(filename)){
          console.log("Error Type model");
          error_model_message="Please upload file type h5 only";
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
          request.post({url:'http://34.78.83.195:5000/upload', formData: options}, function(error, response, body) {
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
  request.post({url:'http://34.78.83.195:5000/delete-model', formData: options}, function(error, response, body) {
    console.error('error:', error); // Print the error
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the data received
    res.redirect("/model");
  });

});

app.get('/admin-model',function(req,res){
  res.render('adminModel',{name:req.session.name,error: admin_error_model_message});
  admin_error_model_message="";
});

app.post('/admin-upload-model',function(req,res){
  req.pipe(req.busboy); // Pipe it trough busboy

  req.busboy.on('file', (fieldname, file, filename) => {
      if(notAcceptedFileType(filename)){
          console.log("Error Type model");
          admin_error_model_message="Please upload file type h5 only";
          res.redirect('/admin-model');
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
            dir: 'default-model'
          }
          request.post({url:'http://34.78.83.195:5000/upload-default', formData: options}, function(error, response, body) {
            console.error('error:', error); // Print the error
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the data received
            res.redirect('/admin-model');
            deleteFileAndDirectory('temp-upload-model/'+req.session.User);
          });
      });
  });
})

function whiteList(path){
  return path === '/add-new-user' || path === '/signUp' || path === '/confirm-login';
}

function adminWhiteList(path){
  return path === '/admin-menu' || path === '/users' || path === "/delete-user" || path === '/admin-upload-model' || path === '/admin-model';
}

function onlyLetters(firstname, lastname){
  if((/^[a-zA-Z]+$/.test(firstname)) == false || (/^[a-zA-Z]+$/.test(lastname)) == false){
    return false
  }else return true
}

function notAcceptedFileType(filename){
  const fileType = filename.split('.')[1];
  return !(fileType === 'h5' || fileType ==='keras')
}

function modelsList(models){
  var modelsNames = models;
  modelsNames.push("Default-model");
  modelsNames.reverse();
  return modelsNames;
}

function modelAssesment(result){
  return result < 50 ? "Not Same Writer" : result >= 50 && result < 75 ? "Could Be Same Writer" : "Same Writer";
}

function firstLetterUpperCase(name){
  name = name.toLowerCase();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function deleteHistory(data){
  data = JSON.parse(data);
  var dataToDelete = [];
  if(Array.isArray(data)){
    dataToDelete = data;
  } else {
    dataToDelete.push(data);
  }

  dataToDelete.forEach(async(record) => {
    await History.deleteOne({_id: record._id}).exec();
  });

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
      model: record.model,
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


module.exports = { whiteList, adminWhiteList, onlyLetters, firstLetterUpperCase,modelsList,notAcceptedFileType,modelAssesment, Document, User, History, app};
