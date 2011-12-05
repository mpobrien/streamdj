var fs        = require('fs');
var net       = require('net')
var path      = require('path')
var contexts  = require('./contexts')
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
var mongodb   = require('mongodb')
var Song      = require('./models').Song
var Session   = require('./models').Session
var Room      = require('./models').Room
var User      = require('./models').User
var mongoose = require('mongoose')
var ObjectID = require('mongodb').BSONPure.ObjectID;
var UserFavorite = require('./models').UserFavorite;
var querystring = require('querystring')
var rooms = {};
var pollrooms = {};
var RoomEventLog      = require('./models').RoomEventLog
var TemplateManager = require('./templatemanager').TemplateManager
var templates = new TemplateManager('./templates',['login.html.mu','theroom.html']);
templates.initializeTemplates();
domains = ["outloud.fm","dev.outloud.fm","stream.dev.outloud.fm:81"];
var msggen = new msgs.MessageGenerator();
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString())
var oa = new OAuth(settings.REQUEST_TOKEN_URL, settings.ACCESS_TOKEN_URL,
                   settings.key, settings.secret, 
                   settings.OAUTH_VERSION, settings.CALLBACK_URL, settings.HASH_VERSION); 
var redisClient = redis.createClient();
var pubsubClient = redis.createClient();

mongoserver = new mongodb.Server(settings.MONGO_HOST, settings.MONGO_PORT, {}),
db_connector = new mongodb.Db('outloud', mongoserver, {});
var roomsCollection;
db_connector.open(function(err, db){
  if(err || !db){
    console.log("error:", err)
    return;
  }
  db_connector.collection('rooms', function(e, c){ 
    roomsCollection = c;
  })
});

var test = function(req, res, qs, matches){
  var cookies = new Cookies(req, res)
  console.log(cookies)
}


function broadcastToRoom(room, message, excludeUid, roomname){
  if(room){
    for(var i=0;i<room.length;i++){
      if(excludeUid && excludeUid == room[i].uid) continue;
      room[i].send(message);
    }
  }
  if(roomname){
    var pollroom = pollrooms[roomname]
    if(pollroom){
      var mid = pollroom.getMax() + 1;
      pollroom.broadcast(message, mid);
    }
  }
}

var listen = function(req, res, qs, roomname){//{{{
  console.log("listen!");
  var cursor = parseInt(qs.query['c'])
  var callback = qs.query['callback']
  if( utilities.validateRoomName(roomname)){
    var pollroom = pollrooms[roomname]
    if( pollroom ){
      pollroom.getMessages(req, res, callback, cursor);
    }else{
      var pollroom = new chat.ChatRoom();
      pollrooms[roomname] = pollroom;
      pollroom.getMessages(req, res, callback, cursor);
    }
  }else{
    res.end();
  }
}//}}}

var savesettings = function(req, res, qs){
  if(!req.session || !req.session.user){
    res.end();
    return;
  }

  var cursor = parseInt(qs.query['c'])
  var settingsInfo = {}
  settingsInfo.notify_chat = qs.query['notify_chat'] == '1' ? 1 : 0;
  settingsInfo.notify_song = qs.query['notify_song'] == '1' ? 1 : 0;
  User.update({_id:req.session.user}, {$set:{"settings":JSON.stringify(settingsInfo)}}, function(e, d){
    console.log(e,d);
  })
  res.end('{}')
}

