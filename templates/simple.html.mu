<html>
    <head>
      <link href="/static/style.css" rel="stylesheet" />
        <script type="text/javascript" src="/static/jquery.min.js"></script>
        <script type="text/javascript" src="/static/jquery-ui-custom.js"></script>
        <!--script type="text/javascript" src="/static/socket.io.min.js"></script-->
        <script type="text/javascript" src="/static/soundmanager2.js"></script>
        <script type="text/javascript" src="/static/chat.js"></script>
        <script type="text/javascript" src="/static/jqwheel.js"></script>
        <script type="text/javascript">

            var msgs = [{{{msgs}}}]
            var username = '{{username}}'
            var newMessageCount = 0;
            var countmsgs = false;
            //socket.on("connect", function(){console.debug("connected.")});
            window.onfocus = function(){
              document.title = 'hey'
              newMessageCount = 0;
            }
            window.onblur = function(){
              countmsgs = true;
            }

            function pad(number, length) {
              var str = '' + number;
              while (str.length < length) {
                str = '0' + str;
              }
              return str;
            }

            function processMessage(message){
              if(message=='1') return;
              var safefrom = $('<div/>').text(message["from"]).html(); 
              var safebody = $('<div/>').text(message["body"]).html();
              var msgTime = message['time']
              var timestamp = new Date(msgTime);
              var timestampHtml = '<span class="timestamp">[' + pad(timestamp.getHours(),2) + ":" + pad(timestamp.getMinutes(),2) + "]</span>";
              if( message.type=='chat'){
                newmsghtml = $('<div class="message" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ': </b>' +  linkify(safebody) + '</div>')
              }else if(message.type=='enq'){
                newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + '<b>' + safefrom + ' </b> added <span class="filename">' +  safebody + '</span> to the queue.</div>')
                var songId = message["songId"]
                $('<li id="song_' + songId +'">' + safebody + '</li>').hide().appendTo('#queueList').show('slide').show('highlight', 3000);
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
                $('#nowplayingtext').text(safebody);
                var songId = message["songId"]
                $('#song_' + songId).hide('slide');
              }/*else if(message.type=='namechange'){
                newmsghtml = $('<div class="enqueued" id="' + message["id"] + '">' + timestampHtml + ' changed their username to <b>' + safebody + '</b></div>')
              }*/
              newmsghtml.appendTo('#chats')
            }

            //socket.on("message", 
