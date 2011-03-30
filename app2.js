require.paths.unshift('/usr/local/lib/node')

// Modules//{{{
var randomString = require('./utilities').randomString
var mp3 = require('./mp3stream'),
    io = require('socket.io'),
    fs = require('fs'),
    http = require('http'),
    path = require('path'),
    multipart = require('multipart'),
    sys = require('sys'),
    util = require('util'),
    Mu = require('Mu'),
    sessions = require('./session'),
    redis = require('redis'),
    redisClient = redis.createClient();//}}}
redisClient.on("error", function(err){//{{{
  console.log("Error: " + err); 
});//}}}

/* Load settings from external config file into var settings */
eval(fs.readFileSync('./localdev.js', encoding="ascii"))
Mu.templateRoot = './templates'
redisClient.ltrim("chatlog", -1, 0);

Array.prototype.remove = function(e) {//{{{
    for (var i = 0; i < this.length; i++) {
        if (e == this[i]) { return this.splice(i, 1); }
    }
};//}}}

var streamlisteners = [];
var stream = new mp3.Mp3Stream();
var listeners = [];
var writeFrame = function(frameData){
  streamlisteners.forEach(function(listener){
    //try{
      listener.write(frameData);
      /*}catch(err){*/
      /*sys.puts(err);*/
      /*}*/
  })
}
stream.onFrameReady = writeFrame;
stream.onFileFinish = function(filename, whouploaded){ 
    msgId++;
    broadcast({messages:[{"type":"stopped","id":msgId,'from':whouploaded,'body':filename}]})
    sys.puts("End of file.");
    stream.loadNext(
      function(newfilename, newwhouploaded){ 
        stream.startStream(writeFrame)
      }
    ); 
};

stream.onFileStart = function(filename, whouploaded){ 
    msgId++;
    broadcast({messages:[{"type":"started","id":msgId,'from':whouploaded,'body':filename}]})
};

//stream.queuePath('/home/mike/Music/shugo tokumaru - night piece - 2004/08 paparazzi.mp3');
//stream.queuePath( '/home/mike/Music/kettel - through friendly waters (sending orbs 2005)/01 - Bodpa.mp3');
stream.loadNext( function(){ stream.startStream( writeFrame ); });

var msgId = 0;
var fileId = 0;
var uploadDirectory = settings.upload_directory

var sendTemplate = function(res, template, context){
  Mu.render(template, context, {}, function(err, output){
    if(err){
      throw err;
    }
    output.addListener('data', function (c) {res.write(c)})
          .addListener('end', function () { res.end() });
  })
}


var numusers = 1;


var server = http.createServer(function(req, res) {
  var session = sessions.lookupOrCreate(req,{ lifetime:604800 });
  if(!session.name){
    session.name = "user" + (numusers++);
  }
  res.setHeader('Set-Cookie', session.getSetCookieHeaderValue());
  sys.puts(session.getSetCookieHeaderValue());
  req.session = session

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
      sendTemplate(res, "splash.html", {})
      //display_form(req, res);
      break;
    case '/changename/':
      changename(req, res, qs)
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
      break;
  }
});
server.listen(settings.port);

//var socket = io.listen(server, {transports:  ['websocket', 'xhr-polling','flashsocket', 'jsonp-polling', 'htmlfile']});
var socket = io.listen(server, {transports:  ['websocket', 'flashsocket']});
socket.on('connection', function(client){
     
    var session = sessions.lookupOrCreate(client.request,{ lifetime:604800 });
    if(!session.name){
      session.name = "user" + (numusers++);
    }
    client.request.session = session

    msgId++;
    var message = JSON.stringify({messages:[{"type":"join","id":msgId,'from':session.name,'body':''}]})
    client.broadcast(message);

    client.on('message',
        function(m){
            sys.puts("message from: " + session.name );
            msgId++;
            var chat = JSON.stringify({messages:[{"type":"chat","id":msgId,'from':session.name,'body':m}]})
            client.broadcast(chat); 
            redisClient.lpush("chatlog", chat,
                function(){ redisClient.ltrim("chatlog", 100, function(){}) });
        } 
    )
    client.on('disconnect', function(){
        msgId++;
        sys.puts("disconnected: " + session.name );
        var disconnectmsg = JSON.stringify({messages:[{"type":"left","id":msgId,'from':session.name,'body':''}]})
        client.broadcast(disconnectmsg); 
        sys.puts("disconnect!"); 
    } )
})

function display_form(req, res) {//{{{
  res.statusCode=200
  //res.setHeader('Content-Type', 'text/html');
  //sys.puts(stream.currentFileName)
  sys.puts(util.inspect(stream.filePaths));
  redisClient.lrange("chatlog", 0, 99, function(err, reply){
    result = {
               username:req.session.name,
               msgs:reply,
               nowplaying: stream.currentFileName != null ? stream.currentFileName : ""
             }
    if(stream.filePaths.length > 0 ) result.queue = stream.filePaths;
    sendTemplate(res, "simple.html", result)
  })
  //sendTemplate(res, "simple.html", {username:req.session.name,value: 10000,taxed_value: function() { return 10; }, in_ca: true })
}//}}}

/*function sendMessage(req, res){//{{{*/
/*var qs = require('url').parse(req.url, true)*/
/*//sys.puts(require('util').inspect(qs.query))*/
/*msgId++;*/
/*broadcast({messages:[{"type":"chat","id":msgId,'from':'dude','body':qs.query['chat']}]});*/
/*res.end()*/
/*}//}}}*/

function broadcast(jsonobj){
  var message = JSON.stringify(jsonobj)
  socket.broadcast(message);
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
  var sess = req.session;
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
          stream.queuePath(uploadDirectory + filePath + ".mp3", fname,sess.name);
          msgId++;
          broadcast({messages:[{"type":"enq","id":msgId,'from':sess.name,'body':fname}]})
        });
      }
    );
  });
  return;
}//}}}

function changename(req, res, qs){
  var newname = qs.query['name']
  var oldname = req.session.name
  sys.puts("old name: " + oldname);
  req.session.name = newname;
  res.end(JSON.stringify({ok:'ok'}));
  broadcast({messages:[{"type":"namechange","id":msgId,'from':oldname,'body':newname}]})
}

function show_404(req, res) {//{{{
  res.end('You r doing it rong!');
}//}}}

