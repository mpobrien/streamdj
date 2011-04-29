var fs        = require('fs');
var path      = require('path')
var asyncid3  = require('./asyncid3')
var routing   = require('./routing')
var uploads   = require('./uploadstream');
var http      = require('http');
var https     = require('https');
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
var error404path = path.join(process.cwd(), "/static/404.html");   

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
  var incomingMsg = JSON.parse(msg);
  if(channel == 'file-ended'){
    var outgoingMsg = JSON.stringify( { messages:[msggen.stopped(incomingMsg.songId)] } ) 
    broadcastToRoom(incomingMsg.roomname, outgoingMsg);
  }else if(channel == 'file-changed'){
    console.log('[' + incomingMsg.roomname + '] song started playing: ', incomingMsg.newfile.name);
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

var homepage = function(req, res){//{{{
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){ // user is not logged in.
    console.log("alien loaded homepage");
    utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
    return;
  }else{ // user is logged in.
    var sessionId = cookies.get("session");
    getUserInfo(sessionId, function(err, userinfo){
      if(err){
        console.log("alien loaded homepage");
        utilities.sendTemplate(res, "login.html", {}, settings.devtemplates)
        return;
      }else{
        console.log(userinfo.name, " loaded homepage");
        utilities.sendTemplate(res, "login.html", {userinfo:userinfo}, settings.devtemplates)
      }
    });
  }
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
      callbackurl = 'http://' + settings.domain + ':' + settings.port + '/authdone/fb/?r=' + escape(room);
    }else{
      callbackurl = settings.CALLBACK_URL + "/fb/"
    }
    res.writeHead(302, { 'Location': 'https://www.facebook.com/dialog/oauth?client_id=' + settings.facebook_app_id + "&redirect_uri=" + escape(callbackurl) + "&scope=publish_stream" });
    res.end()
  }
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

var favorites = function(req, res){//{{{
  var cookies = new Cookies(req, res);
  var sessionId = cookies.get("session");
  if( !sessionId ){ res.end(); return; }// not logged in
  var faved = []
  getUserInfo(sessionId, function(err, userinfo){
    if(err){ res.end(); return; }
    console.log(userinfo.name, "loaded favorites list.");
    var uidkey = userinfo.service + "_" + userinfo.user_id
    redisClient.zrevrange("fave_" + uidkey, 0, 10,function(err, data){
      if(data){
        var keys = []
        for(var i=0;i<data.length;i++){
          keys.push("s_" + data[i]);
        }
        redisClient.mget(keys, function(err2, data2){
          if(data2){
            for(var i=0;i<data2.length;i++){
              if(data2[i]){
                faved.push(JSON.parse(data2[i]));
              }
            }
            res.end(JSON.stringify({faves:faved}));
          }else{
            res.end("{\"faves\":[]}");
          }
        });
      }else{
        res.end("{\"faves\":[]}");
      }
    });
  })
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
}//}}}

var authdone_twitter = function(req, res, qs){//{{{
  var token = qs.query['oauth_token']
  var verifier = qs.query['oauth_verifier']
  var roomname = qs.query['r']
  var cookies = new Cookies(req, res)
  oa.getOAuthAccessToken(token, verifier, function(error, oauth_access_token, oauth_access_token_secret, results2) {
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
      redisClient.mset("session_"+session_id+"_user_id", results2.user_id,
                       "session_"+session_id+"_service", "tw",
                       "session_"+session_id+"_screen_name", results2.screen_name,
                       "session_"+session_id+"_name", results2.screen_name,
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
}//}}}

var authdone_facebook = function(req, res, qs){//{{{
  var roomname = qs.query['r']
  var fbcode = qs.query['code']
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
          var me_data = JSON.parse(d.toString())
          console.log(me_data.name, " logged in with facebook");
          /*{ id: '8801758',
            name: 'Michael O\'Brien',
            first_name: 'Michael',
            last_name: 'O\'Brien',
            link: 'http://www.facebook.com/mpobrien',
            username: 'mpobrien',
            gender: 'male',
            timezone: -4,
            locale: 'en_US',
            verified: true,
            updated_time: '2011-04-24T23:45:39+0000' }*/

          var session_id = utilities.randomString(128);
          redisClient.mset("session_"+session_id+"_user_id", me_data.id,
                           "session_"+session_id+"_service", "fb",
                           "session_"+session_id+"_screen_name", me_data.username,
                           "session_"+session_id+"_name", me_data.name,
            function(){ 
              //TODO check for error here.
              cookies.set("session", session_id, {domain:settings.domain, httpOnly:false});
              var redirectUrl = 'http://' + settings.domain + ':' + settings.port + '/';
              if( roomname && utilities.validateRoomName(roomname) ) redirectUrl += roomname;
              res.writeHead(302, { 'Location': redirectUrl });
              res.end();
            });
        }).on("error", function(e2){
          console.error(e2);
        })

      })
      authtoken.access_token;

    })
    .on('error', function(e) {
      console.error(e);
    });
  });
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
    console.log(uidkey)
    if( matches[1] == 'like'){
      console.log(userinfo.name, "likes", songId);
      redisClient.zadd("fave_" + uidkey, new Date().getTime(), songId ) //key, score, member 
    }else{
      console.log(userinfo.name, "unlikes", songId);
      redisClient.zrem("fave_" + uidkey, songId);
    }
  });
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
    //TODO check err!*/ //TODO check that user is in the room?*/ //TODO validate that it's legit mp3?
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
}//}}}

