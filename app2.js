require.paths.unshift('/usr/local/lib/node')

function nano(template, data) {//{{{
  return template.replace(/\{([\w\.]*)}/g, function (str, key) {
    var keys = key.split("."), value = data[keys.shift()];
    keys.forEach(function (key) { value = value[key];});
    return value;
  });
}//}}}
// Modules//{{{
var randomString = require('./utilities').randomString
var pack = require('./utilities').pack
var extractCookie = require('./utilities').extractCookie
var mp3 = require('./mp3stream'),
    io = require('socket.io'),
    ws = require("websocket-server");
    fs = require('fs'),
    crypto = require("crypto"),
    http = require('http'),
    path = require('path'),
    multipart = require('multipart'),
    sys = require('sys'),
    util = require('util'),
    Mu = require('Mu'),
    sessions = require('./session'),
    redis = require('redis');
var Cookies = require('cookies')
var OAuth = require('node-oauth').OAuth;
var redisClient = redis.createClient();

function serveStaticFile(req, res, uri){//{{{
  var filename = path.join(process.cwd(), uri);  
  path.exists(filename, function(exists) {  
    if(!exists) {  
      res.write("404 Not Found\n");  
      res.end();  
      return;  
    }  
    fs.readFile(filename, "binary", function(err, file) {  
      if(err) {  
        res.write(err + "\n");  
        res.end();  
        return;  
      }  
      res.write(file, "binary");  
      res.end();  
    });  
  });  
}//}}}


eval(fs.readFileSync('./localdev.js', encoding="ascii"))
var oa = new OAuth(settings.REQUEST_TOKEN_URL, settings.ACCESS_TOKEN_URL,
                   settings.key, settings.secret, 
                   settings.OAUTH_VERSION, settings.CALLBACK_URL, settings.HASH_VERSION); 
//}}}
redisClient.on("error", function(err){//{{{
  console.log("Error: " + err); 
});//}}}

/* Load settings from external config file into var settings */
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
var writeFrame = function(frameData){//{{{
  streamlisteners.forEach(function(listener){
      listener.write(frameData);
  })
}//}}}
stream.onFrameReady = writeFrame;
stream.onFileFinish = function(filename, whouploaded){ //{{{
    msgId++;
    broadcast({messages:[{"type":"stopped","id":msgId,'from':whouploaded,'body':filename}]})
    sys.puts("End of file.");
    stream.loadNext(
      function(newfilename, newwhouploaded){ 
        stream.startStream(writeFrame)
      }
    ); 
};//}}}

stream.onFileStart = function(filename, whouploaded){ //{{{
    msgId++;
    broadcast({messages:[{"type":"started","id":msgId,'from':whouploaded,'body':filename}]})
};//}}}

stream.loadNext( function(){ stream.startStream( writeFrame ); });

var msgId = 0;
var fileId = 0;
var uploadDirectory = settings.upload_directory

var sendTemplate = function(res, template, context){//{{{
  Mu.render(template, context, {}, function(err, output){
    if(err){
      throw err;
    }
    output.addListener('data', function (c) {res.write(c)})
          .addListener('end', function () { res.end() });
  })
}//}}}

var numusers = 1;

var server = ws.createServer();
server.addListener("request", function(req, res) {
  var qs = require('url').parse(req.url, true)
  if( qs.pathname.indexOf('/static/') === 0 ){
    var uri = qs.pathname
    serveStaticFile(req, res, uri);
    return;
  }
  switch (qs.pathname) {
    case '/listen':
      streamlisteners.push(res);
      req.connection.addListener("close", function(){ streamlisteners.remove(res); })
      sys.puts("listening");
      break;
    case '/':
      var cookies = new Cookies(req, res);
      if( !cookies.get("session") ){ // user is not logged in.
        sendTemplate(res, "login.html", {})
      }else{ // user is logged in.
        var sessionId = cookies.get("session");
        redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name",
            function(err, replies){
              //TODO check for err.
              userinfo = {user_id:replies[0], name:replies[1]}
              display_form(req, res, userinfo);
            })
      }
      break;
    case '/changename/':
      changename(req, res, qs)
      break;
    case '/upload':
      sys.puts("upload!");
      upload_file(req, res);
      break;
    case '/login':
      oa.getOAuthRequestToken(
          function(error, oauth_token, oauth_token_secret, results){
            if(error) {
              throw new Error(([error.statusCode, error.data].join(': ')));
            } else { 
              res.writeHead(302, { 'Location': 'https://twitter.com/oauth/authorize?oauth_token=' + oauth_token, });
              res.end();
            }
          }
        );
      break;
    case '/authdone':
      var token = qs.query['oauth_token']
      var verifier = qs.query['oauth_verifier']
      var cookies = new Cookies(req, res)
      oa.getOAuthAccessToken(token, verifier, 
          function(error, oauth_access_token, oauth_access_token_secret, results2) {
            var session_id = randomString(128);
            redisClient.mset("session_"+session_id+"_user_id", results2.user_id, "session_"+session_id+"_screen_name", results2.screen_name,
                             function(){
                               cookies.set("session", session_id, {domain:"streamdj.com", httpOnly:false});
                               res.writeHead(302, { 'Location': 'http://streamdj.com/', });
                               res.end();
                             })
          })
      break;
    case '/logout':
      var cookies = new Cookies(req, res)
      var sessionId = cookies.get("session");
      redisClient.del("session_"+sessionId+"_user_id", function(){
        cookies.set("session", null, {domain:"streamdj.com", httpOnly:false});
        res.writeHead(302, { 'Location': 'http://streamdj.com/' });
        res.end()
      })
      break;
    default:
      res.end();
      break;
  } 
});

