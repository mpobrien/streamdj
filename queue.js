var fs = require('fs')
var sys = require('sys')
var mp3 = require('./mp3stream.js')

exports.Mp3Queue = function Mp3Queue(){
  var that = this;
  var queue = [];
  this.nowPlaying = null;
  this.stream = new mp3.Mp3Stream();
  this.stream.on("stream-end", 
    function(){
      that.emit("file-end", that.nowPlaying);
      that.playNextFile();
    } 
  );

  this.getQueue = function(){
    return queue;
  }

  this.enqueue = function(path, name, uploader, songId, meta){//{{{
    queue.push({ path:     path,
                 name:     name,
                 uploader: uploader,
                 songId:   songId, 
                 meta: meta })
                 
    if(that.nowPlaying == null && queue.length == 1){ // A file was just added to an empty queue.
      that.playNextFile();
    }
  }//}}}

  this.playNextFile = function(){//{{{
    var nextFileInfo = queue.shift();
    if(nextFileInfo){
      that.emit("file-start", nextFileInfo);
      fs.readFile(nextFileInfo.path,
        function(err, fd){
          that.nowPlaying = nextFileInfo;
          that.stream.streamFile(fd)
        }
      );
    }else{
      that.nowPlaying = null;
      that.emit("empty");
    }
  }//}}}

}
exports.Mp3Queue.prototype = new process.EventEmitter()
