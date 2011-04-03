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

exports.extractId3 = function(buf){
  var id3MarkerCheck = buf.getChunk(3);
  try{
    if(id3MarkerCheck.toString() != 'ID3') return;
  }catch(e){ return; }
  var version = buf.getChunk(2)[0]
  if(version != 2 && version != 3 ) return; 
  var flags = buf.getChunk(1)
  var headersize = parseSize(buf.getChunk(4));
  var result = {};
  if( version == 3 ){
    var counter = 0;
    while(counter<headersize){
      counter += 4
      var frameTag = buf.getChunk(4);
      counter += 4
      var frameTagSizeData = buf.getChunk(4);
      var frameTagSize = parseSize(frameTagSizeData);
      counter += 2;
      var frameFlags = buf.getChunk(2);
      counter += frameTagSize;
      var frameData = buf.getChunk(frameTagSize);
      if( frameTag in v3Mappings ){
        result[v3Mappings[frameTag]] = frameData.toString().replace(/\u0000/g,'');
      }else{
        //sys.puts("ignoring " + frameTag + " " + frameData);
      }
    }
  }else{
    var counter = 0;
    var counter = 0;
    while(counter<headersize){
      counter += 3
      var frameTag = buf.getChunk(3);
      counter += 3
      var frameTagSizeData = buf.getChunk(3);
      var frameTagSize = parseSize(frameTagSizeData);
      counter += frameTagSize;
      var frameData = buf.getChunk(frameTagSize);
      if( frameTag in v2Mappings ){
        result[v2Mappings[frameTag]] = frameData.toString().replace(/\u0000/g,'');
      }else{
        //sys.puts("ignoring " + frameTag);
      }
    }
  }
  if( !('Artist' in result || 'Album' in result || 'Title' in result) ){
    try{
      var oldId3 = getId3Tag(buf);
      sys.puts(util.inspect(oldId3));
      result['Artist'] = oldId3.artist;
      result['Album'] = oldId3.album;
      result['Title'] = oldId3.title;
    }catch(e){
      return;
    }
  }
  return result;
}


var getId3Tag = function(buffer){//{{{
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
