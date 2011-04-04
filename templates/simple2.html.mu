<html>
  <head>
    <link href="/static/style.css" rel="stylesheet" />
    <link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'>
    <script type="text/javascript" src="/static/jquery.min.js"></script>
    <script type="text/javascript" src="/static/jquery-ui-custom.js"></script>
    <script type="text/javascript" src="/static/soundmanager2.js"></script>
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
    </script>
    <script type="text/javascript">
       var wsurl = '{{wsurl}}'
       var msgs = [{{{msgs}}}]
       var username = '{{username}}'
     </script>
    <script type="text/javascript" src="/static/jqwheel.js"></script>
    <script type="text/javascript" src="/static/outloud.js"></script>

     <script>
       var newMessageCount = 0;
       var countmsgs = false;
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
    </script>
  </head>
  <body>
    <div id="navbar">
      <div id="branding"><span id="note">&#x266c;</span>&nbsp;&nbsp;outloud<span class="org">.fm</span>  </div>
      <div id="volwrapper">
          <div id="volicon">
          </div>
          <div id="volcontrol">
              <div id="volinside">&nbsp;</div>
          </div>
      </div>
      <div id="links">
        <span class="link"><a href="/settings">settings</a></span>
        <span class="link"><a href="/logout">logout</a></span>
      </div>
    </div>

    <div id="maincontent">
      <div id="chatwrapper">
        <div id="chat">
        </div>
        <div id="sender">
          <input type="text" id="newchat" placeholder="say something..."/>
        </div>
      </div>
      <div id="rightbar">
        <div id="nowplaying" class="section">
          <div class="heading">now playing</div>
          <div id="currentfile">
            {{#nowPlaying}}
              {{#meta}}
                <div id="np_title">{{Title}}</div>
                <div id="np_artist"><span id="by">by</span>{{Artist}}</div>
                <div id="np_album"><span id="from">from</span> {{Album}}</div>
                <div id="np_name" class="notshown"></div>
              {{/meta}}
              {{^meta}}
                <div id="np_title" class="notshown"></div>
                <div id="np_artist" class="notshown"><span id="by">by</span>{{Artist}}</div>
                <div id="np_album" class="notshown"><span id="from">from</span> {{Album}}</div>
                <div id="np_name">{{name}}</div>
              {{/meta}}
            {{/nowPlaying}}
          </div>
        </div>
        <div id="listeners" class="section">
          <div class="heading">listeners</div>
          <ul>
            {{#listeners}}
              <li>{{name}}</li>
            {{/listeners}}
          </ul>
        </div>

        <div id="queue" class="section">
          <div class="heading">queue</div>
          <div class="desc">drag and drop files here to upload.</div>
          <div id="progress"></div>
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
    </div>
    <div id="droptarget">
    BLAHBLAH
    </div>
  </body>
</html>