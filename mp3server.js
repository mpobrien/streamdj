var mp3 = require('./mp3stream');
var http = require('http');
var sys = require('sys')
var util = require('util')

var listeners = [];
var stream = new mp3.Mp3Stream();

stream.onFileFinish = function(){ sys.puts("file is finished") };

var writeFrame = function(frameData){//{{{
  listeners.forEach(function(listener){
      listener.write(frameData);
  })
}//}}}
stream.onFrameReady = writeFrame;

stream.queuePath( '/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3');

/*stream.loadNext(*/
/*function(){*/
/*stream.startStream( */
/*function(frameData){*/
/*listeners.forEach(function(listener){*/
/*sys.puts("writing");*/
/*listener.write(frameData);*/
/*})*/
/*}*/
/*);*/
/*}*/
/*);*/

var server = http.createServer(function(req, res) {
  sys.puts("hey!");
  listeners.push(res);
});
server.listen(3000)