pubsubClient.subscribe("chatmessage");
pubsubClient.subscribe("file-changed");
pubsubClient.subscribe("file-ended");
pubsubClient.subscribe("file-queued");
pubsubClient.subscribe("queueremove");
pubsubClient.subscribe("userjoined");
pubsubClient.subscribe("userleft");
pubsubClient.subscribe("userliked");
pubsubClient.subscribe("command");
pubsubClient.subscribe("debug");
pubsubClient.on("message", function(channel, msg){

  if(channel == 'command'){
    try{
      eval(msg);
    }catch(err){
      console.log(err);
    }
    return;
  } 

  if(channel == 'debug'){
    try{
      console.log(eval(msg));
    }catch(err){
      console.log(err);
    }
    return;
  } 

  var firstSpace =  msg.indexOf(" ");
  var secondSpace = msg.indexOf(" ", firstSpace+1);
  var roomname = msg.substring(0, firstSpace);
  var msgId = msg.substring(firstSpace+1, secondSpace);
  var room = rooms[roomname];
  //if( !room ) return;
  if(channel == 'userliked'){
    broadcastToRoom(room, msg.substr(secondSpace+1), null, roomname);
  }else if(channel == 'chatmessage'){
    console.log("hey");
    broadcastToRoom(room, msg.substr(secondSpace+1), null, roomname);
    //room.broadcast(msg.substr(secondSpace+1), msgId);
  }else if(channel == 'userjoined'){
    //room.broadcast(msg.substr(secondSpace+1), msgId);
    broadcastToRoom(room, msg.substr(secondSpace+1), null, roomname);
  }else if(channel == 'userleft'){
    //room.broadcast(msg.substr(secondSpace+1), msgId);
    broadcastToRoom(room, msg.substr(secondSpace+1), null, roomname);
  }else if(channel == 'file-ended'){
    var incomingMsg = JSON.parse(msg.substr(secondSpace+1));
    var outgoingMsg = msggen.stopped(incomingMsg.songId, msgId);
    outgoingMsg.id = msgId;
    var outgoingMsgStr = JSON.stringify(outgoingMsg);
    //room.broadcast(outgoingMsgStr, msgId);
    broadcastToRoom(room, outgoingMsgStr, null, roomname);
  }else if(channel == 'file-changed'){
    var incomingMsg = JSON.parse(msg.substr(secondSpace+1));
    var messages = [];
    var startedmsg = msggen.started(incomingMsg.newfile.uploader, incomingMsg.newfile.name, incomingMsg.newfile.songId, incomingMsg.newfile.meta, incomingMsg.newfile.uid, msgId)
    console.log(startedmsg);
    startedmsg.id = msgId;
    var outgoingMsg = JSON.stringify(startedmsg) 
    console.log("file changed");
    //room.broadcast(outgoingMsg, msgId);
    broadcastToRoom(room, outgoingMsg, null, roomname);
  }else if(channel == 'file-queued'){
    var incomingMsg = JSON.parse(msg.substr(secondSpace+1));
    var outgoingMsg = msggen.queued(incomingMsg.uploader, 'asfa', incomingMsg.songId, incomingMsg.meta, incomingMsg.uid) 
    outgoingMsg.id = msgId;
    console.log("file queued");
    //room.broadcast(JSON.stringify(outgoingMsg), msgId);
    broadcastToRoom(room, JSON.stringify(outgoingMsg), null, roomname);
  }else if(channel == 'queueremove'){
    var incomingMsg = msg.substr(secondSpace+1);
    //var outgoingMsg = msggen.queued(incomingMsg.uploader, 'asfa', incomingMsg.songId, incomingMsg.meta, incomingMsg.uid) 
    /*outgoingMsg.id = msgId;*/
    /*console.log("file queued");*/
    //room.broadcast(incomingMsg, msgId);
    broadcastToRoom(room, incomingMsg, null, roomname);
  }
});

var room = function(req, res, qs){//{{{
  if(!req.session || !req.session.uid){
    utilities.sendTemplate(res, templates.getTemplate("login.html"), {})
    return;
  }
  if(req.method == "POST"){
    var postData = null;
    var roomName = req.postData.roomname;
    console.log(req.session.uid, " is creating/joining room", roomName);
    roomName = utilities.slugify(roomName);
    if( utilities.validateRoomName(roomName) ){
      Room.addNew(roomName, null, function(err,reply){
        console.log("rooms", roomName);
        res.writeHead(302, { 'Location': '/' + roomName});
        res.end()
      });
    }else{
      utilities.sendTemplate(res, templates.getTemplate("login.html"), {userinfo:req.session, roomname:roomName, invalid:true})
    }
  }else{
    var info = {}
    if(req.session){
      info.userinfo = req.session;
    }
    utilities.sendTemplate(res, "login.html", info)
  }
}//}}}

