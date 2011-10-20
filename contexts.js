var Cookies   = require('cookies')
var Session   = require('./models').Session
var User   = require('./models').User
var uploads   = require('./uploadstream');
var utilities = require('./utilities')
var querystring = require('querystring')

var lookupSession = function(req, res, callback){
  var cookies = new Cookies(req, res)
  if( !cookies.get("session") ){
    req.user = null;
    callback();
  }else{
    var sessionId = cookies.get("session");
    Session.findById(sessionId, function(err, doc){
      if(doc){
        req.session = doc;
      }else{
        req.session = null;
      }
      callback();
    });
  }
}
exports.lookupSession = lookupSession

var getUserInfo = function(req, res, callback){
  if(req.session){
    User.findOne({_id:req.session.user}, function(e,d){
      if(d){
        req.user = d;
      }
      callback();
    })
  }else{
    callback();
  }
}
exports.getUserInfo = getUserInfo;

var getPostData = function(req, res, callback){
  var postData = null;
  req.on('data', function(chunk){
    postData = querystring.parse(chunk.toString());
  }).on("end", function(){
    req.postData = postData;
    callback();
  });
}
exports.getPostData = getPostData

var prepareUpload = function(req, res, callback){
  req.pause();
  var filePath = utilities.randomString(64);
  var fullPath = "/home/mike/uploaded" + filePath + ".mp3";
  var fileUpload = new uploads.FileUpload(fullPath, req, res)
  fileUpload.setup();
  req.fileUpload = fileUpload;
  callback();
}
exports.prepareUpload = prepareUpload
