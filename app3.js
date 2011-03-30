var fs = require('fs');
var uploads = require('./fileupload');
var http = require('http');
var queue = require('./queue');
var sys = require('sys')
var Mu = require('Mu')
var ws = require("websocket-server");
var Cookies = require('cookies')
Mu.templateRoot = './templates'
var utilities = require('./utilities')
var util= require('util')
var OAuth = require('node-oauth').OAuth;
var redis = require('redis');
var redisClient = redis.createClient();
var msgs = require('./messages')
var msggen = new msgs.MessageGenerator();
//var settings = JSON.parse(fs.readFileSync(process.argv[2]).toString("ascii"))
var settings  =
{
  "uploadDirectory":"/home/mike/uploaded/",
  "port":80,
  "host":"streamdj.com",
  "key":'IplmVMSk2qr6uNG6Pw11hg',
  "secret":'zVrKkW8YMWS56WrpPxBjXY9HmpUnZe7AiRCytog8uI',
  "REQUEST_TOKEN_URL" : 'http://api.twitter.com/oauth/request_token',
  "ACCESS_TOKEN_URL" : 'http://api.twitter.com/oauth/access_token',
  "OAUTH_VERSION" : '1.0',
  "HASH_VERSION" : 'HMAC-SHA1',
  "CALLBACK_URL" : 'http://streamdj.com/authdone'
}

Array.prototype.remove = function(e) {//{{{
    for (var i = 0; i < this.length; i++) {
        if (e == this[i]) { return this.splice(i, 1); }
    }
};//}}}

var streamlisteners = [];
var queue = new queue.Mp3Queue();

queue.stream.on("frameready", function(data,y,z){
  streamlisteners.forEach(function(listener){
    listener.write(data);
  })
});

var oa = new OAuth(settings.REQUEST_TOKEN_URL, settings.ACCESS_TOKEN_URL,
                   settings.key, settings.secret, 
                   settings.OAUTH_VERSION, settings.CALLBACK_URL, settings.HASH_VERSION); 

var server = ws.createServer();
server.addListener("request", function(req, res) {
  var qs = require('url').parse(req.url, true)
  if( qs.pathname.indexOf('/static/') === 0 ){
    var uri = qs.pathname
    utilities.serveStaticFile(req, res, uri);
    return;
  }
  switch (qs.pathname) {
    case '/listen':
      req.connection.addListener("close", function(){ streamlisteners.remove(res); })
      streamlisteners.push(res); //TODO remove listeners when done
      break;
    case '/':
      var cookies = new Cookies(req, res);
      if( !cookies.get("session") ){ // user is not logged in.
        utilities.sendTemplate(res, "login.html", {})
      }else{ // user is logged in.
        var sessionId = cookies.get("session");
        redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name", function(err, replies){
          //TODO check for err.
          userinfo = {user_id:replies[0], name:replies[1]}
          display_form(req, res, userinfo);
        })
      }
      break;
    case '/upload':
      var cookies = new Cookies(req, res);
      var sessionId = cookies.get("session");
      var filePath = utilities.randomString(64);
      var fname = req.headers['x-file-name']
      var userinfo = {name:'mike',user_id:1234}

      var fileUpload = new uploads.FileUpload(settings.uploadDirectory + filePath + ".mp3", fname)
      req.addListener("data", fileUpload.bufferData);

      fileUpload.on("filesaved", function(uploaderInfo){
        queue.enqueue(settings.uploadDirectory + filePath + ".mp3", fname, uploaderInfo.name);
        server.broadcast(JSON.stringify( {messages:[msggen.queued(uploaderInfo.name, fname)]}))
      });

      redisClient.mget("session_"+sessionId+"_user_id",
                       "session_"+sessionId+"_screen_name",
        function(err, replies){ //TODO check for redis error!
          userinfo = {user_id:replies[0], name:replies[1]}
          fileUpload.okToWrite = true; //TODO validate it, if userinfo is bad, drop stream
          fileUpload.uploaderInfo = userinfo;
          fileUpload.writeToDisk();
        })


      req.addListener("end", function(){
        fileUpload.doneBuffering = true;
        fileUpload.writeToDisk();
      });
      break;
    case '/login':
      oa.getOAuthRequestToken(
          function(error, oauth_token, oauth_token_secret, results){
            if(error) {
              throw new Error(([error.statusCode, error.data].join(': ')));
            } else { 
              res.writeHead(302, { 'Location': 'https://twitter.com/oauth/authorize?oauth_token=' + oauth_token, });
              res.end();
            }
          }
        );
      break;
    case '/logout':
      var cookies = new Cookies(req, res)
      var sessionId = cookies.get("session");
      redisClient.del("session_"+sessionId+"_user_id", function(){
        cookies.set("session", null, {domain:"streamdj.com", httpOnly:false});
        res.writeHead(302, { 'Location': 'http://streamdj.com/' });
        res.end()
      })
      break;
    case '/authdone':
      var token = qs.query['oauth_token']
      var verifier = qs.query['oauth_verifier']
      var cookies = new Cookies(req, res)
      oa.getOAuthAccessToken(token, verifier, 
          function(error, oauth_access_token, oauth_access_token_secret, results2) {
            var session_id = utilities.randomString(128);
            redisClient.mset("session_"+session_id+"_user_id", results2.user_id, "session_"+session_id+"_screen_name", results2.screen_name,
                             function(){
                               cookies.set("session", session_id, {domain:"streamdj.com", httpOnly:false});
                               res.writeHead(302, { 'Location': 'http://streamdj.com/', });
                               res.end();
                             })
          })
      break;
    default:
      //res.end();
      break;
  }
})
var msgId = 0;

