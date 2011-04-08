<html>
  <head>
    <link href="/static/style.css" rel="stylesheet" />
    <link rel="icon" type="image/gif" href="/static/favicon.gif" />
    <link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'>
    <title> outloud.fm </title>
    <script type="text/javascript" src="/static/jquery.min.js"></script>
    <script type="text/javascript" src="/static/jquery-ui-custom.js"></script>
    <script type="text/javascript" src="/static/simplemodal.js"></script>
    <script type="text/javascript" src="/static/messaging.js"></script>
    <script type="text/javascript" src="/static/soundmanager2.js"></script>
    <script type="text/javascript">
    var eqBarInterval = 32
      var makeBar = function(x){
        var s = '';
        for(var i=0;i<=x;i++){
          s += '|'
        }
        return s;
      }
      var whilePlaying = function(){
        var eqBarValues = [0,0,0,0,0,0,0,0,0];
        var eqValues16 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        var bars =[];
        var b1 = 0, b2 = 0, b3 = 0, b4 = 0;

        for (var i=0;i<256;i++){
          bars[i] = makeBar(parseInt(this.eqData[i] * 100));
          if (i < 64){
            b1 += this.eqData[i];
          }else if (i < 128){
            b2 += this.eqData[i];
          }else if (i < 192){
            b3 += this.eqData[i];
          }else{
            b4 += this.eqData[i];
          }
          eqBarValues[(i/eqBarInterval)>>0] += this.eqData[i];
          eqValues16[(i/16)>>0] += this.eqData[i];
        }
        console.debug(bars.join("\\n"));
      }
      soundManager.url = '/static/swf/';
      soundManager.debugMode = false;
      soundManager.flashVersion = 9;
      soundManager.flash9Options.useEQData = true;
      soundManager.flash9Options.useWaveformData = true;
      //soundManager.waitForWindowLoad = true;
      soundManager.useFlashBlock = false; 
      var startStream = function(){
        console.debug(whilePlaying);
        soundManager.createSound({
          id: 'mySound',
          url: '{{listenurl}}',
          autoPlay: true,
          stream: true,
          useEQData: true, 
          whileplaying : whilePlaying
        });
      }
      soundManager.onready(startStream);
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
         document.title = 'outloud.fm'
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
       $(document).ready(function(){
         $('#options').click(function(){
           $('#optionsmodal').modal( {closeHtml:"", overlayClose:true});
         });
         $('#restartaudio').click(function(){
           soundManager.destroySound('mySound');
           startStream();
         });
         $('#restartaudio').click(function(){
           soundManager.destroySound('mySound');
           startStream();
         });
         $('#clearchat').click(function(){
           $('#chat').html('');
         });
       })
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
        <span class="link"><a href="#" id="options">options</a></span>
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
        <div id="soundviz">
        
        </div>
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
            {{^nowPlaying}}
              <div id="np_title" class="notshown"></div>
              <div id="np_artist" class="notshown"><span id="by">by</span>{{Artist}}</div>
              <div id="np_album" class="notshown"><span id="from">from</span> {{Album}}</div>
              <div id="np_name">{{name}}</div>
            {{/nowPlaying}}
          </div>
        </div>
        <div id="listeners" class="section">
          <div class="heading">listeners</div>
          <ul id="listenerslist">
            {{#listeners}}
              <li id="user_{{name}}">{{name}}</li>
            {{/listeners}}
          </ul>
        </div>

        <div id="queue" class="section">
          <div class="heading">queue</div>
          <div class="desc">drag and drop files here to upload.</div>
          <div id="progress"></div>
          <ul id="queueList">
            {{#queue}}
              <li class="queuedsong" id="song_{{songId}}">
                {{#meta}}<span class="title">{{Title}}</span><span class="by">by</span><span class="artist">{{Artist}}</span>{{/meta}}
                {{^meta}}<span class="title">{{name}}</span>{{/meta}}<span class="upby">added&nbsp;by</span><span class="uploader">{{uploader}}</span>
              </li>
            {{/queue}}
          </ul>
        </div>
      </div>
    </div>
    <div id="optionsmodal">
      <div class="heading">Options</div>
        <ul id="optionslist">
          <li><button id="clearchat">Clear chat history</button></li>
          <li><button id="restartaudio">Restart Audio Stream</button></li>
        </ul>
    </div>
  </body>
</html>
