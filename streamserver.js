var mp3   = require('./mp3stream.js')
var http  = require('http');
var redis = require('redis')
var util  = require('util')
var sys   = require('sys')
var URL_PREFIX = "/listen/"
var fs    = require('fs')
var streamRoom = require('./streamRoom')
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString()) 
var rooms = {};

Array.prototype.remove = function(e) {//{{{
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};//}}}

var pubsubClient = redis.createClient();
var redisClient2 = redis.createClient();

pubsubClient.subscribe("newQueueReady")

pubsubClient.on("message", function(channel, msg){
  console.log("got message:", msg, "on channel", channel);
  if(channel != "newQueueReady") return;
  var roomName = msg;
  var room = rooms[roomName];
  if(room && !room.getNowPlaying()){
    room.playNextFile();
  } //TODO error if room not found.
});

function prepareStartup(){
  redisClient2.smembers("rooms", function(err, reply){
    if(reply == null) reply = [];
    for(var i in reply){
      var roomname = reply[i];                                                            
      if(typeof(roomname)!="string") continue;
      var roominfo = new streamRoom.StreamRoom(roomname, redisClient2);
      roominfo.on("file-end", fileEnd);
      roominfo.on("file-change", fileChanged);
      rooms[roomname] = roominfo;
      roominfo.playNextFile();
    }
    console.log("rooms:", util.inspect(rooms));
  });
}

var fileEnd = function(roomName, fileinfo){
  pubsubClient.publish("queueEvents", "fileend " + fileinfo);
  console.log("on roomName", roomName, "file ended:", fileinfo);
}

var fileChanged = function(roomName, oldfile, newfile){
  pubsubClient.publish("queueEvents", "filechanged " + oldfile + " " + newfile);
  console.log("on roomName", roomName, "file ended:", oldfile, "file started:", newfile);
}


var streamingServer = http.createServer(
  function (req, res) {
    var url_parts = require('url').parse(req.url);
    if( !url_parts.pathname.indexOf(URL_PREFIX) === 0 ){ // bogus url.
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end();
    }
    var roomName = url_parts.pathname.substring(URL_PREFIX.length);
    //TODO validate room name, etc.
    console.log("Got connection");
    
    if( roomName in rooms ){
      rooms[roomName].addNewListener(req,res);
    }else{
      // make sure the room was actually created first?
      redisClient2.sismember("rooms", roomName, function(err, reply){ //TODO check for errors!
        if(reply==0){
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end();
          return;
        }
        console.log("setting up new room");
        var newroom = new streamRoom.StreamRoom(roomName, redisClient2);
        newroom.on("file-end", fileEnd);
        newroom.on("file-change", fileChanged);
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

//***** TESTING HARNESS */
redisClient2.lpush("roomqueue_testing2", JSON.stringify({path:"/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3"}), function(){
  redisClient2.lpush("roomqueue_testing", JSON.stringify({path:"/home/mike/2.mp3"}), function(){
    prepareStartup();
    streamingServer.listen(settings.streamingport);
    console.log(rooms)
  });
})


