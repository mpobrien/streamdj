var fs        = require('fs');
var path      = require('path')
var asyncid3  = require('./asyncid3')
var routing   = require('./routing')
var uploads   = require('./uploadstream');
var http      = require('http');
var https     = require('https');
var sys       = require('sys')
var mustache  = require('mustache')
var ws        = require("websocket-server");
var Cookies   = require('cookies')
var utilities = require('./utilities')
var util      = require('util')
var OAuth     = require('oauth').OAuth;
var redis     = require('redis');
var msgs      = require('./messages')
var chat      = require('./rooms')
var TemplateManager = require('./templatemanager').TemplateManager
domains = ["outloud.fm","dev.outloud.fm","stream.dev.outloud.fm:81"];

var querystring = require('querystring')
var net = require("net")
var rooms = {};
var redisClient = redis.createClient();
var pubsubClient = redis.createClient();
var msggen = new msgs.MessageGenerator();
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString()) 
var error404path = path.join(process.cwd(), "/static/404.html");   

var templates = new TemplateManager('./templates',['login.html.mu', 'roomchat2.html.mu', 'loggedin.html.mu', 'roompreview.html', 'adminhome.html', 'adminroom.html']);
templates.initializeTemplates();

function reloadTemplates(req, res){
  templates.initializeTemplates();
  res.end();
}

var isSiteAdmin = function(uid){//{{{
  for(var i=0;i<settings.SITE_ADMINS.length;i++){
    if(uid == settings.SITE_ADMINS[i]){
      return true;
    }
  }
  return false;
}//}}}


/*function broadcastToRoom(roomname, message, exclude){*/
/*var chatroom = rooms[roomname]*/
/*if(chatroom){*/
/*for(var i=0;i<chatroom.length;i++){*/
/*if(exclude && exclude == chatroom[i]) continue;*/
/*chatroom[i].send(message);*/
/*}*/
/*}//TODO error if chatroom isn't found*/
/*}*/

function broadcastToRoom(room, message, excludeUid){
  if(room){
    console.log("sending to ", room.length);
    for(var i=0;i<room.length;i++){
      if(excludeUid && excludeUid == room[i].uid) continue;
      room[i].send(message);
    }
  }
}


function getUserInfo(sessionId, callback){//{{{
  redisClient.mget("session_"+sessionId+"_user_id",
                   "session_"+sessionId+"_screen_name",
                   "session_"+sessionId+"_service",
                   "session_"+sessionId+"_profilepic",
                   "session_"+sessionId+"_name",
                   function(err, replies){
    if(replies[0] == null || replies[1] == null){
      callback("No user found", null);
    }else{
      userinfo = {user_id:replies[0], screen_name:replies[1]}
      if(replies[3]) userinfo.pic = replies[3];
      else {
        if(replies[2] == 'fb') userinfo.pic = "http://graph.facebook.com/" + replies[1] + "/picture?type=square"
        else userinfo.pic = "/static/person.png"
      }
      userinfo.service = replies[2]
      userinfo.name = replies[4]
      callback(null, userinfo);
    }
  });
}//}}}

process.on('uncaughtException', function (err) {
  console.log('FATAL - caught exception:' + err);
  console.log("stack:", err.stack);
});
sys.puts(util.inspect(settings))

pubsubClient.subscribe("chatmessage");
pubsubClient.subscribe("file-changed");
pubsubClient.subscribe("file-ended");
pubsubClient.subscribe("file-queued");
pubsubClient.subscribe("queueremove");
pubsubClient.subscribe("userjoined");
pubsubClient.subscribe("userleft");
pubsubClient.subscribe("userliked");
pubsubClient.on("message", function(channel, msg){
    console.log(channel, msg)
  var firstSpace =  msg.indexOf(" ");
  var secondSpace = msg.indexOf(" ", firstSpace+1);
  var roomname = msg.substring(0, firstSpace);
  var msgId = msg.substring(firstSpace+1, secondSpace);
  var room = rooms[roomname];
  if( !room ) return;
  if(channel == 'userliked'){
    broadcastToRoom(room, msg.substr(secondSpace+1));
  } if(channel == 'chatmessage'){
    broadcastToRoom(room, msg.substr(secondSpace+1));
    //room.broadcast(msg.substr(secondSpace+1), msgId);
  }else if(channel == 'userjoined'){
    //room.broadcast(msg.substr(secondSpace+1), msgId);
    broadcastToRoom(room, msg.substr(secondSpace+1));
  }else if(channel == 'userleft'){
    //room.broadcast(msg.substr(secondSpace+1), msgId);
    broadcastToRoom(room, msg.substr(secondSpace+1));
  }else if(channel == 'file-ended'){
    var incomingMsg = JSON.parse(msg.substr(secondSpace+1));
    var outgoingMsg = msggen.stopped(incomingMsg.songId, msgId);
    outgoingMsg.id = msgId;
    var outgoingMsgStr = JSON.stringify(outgoingMsg);
    //room.broadcast(outgoingMsgStr, msgId);
    broadcastToRoom(room, outgoingMsgStr);
  }else if(channel == 'file-changed'){
    var incomingMsg = JSON.parse(msg.substr(secondSpace+1));
    var messages = [];
    var startedmsg = msggen.started(incomingMsg.newfile.uploader, incomingMsg.newfile.name, incomingMsg.newfile.songId, incomingMsg.newfile.meta, incomingMsg.newfile.uid, msgId)
    console.log(startedmsg);
    startedmsg.id = msgId;
    var outgoingMsg = JSON.stringify(startedmsg) 
    console.log("file changed");
    //room.broadcast(outgoingMsg, msgId);
    broadcastToRoom(room, outgoingMsg);
  }else if(channel == 'file-queued'){
    var incomingMsg = JSON.parse(msg.substr(secondSpace+1));
    var outgoingMsg = msggen.queued(incomingMsg.uploader, 'asfa', incomingMsg.songId, incomingMsg.meta, incomingMsg.uid) 
    outgoingMsg.id = msgId;
    console.log("file queued");
    //room.broadcast(JSON.stringify(outgoingMsg), msgId);
    broadcastToRoom(room, JSON.stringify(outgoingMsg));
  }else if(channel == 'queueremove'){
    var incomingMsg = msg.substr(secondSpace+1);
    //var outgoingMsg = msggen.queued(incomingMsg.uploader, 'asfa', incomingMsg.songId, incomingMsg.meta, incomingMsg.uid) 
    /*outgoingMsg.id = msgId;*/
    /*console.log("file queued");*/
    //room.broadcast(incomingMsg, msgId);
    broadcastToRoom(room, incomingMsg);
  }
});

