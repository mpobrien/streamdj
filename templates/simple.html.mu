<html>
    <head>
      <link href="/static/style.css" rel="stylesheet" />
        <script type="text/javascript" src="/static/jquery.js"></script>
        <script type="text/javascript" src="/static/soundmanager2.js"></script>
        <script type="text/javascript" src="/static/chat.js"></script>
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
            $(document).ready(
                function(){
                    setTimeout(fetchMessages, 1);
                    $('#send').click(sendMessage);
                    $('#newchat').keypress( function(e){
                        if(e.keyCode==13 && $(this).val().length > 0 ){
                          sendMessage();
                        }                  1
                      }
                    )

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
                    console.debug(dropbox);
                    dropbox.addEventListener("dragenter", cancel, false);
                    dropbox.addEventListener("dragexit", cancel, false);
                    dropbox.addEventListener("dragover", cancel, false);
                    dropbox.addEventListener("drop", drophandler, false);
                }
            )
        </script>
    </head>
    <body>

        <div id="chatpanel">
          <div id="chats">
          </div>
          <div id="messagesender">
              <input type="text" style="width:90%;" id="newchat" placeholder="say something..."></input><button id="send" style="width:10%">send</button>
          </div>
        </div>

        <div id="rightPanel">
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
