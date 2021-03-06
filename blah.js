var fs = require('fs')
var http = require('http');
var sys = require('sys')
var util = require('util')
Buffer.prototype.pointer = 0;
Buffer.prototype.getChunk = 
  function(numbytes){
    if( this.pointer + numbytes == this.length ) return null;
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
  if(s[0] == 'T'){
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
    return [data, bitrate, framesize];
  }
}

exports.Mp3Stream = function(){
  this.filePaths = [];
  this.listeners = [];
  this.accumulatedTime = 0;
  this.frames = 0;
  this.syncTime = 0;
  this.currentFile = null;
  this.currentId3 = null;

  this.onFileFinish = function(){};
}

exports.Mp3Stream.queuePath = function(path){
  this.filePaths.push(path);
}

exports.Mp3Stream.gotoNext = function(){
  this.frames = 0;
  this.accumulatedTime = 0;
  this.syncTime = (new Date()).getTime();
  var that = this;
  if( that.filePaths.length > 0 ){
    var filePath = this.filePaths.shift();
    var callback = function(err, fd){ // TODO - check for an error and handle it
      that.currentFile = fd;
      that.currentId3 = getId3Tag(fd);
      sys.puts(currentId3);
      fd.reset(0);
    }
  }
}

exports.Mp3Stream.startStream = function(callback){
  var writeFrame = function(fd){
    var d = readFrame(fd);
    if( d == null ){
      this.onFileFinish();
      return;
    }
    var delay = 0;
    if( d != -1){
      //res.write(d[0]);
      this.frames = (this.frames + 1) % 128;
      if(this.frames == 1) { //we reached a sync point. reset the timer to the sync time.
        this.accumulatedTime = (new Date()).getTime();
        this.syncTime = this.accumulatedTime;
      }
      this.accumulatedTime += d[2] * 8 / d[1];  
      delay = accumulatedTime - (new Date()).getTime();
      delay = delay > 0 ? delay : 0; 
      callback(d[0])
    }
    setTimeout(writeFrame, parseInt(delay), fd)
  }
}



//var mp3filePath = '/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3'
var mp3filePath = '/home/mike/Music/shugo tokumaru - night piece - 2004/08 paparazzi.mp3'

var accumulatedTime;
var frames = 0;
var syncTime;
var server = http.createServer(function(req, res) {
    sys.puts("connection");
    var mp3file = fs.readFile(mp3filePath,
      function(err, fd){
        var num = 0;
        var total = 0;

        var writeFrame = function(fd){
            var d = readFrame(fd);
            if( d == null ){
              sys.puts("got null");
              res.end();
              return;
            }
            var delay = 0;
            if( d != -1){
                res.write(d[0]);
                frames = (frames + 1) % 128;
                if(frames == 1) { //we reached a sync point. reset the timer to the sync time.
                    accumulatedTime = (new Date()).getTime();
                    syncTime = accumulatedTime;
                }
                accumulatedTime += d[2] * 8 / d[1];  
                delay = accumulatedTime - (new Date()).getTime();
                delay = delay > 0 ? delay : 0; 
                sys.puts(parseInt(delay))
            }
            sys.puts(parseInt(delay))
            setTimeout(writeFrame, parseInt(delay), fd)
        }
        writeFrame(fd);
      }
    )
});
server.listen(3000);