var roomdisplay = function(req, res, qs, matches){//{{{
  var roomName = matches[1]
  var cookies = new Cookies(req, res);
  if( !cookies.get("session") ){
    utilities.sendTemplate(res, "login.html", {room:roomName}, settings.devtemplates); 
    return;
  } // user is not logged in.
  var sessionId = cookies.get("session");
  redisClient.sismember("rooms",roomName, function(err, reply){
    if(reply==0){
      console.log("user requested unknown room: ", roomName);
      res.end("room not found :(");
      return;
    }
    redisClient.mget("session_"+sessionId+"_user_id",
                     "session_"+sessionId+"_screen_name",
                     "session_"+sessionId+"_name",
                     "session_"+sessionId+"_profilepic",
                     "session_"+sessionId+"_service",
                     "nowplayingid_" + roomName,  function(err2, replies){
      //TODO;check for err.
      if(replies[0] == null || replies[1] == null || replies[2] == null){
        utilities.sendTemplate(res, "login.html", {room:roomName}, settings.devtemplates)
        return;
      }
      userinfo = {user_id:replies[0], screen_name:replies[1], name:replies[2], pic:replies[3], service:replies[4]}
      console.log(replies[2], "loaded page for room", roomName);
      var nowplaying = replies[5];
      var uidkey = userinfo.service + "_" + userinfo.user_id;
      if( nowplaying ){ // this is bad spaghetti code. clean this up. TODO
        redisClient.zscore("fave_" + uidkey, nowplaying, function(err3, reply){
          display_form(req, res, userinfo, roomName, nowplaying, reply);
        });
      }else{
        display_form(req, res, userinfo, roomName, nowplaying);
      }
    })
  });
}//}}}

var router = new routing.Router([
  ["^/$", homepage],
  ["^/login/(fb|tw)/?$", login],
  ["^/logout/?$", logout],
  ["^/favorites/?$", favorites],
  ["^/room/?$", room],
  ["^/authdone/tw/?$", authdone_twitter],
  ["^/authdone/fb/?$", authdone_facebook],
  ["^/(like|unlike)/?$", like_unlike],
  ["^/([\\w\-]+)/upload/?$", upload],
  ["^/([\\w\-]+)/?$", roomdisplay],
]);

var server = ws.createServer();
server.addListener("request", function(req, res) {
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

})

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
        getUserInfo(sessionId, function(err, userinfo){
          //TODO check for err.
          connection.name = userinfo.name
          connection.uid = userinfo.service + '_' + userinfo.user_id;
          connection.authorized = true;
          if(roomname in chatConnections){
            chatConnections[roomname].push(connection);
          }else{
            chatConnections[roomname] = [connection];
          }
          //var profilepic = replies[2] ? replies[2] : "_";
          var listenerInfo = JSON.stringify([userinfo.name, userinfo.pic])
          redisClient.hset("listeners_" + roomname, userinfo.service + '_' + userinfo.user_id, listenerInfo, function(err, reply){
            msgId++
            if( reply == 1 ){
              var message = JSON.stringify( {messages:[msggen.join(connection.name,userinfo.service, userinfo.user_id, userinfo.pic)]})
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
          console.log("[" + connection.roomname + "] ", connection.name + ":", msg);
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
    redisClient.hdel("listeners_" + roomname, connection.uid, function(err, reply){
      if(reply==1){
        var message = JSON.stringify( {messages:[msggen.left(connection.name, connection.uid)]})
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

function display_form(req, res, userinfo, roomname, nowplaying, liked) {//{{{
  res.statusCode = 200
  var result = { username:JSON.stringify(userinfo.name),
                 msgs:[],                                          
                 wsurl: "ws://" + settings.domain + ":" + settings.port + "/" + roomname,
                 listenurl: "http://" + settings.streamserver_domain + ":" + settings.streamingport + "/listen/" + roomname,
                 roomname: roomname
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
      if(name == userinfo.service + '_' + userinfo.user_id) appendself = false;
      listeners.push({name:listener_name, pic:listener_pic, link:listener_link, uid:name});
    }
    result.listeners = listeners
    if( appendself ){
      var self_link = userinfo.service =='tw' ?  'http://twitter.com/' + userinfo.user_id : 'http://facebook.com/profile.php?id=' + userinfo.user_id;
      if(userinfo.service == 'fb'){userinfo.pic = 'http://graph.facebook.com/' + userinfo.user_id + '/picture';} 
      else if( !userinfo.pic ) {userinfo.pic = "/static/person_small.png";}
      listeners.unshift({name:userinfo.name, pic:userinfo.pic, link:self_link, uid:userinfo.service + '_' + userinfo.user_id});
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
        if( liked ) result.liked = true;
        utilities.sendTemplate(res, "roomchat.html", result, settings.devtemplates)
      });
    });
  });
}//}}}

