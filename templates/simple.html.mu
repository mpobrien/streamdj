<html>
    <head>
      <link href="/static/style.css" rel="stylesheet" />
        <script type="text/javascript" src="/static/jquery.min.js"></script>
        <script type="text/javascript" src="/static/socket.io.min.js"></script>
        <script type="text/javascript" src="/static/soundmanager2.js"></script>
        <script type="text/javascript" src="/static/chat.js"></script>
        <script type="text/javascript">
            var username = '{{username}}'
            var socket = new io.Socket();
            socket.on("connect", function(){console.debug("connected.")});
            socket.on("message", 
                function(data){
                    var msgs = $.parseJSON(data);
                    for( var i in msgs.messages){
                        var message = msgs.messages[i]
                        console.debug(message);
                        var newmsghtml;
                        var safefrom = $('<div/>').text(message["from"]).html(); 
                        var safebody = $('<div/>').text(message["body"]).html();
                        if( message.type=='chat'){
                          newmsghtml = $('<div class="message" id="' + message["id"] + '"><b>' + safefrom + ': </b>' +  safebody + '</div>')
                        }else if(message.type=='enq'){
                          newmsghtml = $('<div class="enqueued" id="' + message["id"] + '"><b>' + safefrom + ' </b> added <span class="filename">' +  safebody + '</span> to the queue.</div>')
                        }else if(message.type=='join'){
                          newmsghtml = $('<div class="enqueued" id="' + message["id"] + '"><b>' + safefrom + ' </b> joined the room.</div>')
                        }else if(message.type=='left'){
                          newmsghtml = $('<div class="enqueued" id="' + message["id"] + '"><b>' + safefrom + ' </b> left the room.</div>')
                        }else if(message.type=='stopped'){
                          newmsghtml = $('<div class="enqueued" id="' + message["id"] + '"><b>' + safebody + ' </b> finished playing.</div>')
                        }else if(message.type=='started'){
                          newmsghtml = $('<div class="enqueued" id="' + message["id"] + '"><b>' + safebody + ' </b> started playing.</div>')
                        }
                        newmsghtml.appendTo('#chats')
                        var objDiv = document.getElementById("chats");
                        objDiv.scrollTop = objDiv.scrollHeight;
                        console.debug("got some data:  ", data)
                    }
                } );
            socket.on('disconnect', function(m){ console.debug("disconnect!")});
            socket.connect();

            var mymsgs =1;
            var sendMessage = function(){
                var msgtext = $('#newchat').val()
                var mynewmsghtml = $('<div class="message" id="mymsgs' + ( mymsgs++ ) + '"><b>' + username + ': </b>' +msgtext + '</div>')
                socket.send(msgtext);
                mynewmsghtml.appendTo('#chats')
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
                  url: '/listen',
                  autoPlay: true,
                  stream: true
              });
          });
        </script>
        <script type="text/javascript">
            var muted = false;
            $(document).ready(
                function(){
                    //setTimeout(fetchMessages, 10);
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

                    var handleFiles =function(files){
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
                            qxhr.open("POST","/getfile", true);
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

                    var currentVolume = 90;
                    $('#volcontrol').click(
                        function(e){
                            var x = e.pageX - $(this).offset().left;
                            var pct = parseInt((x * 100) / 140)
                            currentVolume = pct;
                            soundManager.setVolume('mySound', pct);
                            $('#volinside').css('width', pct + '%')
                        }
                    );
                    $('#volicon').click(function(){
                            muted = !muted;
                            soundManager.setVolume('mySound', muted ? 0 : currentVolume);
                            $('#volinside').css('width', muted ? '0%' : currentVolume + '%')
                        }
                    );
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
          <div id="chats">
          </div>
          <div id="messagesender">
              <input type="text" style="width:90%;" id="newchat" placeholder="say something..."></input><button id="send" style="width:10%">send</button>
          </div>
        </div>

        <div id="rightPanel">
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
              <li>mike</li>
              <li>steven</li>
              <li>person</li>
            </ul>
          </div>
          <div id="uploadArea">
            <span>Drag and drop a file onto here to upload...</span>
            <div id="progress"></div>
          </div>
          <div id="queue">
            <h3>comin up:</h3>
            <ul>
              <li>hey</li>
              <li>hey2</li>
            </ul>
          </div>
        </div>











        <!--<form method="post" enctype="multipart/form-data" action="/getfile">
            <input type="file" name="somename"/>
            <input type="submit"/>
          </form>-->
    </body>
</html>
