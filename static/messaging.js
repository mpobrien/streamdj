/* Utility function for padding zeros into numeric strings. */
var makeTimestamp = function(rawtime){
  var timestamp = new Date(rawtime);
  var pad = function(num, length){ var str = '' + num; while (str.length < length) str = '0' + str; return str; }
  return pad(timestamp.getHours(),2) + ":" + pad(timestamp.getMinutes(),2)
}//}}}

var MessageHandlers = {

  "chat"   : function(message) {//{{{
    var from = message['from']
    var body = message['body']
    var time = message['time']
    var newMessageHtml = $('<div class="message"></div>"').attr("id",message["id"])
                          .append( $('<span class="timestamp"></span>').text(makeTimestamp(time)) )
                          .append( $('<span class="from"></span>').text(from + ":") )
                          .append( $('<span class="message"></span>').html(linkify(body)) )
                          .appendTo("#chat");
  },//}}}

  "enq"    : function(message){//{{{
    var songId = message["songId"]
    //newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ' </b> added <span class="filename">' +  safebody + '</span> to the queue.</div>')
    var songLi = $('<li></li>').attr("class","queuedsong").attr('id','song_' + songId)
    var useFilename = true;
    if(message.meta && 'Title' in message.meta){
      songLi.append($('<span></span>').attr("class","title").text(message.meta['Title']))
      if(message.meta && 'Artist' in message.meta){
        songLi.append($('<span></span>').attr("class","by").text("by"))
        songLi.append($('<span></span>').attr("class","artist").text(message.meta['Artist']))
      }
    }else{
      songLi.append($('<span></span>').attr("class","title").text(message['body']))
    }
    songLi.append($('<span></span>').attr('class','upby').html('added&nbsp;by'))
    songLi.append($('<span></span>').attr('class','uploader').text(message['from']))
    songLi.hide().appendTo("#queueList").show("slide").show("highlight",3000);
  },//}}}

  "join"   : function(message){
    var newMessageHtml = $('<div class="join"></div>"').attr("id",message["id"])
                          .append( $('<span class="timestamp"></span>').text(makeTimestamp(message['time'])) )
                          .append( $('<span class="from"></span>').text(message['from']) )
                          .append( $('<span class="message"></span>').text("joined the room") )
                          .appendTo("#chat");
  },

  "left"   : function(message){
    var newMessageHtml = $('<div class="join"></div>"').attr("id",message["id"])
                          .append( $('<span class="timestamp"></span>').text(makeTimestamp(message['time'])) )
                          .append( $('<span class="from"></span>').text(message['from']) )
                          .append( $('<span class="message"></span>').text("left the room") )
                          .appendTo("#chat");
  },
  "stopped": function(message){
    var songId = message["songId"]
    $('#nowplayingtext').text('');
    $('#song_' + songId).hide('slide');
  },
  "started": function(message){
    ///newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safebody + ' </b> started playing.</div>')
    if(message.meta){
      if('Artist' in message.meta && 'Album'  in message.meta && 'Title' in message.meta){
        $('#np_name').addClass("notshown");
        $('#np_title').text(message.meta['Title']).removeClass('notshown')
        $('#np_artist').text(message.meta['Artist']).removeClass('notshown')
        $('#np_album').text(message.meta['Album']).removeClass('notshown') 
      }else{
        $('#np_title, #np_album,#np_artist').addClass("notshown");
      }
    }
    $('#nowplayingtext').text(message['body']);
    var songId = message["songId"]
    $('#song_' + songId).hide('slide');
  }

}