server.addListener("connection", function(connection){
  connection.authorized = false;
  connection.addListener("message", function(msg){
    if( !connection.authorized ){
      if(msg.substr(0, 5)==="auth:"){
        var authstring = msg.substr(5)
        var sessionId = extractCookie(authstring, "session") //TODO check if present/valid?
        redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name",
            function(err, replies){
              //TODO check for err.
              userinfo = {user_id:replies[0], name:replies[1]}
              connection.name = userinfo.name
              connection.authorized = true;
              redisClient.sadd("listeners", userinfo.name, function(err, reply){
                msgId++
                if( reply == 1 ){
                  var message = JSON.stringify({messages:[{"type":"join","id":msgId,'from':userinfo.name,'body':''}]})
                  connection.broadcast(message);
                }else{} // already inside
              })
            })
      }
    }else{
      var chat = JSON.stringify({messages:[{"type":"chat","id":msgId,'from':connection.name,'body':msg}]})
    }
    //TODO validate the message first?
    connection.broadcast(chat);
  });
});

server.listen(settings.port);
//var socket = io.listen(server, {transports:  ['websocket', 'xhr-polling','flashsocket', 'jsonp-polling', 'htmlfile']});
//var socket = io.listen(server, {transports:  ['websocket', 'flashsocket']});
//socket.on('connection', function(client){

    //TODO fix this shit up! should be secure, reject unauth'd connections, use signed cookies
    //var cookies = new Cookies(client.req, client.res);
    //var username = cookies.get("screen_name");
     
    //var session =  null;sessions.lookupOrCreate(client.request,{ lifetime:604800 });
    //if(!session.name){
      //session.name = "user" + (numusers++);
    /*}*/
    /*client.request.session = session*/
    //session = {name:'dude'}

    //msgId++;
    //var message = JSON.stringify({messages:[{"type":"join","id":msgId,'from':username,'body':''}]})
    //client.broadcast(message);

    //client.on('message',
        //function(m){
            //sys.puts("message from: " + session.name );
            //msgId++;
            //var chat = JSON.stringify({messages:[{"type":"chat","id":msgId,'from':username,'body':m}]})
            //client.broadcast(chat); 
            //redisClient.lpush("chatlog", chat,
                //function(){ redisClient.ltrim("chatlog", 100, function(){}) });
        ////} 
    //)
    //client.on('disconnect', function(){
        //msgId++;
        //sys.puts("disconnected: " + session.name );
        //var disconnectmsg = JSON.stringify({messages:[{"type":"left","id":msgId,'from':username,'body':''}]})
        //client.broadcast(disconnectmsg); 
        //sys.puts("disconnect!"); 
    //} )
//})

function display_form(req, res, userinfo) {//{{{
  res.statusCode=200
  sys.puts(util.inspect(stream.filePaths));
  redisClient.lrange("chatlog", 0, 99, function(err, reply){
    var result = {
               username:userinfo.name,
               msgs:reply,
               nowplaying: stream.currentFileName != null ? stream.currentFileName : ""
             }
    if(stream.filePaths.length > 0 ) result.queue = stream.filePaths;
    redisClient.smembers("listeners", function(err2, reply2){
      result.listeners = [];
      for(var j in reply2){ result.listeners[j] = {name:reply2[j]} }
      sendTemplate(res, "simple.html", result)
    });
  })
}//}}}

function broadcast(jsonobj){
  var message = JSON.stringify(jsonobj)
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
  sys.puts("doing upload!");
  var cookies = new Cookies(req, res);
  var sessionId = cookies.get("session");
  redisClient.mget("session_"+sessionId+"_user_id", "session_"+sessionId+"_screen_name",
    function(err, replies){
      var userinfo = {user_id:replies[0], name:replies[1]}
      sys.puts("uploader: " + util.inspect(userinfo));
      var buf = []; var bufLen = 0;
      fileId++;
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
        fs.open(uploadDirectory + filePath + ".mp3", 'w', function(err, fd){
          fs.write(fd, finalbuf, 0, finalbuf.length, null, function(){
            fs.close(fd);
            res.end();
            sys.puts("queueing up!: " + filePath);
            sys.puts(uploadDirectory + filePath + ".mp3")
            sys.puts(userinfo.name);
            stream.queuePath(uploadDirectory + filePath + ".mp3", fname, userinfo.name);
            msgId++;
            //broadcast({messages:[{"type":"enq","id":msgId,'from':sess.name,'body':fname}]})
          });
        });
      });
    });
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

