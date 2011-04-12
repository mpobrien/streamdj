var fs = require('fs')
var sys = require('sys')
var util = require('util')
var stringUtils = require('./utilities')
Buffer.prototype.pointer = 0;
Buffer.prototype.reset = function(newpos){ this.pointer = newpos }
Buffer.prototype.getChunk = function(numbytes){//{{{
    if( this.pointer + numbytes >= this.length + 1 ) return null;
    return this.slice(this.pointer, (this.pointer+=numbytes)); 
  }//}}}
var parseSize = function(data, version){//{{{
  if( data.length == 4 ){
    if( version > 3 ) {
      var size = data[0] << 0x15;
      size += data[1] << 14;
      size += data[2] << 7;
      size += data[3];
      return size;
    }else{
			var size = data[0] << 24;
			size += data[1] << 16;
			size += data[2] << 8;
			size += data[3];
      return size;
    }
  }else{
		var size = data[0] << 16;
		size += data[1] << 8;
		size += data[2];
    return size
  }
}//}}}
 /*
var parseSize = function(data){//{{{
  if( data.length == 4 ){
    var size = data[0] << 0x15;
    size += data[1] << 14;
    size += data[2] << 7;
    size += data[3];
    return size;
  }else{
		var size = data[0] << 16;
		size += data[1] << 8;
		size += data[2];
    return size
  }
}//}}}
*/

var v3Mappings = {//{{{
    "TPE1": "Artist",
    "TIT2": "Title",
    "TALB": "Album"
}//}}}
var v2Mappings = {//{{{
    "TP1": "Artist",
    "TT2": "Title",
    "TAL": "Album"
}//}}}

var AsyncId3Parser = function(fd){
  var that = this;
  this.fd = fd
  var filePosition = 0;

  var readId3Header = function(callback){
    var headerBuf = new Buffer(10);
    fs.read(that.fd, headerBuf, 0, 10, 0, 
      function(err, bytesRead, buffer){
        filePosition += bytesRead;
        var headerCheck = headerBuf.getChunk(3);
        try{ if(headerCheck.toString() != 'ID3') return; }catch(e){ return; }
        var versionInfo = headerBuf.getChunk(2)
        var majorVer = versionInfo[0]
        var revision = versionInfo[1]
        var headerFlags = headerBuf.getChunk(1)
        var headerSize = parseSize(headerBuf.getChunk(4), majorVer);
        var frameId, frameSize
        if(majorVer >= 2 && majorVer <=4 ){
          callback(null, headerSize, majorVer);
        }else{
          callback("No valid header", null, null);
        }
      }
    );
  }

  var readId3TagFrame = function(size, version, callback){
    var frameBytesRead = 0;
    var frameHeaderSize = version == 2 ? 6 : 10;
    var frameHeaderBuf = new Buffer(frameHeaderSize);
    // read the header of the frame, by grabbing the correct number of bytes based on the version
    fs.read(fd, frameHeaderBuf, 0, frameHeaderSize, filePosition, function(err, bytesRead, data){//TODO check for size errors!
      frameBytesRead += bytesRead;
      filePosition += bytesRead;
      var loadFlags = (version >= 3 );
      if(version == 2){
        frameID = frameHeaderBuf.getChunk(3);
        frameSize = stringUtils.getInteger24At(frameHeaderBuf.getChunk(3), true)
      }else if(version == 3){
        frameID = frameHeaderBuf.getChunk(4);
        var frameSizeData = frameHeaderBuf.getChunk(4);
        frameSize = stringUtils.getLongAt(frameSizeData, true)
        loadFlags = true;
      }else if(version == 4){
        frameID = frameHeaderBuf.getChunk(4);
        frameSize = stringUtils.readSynchsafeInteger32At(frameHeaderBuf.getChunk(4), true)
        loadFlags = true;
      }
      frameID = frameID.toString().replace(/\u0000/g,'')
      //TODO if frame ID is a tag that we don't care about, just advance the file pointer instead of calling fs.read()!
      if( frameID.length == 0 ){ that.emit("done"); callback(null, null, null, frameBytesRead, true); return; }
      //ok, so now we have the frame ID and how many bytes must be read to get the frame data!
      var frameDataBuf = new Buffer(frameSize);
      console.log("bout to read:",frameSize);
      if( frameSize == 0 ){ that.emit("done"); callback(null, null, null, frameBytesRead, true); return; }
      fs.read(fd, frameDataBuf, 0, frameSize, filePosition, function(err2, bytesRead2, data2){//TODO check for size errors
        frameBytesRead += bytesRead2;
        filePosition += bytesRead2;
        //if( majorVer >= 3 && !(frameID in v3Mappings) ) continue;
        //if( majorVer == 2 && !(frameID in v2Mappings) ) continue;
        if( frameID in v3Mappings || frameID in v2Mappings){
          var textEncoding = frameDataBuf.getChunk(1);
          var frameData = frameDataBuf.getChunk(frameSize-1);
          var textData = (textEncoding[0]==1 ? stringUtils.readUTF16String(frameData) : frameData.toString());
          textData = textData.replace(/\u0000/g,'') 
          callback(null, frameID, textData, frameBytesRead);
        }else{
          callback(null, frameID, frameDataBuf, frameBytesRead);
        }
        /*if( textData.length > 0 ){*/
        /*if( majorVer >= 3){*/
        /*tag[v3Mappings[frameID]] = textData*/
        /*}else{*/
        /*tag[v2Mappings[frameID]] = textData*/
        /*}*/
        /*}*/
      });
      
    });
  }

  /*var doneReadingFrame = function(){*/
  /*that.*/
  /*}*/

  this.processAllTags = function(){
    readId3Header( function(err, headerSize, version){
      console.log("headerSize:", headerSize);
      var totalRead = 0;
      var processTagResult = function(err, frameID, textData, frameBytesRead, doneyet){
        totalRead += frameBytesRead;
        console.log("read:", totalRead);
        if( doneyet || totalRead >= headerSize) {
          that.emit("done");
          return;
        }
        that.emit("tag", frameID, textData);
        readId3TagFrame(headerSize, version, processTagResult);
      };

      if(err){ that.emit("Invalid ID3 header"); return; }
      readId3TagFrame(headerSize, version, processTagResult);
        //console.log("frameId", frameId);
        //console.log("textdata", textData);
    });
  }

}
AsyncId3Parser.prototype = new process.EventEmitter()

var debugTag = function(filePath){
  fs.open(filePath, 'r', function(err, fd){
    var asyncParse = new AsyncId3Parser(fd);
    asyncParse.on("tag", function(id, data){
      if( frameID in v3Mappings || frameID in v2Mappings){
        console.log("got tag info:",id, ":", data);
      }else{
        console.log("got nontext tag info:",id);
      }
    });
    asyncParse.on("done", function(){
      console.log("done!");
      process.exit(0);
    });
    asyncParse.processAllTags();
  });

}
exports.debugTag = debugTag;
debugTag("/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3", 'r'); 
/* TESTING */


//var f = fs.openSync("/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3", 'r');