var upload = function(req, res, qs, roomname){//{{{
  if(!req.session){
    res.end();
    return;
  }
  req.fileUpload.on("filedone", function(){
    console.log("Ending request!")
    res.end();
    var uidkey = req.session.uid;
    var fname = req.headers['x-file-name']
    var uploadedFileInfo = JSON.stringify({"path":req.fileUpload.outputPath, "room":roomname, "uploader":req.session.displayName,'uid':uidkey, 'fname':fname});
    redisClient.rpush("newsongready", uploadedFileInfo);
  });
  req.resume();
}//}}}

var poll = function(req, res, qs, matches){//{{{
  var cursor = parseInt(qs.query['c'])
  var roomname = matches[1]
  if( !utilities.validateRoomName(roomname) ){
    res.end();
  }
  if(cursor){
    if(backlog.getMax() > cursor){
      replies = backlog.getFrom(cursor);
      console.log(replies);
      res.end(JSON.stringify(replies));
    }else{
      room.addUserListener(req, res);
    }
  }else{
    room.addUserListener(req,res);
    //res.end("{}");
  }
}//}}}


var homepage = function(req, res, qs, matches){//{{{
  var info = {}
  if(req.session){
    info.userinfo = req.session
  }
  console.log(info);
  utilities.sendTemplate(res, templates.getTemplate("login.html.mu"), info)
}//}}}

var roomonline = function(req, res, qs, roomname){
  res.end('{}')
  if(req.session==null){
    return;
  }
  var pplhash = {}
  pplhash["people." + req.session.uid + ".time"] = +new Date()
  pplhash["people." + req.session.uid + ".name"] = req.session.displayName
  pplhash["people." + req.session.uid + ".img"] = req.session.avatarUrl
  pplhash["people." + req.session.uid + ".uid"] = req.session.uid
  var updateDoc = {"$set":pplhash}
  roomsCollection.update({"roomName":roomname}, updateDoc)
}

var roomdisplay = function(req, res, qs, roomname){//{{{
  res.writeHead(200, {'Content-Type': 'text/html', 'charset':'utf-8'});
  if(req.session == null){ // room preview here
    utilities.httpRedirect(res, "/")
    return;
  }

  Room.getByRoomName(roomname, function(err, room){
    if(err || !room){
      res.end("room not found :(");
      return;
    }else{
      while(room.log.length > 0 && room.log[0] == null){
        room.log.shift()
      }
      var info = {}
      info.room = room;
      info.roomname = room.roomName;
      info.nowplayingId = room.nowPlaying != null ? 1 : 0;
      info.nowPlaying = room.nowPlaying;
      info.servernow = +new Date().getTime()
      info.uidkey = req.session.uid;
      info.listenurl = "http://" + settings.streamserver_domain + ":" + settings.streamingport + "/listen/" + roomname
      info.listeners = [];
      var now = +new Date()
      var added_me = false;
      if('people' in room){
        for(var id in room.people){
          if(id == req.session.uid){
            continue;
          }
          if(room.people[id].time >= (now - 30000)){
            info.listeners.push(room.people[id])
          }
        }
        if(!room.people || !(req.session.uid in room.people)){
          var message = JSON.stringify(msggen.join(req.session.displayName, req.session.uid.slice(0,2), req.session.uid, req.session.avatarUrl, true))
          redisClient.publish("userjoined", roomname + " " + "-1" + " " + message);
        } else {
          if(room.people[req.session.uid].time <= (now-30000)){
            var message = JSON.stringify(msggen.join(req.session.displayName, req.session.uid.slice(0,2), req.session.uid, req.session.avatarUrl, false))
            redisClient.publish("userjoined", roomname + " " + "-1" + " " + message);
          }
        }
      }
      info.listeners.unshift({name:req.session.displayName, img:req.session.avatarUrl, uid:req.session.uid})

      var pollroom = pollrooms[roomname];
      if(pollroom){
        info.cursor = pollroom.getMax();
        if(!info.cursor) info.cursor = 0;
      }else{
        info.cursor = 0
      }
      info.wsurl = "ws://" + settings.domain + ":" + settings.port + "/" + roomname,
      info.username = JSON.stringify(req.session.displayName)
      if(req.user.settings){
        info.usersettings = req.user.settings
      }else{
        info.usersettings = "{notify_chat:0, notify_user:0}"
      }
      redisClient.zrange("roomqueue_" + roomname, 0, 30, function(err, reply){
        var currentQueue = reply;
        var queueinfo = [];
        if( !currentQueue) currentQueue = [];
        for(var i=0;i<currentQueue.length;i++){
          var queueItem = JSON.parse(currentQueue[i]);
          if(queueItem.uid && queueItem.uid == req.session.uid){
            queueItem.mine = true;
          }
          queueinfo.push(queueItem);
        }
        info.queue = queueinfo;
        console.log(info.queue);
        if(settings.devtemplates){ // BLOCKING FUNCTION - USE IN DEV ONLY
          templates.initializeTemplates();
        }
        utilities.sendTemplate(res, templates.getTemplate("theroom.html"), info)
      })
    }
  });
}//}}}