var remove_from_queue = function(req, res, qs, matches){
  var roomname = matches[1];
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  var songId = qs.query['s']
  res.end("{}");
  if( isNaN(parseInt(songId)) ) return;
  songId = parseInt(songId)
  getUserInfo(sessionId, function(err, userinfo){
    if(err || !userinfo) return; //TODO handle/log error.  //TODO make sure user name is valid, + not empyy
    //get the song info by ID - 
    //verify that its the right room, and the right uploader
    //if so, zremrangebyscore roomqueue_<roomname> songId songId
    var uidkey = userinfo.service + "_" + userinfo.user_id
    redisClient.get("s_" + songId, function(err3, reply3){
      if(err3 || !reply3) return;

      var songInfo = JSON.parse(reply3);
      if(songInfo.room == roomname && songInfo.uid == uidkey){
        redisClient.multi( [
          ["zremrangebyscore", "roomqueue_" + roomname, songId, songId],
          ["incr", "roommsg_" + roomname],
        ]).exec(function(errz, replies){
          var numRemoved = replies[0];
          var message = msggen.queue_del(songId)
          message.id = replies[1];
          redisClient.publish("queueremove", roomname + " " + replies[1] + " " + JSON.stringify(message));
        });
      }
    });
  });
  //redisClient.zremrangebyscore("roomqueue_" + roomName, songId, songId, function(err2, reply2){
}






/*pubsubClient.on("message", function(channel, msg){*/
/*var incomingMsg = JSON.parse(msg);*/
/*if(channel == 'file-ended'){*/
/*var outgoingMsg = JSON.stringify( { messages:[msggen.stopped(incomingMsg.songId, incomingMsg.msgId)] } ) */
/*broadcastToRoom(incomingMsg.roomname, outgoingMsg);*/
/*}else if(channel == 'file-changed'){*/
/*console.log('[' + incomingMsg.roomname + '] song started playing: ', incomingMsg.newfile.name);*/
/*var messages = [];*/
/*var msgId = incomingMsg.msgId*/
/*if( incomingMsg.oldfile ) messages.push(msggen.stopped(incomingMsg.oldfile.songId, msgId - 1));*/
/*if( incomingMsg.newfile) messages.push(msggen.started(incomingMsg.newfile.uploader, incomingMsg.newfile.name, incomingMsg.newfile.songId, incomingMsg.newfile.meta, msgId))*/
/*var outgoingMsg = JSON.stringify( {messages:messages}) */
/*broadcastToRoom(incomingMsg.roomname, outgoingMsg);*/
/*}else if(channel == 'file-queued'){*/
/*var messages = [];*/
/*redisClient.incr("roommsg_" + incomingMsg.room, function(err, reply){ //TODO check err*/
/*var msgId = reply;*/
/*messages.push( msggen.queued(incomingMsg.uploader, 'asfa', incomingMsg.songId, incomingMsg.meta, incomingMsg.uid) )*/
/*var outgoingMsg = JSON.stringify( {messages:messages })*/
/*broadcastToRoom(incomingMsg.room, outgoingMsg);*/
/*});*/
/*}else{*/

/*} */
/*});*/
/*});*/

var homepage = function(req, res, qs, matches){//{{{
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ // user is not logged in.
    console.log("alien loaded homepage");
    utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {})
    return;
  }else{ // user is logged in.
    var sessionId = cookies.get("session");
    getUserInfo(sessionId, function(err, userinfo){
      if(err || !userinfo){
        utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {})
      }else{
        console.log(userinfo.name, " loaded homepage");
        var uidkey = userinfo.service + "_" + userinfo.user_id;
        redisClient.zrange("roomvisits_" + uidkey, 0, 6, function(errz, reply){
          if(errz || !reply || reply.length == 0){
            utilities.sendTemplate(res, templates.getTemplate("loggedin.html.mu"), {userinfo:userinfo, rooms:'[]',songs:'[]', counts:'[]'})
          }else{
            utilities.sendTemplate(res, templates.getTemplate("loggedin.html.mu"), {userinfo:userinfo, rooms:'[]',songs:'[]', counts:'[]'})
            /*var commands = [];
            var nowplayingKeys = ["mget"];
            for(var i=0; i<reply.length;i++){
              nowplayingKeys.push("nowplaying_" + reply[i]);
            }
            commands.push(nowplayingKeys);
            for(var i=0; i<reply.length;i++){
              commands.push(["hlen","listeners_" + reply[i]]);
            }
            console.log(commands);
            redisClient.multi(commands).exec(function(errz, reply2){ 
              var nowplayingSongs = reply2[0]
              var roomCounts = reply2.slice(1);
              utilities.sendTemplate(res, templates.getTemplate("loggedin.html.mu"), {userinfo:userinfo, rooms:JSON.stringify(reply), songs:JSON.stringify(reply2[0]), counts:JSON.stringify(roomCounts)})
            })*/
          }
          return;
        });
      }
    });
  }
}//}}}

