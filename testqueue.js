var http = require('http');
var queue = require('./queue');
var sys = require('sys')

var streamlisteners = [];
var queue = new queue.Mp3Queue();
queue.stream.on("frameready", function(data,y,z){
  streamlisteners.forEach(function(listener){
      listener.write(data);
  })
});

http.createServer(
  function (req, res) {
    streamlisteners.push(res);
  }
).listen(81);

queue.enqueue('/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3',"bodpa","mpobrien");
