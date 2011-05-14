var sys = require('sys')
Buffer.prototype.pointer = 0;
Buffer.prototype.getChunk = function(numbytes){//{{{
    if( this.pointer + numbytes >= this.length + 1 ) return null;
    return this.slice(this.pointer, (this.pointer+=numbytes)); 
  }//}}}

var BITRATE1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
var BITRATE2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
var SAMPLERATE1 = [44100, 48000, 32000]
var SAMPLERATE2 = [22050, 24000, 16000]
var SAMPLERATE25 = [11025, 12000, 8000]

Buffer.prototype.reset = function(newpos){ this.pointer = newpos }
Buffer.prototype.rewind = function(numBytes){//{{{
    this.pointer -= numBytes;
    if( this.pointer < 0 ) this.pointer = 0;
}//}}}

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

exports.Mp3Stream = function Mp3Stream(){
  var that = this;
  this.syncTime = 0;
  this.accumulatedTime = 0;
  var frames = 0;
  this.timeoutId = null;

  this.stopStream = function(){
    if(that.timeoutId){
      clearTimeout(that.timeoutId);
    }
  }

  var readFrame = function(buf){//{{{
    var chunk = buf.getChunk(4)
    if( chunk == null ) return null;
    var s = chunk.toString("ascii").slice(0,3)
    if(s.length == 3 && s[0] == 'T'){
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
      var samplerate;
      var h = bm.get(0,31)
      var framesyncCheck = (h >>> 16 ) & 0xffe0
      if( framesyncCheck != 0xffe0){
        console.log("bad frame sync!", h, framesyncCheck);
        return null;
      }
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
      if (version == 3){
        framesize = 144000 * bitrate / samplerate + pad
      }else{
        framesize = 72000 * bitrate / samplerate + pad
      }
      buf.rewind(4)
      var data = buf.getChunk(parseInt(framesize))
      if( data == null ) return null;
      if( data.length == 0 ) return null;
      if( isNaN(framesize) ) return null;
      return [data, bitrate, framesize];
    }
  }//}}}

  this.streamFile = function streamFile(fd){//{{{
    that.stopStream();
    fd.reset(0);
    that.processFrame(fd);
  }//}}}

  this.processFrame = function processFrame(fd){//{{{
    var frameInfo = readFrame(fd);
    if(frameInfo == null){ //end of file!
      that.emit("stream-end");
      return;
    }
    var delay = 0;
    if( frameInfo != -1 ){
      frames = (frames + 1) % 128;
      if(frames == 1) { //we reached a sync point. reset the timer to the sync time.
        that.accumulatedTime = (new Date()).getTime();
        that.syncTime = that.accumulatedTime;
      }
      that.accumulatedTime += frameInfo[2] * 8 / frameInfo[1];  
      //sys.puts(syncTime);
      delay = that.accumulatedTime - (new Date()).getTime();
      delay = delay > 0 ? delay : 0; 
      that.emit("frameready", frameInfo[0], frameInfo[1],frameInfo[2], that.id);
    }
    //that.timeoutId = setTimeout(function(){processFrame(fd)}, 0) 

    //sys.puts(parseInt(frameInfo[2]) + ", " + parseInt(frameInfo[1]));
    that.timeoutId = setTimeout(function(){processFrame(fd)}, parseInt(delay-1)) 
  }//}}}

}
exports.Mp3Stream.prototype = new process.EventEmitter()

//Example + Test:
/*
var sys = require("sys");
var fs = require('fs')
var stream  = new Mp3Stream();
stream.on("frameready", function(x,y,z){
  sys.puts("y: " + y + ",z:"+z);
})
fs.readFile('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3',
    function(err, fd){
      stream.streamFile(fd)
    }
);
setTimeout( function(){stream.stopStream()} , 5000); // stop the stream after 1 second.
*/