server.addListener("connection", function(connection){
  connection.authorized = false;
  connection.addListener("message", function(msg){
    if( !connection.authorized ){
      if(msg.substr(0, 5)==="auth:"){
        var authstring = msg.substr(5)
        var sessionId = utilities.extractCookie(authstring, "session") //TODO check if present/valid?
        redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name",
            function(err, replies){
              //TODO check for err.
              userinfo = {user_id:replies[0], name:replies[1]}
              connection.name = userinfo.name
              connection.authorized = true;
              redisClient.sadd("listeners", userinfo.name, function(err, reply){
                msgId++
                if( reply == 1 ){
                  var message = JSON.stringify({messages:[{"type":"join","id":msgId,'from':userinfo.name,'body':''}]})
                  connection.broadcast(message);
                }else{} // already inside
              })
            })
      }
    }else{
      var chat = JSON.stringify({messages:[{"type":"chat","id":msgId,'from':connection.name,'body':msg}]})
    }
    //TODO validate the message first?
    connection.broadcast(chat);
  });
});








server.listen(settings.port);

function display_form(req, res, userinfo) {//{{{
  res.statusCode=200
  var result = { username:userinfo.name,
                 msgs:[],
                 nowplaying: "" }
  result.queue = []
  utilities.sendTemplate(res, "simple.html", result)
}//}}}

function upload_file(req, res, userinfo) {//{{{
  var fname = req.headers['x-file-name'] 
  sys.puts(util.inspect(req.headers));
  var buf = []
  var bufLen = 0;   
  req.addListener("data", function(data){
    buf.push(data)
    bufLen += data.length;
  });

  req.addListener("end",
      function(){
        var finalbuf = new Buffer(bufLen);
        for (var i=0,len=buf.length,pos=0; i<len; i++) {
          buf[i].copy(finalbuf, pos);
          pos += buf[i].length;
        }  
        var filePath = utilities.randomString(64);
        fs.open(settings.uploadDirectory + filePath + ".mp3", 'w',
          function(err2, fd){
            fs.write(fd, finalbuf, 0, finalbuf.length, null, function(){
                fs.close(fd);
                res.end();
                queue.enqueue(settings.uploadDirectory + filePath + ".mp3", fname, userinfo.name);
                sys.puts(settings.uploadDirectory + filePath + ".mp3");
                server.broadcast(JSON.stringify( {messages:[msggen.queued(userinfo.name, fname)]}))
              //broadcast({messages:[{"type":"enq","id":msgId,'from':sess.name,'body':fname}]})
            });
          });
      });
}//}}}

//fs.readFile('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3', function(err, fd){
  //queue.stream.streamFile(fd)
//})

//queue.enqueue(,"bodpa","mpobrien");

//queue.enqueue('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3',"bodpa","mpobrien");