var room = function(req, res){//{{{
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
        console.log(userinfo.name, " is creating/joining room", roomName);
        roomName = utilities.slugify(roomName);
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
      if(err || !userinfo){  // user not found
        utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
        return;
      }
      utilities.sendTemplate(res, "login.html", {userinfo:userinfo, invalid:true}, true, settings.devtemplates)
    });
    return;
  }
}//}}}

var upload = function(req, res, qs, matches){//{{{
  var roomname = matches[1];
  var filePath = utilities.randomString(64);
  var fname = req.headers['x-file-name']
  req.pause();
  var fullPath = settings.uploadDirectory + filePath + ".mp3";
  var fileUpload = new uploads.FileUpload(fullPath, req, res)
  fileUpload.setup();
  var metadata = {}
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  getUserInfo(sessionId, function(err, uploaderInfo){
    if(err || !uploaderInfo) res.end();
    console.log(uploaderInfo.name," started uploading", fname);
    //TODO check err!*/ //TODO check that user is in the room?*/ //TODO validate that it's legit mp3?
    fileUpload.on("filedone", function(){
      var uidkey = uploaderInfo.service + "_" + uploaderInfo.user_id;
      var uploadedFileInfo = JSON.stringify({"path":fullPath, "room":roomname, "uploader":uploaderInfo.name,'uid':uidkey, 'fname':fname});
      redisClient.rpush("newsongready", uploadedFileInfo);
    });
    req.resume();
  });
}//}}}

var oa = new OAuth(settings.REQUEST_TOKEN_URL, settings.ACCESS_TOKEN_URL,
                   settings.key, settings.secret, 
                   settings.OAUTH_VERSION, settings.CALLBACK_URL, settings.HASH_VERSION); 

pubsubClient.subscribe("chatmessage");
var rooms = {};

//var room = new chat.ChatRoom();

var listen = function(req, res, qs, matches){//{{{
  var cursor = qs.query['c']
  var roomname = matches[1]
  if( utilities.validateRoomName(roomname)){
    var room = rooms[roomname]
    if( room ){
      room.getMessages(req, res, cursor);
    }else{
      room = new chat.ChatRoom();
      rooms[roomname] = room;
      room.getMessages(req, res, cursor);
    }
  }else{
    res.end();
  }
}//}}}

var send = function(req, res, qs, matches){//{{{
  var message = qs.query['m']
  var roomname = matches[1]
  if( !message || !utilities.validateRoomName(roomname) ){
    res.end();
    return;
  }
  res.end();
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ // user is not logged in.
    return;
  }else{ // user is logged in.
    var sessionId = cookies.get("session");
    redisClient.multi([
     ["get","session_"+sessionId+"_name"],
     ["incr", "roommsg_" + roomname]
    ]).exec(function(errz, replies){ 
      if( errz ) return;
      var username = replies[0];
      if( !username ) return;
      var msgId = replies[1];
      var eventMsg = msggen.chat(username, message, msgId)
      var eventMsgString = JSON.stringify(eventMsg)
      //redisClient.zadd("events_" + roomname, msgId, eventMsgString ) //key, score, member 
      redisClient.zadd("chats_" + roomname, msgId, eventMsgString ) //key, score, member 
      redisClient.publish("chatmessage", roomname + " " + msgId + " " + eventMsgString);
    })
  }
  res.end('{}');
}//}}}

var login = function(req, res, qs, matches){//{{{
  var room = qs.query['r']
  var callbackurl;
  if( matches[1] == 'tw' ){
    console.log("alien starting twitter login");
    if( room && utilities.validateRoomName(room) ){
      callbackurl = 'http://' + settings.domain + ':' + settings.port + '/authdone/tw/?r=' + escape(room);
    }else{
      callbackurl = settings.CALLBACK_URL + "/tw/";
    }
    oa.getOAuthRequestToken({oauth_callback:callbackurl}, function(err, oauth_token, oauth_token_secret, results){
      if(err) {
        console.error("Could not fetch a request token! Network or twitter API down?", err);
        res.writeHead(500);
        res.end("Sorry, can't log you in right now! The twitter API did not respond. Try again later.");
      } else { 
        res.writeHead(302, { 'Location': 'https://twitter.com/oauth/authorize?oauth_token=' + oauth_token, });
        res.end();
      }
    });
  }else{
    console.log("alien starting facebook login");
    if( room && utilities.validateRoomName(room) ){
      callbackurl = 'http://' + settings.domain + '/authdone/fb/?r=' + escape(room);
    }else{
      callbackurl = settings.CALLBACK_URL + "/fb/"
    }
    res.writeHead(302, { 'Location': 'https://www.facebook.com/dialog/oauth?client_id=' + settings.facebook_app_id + "&redirect_uri=" + escape(callbackurl)  });
    res.end()
  }
}//}}}

