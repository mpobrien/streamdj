var mp3   = require('./mp3stream.js')
var fs    = require('fs')

var StreamRoom = function(roomName, redisClient){
  var listeners = [];
  var that = this;
  var mp3Stream = new mp3.Mp3Stream();
  var nowPlaying = null;
  var scTimeout = null;

  this.onEmpty = function(){};

  this.getNowPlaying = function(){
    return nowPlaying;
  }

  var streamWriterFunc = function(data, y, z){
    listeners.forEach(function(listener){
      try{
        listener.write(data);
      }catch(e){}
    });
  }

  mp3Stream.on("frameready", streamWriterFunc);
  mp3Stream.on("stream-end", function(){
    that.playNextFile(nowPlaying)
  });

  this.addNewListener = function(req, listener){
    listeners.push(listener);
    req.connection.addListener("close", 
        function(){ 
          listeners.remove(listener); 
          if( listeners.length == 0 ){
            that.onEmpty(roomName);
          }
        });
  }

  this.endCurrentFile = function(requiredId){
    if( nowPlaying.songId == requiredId ){
      that.playNextFile(nowPlaying, true);
    }
  }

  this.playNextFile = function(endingFile, forceStop){
    if( scTimeout ){
      clearTimeout(scTimeout);
    }
    scTimeout = null;
    console.log("playing next!");
    //To pop the lowest-ranked member of a sorted set in redis, we need 2 steps:
    //1. zrange <key> 0 0 WITHSCORES (returns lowest ranked key and its score)
    //2. zremrangebyscore <key> score score // removes that lowest element
    redisClient.zrange("roomqueue_" + roomName, 0, 0, "withscores", function(err, reply){
      //TODO check for err.
      if(!reply || reply.length==0){
        if( endingFile ){
          that.emit("file-end", roomName, endingFile);
        }
        nowPlaying = null;
        if(forceStop){
          mp3Stream.stopStream();
        }
        return; // Nothing on the queue.
      }
      var songInfo = JSON.parse(reply[0])
      var songId = reply[1]
      redisClient.zremrangebyscore("roomqueue_" + roomName, songId, songId, function(err2, reply2){
        nowPlaying = songInfo;
        console.log("[" + roomName + "] now playing: ", songInfo);
        console.log(songInfo.meta.length);
        if( songInfo.fromSoundcloud ){
          that.emit("file-change", roomName, endingFile, nowPlaying);
          mp3Stream.stopStream();
          console.log(songInfo.meta.length);
          scTimeout = setTimeout(function(){ console.log("next!"); that.playNextFile(nowPlaying) }, songInfo.meta.length);
        }else{
          fs.readFile(songInfo.path, function(err3, data){//TODO make this operate on chunked buffer/read, not entire file (less memory)
            that.emit("file-change", roomName, endingFile, nowPlaying);
            if(err) console.log("err:",err);
            setTimeout(function(){ mp3Stream.streamFile(data) }, 100)
            console.log("playing: " + reply);
          });
        }
      });
    });
/*
    redisClient.lpop("roomqueue_" + roomName, function(err, reply){ //TODO catch errors.
      if(!reply){
        if( endingFile ){
          that.emit("file-end", roomName, endingFile);
        }
        nowPlaying = null;
        return; // Nothing on the queue.
      }
      songInfo = JSON.parse(reply);  //TODO check for an error here!
      nowPlaying = songInfo;
      console.log("[" + roomName + "] now playing: ", songInfo);
      fs.readFile(songInfo.path, function(err, data){//TODO make this operate on chunked buffer/read, not entire file (less memory)
        that.emit("file-change", roomName, endingFile, nowPlaying);
        if(err) console.log("err:",err);
        setTimeout(function(){ mp3Stream.streamFile(data) }, 100)
        console.log("playing: " + reply);
      });
    });*/
  }

};

StreamRoom.prototype = new process.EventEmitter()

exports.StreamRoom = StreamRoom;
