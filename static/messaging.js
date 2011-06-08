/* Utility function for padding zeros into numeric strings. */
var nowplayingId = null;
var nowplayingMeta = null;
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
      if( uidkey == message['uid'])
      songLi.append($('<div class="delsong">&nbsp;</div>').attr("id","delsong_" + songId))
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
    //newMessageHtml.attr("id",message["id"]);
    if(message.isnew){
      newMessageHtml.append( $('<span class="timestamp"></span>').text(makeTimestamp(message['time'])) )
      newMessageHtml.append( $('<span class="from"></span>').text(message['from']) )
      newMessageHtml.append( $('<span class="message"></span>').text("joined the room") )
      newMessageHtml.appendTo("#chat");
    }
    if($('#user_' + message['uid']).length==0){
      var newlistener = $('<li></li>');
      var newlistener_pic = $('<img src="' + message['body'] + '" width="24px" height="24px"></img>');
      var newlistener_name = $('<span class="username"></span');
      newlistener_name.text(message['from'])

      var listenerInfo = message['uid'].split('_')
      var listenerLink = $('<a></a>')
      listenerLink.attr('href', listenerInfo[0] =='tw' ? 'http://twitter.com/account/redirect_by_id?id=' + listenerInfo[1]
                                                      : 'http://facebook.com/profile.php?id=' + listenerInfo[1] )
      listenerLink.attr("target","_blank")
      listenerLink.append(newlistener_pic);
      newlistener.append(listenerLink);
      newlistener.append(newlistener_name);
      newlistener.attr('id', 'user_' + message['uid'])
      newlistener.appendTo("#listenerslist");
    }
  },//}}}

  "left"   : function(message, isStatic){//{{{
    //isStatic is ignored for now because server does not log these events
    var newMessageHtml = $('<div class="join"></div>"');
    newMessageHtml.attr("id",message["id"]);
    /*newMessageHtml.append( $('<span class="timestamp"></span>').text(makeTimestamp(message['time'])) )*/
    /*.append( $('<span class="from"></span>').text(message['from']) )*/
    /*.append( $('<span class="message"></span>').text("left the room") )*/
    /*.appendTo("#chat");*/
    $('#user_'+ message['uid']).remove();//eadeOut(30, function(){$(this).remove()})
  },//}}}

  "stopped": function(message, isStatic){//{{{
    //isStatic is ignored for now because server does not log these events
    var songId = message["songId"]
    $('#albumart').hide();
    $('#nowplayingtext').text('');
    $('#currentfile').removeClass("playing").html('<div class="right">the silence is deafening&hellip; :(</div><div class="right">upload something!</div>');
    $('#currentfile_opts').hide()
    $('#visualization').hide();
    $('#song_' + songId).hide('slide', function(){$(this).remove()} );
    nowplayingId = null;
    nowplayingMeta = null;
    $('#albumart').html('')
    $('#albumart').hide();
    oddify(); //TODO clean up
  },//}}}

  "started": function(message, isStatic){//{{{
    $('#nowplayingheart').removeClass("on").addClass("off");
    $('#thumbsdown').removeClass("t_on").addClass("t_off");
    var innerWrapper = $('<div></div>').attr("class","startplaywrapper")
    var enqDiv = $('<div></div>')
                   .attr("class","playstart")
                   .attr("id",message["id"])
                   .append( $('<div class="timestamp" style="float:left"></div>').text(makeTimestamp(message['time'])) )
                   .append(innerWrapper);

    $('#currentfile').html('')
    var nowPlayingInfo;
    nowplayingMeta = message.meta;
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

    var songId = message["songId"]
    if( message.meta && ('pic' in message.meta) && (!isStatic || (songId==nowplayingstart) )){
      $('#albumart').html('')
      var aimg = $('<img></img>');
      aimg.attr('src','http://s3.amazonaws.com/albumart-outloud/art/' + encodeURIComponent(nowplayingMeta.pic));
      aimg.attr('width','128')
      aimg.appendTo('#albumart');
      $('#albumart').show();
    }else{
      $('#albumart').html('')
      $('#albumart').hide();
    }

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
    $('#nowplayingheart').data("songId", songId);
    $('#thumbsdown').data("songId", songId);
    nowplayingId = songId

                      
    if(!isStatic){
      $('#currentfile').addClass("playing");
      $('#currentfile_opts').show();
      $('#visualization').show();
      $('#nowplayingtext').text(message['body']);
      $('#song_' + songId).hide('slide', function(){$(this).remove()});
      oddify(); //TODO clean up
    }
  },//}}}

  "qdel": function(message, isStatic){//{{{
    var songId = message["songId"]
    $('#song_' + songId).hide('slide', function(){$(this).remove()});
  }//}}}

}
