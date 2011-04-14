/* Utility function for padding zeros into numeric strings. */
var makeTimestamp = function(rawtime){
  var timestamp = new Date(rawtime);
  var pad = function(num, length){ var str = '' + num; while (str.length < length) str = '0' + str; return str; }
  return pad(timestamp.getHours(),2) + ":" + pad(timestamp.getMinutes(),2)
}//}}}

var MessageHandlers = {

  "chat"   : function(message, isStatic) {//{{{
    var from = message['from']
    var body = message['body']
    var time = message['time']
    var newMessageHtml = $('<div class="message"></div>"').attr("id",message["id"])
                          .append( $('<span class="timestamp"></span>').text(makeTimestamp(time)) )
                          .append( $('<span class="from"></span>').text(from + ":") )
                          .append( $('<span class="message"></span>').html(linkify(body)) )
                          .appendTo("#chat");
  },//}}}

  "enq"    : function(message, isStatic){//{{{
    //isStatic is ignored for now because server does not log these events
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

  "join"   : function(message, isStatic){//{{{
    //isStatic is ignored for now because server does not log these events
    var newMessageHtml = $('<div class="join"></div>"')
    newMessageHtml.attr("id",message["id"]);
    newMessageHtml.append( $('<span class="timestamp"></span>').text(makeTimestamp(message['time'])) )
    newMessageHtml.append( $('<span class="from"></span>').text(message['from']) )
    newMessageHtml.append( $('<span class="message"></span>').text("joined the room") )
    newMessageHtml.appendTo("#chat");
    if($('#user_' + message['from']).length==0){
      var newlistener = $('<li></li>');
      newlistener.attr('id', 'user_' + message['from'])
      newlistener.text(message['from'])
      newlistener.appendTo("#listenerslist");
    }
  },//}}}

  "left"   : function(message, isStatic){//{{{
    //isStatic is ignored for now because server does not log these events
    var newMessageHtml = $('<div class="join"></div>"');
    newMessageHtml.attr("id",message["id"]);
    newMessageHtml.append( $('<span class="timestamp"></span>').text(makeTimestamp(message['time'])) )
      .append( $('<span class="from"></span>').text(message['from']) )
      .append( $('<span class="message"></span>').text("left the room") )
      .appendTo("#chat");
    $('#user_'+ message['from']).remove();//eadeOut(30, function(){$(this).remove()})
  },//}}}

  "stopped": function(message, isStatic){//{{{
    //isStatic is ignored for now because server does not log these events
    var songId = message["songId"]
    $('#nowplayingtext').text('');
    $('#currentfile').html('<div class="right">the silence is deafening&hellip; :(</div><div class="right">upload something!</div>');
    $('#song_' + songId).hide('slide', function(){$(this).remove()} );
    oddify(); //TODO clean up
  },//}}}

  "started": function(message, isStatic){//{{{
    var innerWrapper = $('<div></div>').attr("class","startplaywrapper")
    var enqDiv = $('<div></div>')
                   .attr("class","playstart")
                   .attr("id",message["id"])
                   .append( $('<div class="timestamp" style="float:left"></div>').text(makeTimestamp(message['time'])) )
                   .append(innerWrapper);

    $('#currentfile').html('');
    var nowPlayingInfo;
    if( message.meta ){
      if( 'Title' in message.meta){
        $('#currentfile').append($('<div></div>').attr("id","np_title").text(message.meta['Title']));
      }else{
        if( 'Artist' in message.meta){
          $('#currentfile').append($('<div></div>').attr("id","np_title").text('(Unknown)'));
        }else{
          $('#currentfile').append($('<div></div>').attr("id","np_title").text(message['body']));
        }
      }
      if( 'Artist' in message.meta){
        var npartist = $('<div></div>')
        npartist.attr("id","np_artist").append($('<span></span>').attr("class","by").text("by"))
                .append($('<span></span>').attr("class","artist").text(message.meta['Artist']))
        $('#currentfile').append(npartist)
      }

      if( 'Album' in message.meta){
        var npalbum = $('<div></div>')
        npalbum.attr("id","np_album").append($('<span></span>').attr("class","from").text("from"))
                                     .append($('<span></span>').attr("class","album").text(message.meta['Album'])); 
        $('#currentfile').append(npalbum)
      }
    }else{
      $('#currentfile').append($('<div></div>').attr("id","np_title").text(message['body']));
    }
    $('#currentfile').append($('<div></div>').attr("id","uploaderinfo")
                             .append($('<span></span>').attr('class','upby').html('added&nbsp;by'))
                             .append($('<span></span>').attr('class','uploader').text(message['from'])))

    if(message.meta && 'Title' in message.meta){
      innerWrapper.append($('<span></span>').attr("class","title").text(message.meta['Title']))
      if(message.meta && 'Artist' in message.meta){
        innerWrapper.append($('<span></span>').attr("class","by").text("by"))
        innerWrapper.append($('<span></span>').attr("class","artist").text(message.meta['Artist']))
      }
    }else{
      innerWrapper.append($('<span></span>').attr("class","title").text(message['body']))
    }
    innerWrapper.append($('<span></span>').attr('class','upby').html('added&nbsp;by'))
    innerWrapper.append($('<span></span>').attr('class','uploader').text(message['from']))
    innerWrapper.append($('<span></span>').attr('class','startedplaying').html("started playing"))
    enqDiv.appendTo("#chat");
                      
    if(!isStatic){
      $('#nowplayingtext').text(message['body']);
      var songId = message["songId"]
      $('#song_' + songId).hide('slide', function(){$(this).remove()});
      oddify(); //TODO clean up
    }
  }//}}}

}
