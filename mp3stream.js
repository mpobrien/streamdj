var fs = require('fs')
var sys = require('sys')
var util = require('util')
Buffer.prototype.pointer = 0;
Buffer.prototype.getChunk = 
  function(numbytes){
    if( this.pointer + numbytes >= this.length + 1 ) return null;
    return this.slice(this.pointer, (this.pointer+=numbytes)); 
  }                 

Buffer.prototype.reset = function(newpos){ this.pointer = newpos }
Buffer.prototype.rewind = function(numBytes){
    this.pointer -= numBytes;
    if( this.pointer < 0 ) this.pointer = 0;
}

var Bitmask = function(bytes){//{{{
    this.bytes = bytes;
    var len = bytes.length * 8
    this.bits = new Array(len);
    for(var i=0; i<bytes.length; i++){
        for(var j=7; j>=0; j--){
            this.bits[--len] = ((bytes[i] >>> j) & 0x01);
        }
    }
}
//}}}

Bitmask.prototype.get = function(from, to){//{{{
  var dec = 0;
  var pow = 1;
  for(var i = from; i <= to; i++){
      dec += this.bits[i] * pow;
      pow *= 2;
  }
  return dec;
}//}}}

BITRATE1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
BITRATE2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
SAMPLERATE1 = [44100, 48000, 32000]
SAMPLERATE2 = [22050, 24000, 16000]
SAMPLERATE25 = [11025, 12000, 8000]

var getId3Tag = function(buffer){//{{{
    buffer.reset(buffer.length - tagSize);
    var tagSize = 128;
    buffer.pointer = buffer.length - tagSize;
    sys.puts(buffer.length);
    return { tag: buffer.getChunk(3).toString("ascii"),        
             title: buffer.getChunk(30).toString("ascii"),       
             artist: buffer.getChunk(30).toString("ascii"),      
             album: buffer.getChunk(30).toString("ascii"),       
             year: buffer.getChunk(4).toString("ascii"),         
             comment: buffer.getChunk(30).toString("ascii"),     
             genre: buffer.getChunk(1).toString("ascii")
           }
}//}}}

var readFrame = function(buf){
  var chunk = buf.getChunk(4)
  if( chunk == null ) return null;
  var s = chunk.toString("ascii").slice(0,3)
  if(s.length == 3 && s[0] == 'T'){
    sys.puts("got tag")
    return -1;
  }else if(s[0] =='I'){
    buf.rewind(1)
    var version = buf.getChunk(2)
    if( version == null ) return null;
    var flags = buf.getChunk(1)
    if( flags == null ) return null;
    var sizeData = buf.getChunk(4)
    if( sizeData == null ) return null;
    var size = (sizeData[0]<<21) | (sizeData[1]<<14) | (sizeData[2]<<7) | sizeData[3]
    var chunk = buf.getChunk(size);
    if( chunk == null ) return null;
    return -1;
  }else{
    var bm = new Bitmask(chunk)
    var h = bm.get(0,31)
    var version = (h & 0x00180000) >> 19
    var isprotected = !(h & 0x00010000)
    var b = (h & 0xf000) >> 12
    if(version == 3) //# V1
        bitrate = BITRATE1[b]
    else // # V2 or V2.5
        bitrate = BITRATE2[b]
    s = (h & 0x0c00) >> 10
    if (version == 3) // V1
        samplerate = SAMPLERATE1[s]
    else if( version == 2)// V2
        samplerate = SAMPLERATE2[s]
    else if( version == 0)// V2.5
        samplerate = SAMPLERATE25[s]
    nsamples = 1152
    if( samplerate <= 24000)
        nsamples = 576
    var pad = (h & 0x0200) >> 9
    var channel = (h & 0xc0) >> 6
    var joint = (h & 0x30) >> 4
    var copyright = (h & 8)>0
    var original = (h & 4)>0
    var emphasis = h & 3
    if (version == 3)
        framesize = 144000 * bitrate / samplerate + pad
    else
        framesize = 72000 * bitrate / samplerate + pad
    buf.rewind(4)
    var data = buf.getChunk(parseInt(framesize))
    if( data == null ) return null;
    if( data.length == 0 ) return null;
    if( isNaN(framesize) ) return null;
    return [data, bitrate, framesize];
  }
}

exports.Mp3Stream = function(){
  var filePaths = [];
  var listeners = [];
  var accumulatedTime = 0;
  var frames = 0;
  var syncTime = 0;
  var currentFile = null;
  var currentFileUploader  = null;
  var currentFileName  = null;
  var currentId3 = null;
  var that = this;

  this.onFileFinish = function(currentFileName, currentFileUploader){sys.puts("file done")};
  this.onFileStart = function(currentFileName, currentFileUploader){sys.puts("file started")};
  this.onFrameReady = function(){};

  this.loadNext = function(callback){
    frames = 0;
    accumulatedTime = 0;
    syncTime = (new Date()).getTime();
    var that = this;
    if( filePaths.length > 0 ){
      var fileInfo = filePaths.shift();
      var filePath = fileInfo[0]
      var fileName = fileInfo[1]
      var fileUploader = fileInfo[2]
      sys.puts(filePath);
      var setupFile = function(err, fd){ // TODO - check for an error and handle it
        currentFile = fd;
        currentFileUploader = fileUploader;
        currentFileName = fileName;
        fd.pointer = 0;
        var tag = getId3Tag(fd);
        sys.puts(util.inspect(tag));
        fd.reset(0);
        callback(fileName, fileUploader);
        that.onFileStart(fileName, fileUploader);
      }
      fs.readFile(filePath, setupFile);
    }
  }

  this.startStream = function startStreaming(){
    var d = readFrame(currentFile);
    if( d == null ){
      currentFile = null;
      that.onFileFinish(currentFileName, currentFileUploader);
      currentFileName = null;
      currentFileUploader = null;
      return;
    }
    var delay = 0;
    if( d != -1){
      frames = (frames + 1) % 128;
      if(frames == 1) { //we reached a sync point. reset the timer to the sync time.
        accumulatedTime = (new Date()).getTime();
        syncTime = accumulatedTime;
      }
      accumulatedTime += d[2] * 8 / d[1];  
      delay = accumulatedTime - (new Date()).getTime();
      delay = delay > 0 ? delay : 0; 
      that.onFrameReady(d[0]);
    }
    setTimeout(startStreaming, parseInt(delay)) 
  }

  this.queuePath = function(path, name, who){
    filePaths.push([path, name, who]);
    if( filePaths.length == 1 && currentFile == null){
      var callback = that.startStream;
      this.loadNext(callback);
    }
  }


  /*this.startStream = function(callback){*/
  /*processFrame(callback);*/
    /*var thefile = this.currentFile;*/
    /*var d = readFrame(this.currentFile);*/
    /*if( d == null ){*/
    /*this.onFileFinish();*/
    /*return;*/
    /*}*/
    /*var delay = 0;*/
    /*if( d != -1){*/
    /*this.frames = (this.frames + 1) % 128;*/
    /*if(this.frames == 1) { //we reached a sync point. reset the timer to the sync time.*/
    /*this.accumulatedTime = (new Date()).getTime();*/
    /*this.syncTime = this.accumulatedTime;*/
    /*}*/
    /*this.accumulatedTime += d[2] * 8 / d[1];  */
    /*delay = accumulatedTime - (new Date()).getTime();*/
    /*delay = delay > 0 ? delay : 0; */
    /*callback(d[0])*/
    /*}*/
    /*setTimeout(arguments.callee, parseInt(delay), thefile)*/
  /*}*/

}

