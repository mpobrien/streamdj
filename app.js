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
var OAuth = require('oauth').OAuth;
var redis = require('redis');
var redisClient = redis.createClient();
var msgs = require('./messages')
var msggen = new msgs.MessageGenerator();
//var settings = JSON.parse(fs.readFileSync(process.argv[2]).toString("ascii"))
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString()) 
var uploadIds = 0;

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
  sys.puts("request at " + qs.pathname);
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
      var fileUpload = new uploads.FileUpload(settings.uploadDirectory + filePath + ".mp3", fname)
      fileUpload.uploadid = ++uploadIds;
      req.addListener("data", fileUpload.bufferData);

      fileUpload.once("filesaved", function(uploaderInfo){
        redisClient.incr("maxsongid", function(err, newMaxId){
          var message = JSON.stringify( {messages:[msggen.queued(uploaderInfo.name, fname, newMaxId)]})
          sys.puts(message);
          server.broadcast(message)
          queue.enqueue(settings.uploadDirectory + filePath + ".mp3", fname, uploaderInfo.name, newMaxId);
        });
      });

      redisClient.mget("session_"+sessionId+"_user_id",
                       "session_"+sessionId+"_screen_name",
        function(err, replies){ //TODO check for redis error!
          var userinfo = {user_id:replies[0], name:replies[1]}
          fileUpload.okToWrite = true; //TODO validate it, if userinfo is bad, drop stream
          fileUpload.uploaderInfo = userinfo;
          fileUpload.writeToDisk();
        })

      req.once("end", function(){
        fileUpload.doneBuffering = true;
        fileUpload.writeToDisk();
        res.end();
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
        cookies.set("session", null, {domain:"outloud.fm", httpOnly:false});
        res.writeHead(302, { 'Location': 'http://outloud.fm:3000/' });
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
            try{
                redisClient.mset("session_"+session_id+"_user_id", results2.user_id, "session_"+session_id+"_screen_name", results2.screen_name,
                                 function(){
                                   cookies.set("session", session_id, {domain:"outloud.fm", httpOnly:false});
                                   res.writeHead(302, { 'Location': 'http://outloud.fm:3000/', });
                                   res.end();
                                 })
            }catch(e){
              res.end("something went wrong, please tell mikey?");
            }
          })
      break;
    default:
      //res.end();
      break;
  }
})
var msgId = 0;

queue.on("file-end", function(nowplaying){
  var message = JSON.stringify( {messages:[msggen.stopped(nowplaying.uploader, nowplaying.name, nowplaying.songId)]})
  server.broadcast(message);
});

queue.on("file-start", function(nowplaying){
  var message = JSON.stringify( {messages:[msggen.started(nowplaying.uploader, nowplaying.name, nowplaying.songId)]})
  server.broadcast(message);
});

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
              var userinfo = {user_id:replies[0], name:replies[1]}
              connection.name = userinfo.name
              connection.authorized = true;
              redisClient.sadd("listeners", userinfo.name, function(err, reply){
                msgId++
                if( reply == 1 ){
                  var message = JSON.stringify( {messages:[msggen.join(connection.name)]})
                  connection.broadcast(message);
                }else{} // already inside
              })
            })
      }
    }else{
      if(msg=='0'){ //ping!
          connection.send("1");
      }else{
          //TODO validate the message first?
          var message = JSON.stringify( {messages:[msggen.chat(connection.name, msg)]})
          sys.puts(connection.name + ": " + msg);
          server.broadcast(message);
          redisClient.lpush("chatlog", message, 
            function(){ redisClient.ltrim("chatlog", 100, function(){}) });
      }
    }
  });
  connection.addListener("close", function(){
    redisClient.srem("listeners", connection.name, function(err, reply){
      if(reply==1){
        var message = JSON.stringify( {messages:[msggen.left(connection.name)]})
        connection.broadcast(message);
      }
    })
  })
});








server.listen(settings.port);

function display_form(req, res, userinfo) {//{{{
  res.statusCode = 200
  var result = { username:userinfo.name,
                 msgs:[]
               }
  if( queue.nowPlaying ){ 
    result.nowPlaying = queue.nowPlaying;
  }else{
    result.nowPlaying = '';
  }
  if( queue.getQueue().length > 0 ){
    result.queue = queue.getQueue()
  }else{
    result.queue = []
  }
  redisClient.smembers("listeners", function(err, reply){
    if(reply == null) reply = [];
    var listeners = [];
    for(var i in reply){
      if(typeof(reply[i]) == "string"){
        listeners.push({name:reply[i]});
      }
    }
    result.listeners = listeners
    redisClient.lrange("chatlog", 0, 99, function(err, reply2){
      if(reply2 == null )result.msgs = []
      else result.msgs = reply2;
      utilities.sendTemplate(res, "simple.html", result)
    });
  });
}//}}}

//fs.readFile('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3', function(err, fd){
  //queue.stream.streamFile(fd)
//})

//queue.enqueue(,"bodpa","mpobrien");

//queue.enqueue('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3',"bodpa","mpobrien");