var authdone_twitter = function(req, res, qs){//{{{
  var token = qs.query['oauth_token']
  var verifier = qs.query['oauth_verifier']
  var roomname = qs.query['r']
  var cookies = new Cookies(req, res)
  oa.getOAuthAccessToken(token, verifier, function(error, oauth_access_token, oauth_access_token_secret, results2) {
    if(!results2 || error){
      console.log("results from oauth is undefined!");
      console.log("error?", error);
      utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
      return;
    }
    if( !results2.user_id ){
      res.end(); 
      return;
    }
    oa.getProtectedResource("http://api.twitter.com/1/users/show.json?user_id=" + results2.user_id,
                            "GET", oauth_access_token, oauth_access_token_secret, function (error, data, response) {
      if(error){ console.log("Error accessing protected resource at twitter:" + error); res.end(); return; }
      jsondata = JSON.parse(data);  //TODO check for an error here! try/catch it
      var profileImg = jsondata.default_profile_image ? "" : jsondata.profile_image_url ;
      console.log(results2.screen_name, "logged in via twitter");
      //TODO use a hash here instead maybe?
      var session_id = utilities.randomString(128);
      redisClient.sadd("allusers", "tw_" + results2.user_id);
      redisClient.mset("session_"+session_id+"_user_id", results2.user_id,
                       "session_"+session_id+"_service", "tw",
                       "session_"+session_id+"_screen_name", results2.screen_name,
                       "session_"+session_id+"_name", results2.screen_name,
                       "session_"+session_id+"_profilepic", profileImg,
                       function(){ 
                         //TODO check for error here.
        cookies.set("session", session_id, {domain:settings.domain, httpOnly:false, expires: new Date(+new Date() + (1000 * 60 * 60 * 24 * 14))});
        var redirectUrl = 'http://' + settings.domain + ':' + settings.port + '/';
        if( roomname && utilities.validateRoomName(roomname) ) redirectUrl += roomname;
        res.writeHead(302, { 'Location': redirectUrl });
        res.end();
      });
    });
  });
}//}}}

var authdone_facebook = function(req, res, qs){//{{{
  var roomname = qs.query['r']
  var fbcode = qs.query['code']
  if(!fbcode){ // something happend... user hit deny? whatever, redirect to home page
    console.log("User denied auth request?");
    ctx = (roomname && utilities.validateRoomName(roomname) ? {room:roomname} : {room:''})
    utilities.sendTemplate(res, templates.getTemplate("login.html"), ctx); 
    return;
  }
  var redirecturi = settings.CALLBACK_URL + "/fb/" + (roomname ? "?r=" + roomname : "");
  var accesstoken_path = '/oauth/access_token?client_id='
                         + settings.facebook_app_id 
                         + '&client_secret='+settings.facebook_api_secret 
                         + '&code=' + fbcode + '&redirect_uri=' + escape(redirecturi) 
  var cookies = new Cookies(req, res)
  https.get({ host: 'graph.facebook.com', path: accesstoken_path}, function(client_res) { 
    client_res.on('data', function(d) {
      //TODO catch error here - token not present or invalid stuff
      var raw = d.toString();
      var authtoken = querystring.parse(raw)
      https.get({ host: 'graph.facebook.com', path: "/me?access_token=" + authtoken.access_token}, function(client_res2) { 
        client_res2.on('data', function(d) {

          var me_data;
          try{
            me_data = JSON.parse(d.toString())
          }catch(exception){
            console.log("ERROR during facebook oauth callback:", exception);
            console.log("from facebook:", d.toString());
            utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {}, settings.devtemplates); 
            return;
          }
        
          console.log(me_data);
          console.log(me_data.name, " logged in with facebook");

          var session_id = utilities.randomString(128);
          redisClient.mset("session_"+session_id+"_user_id", me_data.id,
                           "session_"+session_id+"_service", "fb",
                           "session_"+session_id+"_screen_name", me_data.username,
                           "session_"+session_id+"_name", me_data.name,
            function(){ 
              //TODO check for error here.
              cookies.set("session", session_id, {domain:settings.domain, httpOnly:false, expires: new Date(+new Date() + (1000 * 60 * 60 * 24 * 14))});
              var redirectUrl = 'http://' + settings.domain + ':' + settings.port + '/';
              if( roomname && utilities.validateRoomName(roomname) ) redirectUrl += roomname;
              res.writeHead(302, { 'Location': redirectUrl });
              res.end();
            });
        }).on("error", function(e2){
          console.log("error:", e2);
          utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {errors:[{msg:"Facebook could not be reached. Try again in a moment."}], room:roomname}); 
        })

      }).on("error", function(ee7){
        console.log("error:", ee7);
        utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {errors:[{msg:"Facebook could not be reached. Try again in a moment."}], room:roomname}); 
      })
      authtoken.access_token;

    })
    .on('error', function(e12) {
      console.log("FB error:", e12);
      utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {errors:[{msg:"Facebook could not be reached. Try again in a moment."}], room:roomname}); 
    });
  }).on("error", function(e9){
    console.log("FB error:", e9);
    utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {errors:[{msg:"Facebook could not be reached. Try again in a moment."}], room:roomname}); 
  });
}//}}}

var prepareRoomPreview = function(roomName, recentSongs, numlisteners, nowplayingid, res){
  if(!numlisteners) numlisteners = 0;
  if( !recentSongs ) recentSongs = [];
  for(var i=0;i<recentSongs.length;i++){
    recentSongs[i] = JSON.parse(recentSongs[i]);
    if( recentSongs[i].meta.pic ){
      recentSongs[i].meta.pic = encodeURIComponent(recentSongs[i].meta.pic);
    }
  }
  var nowplaying = [];
  if( recentSongs.length > 0 && nowplayingid == recentSongs[0].songId ){
    nowplaying = recentSongs.shift()
  }
  utilities.sendTemplate(res, templates.getTemplate("roompreview.html"), {room:roomName, recentSongs:recentSongs, nowplaying:nowplaying, numlisteners:numlisteners}); 
  return;
}


