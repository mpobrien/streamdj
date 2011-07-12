var mp3   = require('./mp3stream.js')
var http  = require('http');
var redis = require('redis')
var util  = require('util')
var sys   = require('sys')
var URL_PREFIX = "/listen/"
var msgs      = require('./messages')
var fs    = require('fs')
var streamRoom = require('./streamRoom')
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString()) 
var rooms = {};

Array.prototype.remove = function(e) {//{{{
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};//}}}

var msggen = new msgs.MessageGenerator();

var pubsubClient = redis.createClient();
var redisClient2 = redis.createClient();

pubsubClient.subscribe("newQueueReady")
pubsubClient.subscribe("skipnow")
pubsubClient.subscribe("debug")

pubsubClient.on("message", function(channel, msg){
  console.log(channel, msg);
  if(channel != "newQueueReady" && channel != "skipnow" && channel!="debug") return;
  if( channel == 'debug'){
    console.log(process.memoryUsage());
    console.log(rooms);
  }
  var roomName = msg.split(" ")[0]
  var room = rooms[roomName];
  if( channel == 'newQueueReady'){
    if(room && !room.getNowPlaying()){
      room.playNextFile();
    }
  }else if(channel == 'skipnow'){
  console.log("got skip shit");
    var msgparts = msg.split(" ");
    var roomName = msgparts[0];
    var songId = msgparts[1]
    if(room && room.getNowPlaying() && room.getNowPlaying().songId == songId){
      room.endCurrentFile(songId);
    }
  }
});

function prepareStartup(){
  redisClient2.smembers("rooms", function(err, reply){
    if(reply == null) reply = [];
    for(var i=0;i<reply.length;i++){
      var roomname = reply[i];                                                            

      var roomcreator = function(rn){
        redisClient2.zcard("roomqueue_" + rn, function(err2, reply2){
          if(err2) return;
          //if( reply2 > 0){
          if( true ){
            var newstreamroom = new streamRoom.StreamRoom(rn, redisClient2);
            newstreamroom.onEmpty = function(name){
            /*var room = rooms[name];*/
            /*if(!room.getNowPlaying()){*/
            /*delete rooms[name];*/
            /*}*/
            }
            newstreamroom.on("file-end", fileEnd);
            newstreamroom.on("file-change", fileChanged);
            rooms[rn] = newstreamroom;
            newstreamroom.playNextFile();
          }else{
            console.log("room", rn, "has empty queue, skipping");
          }
        });
      };
      roomcreator(reply[i]);
    }
  });
}

var fileEnd = function(roomName, fileinfo){
  console.log("file ended mesgs");
  fileinfo.roomname = roomName;
  redisClient2.del("nowplaying_" + roomName);
  redisClient2.del("nowplayingid_" + roomName);
  redisClient2.incr("roommsg_" + roomName, function(err, reply){
    fileinfo.msgId = reply;
    redisClient2.publish("file-ended", roomName + " " + fileinfo.msgId + " " + JSON.stringify(fileinfo));
  });

  if( fileinfo && fileinfo.path){
    fs.unlink(fileinfo.path, function(error){
        if( error ){
          console.log("error occurred deleting file after finished:", error);
        }else{
          console.log("Deleted file", fileinfo.path);
        }
    })
  }
}

var fileChanged = function(roomName, oldfile, newfile){
  redisClient2.set("nowplaying_" + roomName, JSON.stringify(newfile));
  redisClient2.set("nowplayingid_" + roomName, newfile.songId);
  redisClient2.incr("roommsg_" + roomName, function(er, reply){ //TODO check errors
    console.log("reply",reply)
    var msgId = reply;
    var startedMsg = msggen.started(newfile.uploader, newfile.name, newfile.songId, newfile.meta,newfile.uid, msgId);
    var message = JSON.stringify( startedMsg )
    var msg = {"oldfile":oldfile, "newfile":newfile, "roomname":roomName, "msgId":msgId};
    redisClient2.publish("file-changed", roomName + " " + msgId + " " + JSON.stringify(msg));
    redisClient2.multi([
     ["zadd","roomlog_" + roomName, msgId, message],
     ["zadd","songs_" + roomName, msgId, message]
    ]).exec();
    redisClient2.zadd("roomlog_" + roomName, msgId, message, function(){ 
      //TODO trim the log?
      //redisClient2.ltrim("chatlog_"+ roomName, 100, function(){});
    });
  });
  if( oldfile && oldfile.path){
    fs.unlink(oldfile.path, function(error){
        if( error ){
          console.log("error occurred deleting file after finished:", error);
        }else{
          console.log("Deleted file", oldfile.path);
        }
    })
  }
}


var streamingServer = http.createServer(
  function (req, res) {
    var url_parts = require('url').parse(req.url);
    console.log(url_parts.pathname)

    if(url_parts.pathname == '/crossdomain.xml'){
      res.writeHead(200, {'Content-Type': 'application/xml'}); 
      res.end('<?xml version="1.0"?><!DOCTYPE cross-domain-policy SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd"><cross-domain-policy><allow-access-from domain="outloud.fm" to-ports="80"/><allow-access-from domain="dev.outloud.fm"to-ports="80"/><allow-access-from domain="stream.dev.outloud.fm"to-ports="81"/></cross-domain-policy>')
      return;
    }

    if( !url_parts.pathname.indexOf(URL_PREFIX) === 0 ){ // bogus url.
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end();
    }
    var roomName = url_parts.pathname.substring(URL_PREFIX.length);
    //TODO validate room name, etc.
    if( roomName in rooms ){
      rooms[roomName].addNewListener(req,res);
    }else{
      // make sure the room was actually created first?
      redisClient2.sismember("rooms", roomName, function(err, reply){ //TODO check for errors!
        if(reply==0){
          console.log(roomName, "is a non existent room");
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end();
          return;
        }
        console.log("setting up new room");
        var newroom = new streamRoom.StreamRoom(roomName, redisClient2);
        newroom.onEmpty = function(name){
        /*var room = rooms[name];*/
        /*if(room*/
          /*if(!room.getNowPlaying()){*/
          /*delete rooms[name];*/
          /*}*/
        }
        newroom.on("file-end", fileEnd);
        newroom.on("file-change", fileChanged);
        console.log("adding new room", roomName);
        rooms[roomName] = newroom;
        newroom.addNewListener(req, res);
        newroom.playNextFile();
      });
    }
    
    //var raw = require('querystring').parse(url_parts.query);
    // some juggling e.g. for data from jQuery ajax() calls.
    //var data = raw ? raw : {};
    //data = raw.data ? JSON.parse(raw.data) : data;



  //res.writeHead(200, {'Content-Type': 'text/plain'});
  //res.end('Hello World\n');
})

prepareStartup();
streamingServer.listen(settings.streamingport);



