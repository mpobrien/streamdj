/* Linkify for chat to create <a hrefs> *///
window.linkify =//{{{
(function(){var k="[a-z\\d.-]+://",h="(?:(?:[0-9]|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}(?:[0-9]|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])",c="(?:(?:[^\\s!@#$%^&*()_=+[\\]{}\\\\|;:'\",.<>/?]+)\\.)+",n="(?:ac|ad|aero|ae|af|ag|ai|al|am|an|ao|aq|arpa|ar|asia|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|biz|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|cat|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|coop|com|co|cr|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|edu|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gov|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|info|int|in|io|iq|ir|is|it|je|jm|jobs|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mil|mk|ml|mm|mn|mobi|mo|mp|mq|mr|ms|mt|museum|mu|mv|mw|mx|my|mz|name|na|nc|net|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|org|pa|pe|pf|pg|ph|pk|pl|pm|pn|pro|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tel|tf|tg|th|tj|tk|tl|tm|tn|to|tp|travel|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|xn--0zwm56d|xn--11b5bs3a9aj6g|xn--80akhbyknj4f|xn--9t4b11yi5a|xn--deba0ad|xn--g6w251d|xn--hgbk6aj7f53bba|xn--hlcj6aya9esc7a|xn--jxalpdlp|xn--kgbechtv|xn--zckzah|ye|yt|yu|za|zm|zw)",f="(?:"+c+n+"|"+h+")",o="(?:[;/][^#?<>\\s]*)?",e="(?:\\?[^#<>\\s]*)?(?:#[^<>\\s]*)?",d="\\b"+k+"[^<>\\s]+",a="\\b"+f+o+e+"(?!\\w)",m="mailto:",j="(?:"+m+")?[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@"+f+e+"(?!\\w)",l=new RegExp("(?:"+d+"|"+a+"|"+j+")","ig"),g=new RegExp("^"+k,"i"),b={"'":"`",">":"<",")":"(","]":"[","}":"{","B;":"B+","b:":"b9"},i={callback:function(q,p){return p?'<a href="'+p+'" title="'+p+'" target="_blank">'+q+"</a>":q},punct_regexp:/(?:[!?.,:;'"]|(?:&|&amp;)(?:lt|gt|quot|apos|raquo|laquo|rsaquo|lsaquo);)$/};return function(u,z){z=z||{};var w,v,A,p,x="",t=[],s,E,C,y,q,D,B,r;for(v in i){if(z[v]===undefined){z[v]=i[v]}}while(w=l.exec(u)){A=w[0];E=l.lastIndex;C=E-A.length;if(/[\/:]/.test(u.charAt(C-1))){continue}do{y=A;r=A.substr(-1);B=b[r];if(B){q=A.match(new RegExp("\\"+B+"(?!$)","g"));D=A.match(new RegExp("\\"+r,"g"));if((q?q.length:0)<(D?D.length:0)){A=A.substr(0,A.length-1);E--}}if(z.punct_regexp){A=A.replace(z.punct_regexp,function(F){E-=F.length;return""})}}while(A.length&&A!==y);p=A;if(!g.test(p)){p=(p.indexOf("@")!==-1?(!p.indexOf(m)?"":m):!p.indexOf("irc.")?"irc://":!p.indexOf("ftp.")?"ftp://":"http://")+p}if(s!=C){t.push([u.slice(s,C)]);s=E}t.push([A,p])}t.push([u.substr(s)]);for(v=0;v<t.length;v++){x+=z.callback.apply(window,t[v])}return x||u}})();//}}}

var droptarget ;
/* Drag and drop */
var ProgressBar = function(){//{{{
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
}//}}}
var handleFiles = function(files){//{{{
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
}//}}}

/* Message handling */
function processMessage(message, isStatic){//{{{
  var type = message.type;
  var handler = MessageHandlers[type]
  if(handler){
    handler(message, isStatic);
  }
  /*
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
  }
  newmsghtml.appendTo('#chat')
  */
}//}}}

/* Message Receiving */
var sendMessage = function(){//{{{
  var msgtext = $('#newchat').val()
  msgtext = $('<div/>').text(msgtext).html();
  ws.send(msgtext);
  var objDiv = document.getElementById("chat");
  objDiv.scrollTop = objDiv.scrollHeight;
  $('#newchat').val('');
}//}}}

/* GUI hooks setup */
$(document).ready(//{{{
  function(){
    droptarget = document.getElementById("queue"); 
    var y;
    while(y = msgs.pop()){
      for( var j in y.messages ){
        processMessage(y.messages[j], true);
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
        processMessage(message, false);
        if( message.type == 'chat' && countmsgs){
          newMessageCount++;
          document.title = "(" + newMessageCount + ") outloud.fm";
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

    droptarget.addEventListener("drop", drop, false);
    droptarget.addEventListener("dragenter", dragEnter, false);
    droptarget.addEventListener("dragleave", dragExit, false);
    droptarget.addEventListener("dragover", dragOver, false);
    window.addEventListener("drop", dragEnter, false);
    window.addEventListener("dragenter", dragEnter, false);
    window.addEventListener("dragleave", dragEnter, false);
    window.addEventListener("dragover", dragEnter, false);

    function dragEnter(evt){
      evt.stopPropagation();
      evt.preventDefault();
    }

    function dragExit(evt){
      evt.stopPropagation();
      evt.preventDefault();
      $(droptarget).removeClass("highlight");
    }

    function dragOver(evt){
      evt.stopPropagation();
      evt.preventDefault();
      $(droptarget).addClass("highlight");
    }

    function drop(evt){
      evt.stopPropagation();
      evt.preventDefault();
      $(droptarget).removeClass("highlight");
      var files = evt.dataTransfer.files;
      var count = files.length;
      if( count == 0 ) return;
      handleFiles(files)
    }

  }
  
  
)//}}}

