window.linkify =//{{{
(function(){var k="[a-z\\d.-]+://",h="(?:(?:[0-9]|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}(?:[0-9]|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])",c="(?:(?:[^\\s!@#$%^&*()_=+[\\]{}\\\\|;:'\",.<>/?]+)\\.)+",n="(?:ac|ad|aero|ae|af|ag|ai|al|am|an|ao|aq|arpa|ar|asia|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|biz|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|cat|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|coop|com|co|cr|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|edu|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gov|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|info|int|in|io|iq|ir|is|it|je|jm|jobs|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mil|mk|ml|mm|mn|mobi|mo|mp|mq|mr|ms|mt|museum|mu|mv|mw|mx|my|mz|name|na|nc|net|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|org|pa|pe|pf|pg|ph|pk|pl|pm|pn|pro|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tel|tf|tg|th|tj|tk|tl|tm|tn|to|tp|travel|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|xn--0zwm56d|xn--11b5bs3a9aj6g|xn--80akhbyknj4f|xn--9t4b11yi5a|xn--deba0ad|xn--g6w251d|xn--hgbk6aj7f53bba|xn--hlcj6aya9esc7a|xn--jxalpdlp|xn--kgbechtv|xn--zckzah|ye|yt|yu|za|zm|zw)",f="(?:"+c+n+"|"+h+")",o="(?:[;/][^#?<>\\s]*)?",e="(?:\\?[^#<>\\s]*)?(?:#[^<>\\s]*)?",d="\\b"+k+"[^<>\\s]+",a="\\b"+f+o+e+"(?!\\w)",m="mailto:",j="(?:"+m+")?[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@"+f+e+"(?!\\w)",l=new RegExp("(?:"+d+"|"+a+"|"+j+")","ig"),g=new RegExp("^"+k,"i"),b={"'":"`",">":"<",")":"(","]":"[","}":"{","B;":"B+","b:":"b9"},i={callback:function(q,p){return p?'<a href="'+p+'" title="'+p+'" target="_blank">'+q+"</a>":q},punct_regexp:/(?:[!?.,:;'"]|(?:&|&amp;)(?:lt|gt|quot|apos|raquo|laquo|rsaquo|lsaquo);)$/};return function(u,z){z=z||{};var w,v,A,p,x="",t=[],s,E,C,y,q,D,B,r;for(v in i){if(z[v]===undefined){z[v]=i[v]}}while(w=l.exec(u)){A=w[0];E=l.lastIndex;C=E-A.length;if(/[\/:]/.test(u.charAt(C-1))){continue}do{y=A;r=A.substr(-1);B=b[r];if(B){q=A.match(new RegExp("\\"+B+"(?!$)","g"));D=A.match(new RegExp("\\"+r,"g"));if((q?q.length:0)<(D?D.length:0)){A=A.substr(0,A.length-1);E--}}if(z.punct_regexp){A=A.replace(z.punct_regexp,function(F){E-=F.length;return""})}}while(A.length&&A!==y);p=A;if(!g.test(p)){p=(p.indexOf("@")!==-1?(!p.indexOf(m)?"":m):!p.indexOf("irc.")?"irc://":!p.indexOf("ftp.")?"ftp://":"http://")+p}if(s!=C){t.push([u.slice(s,C)]);s=E}t.push([A,p])}t.push([u.substr(s)]);for(v=0;v<t.length;v++){x+=z.callback.apply(window,t[v])}return x||u}})();//}}}
var favoritesopen = false;

scplay = function(url){
  soundcloud.getPlayer('yourPlayerId').api_load(url);
}

//var cursor = lastMsgId;
function timeSince(date) {//{{{
  var seconds = Math.floor((new Date() - date) / 1000);
  var interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + " years";
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months";
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days";
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours";
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes";
  return Math.floor(seconds) + " seconds";
}//}}}

var pendinguploads = 0;
var muted;
var currentVolume;
var generateTwitterMsg = function(songInfo){
  description = "Come play music with us in " + roomname + "! "
  if( songInfo.Title && songInfo.Title!='(Unknown)'){
    description += songInfo.Title;
    if( songInfo.Artist && songInfo.Artist != '(Unknown)'){
      description += ' - ' + songInfo.Artist;
    }
  }
  return description;
}   

function bit_url(url, callback) { 
  var url=url;
  var username="outloudfm";
  var key="R_9f80d2bb72c762594c204fa44ca836c8";
  $.ajax({ url:"http://api.bit.ly/v3/shorten", data:{longUrl:url,apiKey:key,login:username}, dataType:"jsonp",           
           success:function(v){
             var bit_url=v.data.url;
             callback(bit_url)
           }
  });
}
var appendGreeting = function(){
  $('#chat').append($('<div class="greeting"><div style="font-style:bold;">Welcome to your shiny new room!</div><div>Invite some friends! <span class="fbinvite"><img src="/static/facebook_small.png"/></span> <span class="twinvite" style="cursor:pointer;"><img src="/static/twitter_small.png"/></span></div><div>Or copy and paste this URL: <span class="roomlink">http://outloud.fm/' + roomname +'</span></div></div>'))
}

var extractCookie = function(cstring, c_name){
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


var droptarget ;
var likedIds = {};
/* Drag and drop */
var ProgressBar = function(){//{{{
  this.outer = $('<div class="progressContainer">')
  this.inner = $('<div class="progressBar">')
  this.inner.appendTo(this.outer)
  var that = this;
  var done = false;
  this.update = function(pct){
    if( pct == 100 ){ 
      that.inner.animate({'width':pct + '%'}, 100, function(){
        that.finish();
      });
    }else{
      that.inner.animate({'width':pct + '%'}, 100) 
    }
  }
  this.finish = function(x){
    if (!done){
      pendinguploads--;
      done = true;
      that.outer.fadeOut(function(){$(this).remove()});
    }
  }
}//}}}
var handleFiles = function(files){//{{{
  if( files.length + pendinguploads > 5 ){
    alert("Sorry, you're limited to upload up to 5 files at once.");
    return;
  }
  numinqueue = $('.delsong').length;
  if( numinqueue >= 5){
    alert("Sorry, you've already got 5 songs in the queue already! Let one play before uploading more.");
    return;
  }
  for( var fn in files ){
    var file = files[fn];
    if( !file.fileSize ) continue;
    if( file.fileSize > 1024 * 1024 * 20){
      alert("Files may be no larger than 20 megs each.");
      continue;
    }
    pendinguploads++;
    var qxhr = new XMLHttpRequest();
    var progbar = new ProgressBar();
    $('#progress').append(progbar.outer)
    qxhr.onreadystatechange = function(){}
    qxhr.upload.onerror = function(e){ /*console.debug("error", e);*/ }
    qxhr.upload.onloadstart = function(e){ /*console.debug("loadstart", e);*/ }
    qxhr.upload.onprogress = function makeupdater(bar){
        return function(e){
            /*console.debug(e);*/
          var pct = parseInt((e.loaded / e.totalSize) * 100);
          bar.update(pct);
        }
    }(progbar);
    qxhr.onload = progbar.finish;
    var url = "/" + roomname + "/upload"
        /*console.debug("url",url)*/
    qxhr.open("POST","/" + roomname + "/upload", true);
    qxhr.setRequestHeader('Content-Type', 'multipart/form-data');
    qxhr.setRequestHeader("X-File-Name", file.fileName);
    qxhr.send(file);
  }
}//}}}

/* Message handling */
function processMessage(message, isStatic){//{{{
  console.log("processing", isStatic);
  if( !message ) return;
  if( !('type' in message) ) return;
  var type = message.type;
  var handler = MessageHandlers[type]
  if(handler){
    handler(message, isStatic);
  }
}//}}}

/* Message Receiving */
var sendMessage = function(){//{{{
  var msgtext = $('#newchat').val()
  msgtext = $('<div/>').text(msgtext).html();
  //$.getJSON('/' + roomname + '/send/', {'m':msgtext}, function(json){});
  ws.send(msgtext);
  var objDiv = document.getElementById("chat");
  objDiv.scrollTop = objDiv.scrollHeight;
  $('#newchat').val('');
}//}}}

var removeSongFromQueue = function(songId){
  $.get( '/' + roomname + '/remove', {s:songId}, function(){})
}

var oddify = function(){
  var songs = $('.queuedsong');
  /*console.debug(songs);*/
  for( var i=0;i<songs.length;i++){
    var song = songs[i]
    if( i % 2 > 0 ){
      $(songs[i]).removeClass("odd");
    }else{
      $(songs[i]).addClass("odd");
    }
  }
}

function setVol(v){
  soundManager.setVolume('mySound', v);
  $('#volinside').css('width', v + '%')
  document.cookie = "olvol_" + roomname + "=" + v;
}

function loadFavGenerator(pn){
 return function(){
   loadFavorites(pn);
 }
}
function loadFavorites(pageNum, doSlide){
 var pageNum = parseInt(pageNum);
 $('#favelist').html('')
 $('#favepages').html('');
 $.getJSON('/favorites/', {p:pageNum}, function(data){
   if(!data.faves || data.numFavorites == 0){
     $('#nofaves').show();
     $('#favesheader').text("Favorites (0)")
   }else{
     var numfavorites = data.numFavorites;
     if(!numfavorites) numfavorites = 0;
     $('#favesheader').text("Favorites (" + numfavorites + ")")
     var numPages = Math.ceil(data.numFavorites / 10 );
     data.page = parseInt(data.page);
     if( numPages > 1){
       if( data.page > 0 ){
         var prevlink = $('<li class="favepagelink">&larr;</li>');
         prevlink.click(loadFavGenerator(data.page-1));
         $('#favepages').append(prevlink);
       }else{
         $('#favepages').append($('<li class="favepagelink">&nbsp;</li>'));
       }
       for(var i=0;i<numPages;i++){
         var nli = $('<li class="favepagelink">' + (i+1) + '</li>')
         if( i==data.page ) nli.attr('id',"curpage");
         else{
          nli.click(loadFavGenerator(i));
         }
         $('#favepages').append(nli);
       }
       if( data.page != numPages-1 ){
         var nextlink = $('<li class="favepagelink">&rarr;</li>');
         nextlink.click(loadFavGenerator(parseInt(data.page)+1));
         $('#favepages').append(nextlink);
       }
     }
     
     $('#nofaves').hide();
     var count = 0;
     $.each(data.faves, function(key, message){
       count++;
       if(!message) return;
       var wrapper = $('<div class="favwrapper' + (count%2>0 ? ' odd':'') + '"></div>');
       var newli = $('<div class="favorite_entry"></div>');
       if( count == 1 ) wrapper.addClass("first");
       if( count == 10 ) wrapper.addClass("last");
       //var unfavorite = $('<div class="unfavorite"><img src="/static/heart.png"/></div>');
       var unfavorite = $('<div class="heartbox on">&nbsp;</div>');
       $(unfavorite).data('songId', message['songId']);
       if( 'Title' in message){
         newli.append($('<div class="fav_line"></div>').append(
           $('<span></span>').attr("class","title").text(message['Title']))
         )
       }
       if( 'Artist' in message){
         newli.append($('<div class="fav_line"></div>').append(
           $('<span></span>').attr("class","meta").text("by")).append(
           $('<span></span>').attr("class","artist").text(message['Artist'])))
       }
       if( 'Album' in message){
         newli.append($('<div class="fav_line"></div>').append(
          $('<span class="meta">from</span>')).append(
          $('<span></span>').attr("class","artist").text(message['Album'])
         ))
       }
       unfavorite.appendTo(wrapper)
       newli.appendTo(wrapper);
       wrapper.appendTo('#favelist');
       $('<div class="clearer"></div>').appendTo(wrapper);
     })
   }
   if( doSlide ){
     //$('#favorites').show('slide', 'fast', function(){
       //favoritesopen = true;
     //});
   }
 })
}


var isBlurred = false;
var unreadCount = 0;

/* GUI hooks setup */
$(document).ready(function(){
  $(window).blur( function(){
    isBlurred = true;
  }).focus( function(){
    unreadCount = 0;
    document.title = roomname + " - outloud.fm"
    isBlurred = false;
  })

  setInterval(setSongProgress, 500);

  droptarget = document.getElementById("queueholder"); 
  var y;
  while(y = msgs.pop()){
    if(y.messages){
    /*for( var i=0;i<y.messages.length;i++ ){*/
    /*processMessage(y.messages[i], true);*/
    /*}*/
    }else{
      processMessage(y, true);
    }
  }
  var objDiv = document.getElementById("chat");
  objDiv.scrollTop = objDiv.scrollHeight;
  $('#newchat').keypress( function(e){
    if(e.keyCode==13 && $(this).val().length > 0 ){
      sendMessage();
    } 
  })
  $('#nowplaying_skip').click(
    function(){
      $.get( '/' + roomname + '/skip/', {s:$.data(this,"songId")}, function(){
      });
    }
  );

  $('.queue').live('click',
  function(div){
    $.get( '/' + roomname + '/scqueue/', {t:$.data(this,"id")}, function(){
    });
  });

  $('.preview').live('click',function(div){
    if( currentlyPlaying ){
      $(currentlyPlaying).removeClass('scplaying').addClass('notplaying')
    }
    currentlyPlaying = this;
    $(this).addClass('scplaying').removeClass('notplaying');
    var scid = soundManager.getSoundById('previewsound');
    var soundurl = "http://api.soundcloud.com/tracks/" + $(this).data('id') + "/stream?client_id=" + sc_clientId;
    console.log(soundurl);
    console.log(scid);
    if( scid ){
      console.log("here");
      scid.load({url: soundurl});
      scid.setPosition(0);
      scid.play();
    }else{
      console.log("here2");
      scid = soundManager.createSound({id:'previewsound',url:soundurl, autoPlay:true});
    }
    //soundcloud.getPlayer('yourPlayerId').api_load($(this).data('url'));
  })


   $('.delsong').live('click',
     function(div){
       var songId = $(this).attr("id").split("_")[1];
       var answer = confirm("Are you sure you want to delete this song from the queue?");
       if(answer){
         removeSongFromQueue(songId);
       }
     });

  $('#settingscog').live({
    mouseenter: function(){
      $(this).addClass("c_hover");
    },

    mouseleave: function(){
      if(!$('#settingsmenu').is(':visible')){
        $(this).removeClass("c_hover");
      }
    }, 

    click: function(event){
      if(document.getElementById('settingsmenu').className != 'menuhidden'){
        $('#settingsmenu').addClass('menuhidden');
        $(this).removeClass("c_hover");
      }else{
        $(this).add("c_hover");
        var cogposition = $('#settingscog').position();
        $('#settingsmenu').css('left', cogposition.left + 'px').css('top', cogposition.top + 24 +  'px');
        $('#settingsmenu').attr('class','');
      }
    }
  });

  /*$('#settingscog').live('click', function(event){*/
  /*var cogposition = $('#settingscog').position();*/
  /*//$('#settingsmenu').position({left:cogposition.left + 'px', top:cogposition.top + 24 + 'px'});*/
  /*$('#settingsmenu').css('left', cogposition.left + 'px').css('top', cogposition.top + 24 +  'px').show();*/
  /*event.stopPropagation();*/
  /*});*/

  $('html').click(function(event) {
    if($('#settingsmenu').is(':visible')){
      $('#settingsmenu').addClass('menuhidden');
      $('#settingscog').removeClass("c_hover");
      event.stopPropagation();
    }
  });

  $('#faveslink').click(function(){
    if( favoritesopen ){
       $('#favorites').hide('slide', 'fast',function(){
         favoritesopen = false;
         $('#player').show('slide', 'fast');
       });
    }else{
       $('#player').hide('slide', 'fast',function(){
         favoritesopen = true;
         loadFavorites(0, true);
         $('#favorites').show('slide', 'fast');
       });
    }
  });

   $('#closefavorites').click(function(){
     $('#favorites').hide('slide', 'fast',function(){
       favoritesopen = false;
       $('#player').show('slide', 'fast');
     });
   });

   /*
  function getMessages() {
    $.getJSON('/' + roomname + '/listen', {"c":cursor}, function(json){
      if(json.m){
        for(var i=0;i<json.m.length;i++){
          var item = $.parseJSON(json.m[i])
          processMessage(item, false);
        }
      }else{
        processMessage(json, false);
      }
      cursor = (parseInt(json.id)+1) + '';
      getMessages();
      var objDiv = document.getElementById("chat");
      objDiv.scrollTop = objDiv.scrollHeight;
    }).error(function(){
      //retry in 5 seconds;
      setTimeout( getMessages, 5000);
    })
  }
  setTimeout( getMessages, 500);
  */


  currentVolume = 90;

  var muteToggle = function(setOn){
    if( setOn === undefined){
      muted = !muted;
    }else{
      muted = setOn>0;// ? true : false;
    }
    document.cookie = "olmute_" + roomname + "=" + (muted ? 1 : 0)
    $('#volinside').css('width', muted ? '0%' : currentVolume + '%');
    if (muted) {
      soundManager.setVolume('mySound', 0);
      $('#volicon').addClass( muted ? "muted" : "notmuted").removeClass(muted ? "notmuted" : "muted");
    } else {
      soundManager.setVolume('mySound', currentVolume);
      $('#volicon').addClass("notmuted").removeClass("muted");
    }
  }


  var roomvolinitial = extractCookie(document.cookie, "olvol_" + roomname);
  if(roomvolinitial != undefined){
    currentVolume = roomvolinitial;
    setVol(roomvolinitial);
  }

  var mutedInitial = extractCookie(document.cookie, "olmute_" + roomname);
  if(mutedInitial){
    muteToggle(mutedInitial);
  }

  $('#volcontrol').click(
    function(e){
      var x = e.pageX - $(this).offset().left;
      var pct = parseInt((x * 100) / 140)
      currentVolume = pct;
      if(muted) muteToggle(false)
      setVol(pct);
    }
  );

  $('#volicon').click(function(){
    muteToggle();
  });


  function dragEnter(evt){
    evt.stopPropagation();
    evt.preventDefault();
    return false;
  }

  function dragExit(evt){
    evt.preventDefault();
    evt.stopPropagation();
    $('#queueheading').removeClass("highlight");
    return false;
  }

  function dragOver(evt){
    evt.preventDefault();
    evt.stopPropagation();
    $('#queueheading').addClass("highlight");
    return false;
  }

  function drop(evt){
    evt.preventDefault();
    evt.stopPropagation();
    $('#queueheading').removeClass("highlight");
    var files = evt.dataTransfer.files;
    var count = files.length;
    if( count == 0 ) return;
    handleFiles(files)
    return false;
  }

  document.addEventListener("drop", drop, false);
  document.addEventListener("dragenter", dragEnter, false);
  document.addEventListener("dragleave", dragExit, false);
  document.addEventListener("dragover", dragOver, false);
  /*droptarget.addEventListener("drop", drop, false);*/
  /*droptarget.addEventListener("dragenter", dragEnter, false);*/
  /*droptarget.addEventListener("dragleave", dragExit, false);*/
  /*droptarget.addEventListener("dragover", dragOver, false);*/
  
  oddify();
  $('.heartbox').live({
    mouseenter: function(){
      if( !$(this).hasClass('on') ){ // not liked yet
        $(this).addClass("hover");
      }else{}
    },
    mouseleave: function(){
      if( !$(this).hasClass('on') ){ // not liked yet
        $(this).removeClass("hover");
      }
    }, 

    click: function(){
      var me = this;
      if( !$(this).hasClass('on') ){
        $.get( '/like/', {s:$.data(this,"songId")}, function(){
          $(me).removeClass('off').removeClass('hover').addClass('on');
        });
      }else{
        $.get( '/unlike/', {s:$.data(this,"songId")}, function(){
          $(me).removeClass('on').removeClass('hover').addClass('off');
        });
      }
    }
  });

  ws = new WebSocket(wsurl);

  ws.onmessage = function(message){
    if(message.data=='1'){ return; }
    //var msgs = $.parseJSON(message.data);
    var jsonMessage = $.parseJSON(message.data)
    processMessage(jsonMessage, false);
    /*if( jsonMessage.type == 'chat' && countmsgs){*/
    /*newMessageCount++;*/
    /*document.title = "(" + newMessageCount + ") outloud.fm";*/
    /*}*/
  };

  ws.onopen = function(){
    ws.send("auth:" + document.cookie);
    setInterval(function(){ ws.send("0") }, 45000);
  }

})//}}}

function doFbInvite(){
  var fburl = 'http://www.facebook.com/dialog/feed?';
  fburl += 'link=' + escape('http://outloud.fm/' + roomname)
  fburl += '&app_id=123006794442539&'
  var imageUrl = escape('http://outloud.fm/static/ol_med.png');
  if(nowplayingMeta){
    if('pic' in nowplayingMeta){
      imageUrl = 'http://s3.amazonaws.com/albumart-outloud/art/' + encodeURIComponent(nowplayingMeta.pic);
    }else if('picurl' in nowplayingMeta){
      imageUrl = escape(nowplayingMeta.picurl);
    }
  }
  fburl += '&picture=' + imageUrl
  if( nowplayingMeta ){
    fburl += '&name=%E2%99%AB%20' + escape( " Now playing in " + roomname + ": ") + '%E2%99%AB%20'
  }else{
    fburl += '&name=' + escape(roomname + " on outloud.fm")
  }
  fburl += '&message=' + escape('Come play music with me in ' + roomname + ' on outloud.fm!')
  if( nowplayingMeta ){
    fburl += '&caption=' + escape(nowplayingMeta.Title)
    fburl += '&description=' + escape('by ' + nowplayingMeta.Artist)
  }
  fburl += '&redirect_uri=http://outloud.fm/postdone'
  var windowOptions = 'scrollbars=yes,resizable=yes,toolbar=no,location=yes'
  var width = 960
  var height = 420
  var winHeight = screen.height
  var winWidth = screen.width;
  left = Math.round((winWidth / 2) - (width / 2));
  top = 0;
  if (winHeight > height) {
    top = Math.round((winHeight / 2) - (height / 2));
  }
  window.open(fburl, 'intent', windowOptions + ',width=' + width + ',height=' + height + ',left=' + left + ',top=' + top); 
}

var doTwitterinvite = function(){
  var windowOptions = 'scrollbars=yes,resizable=yes,toolbar=no,location=yes'
  var width = 550
  var height = 420
  var winHeight = screen.height
  var winWidth = screen.width;
  left = Math.round((winWidth / 2) - (width / 2));
  top = 0;

  if (winHeight > height) {
    top = Math.round((winHeight / 2) - (height / 2));
  }
  var message;
  if( nowplayingMeta ){
    var message = "Come play music with me! ";
    var nowplayingmessage = "Now playing in " + roomname + ": " + nowplayingMeta.Title + ' by ' + nowplayingMeta.Artist
    bit_url('http://outloud.fm/' + roomname, function(shorturl){
      var totalmsg = message + nowplayingmessage + " " + shorturl
      if(totalmsg.length > 140){
        var outmsg = message + nowplayingmessage
        outmsg = escape(outmsg.substring(0, outmsg.length - (totalmsg.length - 135) )) + "%E2%80%A6" + escape(" " + shorturl);
        window.open('http://twitter.com/intent/tweet?text=' + outmsg, 'intent', windowOptions + ',width=' + width + ',height=' + height + ',left=' + left + ',top=' + top);
      }else{
        window.open('http://twitter.com/intent/tweet?text=' + escape(totalmsg), 'intent', windowOptions + ',width=' + width + ',height=' + height + ',left=' + left + ',top=' + top);
      }
    })
  }else{
    var message = "Come play music with me in " + roomname + " on #outloudfm - http://outloud.fm/" + roomname
    window.open('http://twitter.com/intent/tweet?text=' + escape(message), 'intent', windowOptions + ',width=' + width + ',height=' + height + ',left=' + left + ',top=' + top);
  }
}


