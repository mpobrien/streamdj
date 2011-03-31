var fs = require('fs')
var sys = require('sys')

exports.FileUpload = function FileUpload(outputPath, filename, res){
  this.fileName = filename;
  this.okToWrite = false;
  this.uploaderInfo = null;
  this.doneBuffering = false;
  var buf = []
  var bufLen = 0;
  var finalbuf = new Buffer(bufLen);
  var that = this;
  this.written = false;
  this.uploadid = -1;

  this.bufferData = function(data){
    buf.push(data)
    bufLen += data.length;
  }
  //req.addListener("data", function(data){ // collect the data in a buffer });

  this.writeToDisk = function(callback){
    if( that.written ) return;
    if(!that.okToWrite || !that.doneBuffering){
        return;
    }
    that.written = true;
    var finalbuf = new Buffer(bufLen);
    for (var i=0,len=buf.length,pos=0; i<len; i++) {
      buf[i].copy(finalbuf, pos);
      pos += buf[i].length;
    }  

    fs.open(outputPath, 'w', function(err2, fd){
      fs.write(fd, finalbuf, 0, finalbuf.length, null,
        function(){
          fs.close(fd);
          that.emit("filesaved", that.uploaderInfo);
        });
    });
  }
}

exports.FileUpload.prototype = new process.EventEmitter()
