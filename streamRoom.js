var mp3   = require('./mp3stream.js')
var fs    = require('fs')

var StreamRoom = function(roomName, redisClient){
  var listeners = [];
  var that = this;
  var mp3Stream = new mp3.Mp3Stream();
  var nowPlaying = null;

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
    req.connection.addListener("close", function(){ listeners.remove(listener); } );
  }

  this.playNextFile = function(endingFile){
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
    });
  }

};

StreamRoom.prototype = new process.EventEmitter()

exports.StreamRoom = StreamRoom;
