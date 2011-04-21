var fs        = require('fs');
var path      = require('path')
var asyncid3  = require('./asyncid3')
//var uploads   = require('./fileupload');
var uploads   = require('./uploadstream');
var http      = require('http');
var sys       = require('sys')
var Mu        = require('Mu')
var ws        = require("websocket-server");
var Cookies   = require('cookies')
var utilities = require('./utilities')
var util      = require('util')
var OAuth     = require('oauth').OAuth;
var redis     = require('redis');
var msgs      = require('./messages')
var querystring = require('querystring')
var net = require("net"),
domains = ["outloud.fm:3000","dev.outloud.fm:3000","stream.dev.outloud.fm:3001"];
var chatConnections = {};

Mu.templateRoot = './templates'
var redisClient = redis.createClient();
var pubsubClient = redis.createClient();
var msggen = new msgs.MessageGenerator();
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString()) 
var uploadIds = 0;
var error404path = path.join(process.cwd(), "/static/404.html");   
var urlRegEx = new RegExp('^/([a-zA-Z0-9]+)/?(upload?)?/?$');

var msgId = 0;

Array.prototype.remove = function(e) {//{{{
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};//}}}

sys.puts(util.inspect(settings))

pubsubClient.subscribe("file-ended");
pubsubClient.subscribe("file-changed");
pubsubClient.on("message", function(channel, msg){
  console.log("received message on", channel, "room", msg.roomname)
  if(channel == 'file-ended'){
    var incomingMsg = JSON.parse(msg);
    var outgoingMsg = JSON.stringify( { messages:[msggen.stopped(msg.songId)] } ) 
    broadcastToRoom(msg.roomname, outgoingMsg);
  }else if(channel == 'file-changed'){
    var incomingMsg = JSON.parse(msg);
    var messages = [];
    if( incomingMsg.oldfile ) messages.push(msggen.stopped(incomingMsg.oldfile.songId));
    if( incomingMsg.newfile) messages.push(msggen.started(incomingMsg.newfile.uploader, incomingMsg.newfile.name, incomingMsg.newfile.songId, incomingMsg.newfile.meta))
    var outgoingMsg = JSON.stringify( {messages:messages }) 
    broadcastToRoom(incomingMsg.roomname, outgoingMsg);
  }else{} //bogus message
});

function getUserInfo(sessionId, callback){
  redisClient.mget("session_"+sessionId+"_user_id",
                   "session_"+sessionId+"_screen_name",
                   "session_"+sessionId+"_profilepic",
                   function(err, replies){
    if(replies[0] == null || replies[1] == null){
      callback("No user found", null);
    }else{
      userinfo = {user_id:replies[0], name:replies[1]}
      if(replies[2]) userinfo.pic = replies[2];
      else userinfo.pic = "/static/person.png"
      callback(null, userinfo);
    }
  });
}


function broadcastToRoom(roomname, message, exclude){
  var chatroom = chatConnections[roomname]
  if(chatroom){
    for(var i=0;i<chatroom.length;i++){
      if(exclude && exclude == chatroom[i]) continue;
      chatroom[i].send(message);
    }
  }//TODO error if chatroom isn't found
}

var oa = new OAuth(settings.REQUEST_TOKEN_URL, settings.ACCESS_TOKEN_URL,
                   settings.key, settings.secret, 
                   settings.OAUTH_VERSION, settings.CALLBACK_URL, settings.HASH_VERSION); 