var scQueue = function(req, res, qs, roomname){//{{{
  console.log("here, ", roomname)
  res.end('{}');
  if(!req.session) return;
  var trackId = qs.query['t']
  if( isNaN(parseInt(trackId)) ) return;
  Room.getByRoomNameSparse(roomname, function(err, doc){
    if( err || !doc ) return;
    var newScTrackInfo = JSON.stringify({uid:req.session.uid, uploader:req.session.displayName, trackId:trackId, room:roomname});
    redisClient.rpush("sctracks", newScTrackInfo);
  });
}//}}}

var logout = function(req, res){//{{{
  var cookies = new Cookies(req, res)
  var sessionId = cookies.get("session");
  cookies.set("session", null, {domain:settings.domain, httpOnly:false});
  //TODO actually delete the session!!!!
  res.writeHead(302, { 'Location': 'http://' + settings.domain + ':' + settings.port + '/' });
  res.end()
}//}}}

var send = function(req, res, qs, roomname){//{{{
  if(!req.session) return res.end();
  var message = qs.query['m']
  res.end()
  console.log("message", message)
  if(message && message.length > 0){
    var eventMsg = msggen.chat(req.session.displayName, message, 0)
    var eventMsgString = JSON.stringify(eventMsg)
    Room.getByRoomName(roomname, function(err, room){
      if(!err && room){
        room.addMessage(eventMsgString);
        redisClient.publish("chatmessage", roomname + " " + -1 + " " + eventMsgString);
      }
    })
  }
}
//}}}

var authdone_twitter = function(req, res, qs){//{{{
  var token = qs.query['oauth_token']
  var verifier = qs.query['oauth_verifier']
  var roomname = qs.query['r']
  var cookies = new Cookies(req, res)
  oa.getOAuthAccessToken(token, verifier, function(error, oauth_access_token, oauth_access_token_secret, results2) {
    if(!results2 || error){
      console.log("results from oauth is undefined!");
      console.log("error?", error.stack);
      res.end('An error occurred loggin you in :(');
      //TODO fix
      //utilities.sendTemplate(res, "login.html", {}, true, settings.devtemplates)
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
      console.log(results2.screen_name, "logged in via twitter........");
      //Model.update(conditions,                 update,                                                                                      options, callback)

      User.update({uid:'tw_'+results2.user_id}, {displayName : results2.screen_name, uid:'tw_'+results2.user_id, avatarUrl:profileImg }, { upsert: true }, function(err, docs){
        if(err){
        console.log("error saving user", err.stack);
        }
        console.log("saved user:",docs);
        User.findOne({uid:"tw_"+results2.user_id}, function(err2, doc2){
          if(doc2 && !err2){
            console.log(doc2)
            var userSession = new Session({user:doc2._id, uid:doc2.uid, avatarUrl:profileImg,displayName : results2.screen_name});
            userSession.save(function(err3,doc3){
              cookies.set("session", doc3._id, {domain:settings.domain, httpOnly:false, expires: new Date(+new Date() + (1000 * 60 * 60 * 24 * 14))});
              var redirectUrl = 'http://' + settings.domain + ':' + settings.port + '/';
              if( roomname && utilities.validateRoomName(roomname) ) redirectUrl += roomname;
              res.writeHead(302, { 'Location': redirectUrl });
              res.end();
            });
          }else{
            res.end();
          }
        });
      });
    });
  });
}//}}}

