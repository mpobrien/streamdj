var Mu = require('Mu')
var fs = require('fs')
var sys = require('sys')
var util = require('util')
var path = require('path')

exports.validateRoomName = function(roomname){
  if(!roomname) return false;
  if(roomname.length<6 || roomname.length>15) return false;
  if( roomname == 'login' || roomname == 'upload' || roomname == 'logout' || roomname == 'authdone' || roomname == 'like' || roomname == 'unlike' ) return false;
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

exports.getInteger24At = function(buf, bigEndian) {//{{{
  var byte1 = buf[0];
  var	byte2 = buf[1];
  var byte3 = buf[2];

  var intresult = bigEndian ? 
			((((byte1 << 8) + byte2) << 8) + byte3)
			: ((((byte3 << 8) + byte2) << 8) + byte1);
		if (intresult < 0) intresult += 16777216;
		return intresult;
}//}}}

exports.getLongAt = function(buf, bigEndian){//{{{
  var byte1 = buf[0]
  var byte2 = buf[1]
  var byte3 = buf[2]
  var byte4 = buf[3]

	var longResult = bigEndian ? 
			(((((byte1 << 8) + byte2) << 8) + byte3) << 8) + byte4
			: (((((byte4 << 8) + byte3) << 8) + byte2) << 8) + byte1;
		if (longResult < 0) longResult += 4294967296;
		return longResult;
}//}}}

exports.readSynchsafeInteger32At = function(data) {//{{{
  var size1 = data[0]//data.getByteAt(offset);
  var size2 = data[1]//data.getByteAt(offset+1);
  var size3 = data[2]//.getByteAt(offset+2);
  var size4 = data[3]//.getByteAt(offset+3);
  // 0x7f = 0b01111111
  var size = size4 & 0x7f | ((size3 & 0x7f) << 7) | ((size2 & 0x7f) << 14) | ((size1 & 0x7f) << 21);
  return size;
}//}}}

var isBitSetAt = function(thebyte, bitnum) {//{{{
  return (thebyte & (1 << bitnum)) != 0;
}//}}}

exports.readUTF16String = function(bytes, bigEndian, maxBytes) {//{{{
  var ix = 0;
  var offset1 = 1, offset2 = 0;
  maxBytes = Math.min(maxBytes||bytes.length, bytes.length);
  if( bytes[0] == 0xFE && bytes[1] == 0xFF ) {
    bigEndian = true;
    ix = 2;
  } else if( bytes[0] == 0xFF && bytes[1] == 0xFE ) {
    bigEndian = false;
    ix = 2;
  }
  if( bigEndian ) {
    offset1 = 0;
    offset2 = 1;
  }

  var arr = ""//[];
  for( var j = 0; ix < maxBytes; j++ ) {
    var byte1 = bytes[ix+offset1];
    var byte2 = bytes[ix+offset2];
    var word1 = (byte1<<8)+byte2;
    ix += 2;
    if( word1 == 0x0000 ) {
      break;
    } else if( byte1 < 0xD8 || byte1 >= 0xE0 ) {
      arr += String.fromCharCode(word1)
    } else {
      var byte3 = bytes[ix+offset1];
      var byte4 = bytes[ix+offset2];
      var word2 = (byte3<<8)+byte4;
      ix += 2;
      arr += String.fromCharCode(word1, word2); 
    }
  }
  return arr;
}//}}}