var server = ws.createServer();
server.addListener("request", function(req, res) {
  var qs = require('url').parse(req.url, true)
  if( qs.pathname.indexOf('/static/') === 0 ){
    var uri = qs.pathname
    utilities.serveFromStaticDir(req, res, uri);
    return;
  }
  sys.puts("request at " + qs.pathname);
  switch (qs.pathname) {
    case '/room':
      var cookies = new Cookies(req, res);
      var sessionId = cookies.get("session");
      if( !sessionId ){ utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates); return; }
      if(req.method == "POST"){
        var postData = null;
        req.addListener('data', function(chunk){
          postData = querystring.parse(chunk.toString());
        }).addListener('end', function(){
          var roomName = postData.roomname;
          getUserInfo(sessionId, function(err, userinfo){
            if(err){  // user not found
              utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
              return;
            }
            if( utilities.validateRoomName(roomName) ){
              redisClient.sadd("rooms", roomName, function(err, reply){
                if(reply==1){ //room is newly created
                }else{} // room already existed. whatevz
                res.writeHead(302, { 'Location': '/' + roomName});
                res.end()
              })
            }else{
              utilities.sendTemplate(res, "login.html", {userinfo:userinfo, roomname:roomName, invalid:true}, true, settings.devtemplates)
              return;
            }
          });
        });
      }else{
        getUserInfo(sessionId, function(err, userinfo){
          if(err){  // user not found
            utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
            return;
          }
          utilities.sendTemplate(res, "login.html", {userinfo:userinfo, roomname:roomName, invalid:true}, true, settings.devtemplates)
        });
        return;
      }
      break;
    case '/':
      var cookies = new Cookies(req, res);
      if( !cookies.get("session") ){ // user is not logged in.
        utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
        return;
      }else{ // user is logged in.
        var sessionId = cookies.get("session");
        getUserInfo(sessionId, function(err, userinfo){
          if(err){
            utilities.sendTemplate(res, "login.html", {}, settings.devtemplates)
            return;
          }else{
            utilities.sendTemplate(res, "login.html", {userinfo:userinfo}, settings.devtemplates)
            display_form(req, res, userinfo);
          }
        });
      }
      break;
    case '/upload':
      break;
    case '/login':
      var room = qs.query['r']
      var callbackurl;
      if( room && utilities.validateRoomName(room) ){
        callbackurl = 'http://' + settings.domain + ':' + settings.port + '/authdone?r=' + escape(room);
      }else{
        callbackurl = settings.CALLBACK_URL;
      }
      //console.log(callbackurl);
      oa.getOAuthRequestToken({oauth_callback:callbackurl},
          function(error, oauth_token, oauth_token_secret, results){
            if(error) {
              console.error("Could not fetch a request token! Network or twitter API down?");
              console.error(error);
              res.writeHead(500);
              res.end("Sorry, can't log you in right now! The twitter API did not respond. Try again later.");
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
        cookies.set("session", null, {domain:settings.domain, httpOnly:false});
        res.writeHead(302, { 'Location': 'http://' + settings.domain + ':' + settings.port + '/' });
        res.end()
      })
      break;
    case '/authdone':
      var token = qs.query['oauth_token']
      var verifier = qs.query['oauth_verifier']
      var roomname = qs.query['r']
      var cookies = new Cookies(req, res)
      oa.getOAuthAccessToken(token, verifier, function(error, oauth_access_token, oauth_access_token_secret, results2) {
        sys.puts(util.inspect(results2))
        if( !results2.user_id ){
          res.end(); 
          return;
        }
        oa.getProtectedResource("http://api.twitter.com/1/users/show.json?user_id=" + results2.user_id,
                                "GET", oauth_access_token, oauth_access_token_secret, function (error, data, response) {
          if(error){
            console.log("Error accessing protected resource at twitter:" + error);
            res.end();
            return;
          }
          jsondata = JSON.parse(data);  //TODO check for an error here!
          var profileImg = jsondata.default_profile_image ? "" : jsondata.profile_image_url ;
          //TODO use a hash here instead maybe?
          var session_id = utilities.randomString(128);
          redisClient.mset("session_"+session_id+"_user_id", results2.user_id,
                           "session_"+session_id+"_screen_name", results2.screen_name,
                           "session_"+session_id+"_profilepic", profileImg,
                           function(){ 
                             //TODO check for error here.
            cookies.set("session", session_id, {domain:settings.domain, httpOnly:false});
            var redirectUrl = 'http://' + settings.domain + ':' + settings.port + '/';
            if( roomname && utilities.validateRoomName(roomname) ) redirectUrl += roomname;
            res.writeHead(302, { 'Location': redirectUrl });
            res.end();
          });
        });
      });
      break;
    default:
      var matches = urlRegEx.exec(qs.pathname);
      if( !matches ){ res.end(); return; } //404
      var roomName = matches[1];
      if(!utilities.validateRoomName(roomName) ){ res.end(); return; }
      var isUpload = matches[2];
      var cookies = new Cookies(req, res);
      if( !cookies.get("session") ){ // user is not logged in.
        var ctx = {};
        if( utilities.validateRoomName(roomName) ){
          ctx.room = escape(roomName);
        }
        utilities.sendTemplate(res, "login.html", ctx, true, settings.devtemplates)
      }else{ // user is logged in.
        var sessionId = cookies.get("session");
        if( isUpload ){
          doUpload(req, res, roomName, sessionId);
        }else{
          redisClient.sismember("rooms",roomName, function(err, reply){
            if(reply==0){
              res.end("room not found :(");
              return;
            }
            redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name", "nowplaying_" + roomName,  function(err, replies){
              //TODO;check for err.
              if(replies[0] == null || replies[1] == null){
                utilities.sendTemplate(res, "login.html", {}, settings.devtemplates)
                return;
              }
              userinfo = {user_id:replies[0], name:replies[1]}
              var nowplaying = replies[2];
              display_form(req, res, userinfo, roomName, nowplaying);
            })
          });
        }
      }
      break;
  }
})