var roomdisplay = function(req, res, qs, matches){//{{{
  var roomName = matches[1]
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){
    // get the currently playing song
    // get the 5 most recently played songs
    redisClient.multi([
      ['sismember', 'rooms', roomName],
      ['get','nowplayingid_' + roomName],
      ["zrevrange", "songs_" + roomName, 0, 5],
      ['hlen','listeners_' + roomName],
    ]).exec(function(errz, repliez){
      if( errz || !repliez){
        utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), {room:''}); 
        return;
      }else{
        if( !repliez[0] ) {
          res.end("room not found :(");
          return;
        }
        prepareRoomPreview(roomName, repliez[2], repliez[3], repliez[1], res);
        return;
      }
    });
  }else{
    var sessionId = cookies.get("session");
    redisClient.sismember("rooms",roomName, function(err, reply){
      if(reply==0){
        console.log("user requested unknown room: ", roomName);
        res.end("room not found :(");
        return;
      }
      redisClient.multi([
        ["mget", "session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name",
         "session_"+sessionId+"_name", "session_"+sessionId+"_profilepic",
         "session_"+sessionId+"_service", 
         "nowplayingid_" + roomName],
        ["zrevrange", "songs_" + roomName, 0, 5],
        ['hlen','listeners_' + roomName],
      ]).exec(function(errx, repliex){
        var nowplaying = repliex[0][5];
        if(repliex[0][0] == null || repliex[0][1] == null || repliex[0][2] == null){
          // not logged in
          prepareRoomPreview(roomName, repliex[1], repliex[2], repliex[0][5], res);
          return;
        }else{
          // logged in
          var userinfo = {user_id:repliex[0][0], screen_name:repliex[0][1], name:repliex[0][2], pic:repliex[0][3], service:repliex[0][4]}
          console.log(repliex[0][1], "loaded page for room", roomName);
          var uidkey = userinfo.service + "_" + userinfo.user_id;
          redisClient.zadd("roomvisits_" + uidkey, new Date().getTime(), roomName ) //key, score, member 
          if( nowplaying ){ // this is bad spaghetti code. clean this up. TODO
            redisClient.multi([ ["zscore",   "fave_" + uidkey,      nowplaying], ])
            .exec(function(err3, reply){
              var isLiked = reply[0];
              //var isVoted = reply[1];
              var context = {userinfo:userinfo, roomname:roomName, nowplaying:nowplaying, liked:isLiked}
              display_form(req, res, context);
            });
          }else{
            var context = {userinfo:userinfo, roomname:roomName, nowplaying:nowplaying}
            display_form(req, res, context);
          }
        }
      })
    });
  }
}//}}}

function display_form(req, res, context){//{{{
  var userinfo = context.userinfo;
  var roomname = context.roomname;
  var nowplaying = context.nowplaying;
  var liked = context.liked;
  //var lastMsgId = context.lastMsgId;
  
  //context:{userinfo, roomname, nowplaying, liked, voted}
  res.statusCode = 200
  var uidkey = userinfo.service + '_' + userinfo.user_id;
  var result = { username:JSON.stringify(userinfo.name),
                 msgs:[],                                          
                 wsurl: "ws://" + settings.domain + ":" + settings.port + "/" + roomname,
                 listenurl: "http://" + settings.streamserver_domain + ":" + settings.streamingport + "/listen/" + roomname,
                 roomname: roomname,
                 uidkey:uidkey
               }
  redisClient.hgetall("listeners_" + roomname, function(err, reply){
    if(reply == null) reply = [];
    var listeners = [];
    var appendself = true;
    for(var name in reply){
      if(typeof(name) != "string") continue;
      var val = JSON.parse(reply[name]);
      var nameparts = name.split('_')
      var service = nameparts[0]
      var listener_id = nameparts[1]
      var listener_name = val[0];
      var listener_pic = val[1];
      var listener_link = (service == 'tw' ?  'http://twitter.com/account/redirect_by_id?id=' + listener_id : 'http://facebook.com/profile.php?id=' + listener_id);
      if( service == 'fb') listener_pic = "http://graph.facebook.com/" + listener_id + "/picture?type=square" 
      if(name == uidkey) appendself = false;
      listeners.push({name:listener_name, pic:listener_pic, link:listener_link, uid:name});
    }
    result.listeners = listeners
    if( appendself ){
      var self_link = userinfo.service =='tw' ?  'http://twitter.com/' + userinfo.user_id : 'http://facebook.com/profile.php?id=' + userinfo.user_id;
      if(userinfo.service == 'fb'){userinfo.pic = 'http://graph.facebook.com/' + userinfo.user_id + '/picture';} 
      else if( !userinfo.pic ) {userinfo.pic = "/static/person_small.png";}
      listeners.unshift({name:userinfo.name, pic:userinfo.pic, link:self_link, uid:userinfo.service + '_' + userinfo.user_id});
    }
    redisClient.multi( [
      ["zrevrange", "chats_" + roomname, 0, 50],
      ["zrevrange", "songs_" + roomname, 0, 30],
      ["zrange", "roomqueue_" + roomname, 0, 30]
    ]).exec(function(errz, replies){
      var latestChats = replies[0];
      var latestSongs = replies[1];
      var currentQueue = replies[2];
      var queueinfo = [];
      if( !latestSongs ) latestSongs = []
      if( !currentQueue) currentQueue = [];
      for(var i=0;i<currentQueue.length;i++){
        var queueItem = JSON.parse(currentQueue[i]);
        if(queueItem.uid && queueItem.uid == uidkey){
          queueItem.mine = true;
        }
        queueinfo.push(queueItem);
      }
      result.nowPlaying = (nowplaying!=null) ? nowplaying : 0;
      if( liked ) result.liked = true;
      //result.lastMsgId = lastMsgId;
      result.songs = latestSongs;
      result.chats = latestChats;
      result.queue = queueinfo;
      var songIds = [];
      for(var i=0;i<latestSongs.length;i++){
        var songInfo = JSON.parse(latestSongs[i]);
        songIds.push("favecount_" + songInfo.songId);
      }
      
      result.servernow = +new Date().getTime()
      if( !songIds ){
        utilities.sendTemplate(res, templates.getTemplate("roomchat2.html.mu"), result, settings.devtemplates)
      }else{
        redisClient.mget(songIds, function(errz2, replies2){
          result.songIds = JSON.stringify(songIds);
          if( !replies2 ) replies2 = []
          result.favCounts = JSON.stringify(replies2);
          utilities.sendTemplate(res, templates.getTemplate("roomchat2.html.mu"), result, settings.devtemplates)
        })
      }
    })
  });
}//}}}