/*
                function(data){
                    var msgs = $.parseJSON(data);
                    for( var i in msgs.messages){
                        var message = msgs.messages[i]
                        console.debug(message);
                        var newmsghtml;
                        processMessage(message);
                        if( message.type == 'chat' && countmsgs){
                          newMessageCount++;
                          document.title = "(" + newMessageCount + ") hey";
                        }
                        var objDiv = document.getElementById("chats");
                        objDiv.scrollTop = objDiv.scrollHeight;
                        console.debug("got some data:  ", data)
                    }
                } );
            socket.on('disconnect', function(m){ console.debug("disconnect!")});
            socket.connect();*/

            var mymsgs =1;
            var sendMessage = function(){
                var msgtext = $('#newchat').val()
                msgtext = $('<div/>').text(msgtext).html();
                var mynewmsghtml = $('<div class="message" id="mymsgs' + ( mymsgs++ ) + '"><b>' + username + ': </b>' + linkify(msgtext) + '</div>')
                ws.send(msgtext);
                //mynewmsghtml.appendTo('#chats')
                var objDiv = document.getElementById("chats");
                objDiv.scrollTop = objDiv.scrollHeight;
                $('#newchat').val('');
            }
        </script>
        <script type="text/javascript">
          soundManager.url = '/static/swf/';
          soundManager.debugMode = false;
          soundManager.flashVersion = 9;
          soundManager.useFlashBlock = false; 
          soundManager.onready(function() {
              soundManager.createSound({
                  id: 'mySound',
                  url: '{{listenurl}}',
                  autoPlay: true,
                  stream: true
              });
          });                
          soundManager.onbufferchange = function(){
            console.debug("change");
          }
        </script>
        <script type="text/javascript">
            var muted = false;
            $(document).ready(
                function(){
                    ws = new WebSocket("{{wsurl}}");
                    ws.onopen = function(){
                      console.debug("hey");
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
                            var objDiv = document.getElementById("chats");
                            objDiv.scrollTop = objDiv.scrollHeight;
                        }
                    };
                    //setTimeout(fetchMessages, 10);
                    $('#changename').click(
                      function(){
                      newname = prompt("Change your username to:")
                      if(newname != null){
                        $.getJSON('/changename/', {name:newname},
                          function(data){
                            if(data.ok == 'ok'){
                              $('#myname').text(newname);
                              username = newname
                            }
                          });
                          
                        }
                      }
                    );
                    $('#send').click(sendMessage);
                    $('#newchat').keypress( function(e){
                        if(e.keyCode==13 && $(this).val().length > 0 ){
                          sendMessage();
                        } 
                      }
                    )
                    $('#mute').click(
                      function(){
                        muted = !muted;
                        soundManager.setVolume('mySound', muted ? 0 : 100);
                        $(this).text(muted ? "Unmute" : "Mute");
                      })

                    var handleFiles = function(files){
                        for( var fn in files ){
                            var file = files[fn];
                            if( !file.fileSize ) continue;
                            var reader = new FileReader();
                            var qxhr = new XMLHttpRequest();
                            var outer = $('<div class="progressContainer">')
                            var inner = $('<div class="progressBar">')
                            $('#progress').append(outer)
                            inner.appendTo(outer)
                            qxhr.onreadystatechange = function(){ console.debug("readystate", this.readystate); }
                            qxhr.upload.onerror = function(e){ console.debug("error", e); }
                            qxhr.upload.onloadstart = function(e){ console.debug("loadstart", e); }
                            qxhr.upload.onprogress = function(e){
                                var pct = parseInt((e.loaded / e.totalSize) * 100);
                                console.debug(pct);
                                if( pct == 100 ){ 
                                  inner.animate({'width':pct + '%'},
                                      100,
                                      function(){
                                        outer.fadeOut(function(){$(this).remove()});
                                      })
                                }else{ inner.animate({'width':pct + '%'}, 100, function(){console.debug("not done");}) }
                                console.debug("progress", e);
                            }
                            qxhr.open("POST","/upload", true);
                            qxhr.setRequestHeader('Content-Type', 'multipart/form-data');
                            qxhr.setRequestHeader("X-File-Name", file.fileName);
                            qxhr.send(file);
                        }
                    }


                    var drophandler = function(evt){
                        evt.stopPropagation();
                        evt.preventDefault();
                        var files = evt.dataTransfer.files;
                        var count = files.length;
                        if (count > 0){ handleFiles(files) } // Only call handler if 1 or more files was dropped.
                    }

                    var cancel = function(evt){
                        evt.stopPropagation();
                        evt.preventDefault();
                    }
                    var dropbox = document.getElementById("uploadArea")
                    dropbox.addEventListener("dragenter", cancel, false);
                    dropbox.addEventListener("dragexit", cancel, false);
                    dropbox.addEventListener("dragover", cancel, false);
                    dropbox.addEventListener("drop", drophandler, false);
                    window.addEventListener("dragenter", cancel, false);
                    window.addEventListener("dragexit", cancel, false);
                    window.addEventListener("dragover", cancel, false);
                    window.addEventListener("drop", cancel, false);

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
                        }
                    );
                    
                    var y;
                    while(y = msgs.pop()){
                      for( var j in y.messages ){
                        processMessage(y.messages[j]);
                      }
                    }
                    var objDiv = document.getElementById("chats");
                    objDiv.scrollTop = objDiv.scrollHeight;
                }
            )
        </script>
        <!--link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'/-->
    </head>
    <body>
        <div id="header" >
            <h1>
                d[-_-]b
            </h1>
        </div>
        <div id="chatpanel">
          <div id="nowplaying">
            <marquee>Now playing: {{#nowPlaying}}<span id="nowplayingtext">{{name}}</span> uploaded by <span id="whouploaded">{{uploader}}</span>{{/nowPlaying}}</marquee>
          </div>
          <div id="chats">
          </div>
          <div id="messagesender">
              <input type="text" style="width:90%;" id="newchat" placeholder="say something..."></input><button id="send" style="width:10%" class="awesome">send</button>
          </div>
        </div>

        <div id="rightPanel">
            <div id="links">
              <a href="/logout">logout</a>
            </div>
            <div id="volwrapper">
                <div id="volicon">
                </div>
                <div id="volcontrol">
                    <div id="volinside">&nbsp;</div>
                </div>
            </div>
          <div id="whosInRoom">
            <h3>Listeners</h3>
            <ul>
                {{#listeners}}
                  <li>{{name}}</li>
                {{/listeners}}
            </ul>
          </div>
          <div id="uploadArea">
            <span>Drag and drop a file onto here to upload...</span>
            <div id="progress"></div>
          </div>
          <div id="queue">
            <h3>comin up:</h3>
            <ul id="queueList">
              {{#queue}}
                <li id="song_{{songId}}">
                  {{#meta}}{{Title}} by {{Artist}}{{/meta}}
                  {{^meta}}{{name}}{{/meta}}
                   uploaded by: {{uploader}}
                </li>
              {{/queue}}
            </ul>
          </div>
        </div>
        <!--<form method="post" enctype="multipart/form-data" action="/getfile">
            <input type="file" name="somename"/>
            <input type="submit"/>
        </form>-->
    </body>
</html>
