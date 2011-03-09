var mp3 = require('./mp3stream');
var http = require('http');
var sys = require('sys')
var util = require('util')

var listeners = [];
var stream = new mp3.Mp3Stream();
stream.onFileFinish = function(){ sys.puts("file is finished") };
//stream.queuePath( '/home/mike/Music/shugo tokumaru - night piece - 2004/08 paparazzi.mp3' );
stream.queuePath( '/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3');
//var mp3filePath = '/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3'
stream.loadNext(
  function(){
    stream.startStream( 
      function(frameData){
        listeners.forEach(function(listener){
          listener.write(frameData);
        })
      }
    );
  }
);

var server = http.createServer(function(req, res) {
  listeners.push(res);
});
server.listen(3000)
