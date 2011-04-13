var mp3   = require('./mp3stream.js')
var http  = require('http');
var redis = require('redis')
var util  = require('util')
var sys   = require('sys')
var URL_PREFIX = "/listen/"
var fs    = require('fs')
var settings = JSON.parse(fs.readFileSync(process.argv[2] ? process.argv[2] : "./settings.json").toString()) 
var rooms = {};

Array.prototype.remove = function(e) {//{{{
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};//}}}

var pubsubClient = redis.createClient();
var redisClient2 = redis.createClient();

pubsubClient.subscribe("queueEvents")

function createRoom(theroomname){
  console.log("creating", theroomname);
  var mp3Stream = new mp3.Mp3Stream();  //TODO add event listeners!
  var streamWriterFunc = function(key){ // TODO this is confusing. clean it up!
    return function(data, y, z, id){
      rooms[key].listeners.forEach(function(listener){
        try{
          listener.write(data);
        }catch(e){}
      });
    } }(theroomname) 
  mp3Stream.on("frameready", streamWriterFunc);
  return {listeners:[], stream: mp3Stream, key:theroomname};
}

function createStartStreamCommand(nameOfRoom, roominfo){
  return function(){
    redisClient2.lpop("roomqueue_" + nameOfRoom, function(err, reply){ //TODO catch errors.
      if(!reply) return;
      songInfo = JSON.parse(reply);  //TODO check for an error here!
      fs.readFile(songInfo.path, function(err, data){//TODO make this operate on chunked buffer/read, not entire file (less memory)
        if(err) console.log("err:",err);
        roominfo.stream.streamFile(data);
      });
    });
  };
}

function prepareStartup(){
  redisClient2.smembers("rooms", function(err, reply){
    if(reply == null) reply = [];
    for(var i in reply){
      var roomname = reply[i];                                                            
      if(typeof(roomname)!="string") continue;
      var roominfo = createRoom(roomname);
      rooms[roomname] = roominfo;
      createStartStreamCommand(roomname, roominfo)();
      /*redisClient2.lpop("roomqueue_" + roomname, function(err, reply){ //TODO catch errors.*/
      /*console.log("roomname now:", x);*/
      /*if(!reply) return;*/
      /*songInfo = JSON.parse(reply);  //TODO check for an error here!*/
      /*console.log(roomname, " is streaming: " , util.inspect(songInfo));*/
      /*fs.readFile(songInfo.path, function(err, data){//TODO make this operate on chunked buffer/read, not entire file (less memory)*/
      /*if(err) console.log("err:",err);*/
      /*roominfo.stream.streamFile(data);*/
      /*roominfo.stream.id = roomname;*/
      /*console.log("id",roomname);*/
      /*roominfo.stream.path = songInfo.path;*/
      /*});*/
      /*});*/
    }
    console.log("rooms : ", util.inspect(rooms));
  });
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
      rooms[roomName].listeners.push(res);
      req.connection.addListener("close", 
        function(key){ return function(){
          rooms[key].listeners.remove(res); } }(roomName) );
    }else{
      // make sure the room was actually created first?
      redisClient2.sismember("rooms", roomName, function(err, reply){ //TODO check for errors!
        if(reply==0){
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end();
          return;
        }
        console.log("setting up new room");
        var newroom = createRoom(roomName);
        rooms[roomName] = newroom;
        rooms[roomName].listeners.push(res);
        req.connection.addListener("close", 
          function(key){ return function(){
            rooms[key].listeners.remove(res); } }(roomName) );
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
  redisClient2.lpush("roomqueue_testing", JSON.stringify({path:"/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/02 - Pinch Of Peer.mp3"}), function(){
    prepareStartup();
    streamingServer.listen(settings.streamingport);
    console.log(rooms)
  });
})