var logout = function(req, res){//{{{
  console.log("logging out");
  var cookies = new Cookies(req, res)
  var sessionId = cookies.get("session");
  redisClient.del("session_"+sessionId+"_user_id", function(){
    cookies.set("session", null, {domain:settings.domain, httpOnly:false});
    res.writeHead(302, { 'Location': 'http://' + settings.domain + ':' + settings.port + '/' });
    res.end()
  })
}//}}}

var like_unlike = function(req, res, qs, matches){//{{{
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  var songId = qs.query['s']
  res.end("{}");
  if( isNaN(parseInt(songId)) ) return;
  songId = parseInt(songId)
  getUserInfo(sessionId, function(err, userinfo){
    if(err) return; //TODO handle/log error.  //TODO make sure user name is valid, + not empyy
    var uidkey = userinfo.service + "_" + userinfo.user_id
    if( matches[1] == 'like'){
      console.log(userinfo.name, "likes", songId);
      redisClient.multi([
        ["zadd","fave_" + uidkey, new Date().getTime(), songId],
        ["sadd", "favers_" + songId, uidkey],
        ["scard", "favers_" + songId],
        ["get","s_" + songId],
      ]).exec(function(er, r1){
        var numFavers = r1[2];
        var songInfo = r1[3];
        redisClient.set("favecount_" + songId, numFavers);
        try{
          var songjson = JSON.parse(songInfo);
          var outgoingMessage = msggen.liked(songId, numFavers) 
          console.log("publishing");
          redisClient.publish("userliked",songjson.room + " -1 " + JSON.stringify(outgoingMessage));
        }catch(e){};
      });
    }else{
      console.log(userinfo.name, "unlikes", songId);
      redisClient.zrem("fave_" + uidkey, songId);
      redisClient.multi([
        ["zrem","fave_" + uidkey, songId],
        ["srem", "favers_" + songId, uidkey],
        ["scard", "favers_" + songId],
      ]).exec(function(er, r1){
        var numFavers = r1[2];
        redisClient.set("favecount_" + songId, numFavers);
      });
    }
  });
}//}}}

var favorites = function(req, res, qs){//{{{
  var cookies = new Cookies(req, res);
  var sessionId = cookies.get("session");
  if( !sessionId ){ res.end(); return; }// not logged in
  var faved = []
  var pagesize = 10;
  getUserInfo(sessionId, function(err, userinfo){
    if(err){ res.end(); return; }
    console.log(userinfo.name, "loaded favorites list.");
    var uidkey = userinfo.service + "_" + userinfo.user_id
    var pageNum = qs.query['p']
    if( !pageNum ) pageNum = 0;
    responseJson = {numFavorites:0, faves:[], page:pageNum};
    var lowerBound = (pageNum*pagesize);
    var upperBound = lowerBound + pagesize - 1
    responseJson.page = pageNum;
    redisClient.zcard("fave_" + uidkey, function(err, data){
      if( data != undefined ){
        responseJson.numFavorites = data;
      }
      responseJson.page = pageNum;

      redisClient.zrevrange("fave_" + uidkey, lowerBound, upperBound,function(err, data){
        if(data){
          var keys = []
          for(var i=0;i<data.length;i++){
            keys.push("s_" + data[i]);
          }
          redisClient.mget(keys, function(err2, data2){
            if(data2){
              for(var i=0;i<data2.length;i++){
                if(data2[i]){
                  try{
                    var fave_info = JSON.parse(data2[i]);
                    fave_info.songId = data[i];
                    responseJson.faves.push(fave_info);
                  }catch(exception){
                    console.log("bad json?", data2[i]);
                    continue;
                  }
                }
              }
              res.end(JSON.stringify(responseJson));
            }else{
              res.end(JSON.stringify(responseJson));
            }
          });
        }else{
          res.end(JSON.stringify(responseJson));
        }
      });
    });
  })
}//}}}

var postdone = function(req, res, qs){//{{{
  res.end('<html><head><script type="text/javascript">window.close()</script></head><body></body></html>');
}//}}}//}}}

var skip = function(req, res, qs, matches){
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  var songId = qs.query['s']
  res.end("{}");
  roomname = matches[1];
  if( !utilities.validateRoomName(roomname) ) return;
  if( isNaN(parseInt(songId)) ) return;
  songId = parseInt(songId)
  getUserInfo(sessionId, function(err, userinfo){
    if(err) return; //TODO handle/log error.  //TODO make sure user name is valid, + not empyy
    var uidkey = userinfo.service + "_" + userinfo.user_id
    console.log(uidkey,"is skipping", songId);
    redisClient.get("nowplaying_" + roomname, function(err2, reply2){
      var songInfo = JSON.parse(reply2)
      if(songInfo.songId != songId) return; // song ID doesn't match currently playing song.
      if(songInfo.uid != uidkey) return;
      console.log("publishing");
      redisClient.publish("skipnow", roomname + " " + songId);
    });
  });
}

var adminhome = function(req, res, qs, matches){//{{{
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  getUserInfo(sessionId, function(err, userinfo){
    if(err || !userinfo) return;
    var uidkey = userinfo.service + '_' + userinfo.user_id;
    //Check if this is one of the good guys
    if( !isSiteAdmin(uidkey) ){
      res.end('');
      return;
    }else{
      redisClient.smembers("rooms", function(err, rooms){
        if(err || !rooms){
          res.end("error :(");
          return;
        }else{
          utilities.sendTemplate(res, templates.getTemplate("adminhome.html"), {"rooms":rooms});
          return;
        }
      });
    }
  });
}//}}}

