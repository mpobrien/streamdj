var fs = require('fs')
var sys = require('sys')

exports.FileUpload = function FileUpload(outputPath, filename){
  this.fileName = filename;
  this.okToWrite = false;
  this.uploaderInfo = null;
  this.doneBuffering = false;
  var buf = []
  var bufLen = 0;
  var finalbuf = new Buffer(bufLen);
  var that = this;
  var written = false;

  this.bufferData = function(data){
    buf.push(data)
    bufLen += data.length;
  }
  //req.addListener("data", function(data){ // collect the data in a buffer });

  this.writeToDisk = function(callback){
    sys.puts("that.okToWrite: " + that.okToWrite);
    if(written){
      sys.puts("already written");
      return;
    }
    if(!that.okToWrite){
      sys.puts("not ok to write yet.");
      return;
    }
    if(!that.doneBuffering){
      sys.puts("not ok to write yet.");
      return;
    }
    written = true;
    sys.puts("ok writing! " + bufLen);
    var finalbuf = new Buffer(bufLen);
    for (var i=0,len=buf.length,pos=0; i<len; i++) {
      buf[i].copy(finalbuf, pos);
      pos += buf[i].length;
    }  

    sys.puts("writing to " + outputPath);
    fs.open(outputPath, 'w', function(err2, fd){
      fs.write(fd, finalbuf, 0, finalbuf.length, null,
        function(){
          sys.puts("done");
          fs.close(fd);
          that.emit("filesaved", that.uploaderInfo);
        });
    });
  }
}

exports.FileUpload.prototype = new process.EventEmitter()
