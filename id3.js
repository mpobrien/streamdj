var sys = require('sys')
var util = require('util')

Buffer.prototype.pointer = 0;
Buffer.prototype.reset = function(newpos){ this.pointer = newpos }
Buffer.prototype.getChunk = function(numbytes){//{{{
    if( this.pointer + numbytes >= this.length + 1 ) return null;
    return this.slice(this.pointer, (this.pointer+=numbytes)); 
  }//}}}

var parseSize = function(data){//{{{
  if( data.length == 4 ){
    var size = data[0] << 0x15;
    size += data[1] << 14;
    size += data[2] << 7;
    size += data[3];
    return size;
  }else{
		var size = data[0] << 16;
		size += data[1] << 8;
		size += data[2];
    return size
  }
}//}}}

var v3Mappings = {
    "TPE1": "Artist",
    "TIT2": "Title",
    "TALB": "Album"
}

var v2Mappings = {
    "TP1": "Artist",
    "TT2": "Title",
    "TAL": "Album"
}

var getInteger24At = function(buf, bigEndian) {//{{{
  var byte1 = buf[0];
  var	byte2 = buf[1];
  var byte3 = buf[2];

  var intresult = bigEndian ? 
			((((byte1 << 8) + byte2) << 8) + byte3)
			: ((((byte3 << 8) + byte2) << 8) + byte1);
		if (intresult < 0) intresult += 16777216;
		return intresult;
}//}}}

var getLongAt = function(buf, bigEndian){//{{{
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

function readSynchsafeInteger32At(data) {//{{{
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

var readUTF16String = function(bytes, bigEndian, maxBytes) {//{{{
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

exports.extractId3 = function(buf){
  var tag = {};
  var headerCheck = buf.getChunk(3);
  try{ if(headerCheck.toString() != 'ID3') return; }catch(e){ return; }
  var versionInfo = buf.getChunk(2)
  var majorVer = versionInfo[0]
  var revision = versionInfo[1]
  var headerFlags = buf.getChunk(1)
  var headerSize = parseSize(buf.getChunk(4));
  var frameId, frameSize, frameHeaderSize;
  while(buf.pointer<=headerSize){
    if(majorVer == 2){
      frameID = buf.getChunk(3);
      frameSize = getInteger24At(buf.getChunk(3), true)
      frameHeaderSize = 6;
    }else if(majorVer == 3){
      frameID = buf.getChunk(4);
      frameSize = getLongAt(buf.getChunk(4), true)
      frameHeaderSize = 10;
    }else if(majorVer == 4){
      frameID = buf.getChunk(4);//getStringAt(frameDataOffset, 4);
      frameSize = readSynchsafeInteger32At(buf.getChunk(4));
      frameHeaderSize = 10;
    }
    if(majorVer > 2){
      var flags = buf.getChunk(2);
    }
    frameID = frameID.toString().replace(/\u0000/g,'')
    if( frameID.length == 0 ) break;
    if( majorVer >= 3 && !(frameID in v3Mappings) ) continue;
    if( majorVer == 2 && !(frameID in v2Mappings) ) continue;
    var textEncoding = buf.getChunk(1);
    var frameData = buf.getChunk(frameSize-1);
    var textData = (textEncoding[0]==1 ? readUTF16String(frameData) : frameData.toString());
    textData = textData.replace(/\u0000/g,'') 
    if( textData.length > 0 ){
      if( majorVer >= 3){
        tag[v3Mappings[frameID]] = textData
      }else{
        tag[v2Mappings[frameID]] = textData
      }
    }
  }

  if( !('Artist' in tag || 'Album' in tag || 'Title' in tag) ){
    try{
      var oldId3 = getId3Tag(buf);
      if(!('Artist' in tag))
        tag['Artist'] = oldId3.artist;
      if(!('Album' in tag))
        tag['Album'] = oldId3.album;
      if(!('Title' in tag))
        tag['Title'] = oldId3.title;
    }catch(e){
      return;
    }
  }
  return tag;
}

var getId3v1Tag = function(buffer){//{{{
  buffer.reset(buffer.length - tagSize);
  var tagSize = 128;
  buffer.pointer = buffer.length - tagSize;
  //sys.puts(buffer.length);
  return { tag: buffer.getChunk(3).toString().replace(/\u0000/g,''),        
           title: buffer.getChunk(30).toString("ascii").replace(/\u0000/g,''),  
           artist: buffer.getChunk(30).toString("ascii").replace(/\u0000/g,''),
           album: buffer.getChunk(30).toString("ascii").replace(/\u0000/g,''),
           year: buffer.getChunk(4).toString("ascii").replace(/\u0000/g,''), 
           comment: buffer.getChunk(30).toString("ascii").replace(/\u0000/g,''),
           genre: buffer.getChunk(1).toString("ascii").replace(/\u0000/g,'')
         }
}//}}}