var adminroom = function(req, res, qs, matches){//{{{
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  getUserInfo(sessionId, function(err, userinfo){
    if(err || !userinfo) return;
    var uidkey = userinfo.service + '_' + userinfo.user_id;
    //Check if this is one of the good guys
    if( !isSiteAdmin(uidkey) ){
      res.end('');
      return;
    }else{
      var roomname = qs.query['room']
      redisClient.multi( [
        ["get", "nowplaying_" + roomname],
        ["get", "nowplayingid_" + roomname],
        ["zrange", "roomqueue_" + roomname, 0, -1, "withscores"],
        ["hgetall", "listeners_" + roomname],
        ["zcard", "songs_" + roomname],
        ["zcard", "chats_" + roomname],
        ["scard", "uniqlisteners_" + roomname],
      ]).exec(function(errz, replies){
        var queue = replies[2];
        var roomqueue = []
        for(var i=0;i<queue.length;i+=2){
          var queueItem = JSON.parse(queue[i]);
          queueItem.score = queue[i+1];
          queueItem.strinfo = queue[i];
          roomqueue.push(queueItem);
        }
        var numsongs = replies[4];
        var numchats = replies[5];
        var numuniqlisteners = replies[6];
        if( !numsongs ) numsongs = 0;
        if( !numchats ) numchats = 0;
        if( !numuniqlisteners ) numuniqlisteners = 0;

        var context = {"roomname" : roomname,
                       "nowplaying" : replies[0],
                       "nowplaying_id" : replies[1],
                       "roomqueue" : roomqueue,
                       "listeners" : JSON.stringify(replies[3]),
                       "numsongs" : numsongs,
                       "numchats" : numchats,
                       "numuniqlisteners" : numuniqlisteners
                      }
        utilities.sendTemplate(res, templates.getTemplate("adminroom.html"), context);
        return;
      });
    }
  });
}//}}}

var admincommand = function(req, res, qs, matches){//{{{
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  getUserInfo(sessionId, function(err, userinfo){
    if(err || !userinfo) return;
    var uidkey = userinfo.service + '_' + userinfo.user_id;
    //Check if this is one of the good guys
    if( !isSiteAdmin(uidkey) ){
      res.end('');
      return;
    }else{
      var redirectFunc = function(){
        res.writeHead(302, { 'Location': '/admin/roominfo?room=' + roomname});
        res.end();
      }
      var roomname = qs.query['room']
      var command = qs.query['command']
      if( command == "clearlisteners" ){
        redisClient.del("listeners_" + roomname, redirectFunc);
      }else if(command == "skipsong" ){
        var songId = qs.query['songId']
        redisClient.publish("skipnow", roomname + " " + songId, redirectFunc);
      }else if(command =="queuedelete"){
        var songId = qs.query['songId']
        redisClient.multi( [
          ["zremrangebyscore", "roomqueue_" + roomname, songId, songId],
          ["incr", "roommsg_" + roomname],
        ]).exec(function(errz, replies){
          var numRemoved = replies[0];
          var message = msggen.queue_del(songId)
          message.id = replies[1];
          redisClient.publish("queueremove", roomname + " " + replies[1] + " " + JSON.stringify(message));
          redirectFunc();
        });
      }else{
        redirectFunc();
      }
    }
  });
}//}}}

var scQueue = function(req, res, qs, matches){
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ res.end(); return } // user is not logged in.
  var sessionId = cookies.get("session");
  var trackId = qs.query['t']
  res.end("{}");
  roomname = matches[1];
  if( isNaN(parseInt(trackId)) ) return;
  redisClient.sismember("rooms", roomname, function(err2, isroom){
    if( err2 || !isroom ) return;
    getUserInfo(sessionId, function(err, userinfo){
      if(err) return; //TODO handle/log error.  //TODO make sure user name is valid, + not empyy
      var uidkey = userinfo.service + "_" + userinfo.user_id
      var newScTrackInfo = JSON.stringify({uid:uidkey, uploader:userinfo.name, trackId:trackId, room:roomname});
      redisClient.rpush("sctracks", newScTrackInfo);
    })
  });
}

var scredirect = function(req, res, qs, matches){
  trackId = matches[1];
  if(isNaN(parseInt(trackId))){
    utilities.httpRedirect(res, 'http://www.soundcloud.com/');
    return;
  }else{
    trackId = parseInt(trackId);
    var soundcloudApiPath = '/tracks/' + trackId + '.json?client_id=' + settings.SOUNDCLOUD_CLIENTID
    http.get({ host: 'api.soundcloud.com', path: soundcloudApiPath}, function(client_res) { 
      var clientResponse = '';
      client_res.on("data", function(clientdata){
        var raw = clientdata.toString();
        clientResponse += raw;
      }).on("end", function(){
        try{
          var trackInfo = JSON.parse(clientResponse);
          if( 'permalink_url' in trackInfo ){
            utilities.httpRedirect(res, trackInfo['permalink_url']);
            return;
          }else{
            utilities.httpRedirect(res,  'http://www.soundcloud.com/');
            return;
          }
        }catch(exception){
          console.log("Could not parse json data", exception, clientdata.toString());
          utilities.httpRedirect(res, 'http://www.soundcloud.com/');
          return;
        }
      })
      .on("error", function(error){
        console.log("Error occurred getting soundcloud data:", error);
        utilities.httpRedirect(res, 'http://www.soundcloud.com/');
        return;
      });
    }).on("error", function(e){
      console.log("Error occurred reaching soundcloud API:", e);
      utilities.httpRedirect(res, 'http://www.soundcloud.com/');
      return;
    });
  }
}

