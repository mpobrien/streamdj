var fs = require('fs')
var sys = require('sys')

exports.FileUpload = function FileUpload(outputPath, req, res){
  //TODO make sure all outpustreams are getting closed!

  var outputstream = fs.createWriteStream(outputPath);

  this.writeChunk = function(data){
    var isBufFull = outputstream.write(data);
    if (!isBufFull) req.pause();
  }

  var that = this;
  this.setup = function(){
    req.addListener("data", that.writeChunk); 
    outputstream.addListener("drain", function(){
      req.resume();
    });
    req.addListener("error", function(){
      // TODO handle the error!
      //req.resume();
      that.emit("error");
    });
    req.once("end", function(){
      outputstream.destroySoon();
      res.end();
    })

    outputstream.once("close", function(){
      that.emit("filedone");
    });

    outputstream.on("error", function(){
      that.emit("error");
    });
  }

}
exports.FileUpload.prototype = new process.EventEmitter()