var authdone_facebook = function(req, res, qs){//{{{
  var roomname = qs.query['r']
  var fbcode = qs.query['code']
  ctx = (roomname && utilities.validateRoomName(roomname) ? {room:roomname} : {room:''})
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
            utilities.sendTemplate(res, templates.getTemplate("login.html"), ctx); 
            return;
          }


          User.update({uid:'fb_' + me_data.id}, {displayName : me_data.name, uid:'fb_' + me_data.id, avatarUrl: "http://graph.facebook.com/" + me_data.id + '/picture'}, { upsert: true }, function(err, docs){
            if(err){
              console.log("error saving user", err.stack);
              return;
            }
            User.findOne({uid:"fb_"+me_data.id}, function(err2, doc2){
              if(doc2 && !err2){
                console.log(doc2)
                var userSession = new Session({user:doc2._id, uid:doc2.uid, avatarUrl: "http://graph.facebook.com/" + me_data.id + '/picture', displayName : me_data.name});
                userSession.save(function(err3,doc3){
                  cookies.set("session", doc3._id, {domain:settings.domain, httpOnly:false, expires: new Date(+new Date() + (1000 * 60 * 60 * 24 * 14))});
                  var redirectUrl = 'http://' + settings.domain + ':' + settings.port + '/';
                  if( roomname && utilities.validateRoomName(roomname) ) redirectUrl += roomname;
                  res.writeHead(302, { 'Location': redirectUrl });
                  res.end();
                });
              }else{
                res.end();
              }
            });
          });

          console.log(me_data);
          console.log(me_data.name, " logged in with facebook");
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