//queue.on("file-end", function(nowplaying){
  //var message = JSON.stringify( {messages:[msggen.stopped(nowplaying.uploader, nowplaying.name, nowplaying.songId, nowplaying.meta)]})
  //server.broadcast(message);
//});

//queue.on("file-start", function(nowplaying){
  //var message = JSON.stringify( {messages:[msggen.started(nowplaying.uploader, nowplaying.name, nowplaying.songId, nowplaying.meta)]})
  //server.broadcast(message);
  //redisClient.lpush("chatlog", message, 
    //function(){ redisClient.ltrim("chatlog", 100, function(){}) });
//});

server.addListener("connection", function(connection){
  var qs = require('url').parse(connection._req.url, true)
  var roomname = qs.pathname;
  //TODO make sure room exists?

  roomname = roomname.substring(1); //TODO validate roomname
  connection.authorized = false;
  connection.roomname = roomname;
  connection.addListener("message", function(msg){
    if( !connection.authorized ){
      if(msg.substr(0, 5)==="auth:"){
        var authstring = msg.substr(5)
        var sessionId = utilities.extractCookie(authstring, "session") //TODO check if present/valid?
        redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name", "session_"+sessionId+"_profilepic",
            function(err, replies){
              //TODO check for err.
              var userinfo = {user_id:replies[0], name:replies[1]}
              connection.name = userinfo.name
              connection.authorized = true;
              if(roomname in chatConnections){
                chatConnections[roomname].push(connection);
              }else{
                chatConnections[roomname] = [connection];
              }
              var profilepic = replies[2] ? replies[2] : "_";
              redisClient.hset("listeners_" + roomname, userinfo.name, profilepic, function(err, reply){
                msgId++
                if( reply == 1 ){
                  var message = JSON.stringify( {messages:[msggen.join(connection.name)]})
                  broadcastToRoom(connection.roomname, message, connection);
                  //connection.broadcast(message);
                }else{} // already inside
              })
            })
      }else{ // tried to send message on an unauthorized connection - disconnect it
        //TODO actually disconnect it. im not sure how right now.
        //TODO remove it from the chat connections handler
      }
    }else{
      if(msg=='0'){ //ping! //TODO check timing of pings to prevent DOS
          connection.send("1");
      }else{
          //TODO validate the message first?
          var message = JSON.stringify( {messages:[msggen.chat(connection.name, msg)]})
          sys.puts("[" + connection.roomname + "] " + connection.name + ": " + msg);
          broadcastToRoom(connection.roomname, message);
          //server.broadcast(message);
          redisClient.lpush("chatlog_" + connection.roomname, message,  //TODO only trim after 10 over size, etc.
            function(){ redisClient.ltrim("chatlog_" + connection.roomname, 100, function(){}) });
      }
    }
  });
  connection.addListener("close", function(){
    var chatroom = chatConnections[roomname];
    if( chatroom ) chatConnections[roomname].remove(connection);
    redisClient.hdel("listeners_" + roomname, connection.name, function(err, reply){
      if(reply==1){
        var message = JSON.stringify( {messages:[msggen.left(connection.name)]})
        broadcastToRoom(connection.roomname, message);
      }
    })
  })
});



server.listen(settings.port);

net.createServer(
  function(socket){
    socket.write("<?xml version=\"1.0\"?>\n");
    socket.write("<!DOCTYPE cross-domain-policy SYSTEM \"http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd\">\n");
    socket.write("<cross-domain-policy>\n");
    domains.forEach( function(domain) {
      var parts = domain.split(':');
      socket.write("<allow-access-from domain=\""+parts[0]+"\"to-ports=\""+(parts[1]||'80')+"\"/>\n");
    });
    socket.write("</cross-domain-policy>\n");
    socket.end();   
  }
).listen(843);