var router = new routing.Router([//{{{
  ["^/$", homepage],
  ["^/admin/?$", adminhome],
  ["^/admin/roominfo?$", adminroom],
  ["^/admin/command?$", admincommand],
  ["^/sctrack/(\\d+)/?$", scredirect],
  ["^/admin/reloadtemplates$", reloadTemplates],
  ['^/([\\w\-]+)/listen/?$', listen],
  //['^/([\\w\-]+)/send/?$', send],
  ["^/postdone/?$", postdone],
  ["^/login/(fb|tw)/?$", login],
  ["^/logout/?$", logout],
  ["^/favorites/?$", favorites],
  ["^/room/?$", room],
  ["^/authdone/tw/?$", authdone_twitter],
  ["^/authdone/fb/?$", authdone_facebook],
  /*["^/([\\w\-]+)/(vote|unvote)/?$", vote_unvote],*/
  ["^/(like|unlike)/?$", like_unlike],
  ["^/([\\w\-]+)/skip/?$", skip],
  ["^/([\\w\-]+)/remove/?$", remove_from_queue],
  ["^/([\\w\-]+)/upload/?$", upload],  
  ["^/([\\w\-]+)/scqueue/?$", scQueue],  
  ["^/([\\w\-]+)/?$", roomdisplay],
]);//}}}

var server = ws.createServer();
server.addListener("error", function(err) {//{{{
  console.log("server caught 'error' event:", err);
  console.log("stack", err.stack);
})//}}}

server.addListener("request", function(req, res) {//{{{

  req.on("clientError", function(exception){
    console.log("request had client ERROR - ", exception);
    console.log("stack:", exception.stack);
    res.end();
  });

  req.on("error", function(exception){
    console.log("request had ERROR - ", exception);
    console.log("stack:", exception.stack);
    res.end();
  });

  var qs = require('url').parse(req.url, true)
  if( qs.pathname.indexOf('/static/') === 0 ){
    var uri = qs.pathname
    utilities.serveFromStaticDir(req, res, uri);
    return;
  }

  var r = "unknown";
  if('referer' in req.headers){
    r = req.headers['referer']
  }
  console.log("Request at:", qs.pathname, qs.query, "from", req.connection.remoteAddress, r);
  var func = router.route(qs.pathname);
  if( func ){
    func[0](req, res, qs, func[1])
  }else{
    res.end('404!');
  }
})//}}}

server.addListener("connection", function(connection){
  var qs = require('url').parse(connection._req.url, true)
  var roomname = qs.pathname;
  //TODO validate room name
  //TODO make sure room exists?
  roomname = roomname.substring(1); //TODO validate roomname
  connection.authorized = false;
  connection.roomname = roomname;
  connection.addListener("message", function(msg){
    if( !connection.authorized ){
      if(msg.substr(0, 5)==="auth:"){
        var authstring = msg.substr(5)
        var sessionId = utilities.extractCookie(authstring, "session") //TODO check if present/valid?
        getUserInfo(sessionId, function(err, userinfo){
          //TODO check for err.
          connection.name = userinfo.name
          connection.uid = userinfo.service + '_' + userinfo.user_id;
          connection.authorized = true;
          if(roomname in rooms){
            rooms[roomname].push(connection);
          }else{
            rooms[roomname] = [connection];
          }
          //var profilepic = replies[2] ? replies[2] : "_";
          var listenerInfo = JSON.stringify([userinfo.name, userinfo.pic])
          redisClient.hset("listeners_" + roomname, userinfo.service + '_' + userinfo.user_id, listenerInfo, function(err, reply){
            redisClient.sadd("uniqlisteners_" + roomname, userinfo.service + '_' + userinfo.user_id, function(err2, reply2){
              var message = JSON.stringify(msggen.join(connection.name,userinfo.service, userinfo.user_id, userinfo.pic, reply2==1))
              if( reply == 1 ){
                redisClient.publish("userjoined", roomname + " " + "-1" + " " + message);
              }else{} // already inside
            });
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
        redisClient.incr("roommsg_" + connection.roomname, function(err, reply){
          //TODO check err
          var username = connection.name;
          var msgId = reply;
          var eventMsg = msggen.chat(username, msg, msgId)
          var eventMsgString = JSON.stringify(eventMsg)
          redisClient.zadd("chats_" + roomname, msgId, eventMsgString ) //key, score, member 
          redisClient.publish("chatmessage", roomname + " " + msgId + " " + eventMsgString);
          //TODO events
          console.log("[" + connection.roomname + "] ", connection.name + ":", msg);
          //redisClient.zadd("roomlog_" + connection.roomname, msgId, message, function(err2, reply2){ });
          //TODO trim sorted set? maybe sometimes?
        });
      }
    }
  });
  connection.addListener("close", function(){
    var chatroom = rooms[roomname];
    if( chatroom ) rooms[roomname].remove(connection);
    redisClient.hdel("listeners_" + roomname, connection.uid, function(err, reply){
      if(reply==1){
        var message = JSON.stringify( msggen.left(connection.name, connection.uid))
        redisClient.publish("userleft", roomname + " " + "-1" + " " + message);
      }
    })
  })
});

server.listen(settings.port);

/*
http.createServer(function (req, res) {//{{{
  var qs = require('url').parse(req.url, true)
  if( qs.pathname.indexOf('/static/') === 0 ){
    var uri = qs.pathname
    utilities.serveFromStaticDir(req, res, uri);
    return;
  }

  var func = router.route(qs.pathname);
  if( func ){
    func[0](req, res, qs, func[1])
  }else{
    res.end('404!');
  }
}).listen(settings.port, "127.0.0.1");//}}}
*/

net.createServer(//{{{
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
//}}}