var login = function(req, res, qs, fromService){//{{{
  var room = qs.query['r']
  var callbackurl;
  if( fromService == 'tw' ){
    console.log("alien starting twitter login");
    if( room && utilities.validateRoomName(room) ){
      callbackurl = 'http://' + settings.domain + ':' + settings.port + '/authdone/tw/?r=' + escape(room);
    }else{
      callbackurl = settings.CALLBACK_URL + "/tw/";
    }
    oa.getOAuthRequestToken({oauth_callback:callbackurl}, function(err, oauth_token, oauth_token_secret, results){
      if(err) {
        console.error("Could not fetch a request token! Network or twitter API down?", err.stack);
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

var skip = function(req, res, qs, roomname){//{{{
  var songId = qs.query['s']
  res.end("{}");
  if( !utilities.validateRoomName(roomname) ) return;
  var uidkey = req.session.uid;
  console.log(uidkey,"is skipping", songId);
  Room.getCurrentSongByRoomName(roomname, function(err, reply){
    if(err || !reply) return;
    var songInfo = JSON.parse(reply.nowPlaying)
    if(songInfo.songId != songId) return;
    if(songInfo.uid != uidkey) return;
    redisClient.publish("skipnow", roomname + " " + songId);
  })
}//}}}

var like_unlike = function(req, res, qs, roomname){//{{{
  var songId = qs.query['s']
  var scId = null;
  if('scid' in qs.query){
    scId = qs.query['scid']
  }
  res.end("{}");
  Room.getCurrentSongByRoomName(roomname, function(err, result){
    if(err || !result) return;
    if(result.nowPlaying){
      //TODO this is bad. parsing json is bad. just put it in the doc.
      var np = JSON.parse(result.nowPlaying);
      console.log("nowplaying:", np)
      var pic = null;
      if('picurl' in np.meta) pic = np.meta.picurl
      if('pic' in np.meta) pic = np.meta.picurl
      console.log(np)
      UserFavorite.addFavorite(req.session.uid,
                               new ObjectID(np.songId),
                               scId,
                               np.meta.Title,
                               np.meta.Artist,
                               np.meta.Album,
                               np.uploader,
                               pic,
                               np.meta.uid, function(){});
    }
  })
}//}}}

var favorites = function(req, res, qs){//{{{
  if( !req.session ){ res.end(); return; }// not logged in
  var pageNum = qs.query['p']
  if( !pageNum ) pageNum = 0;
  var pagesize = 10;
  responseJson = {numFavorites:10, faves:[], page:pageNum};
  UserFavorite.find({'uid':req.session.uid}).count().run(function(err, result){
    if(err){
      res.end(JSON.stringify(responseJson));
      return;
    }else{
      responseJson.numFavorites = result;
      UserFavorite.find({'uid':req.session.uid}).sort('mtime','descending')
                  .skip(pageNum*pagesize).limit(pagesize)
                  .run(function(err, docs){
                    if(err){
                      res.end(JSON.stringify(responseJson));
                      return;
                    }else{
                      res.end(JSON.stringify(docs));
                    }
                  })
    }
  })
}//}}}

var scredirect = function(req, res, qs, trackId){
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


var remove_from_queue = function(req, res, qs, roomname){
  /*
  var songId = qs.query['s']
  res.end("{}");
  Song.getById(songId, function(err, doc){
    if(err || !doc) return;

  })
  //Room.getCurrentSongByRoomName()
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
  /*/
}

var router = new routing.Router([//{{{
  ["^/$", homepage, [contexts.lookupSession]],
  ["^/login/(fb|tw)/?$", login],
  ["^/logout/?$", logout],
  ["^/authdone/fb/?$", authdone_facebook],
  ["^/authdone/tw/?$", authdone_twitter],
  ["^/favorites/?$", favorites, [contexts.lookupSession]],
  ["^/room/?$", room, [contexts.getPostData, contexts.lookupSession]],
  ["^/savesettings/?$", savesettings, [contexts.lookupSession]],
  ["^/([\\w\-]+)/(like|unlike)/?$", like_unlike, [contexts.lookupSession]],
  ["^/([\\w\-]+)/o/?$", roomonline, [contexts.lookupSession]],
  ["^/([\\w\-]+)/skip/?$", skip, [contexts.lookupSession]],
  ["^/([\\w\-]+)/scqueue/?$", scQueue, [contexts.lookupSession]],
  ['^/([\\w\-]+)/listen/?$', listen],
  ['^/([\\w\-]+)/send/?$', send, [contexts.lookupSession]],
  ["^/([\\w\-]+)/?$", roomdisplay, [contexts.lookupSession, contexts.getUserInfo]],
  ["^/([\\w\-]+)/upload/?$", upload, [contexts.uploadFuncGen(settings.uploadDirectory), contexts.lookupSession]],
  ["^/sctrack/(\\d+)/?$", scredirect],
  ["^/([\\w\-]+)/remove/?$", remove_from_queue, [contexts.lookupSession]],
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
  router.route(req,res);
})//}}}

server.addListener("connection", function(connection){
  console.log("websocket connection!!");
  var qs = require('url').parse(connection._req.url, true)
  var roomname = qs.pathname.slice(1);
  connection.authorized = false;
  connection.roomname = roomname;
  connection.addListener("message", function(msg){
    console.log(msg);
    if( !connection.authorized ){
      if(msg.substr(0, 5)==="auth:"){
        var authstring = msg.substr(5)
        var sessionId = utilities.extractCookie(authstring, "session") //TODO check if present/valid?
        Session.findById(sessionId, function(err, doc){
          if(!err && doc){
            connection.name = doc.displayName;
            connection.uid = doc.uid;
            connection.authorized = true;
            if(roomname in rooms){
              rooms[roomname].push(connection);
            }else{
              rooms[roomname] = [connection];
            }
          }else{
            connection.close();
            return;
          }
        });
      }else{ // tried to send message on an unauthorized connection - disconnect it
        //TODO actually disconnect it. im not sure how right now.
        //TODO remove it from the chat connections handler
      }
    }else{
      if(msg=='0'){ //ping! //TODO check timing of pings to prevent DOS
        connection.send("1");
      }else{
        var eventMsg = msggen.chat(connection.name, msg, -1)
        var eventMsgString = JSON.stringify(eventMsg);
        Room.addMessageByName(connection.roomname, eventMsgString)
        redisClient.publish("chatmessage", roomname + " " + -1 + " " + eventMsgString);
        console.log("[" + connection.roomname + "] ", connection.name + ":", msg);
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