function doUpload(req, res, roomname, sessionId){
  var filePath = utilities.randomString(64);
  var fname = req.headers['x-file-name']
  req.pause();
  var fullPath = settings.uploadDirectory + filePath + ".mp3";
  var fileUpload = new uploads.FileUpload(fullPath, req, res)
  fileUpload.setup();
  var metadata = {}
  getUserInfo(sessionId, function(err, uploaderInfo){
    //TODO check err!*/
    //TODO check that user is in the room?*/
    //TODO validate that it's legit mp3?
    fileUpload.on("filedone", function(){
      redisClient.incr("maxsongid", function(err2, newMaxId){
        asyncid3.getBasicTagInfo(fullPath, function(tagdata){
          metadata = tagdata;
          var chatmessage = JSON.stringify( {messages:[msggen.queued(uploaderInfo.name, fname, newMaxId, metadata)]})
          var streamMessage = JSON.stringify( {path:settings.uploadDirectory + filePath + ".mp3",
          name:fname,
          uploader: uploaderInfo.name,
          songId: newMaxId, 
          meta: metadata});
          redisClient.rpush("roomqueue_" + roomname, streamMessage, function(){
            broadcastToRoom(roomname, chatmessage);
            redisClient.publish("newQueueReady",roomname);
          })
          var songMeta = JSON.stringify( {fname:fname,meta:metadata, room:roomname, id:newMaxId} );
          redisClient.set("s_" + newMaxId, songMeta); //TODO make this a hash instead!
        });
      });
    });
    req.resume();
  });

  /*req.pause(); // Pause the incoming stream until we make sure the incoming request is OK*/
  /*req.addListener("data", fileUpload.writeData); */
  /*getUserInfo(sessionId, function(err, userinfo){*/
  /*//TODO check err*/
  /*//TODO check that user is in the room?*/
  /*fileUpload.prepare();*/
  /*req.resume();*/
  /*});*/

  /*req.once("end", function(){*/
  /*fileUpload.finishFile();*/
  /*})*/
  /*var metadata = {};*/

  /*fileUpload.once("filesaved", function(uploaderInfo){*/
  /*redisClient.incr("maxsongid", function(err, newMaxId){*/
  /*var chatmessage = JSON.stringify( {messages:[msggen.queued(uploaderInfo.name, fname, newMaxId, metadata)]})*/
  /*var streamMessage = JSON.stringify( {path:settings.uploadDirectory + filePath + ".mp3",*/
  /*name:fname,*/
  /*uploader: uploaderInfo.name,*/
  /*songId: newMaxId, */
  /*meta: metadata});*/
  /*redisClient.rpush("roomqueue_" + roomname, streamMessage, function(){*/
  /*broadcastToRoom(roomname, chatmessage);*/
  /*redisClient.publish("newQueueReady",roomname);*/
  /*})*/
  /*});*/
  /*});*/

  /*redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name",*/
  /*function(err, replies){ //TODO check for redis error!*/
  /*var userinfo = {user_id:replies[0], name:replies[1]}*/
  /*fileUpload.okToWrite = true; //TODO validate it, if userinfo is bad, drop stream*/
  /*fileUpload.uploaderInfo = userinfo;*/
  /*fileUpload.writeToDisk();*/
  /*})*/

  /*req.once("end", function(){*/
  /*fileUpload.doneBuffering = true;*/
  /*fileUpload.prepareBuffer();*/
  /*metadata = fileUpload.getMetaData();*/
  /*fileUpload.writeToDisk();*/
  /*res.end();*/
  /*});*/
}

function display_form(req, res, userinfo, roomname, nowplaying) {//{{{
  res.statusCode = 200
  var result = { username:userinfo.name,
                 msgs:[],
                 wsurl: "ws://" + settings.domain + ":" + settings.port + "/" + roomname,
                 listenurl: "http://" + settings.streamserver_domain + ":" + settings.streamingport + "/listen/" + roomname,
                 roomname: roomname
               }
  result.nowPlaying = [] //TODO
  result.queue = [] //TODO
  //result.nowPlaying = queue.nowPlaying ? queue.nowPlaying : '';
  //result.queue = queue.getQueue().length > 0 ? queue.getQueue() : [];
  redisClient.hgetall("listeners_" + roomname, function(err, reply){
    if(reply == null) reply = [];
    var listeners = [];
    var appendself = true;
    for(var name in reply){
      if(typeof(name) != "string") continue;
      if(name == userinfo.name) appendself = false;
      var pic = reply[name] != "_" ? reply[name] : "/static/person_small.png";
      listeners.push({name:name, pic:pic});
    }
    result.listeners = listeners
    if( appendself ){
      listeners.unshift({name:userinfo.name, pic: "/static/person_small.png"});
    }
    redisClient.lrange("chatlog_" + roomname, 0, 99, function(err, reply2){
      if(reply2 == null )result.msgs = []
      else result.msgs = reply2;
      redisClient.lrange("roomqueue_" + roomname, 0, 10, function(err, reply3){ //TODO check for err
        if( reply3 ){
          var queueinfo = [];
          var i=0;
          for(i=0;i<reply3.length;i++){
            queueinfo.push(JSON.parse(reply3[i]));
          }
          result.queue = queueinfo;
        }else{
          result.queue = [];
        }
        result.nowPlaying = (nowplaying!=null) ? true : false;
        utilities.sendTemplate(res, "roomchat.html", result, settings.devtemplates)
      });
    });
  });
}//}}}

//fs.readFile('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3', function(err, fd){
  //queue.stream.streamFile(fd)
//})

//queue.enqueue(,"bodpa","mpobrien");

//queue.enqueue('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3',"bodpa","mpobrien");
