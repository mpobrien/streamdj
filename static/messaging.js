/* Utility function for padding zeros into numeric strings. */
var nowplayingMeta = null;
var nowplayingMessage = null;
var lastStoppedTime = null;
var makeText = function(){
  return document.createTextNode(' ');
}

var strip = function(s){
  return s.replace(/^\s+|\s+$/g, '') ;
}

var makeTimestamp = function(rawtime){
  var timestamp = new Date(rawtime);
  var pad = function(num, length){ var str = '' + num; while (str.length < length) str = '0' + str; return str; }
  return pad(timestamp.getHours(),2) + ":" + pad(timestamp.getMinutes(),2)
}//}}}

var bumpMessageCount = function(){
  if(isBlurred){
    unreadCount++;
    document.title = "(" + unreadCount + ") " + roomname + " - outloud.fm"
  }
}

var MessageHandlers = {

  "chat"   : function(message, isStatic) {//{{{
    var from = message['from']
    var body = message['body']
    var time = message['time']
    var newMessageHtml = $('<div class="chatmessage"></div>"').attr("id",message["id"])
                          .append( $('<div class="timestamp"></div>').text(makeTimestamp(time)) )
                          .append( $('<span class="sendername"></span>').text(from + ":") )
                          .append( $('<span class="messagebody"></span>').html(linkify(body)) )
                          .appendTo("#chat");
    var objDiv = document.getElementById("chat");
    objDiv.scrollTop = objDiv.scrollHeight;
    bumpMessageCount();
  },//}}}

  "liked"   : function(message, isStatic) {//{{{
    console.log(message);
    var songDiv = $('#s_' + message.songId);
    if(!songDiv) return;
    console.log("yo");
    favCounter = songDiv.find('.favcount');
    var countNum = message.body;
    var innerText = (countNum == 1 ? countNum + ' person favorited this': countNum + ' people favorited this')
    if( favCounter.length ){
      console.log(innerText);
      console.log(favCounter);
      favCounter.text(innerText); 
    }else{
      var newfavcount =  $('<div class="favcount"></div>').text(innerText).hide(); 
      songDiv.find('.feed_uploader_info').after(newfavcount);
      newfavcount.fadeIn();
      var objDiv = document.getElementById("chat");
      objDiv.scrollTop = objDiv.scrollHeight;
    }
  },//}}}

  "enq"    : function(message, isStatic){//{{{

    var songId = message["songId"]
    var songLi = $('<div class="queuedsong"></div>').attr('id','song_' + songId)
    var delsong = message['uid'] == uidkey ? $('<a class="delsong" id="delsong_' + songId + '" href="javascript:void(0)">(remove)</a>') : null;
    songLi.append($('<div class="songinfo"></div>')
      .append($('<div class="title"></div>').text(message.meta['Title']))
        .append($('<div class="artistinfo"></div>')
          .append($('<span class="meta">by</span>'))
          .append(makeText())
          .append($('<span class="artistname"></span>').text(message.meta['Artist']))
          .append(makeText())))
      .append($('<div class="uploaderinfo"></div>')
        .append($('<span class="uploader"></span>').text(message['from']))
        .append(makeText()))
      .append(delsong)
      .append($('<div class="clearer"> </div>'))
    songLi.hide().appendTo("#queuelisting").show("slide").show("highlight",1000);
    oddify();
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
      var newlistener = $('<div style="line-height:24px"></div>');
      var listenerInfo = message['uid'].split('_')
      if(listenerInfo[0] == 'tw'){
        var picpath = message['body']
      }else{
        var picpath = 'http://graph.facebook.com/' + listenerInfo[1] + '/picture/?type=square'
      }
      var newlistener_pic = $('<img src="' + picpath + '" width="24px" height="24px"></img>');
      var newlistener_name = $('<span class="username"></span');
      newlistener_name.text(message['from'])

      var listenerLink = $('<a></a>')
      listenerLink.attr('href', listenerInfo[0] =='tw' ? 'http://twitter.com/account/redirect_by_id?id=' + listenerInfo[1]
                                                      : 'http://facebook.com/profile.php?id=' + listenerInfo[1] )
      listenerLink.attr("target","_blank")
      listenerLink.append(newlistener_pic);
      newlistener.append(listenerLink);
      newlistener.append(newlistener_name);
      newlistener.attr('id', 'user_' + message['uid'])
      newlistener.appendTo("#listeners");
    }
    bumpMessageCount();
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
    lastStoppedTime = new Date();
    //isStatic is ignored for now because server does not log these events
    var songId = message["songId"]
    $('#albumart').hide();
    $('#nowplayingtext').text('');
    $('#currentfile').removeClass("playing").addClass("notplaying").html('<div class="right">the silence is deafening&hellip; :(</div><div class="right">upload something!</div>');
    $('#currentfile_opts').hide()
    $('#visualization').hide();
    $('#song_' + songId).hide('slide', function(){$(this).remove()} );
    nowplayingId = null;
    nowplayingMeta = null;
    $('#albumart').html('')
    $('#albumart').hide();
    oddify();
  },//}}}

  "started": function(message, isStatic){//{{{
    var nowtime = new Date().getTime();
    if(!isStatic && (lastStoppedTime == null || (nowtime - lastStoppedTime > 10000))){
      soundManager.destroySound('mySound');
      startStream();
    }
    $('#nowplayingheart').removeClass("on").addClass("off");
    //$('#thumbsdown').removeClass("t_on").addClass("t_off");
    var albumartDiv;
    if( message.meta && ('pic' in message.meta)){
      albumartDiv = $('<div id="albumartcol"></div>"')
                       .append($('<div class="albumart"></div>')
                        .append($('<img></img>').attr("width","60").attr("height","60")
                        .attr('src','http://s3.amazonaws.com/albumart-outloud/art/' + encodeURIComponent(message.meta.pic))))
    }else{
      albumartDiv = $('<div class="albumartspacer">&nbsp;</div>"')
    }
    albumartDiv.appendTo('#currentfile')
    var songId = message["songId"]
    var favCount = null;
    if( ('favecount_' + songId) in countsDict ){
      countNum = countsDict['favecount_' + songId]
      if(countNum > 0 ){
        favCount = $('<div class="favcount"></div>').text(countNum == 1 ? countNum + ' person favorited this': countNum + ' people favorited this');
      }
    }
    $('<div class="songmessage" id="s_' + songId + '">')
      .append($('<div class="timestamp"></div>"').text(makeTimestamp(message['time'])))
      .append(albumartDiv)
      .append($('<div></div>')
        .append($('<div class="feed_title"></div>').text(message.meta['Title']))
        .append($('<div class="feed_artist"></div>')
          .append($('<span class="meta">by</span>').append(makeText()))
          .append($('<span class="artist"></span>').text(message.meta['Artist'])))
        .append($('<div class="feed_uploader_info"></div>')
          .append($('<span class="meta">added by</span>').append(makeText()))
          .append($('<span class="uploader"></span>').text(message['from']).append(makeText())))
        .append(favCount)
        .append($('<div class="clearer"></div>')))
      .appendTo("#chat");
    var nowPlayingInfo;
    nowplayingMeta = message.meta;
    nowplayingMessage = message;
    var songId = message["songId"]
    nowplayingId = songId;
    $('#currentfile').html('<div id="albumartcol"><div id="currentfile_opts"><div class="optcontrol heartbox off" id="nowplaying_favorite"></div><div class="optcontrol c_off" id="settingscog">&nbsp;</div></div><div id="nowplayingart"></div></div>')
    $('#nowplaying_favorite').data("songId", songId); 
    $('#nowplaying_skip').data("songId", songId); 
    if(message['uid'] == uidkey) $('#nowplaying_skip').removeClass('disabled');
    else $('#nowplaying_skip').addClass('disabled')

    var nowPlayingInfo = $('<div id="nowplayinginfo"></div>');
    $('#currentfile').append(nowPlayingInfo);
    nowPlayingInfo
      .append( $('<div class="title"></div>').text(message.meta['Title']) )
      .append( $('<div class="artistinfo"></div>')
        .append( $('<span class="meta">by</span>').append(makeText()))
        .append( $('<span class="artistname"></span>').text(message.meta['Artist'])))
    if('meta' in message && 'Album' in message.meta && message.meta['Album'] != '(Unknown)'){
      nowPlayingInfo
        .append( $('<div class="albuminfo"></div>')
          .append( $('<span class="meta">from</span>').append(makeText()))
          .append( $('<span class="albumname"></span>').text(message.meta['Album'])))
    }
    nowPlayingInfo
      .append( $('<div class="np_uploaderinfo"></div>')
        .append( $('<span class="meta">added by</span>').append(makeText()))
        .append( $('<span class="uploader"></span>').text(message['from'])))
    if( !isStatic || (songId == nowplayingstart)){
      if( message.meta && ('pic' in message.meta)){
        albumartDiv = $('<img></img>').attr("width","128")
                        .attr('src','http://s3.amazonaws.com/albumart-outloud/art/' + encodeURIComponent(message.meta.pic))
                      .appendTo('#nowplayingart')
      }
    }
    $('#currentfile').addClass('playing').removeClass('notplaying');
    $('#currentfile').append($('<div class="clearer"> </div>'));
    $('#song_' + songId).hide('slide', function(){$(this).remove(); oddify()});
    var objDiv = document.getElementById("chat");
    objDiv.scrollTop = objDiv.scrollHeight;
  },//}}}

  "qdel": function(message, isStatic){//{{{
    var songId = message["songId"]
    $('#song_' + songId).hide('slide', function(){$(this).remove(); oddify()});
  }//}}}

}
