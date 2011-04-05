function pad(number, length) {
  var str = '' + number;
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
}

var ProgressBar = function(){
  this.outer = $('<div class="progressContainer">')
  this.inner = $('<div class="progressBar">')
  this.inner.appendTo(this.outer)
  var that = this;
  this.update = function(pct){
    if( pct == 100 ){ 
      that.inner.animate({'width':pct + '%'}, 100, function(){
      that.outer.fadeOut(function(){$(this).remove()});
      })
    }else{
      that.inner.animate({'width':pct + '%'}, 100) 
    }
  }
}

var handleFiles = function(files){
  for( var fn in files ){
    var file = files[fn];
    if( !file.fileSize ) continue;
    var reader = new FileReader();
    var qxhr = new XMLHttpRequest();
    var progbar = new ProgressBar();
    $('#progress').append(progbar.outer)
    qxhr.onreadystatechange = function(){ console.debug("readystate", this.readystate); }
    qxhr.upload.onerror = function(e){ console.debug("error", e); }
    qxhr.upload.onloadstart = function(e){ console.debug("loadstart", e); }
    qxhr.upload.onprogress = function makeupdater(bar){
        return function(e){
          var pct = parseInt((e.loaded / e.totalSize) * 100);
          bar.update(pct);
        }
    }(progbar);
    qxhr.open("POST","/upload", true);
    qxhr.setRequestHeader('Content-Type', 'multipart/form-data');
    qxhr.setRequestHeader("X-File-Name", file.fileName);
    qxhr.send(file);
  }
}

var cancel = function(evt){
  evt.stopPropagation();
  evt.preventDefault();
}
var hoverhandler = function(evt){
  evt.stopPropagation();
  evt.preventDefault();
}
var hoverouthandler = function(evt){
  evt.stopPropagation();
  evt.preventDefault();
}
var drophandler = function(evt){
  evt.stopPropagation();
  evt.preventDefault();
  var files = evt.dataTransfer.files;
  var count = files.length;
  if( count == 0 ) return;
  handleFiles(files)
}





function processMessage(message){
  console.debug(message);
  if(message=='1') return;
  var safefrom = $('<div/>').text(message["from"]).html(); 
  var safebody = $('<div/>').text(message["body"]).html();
  var msgTime = message['time']
  var timestamp = new Date(msgTime);
  var timestampHtml = '<span class="timestamp">' + pad(timestamp.getHours(),2) + ":" + pad(timestamp.getMinutes(),2) + "</span>";
  if( message.type=='chat'){
    newmsghtml = $('<div class="message" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ': </b>' +  linkify(safebody) + '</div>')
  }else if(message.type=='enq'){
    newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ' </b> added <span class="filename">' +  safebody + '</span> to the queue.</div>')
    var songId = message["songId"]
    var songLi = $('<li id="song_' + songId +'"></li>');
    if(message.meta){
      if('Artist' in message.meta || 'Album' in message.meta || 'Title' in message.meta){
        var a1 = $('<div class="title"></div>').text(message.meta['Title'])
        var a2 = $('<div class="artist"></div>').text(message.meta['Artist'])
        songLi.append(a1)
        songLi.append(a2)
      }else{
        console.debug("nometa");
        songLi.text(safebody);
      }
    }
    songLi.hide().appendTo("#queueList").show("slide").show("highlight",3000);
  }else if(message.type=='join'){
    newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ' </b> joined the room.</div>')
  }else if(message.type=='left'){
    newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ' </b> left the room.</div>')
  }else if(message.type=='stopped'){
    newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safebody + ' </b> finished playing.</div>')
    $('#nowplayingtext').text('');
    $('#song_' + songId).hide('slide');
  }else if(message.type=='started'){
    newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safebody + ' </b> started playing.</div>')
    if(message.meta){
      if('Artist' in message.meta && 'Album'  in message.meta && 'Title' in message.meta){
        $('#np_name').addClass("notshown");
        $('#np_title').text(message.meta['Title'])
        $('#np_artist').text(message.meta['Artist'])
        $('#np_album').text(message.meta['Album'])
      }else{
        $('#np_title, #np_album,#np_artist').addClass("notshown");
      }
    }

    $('#nowplayingtext').text(safebody);
    var songId = message["songId"]
    $('#song_' + songId).hide('slide');
  }/*else if(message.type=='namechange'){
    newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + ' changed their username to <b>' + safebody + '</b></div>')
  }*/
  newmsghtml.appendTo('#chat')
}



$(document).ready(
  function(){
    var y;
    while(y = msgs.pop()){
      for( var j in y.messages ){
        processMessage(y.messages[j]);
      }
    }
    var objDiv = document.getElementById("chat");
    objDiv.scrollTop = objDiv.scrollHeight;
    $('#newchat').keypress( function(e){
      if(e.keyCode==13 && $(this).val().length > 0 ){
        sendMessage();
      } 
    })

    ws = new WebSocket(wsurl);
    ws.onopen = function(){
      ws.send("auth:" + document.cookie);
      setInterval(function(){
        console.debug("ping?");
        ws.send("0")
      }, 45000);
    }
    ws.onmessage = function(message){
      if(message.data=='1'){
        console.debug("pong.");
        return;
      }
      console.debug("got message!", message)
      var msgs = $.parseJSON(message.data);
      console.debug("received", msgs)
      for( var i in msgs.messages){
        var message = msgs.messages[i]
        var newmsghtml;
        processMessage(message);
        if( message.type == 'chat' && countmsgs){
          newMessageCount++;
          document.title = "(" + newMessageCount + ") hey";
        }
        var objDiv = document.getElementById("chat");
        objDiv.scrollTop = objDiv.scrollHeight;
      }
    };

    var muted;
    currentVolume = 90;
    function setVol(v){
      soundManager.setVolume('mySound', v);
      $('#volinside').css('width', v + '%')
    }
    $('#volcontrol').click(
      function(e){
        var x = e.pageX - $(this).offset().left;
        var pct = parseInt((x * 100) / 140)
        currentVolume = pct;
        setVol(pct);
      }
    ).mousewheel(function(e,delta){
      var newvolume = currentVolume + delta;
      if( newvolume >= 100 ) newvolume = 100;
      if( newvolume <= 0 ) newvolume = 0;
      currentVolume = newvolume;
      setVol(newvolume);
    });

    $('#volicon').click(function(){
      muted = !muted;
      soundManager.setVolume('mySound', muted ? 0 : currentVolume);
      $('#volinside').css('width', muted ? '0%' : currentVolume + '%')
    });

    var droptarget = $('#queue')
    window.addEventListener("dragenter", hoverhandler, false);
    window.addEventListener("dragexit", hoverouthandler, false);
    window.addEventListener("dragleave", hoverouthandler, false);
    window.addEventListener("dragover", hoverhandler, false);
    window.addEventListener("drop", drophandler, false);
  }
  
  
)


var sendMessage = function(){
  var msgtext = $('#newchat').val()
  msgtext = $('<div/>').text(msgtext).html();
  ws.send(msgtext);
  //mynewmsghtml.appendTo('#chats')
  var objDiv = document.getElementById("chat");
  objDiv.scrollTop = objDiv.scrollHeight;
  $('#newchat').val('');
}
