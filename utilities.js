var Mu = require('Mu')
var fs = require('fs')
var sys = require('sys')
var util = require('util')
var path = require('path')

exports.validateRoomName = function(roomname){
  if(roomname.length<6 || roomname.length>15) return false;
  if( roomname == 'login' || roomname == 'upload' || roomname == 'logout' || roomname == 'authdone') return false;
  if(roomname.match(/^[a-zA-Z0-9]+$/) ) return true;
  else return false;
}

exports.randomString = function(bits){
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

exports.extractCookie = function(cstring, c_name){
  var i,x,y,ARRcookies=cstring.split(";");
  for (i=0;i<ARRcookies.length;i++){
    x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
    y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
    x=x.replace(/^\s+|\s+$/g,"");
    if (x==c_name){
      return unescape(y);
    }
  }
}

exports.pack = function(num) {//{{{
  var result = '';
  result += String.fromCharCode(num >> 24 & 0xFF);
  result += String.fromCharCode(num >> 16 & 0xFF);
  result += String.fromCharCode(num >> 8 & 0xFF);
  result += String.fromCharCode(num & 0xFF);
  return result;
}//}}}

var serveStaticFile = function(req, res, filename){//{{{
  fs.readFile(filename, "binary", function(err, file) {  
    if(err) {  
      res.write(err + "\n");  
      res.end();  
      return;  
    }  
    res.write(file, "binary");  
    res.end();  
  });  
}//}}}

exports.serveStaticFile  = serveStaticFile;

exports.serveFromStaticDir = function(req,res,uri){
  var filename = path.join(process.cwd(), uri);  
  path.exists(filename, function(exists) {  
    if(!exists) {  
      res.write("404 Not Found\n");  
      res.end();  
      return;  
    }  
    serveStaticFile(req, res, filename);
  });
}

exports.sendTemplate = function(res, template, context, devmode){//{{{
  var options = {}
  if( devmode ){
    options['cached'] = false;
  }
  Mu.render(template, context, options, function(err, output){
    if(err){
      throw err;
    }
    output.addListener('data', function (c) {res.write(c)})
          .addListener('end', function () { res.end() });
  })
}//}}}
