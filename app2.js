require.paths.unshift('/usr/local/lib/node')
var mp3 = require('./mp3stream');
var fs = require('fs')
var http = require('http');
var path = require('path');
var multipart = require('multipart');
var sys = require('sys');
var util = require('util')
var Mu = require('Mu')

Mu.templateRoot = './templates'
var jquery = fs.readFileSync("./static/jquery.js")

Array.prototype.remove = function(e) {//{{{
    for (var i = 0; i < this.length; i++) {
        if (e == this[i]) { return this.splice(i, 1); }
    }
};//}}}

function randomString(bits){
  var chars,rand,i,ret;
  chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-'
  ret=''
  while(bits > 0){
      rand=Math.floor(Math.random()*0x100000000) // 32-bit integer
      // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
      for(i=26; i>0 && bits>0; i-=6, bits-=6) ret+=chars[0x3F & rand >>> i]
  }
  return ret
}

var streamlisteners = [];
var stream = new mp3.Mp3Stream();
var listeners = [];
var writeFrame = function(frameData){
  streamlisteners.forEach(function(listener){
    listener.write(frameData);
  })
}
stream.onFrameReady = writeFrame;
stream.onFileFinish = function(){ 
    sys.puts("End of file.");
    stream.loadNext(
      function(){ stream.startStream(writeFrame) }
    ); 
};
//stream.queuePath('/home/mike/Music/shugo tokumaru - night piece - 2004/08 paparazzi.mp3');
//stream.queuePath( '/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3');
stream.loadNext( function(){ stream.startStream( writeFrame ); });

var msgId = 0;
var fileId = 0;
var uploadDirectory = "/home/mpobrien/uploaded/"

var sendTemplate = function(res, template, context){
  Mu.render(template, context, {}, function(err, output){
    if(err){
      throw err;
    }
    output.addListener('data', function (c) {res.write(c)})
          .addListener('end', function () { res.end() });
  })
}




var server = http.createServer(function(req, res) {
  var qs = require('url').parse(req.url, true)
  if( qs.pathname.indexOf('/static/') === 0 ){
    var uri = qs.pathname
    var filename = path.join(process.cwd(), uri);  
    path.exists(filename, function(exists) {  
        if(!exists) {  
            res.write("404 Not Found\n");  
            res.end();  
            return;  
        }  
        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                //res.sendHeader(500, {"Content-Type": "text/plain"});  
                res.write(err + "\n");  
                res.end();  
                return;  
            }  
            //res.sendHeader(200);  
            res.write(file, "binary");  
            res.end();  
        });  
    });  
    return;
  }
  switch (qs.pathname) {
    case '/listen':
      streamlisteners.push(res);
      req.connection.addListener("close", function(){ streamlisteners.remove(res); })
      break;
    case '/':
      display_form(req, res);
      break;
    case '/upload':
      upload_file(req, res);
      break;
    case '/a/message/new':
      sendMessage(req, res);
      break;
    case '/a/message/updates':
      getUpdates(req, res);
      break;
    case '/getfile':
    upload_file(req, res)
      break
    default:
      show_404(req, res);
      break;
  }
});
server.listen(3000);

function display_form(req, res) {//{{{
  res.statusCode=200
  //res.setHeader('Content-Type', 'text/html');
  sendTemplate(res, "simple.html", {name: "Chris",value: 10000,taxed_value: function() { return 10; }, in_ca: true })
}//}}}

function sendMessage(req, res){//{{{
  var qs = require('url').parse(req.url, true)
  sys.puts(require('util').inspect(qs.query))
  msgId++;
  broadcast({messages:[{"type":"chat","id":msgId,'from':'dude','body':qs.query['chat']}]});
  res.end()
}//}}}

function broadcast(jsonobj){
  var message = JSON.stringify(jsonobj)
  listeners.forEach(function(listener){
      listener.write(message)
      listener.end()
      listeners.remove(listener)
  })
}

function getUpdates(req, res){//{{{
    req.connection.addListener("close", 
        function(){ 
            if(listeners.remove(res)){
                sys.puts("client disconnected.") 
            }
        })
    listeners.push(res)
    sys.puts(listeners.length)
}//}}}


function upload_file(req, res) {//{{{
  var buf = []; var bufLen = 0;
  fileId++;
  sys.puts(util.inspect(req.headers));
  var fname = req.headers['x-file-name'] 
  sys.puts(fname);
  req.addListener("data", function(data){
    buf.push(data)
    bufLen += data.length;
  });

  req.addListener("end", function(){
    var finalbuf = new Buffer(bufLen);
    for (var i=0,len=buf.length,pos=0; i<len; i++) {
      buf[i].copy(finalbuf, pos);
      pos += buf[i].length;
    }  
    var filePath = randomString(64);
    fs.open(uploadDirectory + filePath + ".mp3", 'w', 
      function(err, fd){
        fs.write(fd, finalbuf, 0, finalbuf.length, null, function(){
          fs.close(fd);
          res.end();
          sys.puts("queueing up!: " + filePath);
          stream.queuePath(uploadDirectory + filePath + ".mp3");
          msgId++;
          broadcast({messages:[{"type":"enq","id":msgId,'from':'dude','body':fname}]})
        });
      }
    );
  });
  return;
}//}}}

function show_404(req, res) {//{{{
  res.end('You r doing it rong!');
}//}}}

