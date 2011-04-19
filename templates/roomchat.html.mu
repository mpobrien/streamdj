<html>
  <head>
    <link href="/static/style.css" rel="stylesheet" />
    <link rel="icon" type="image/gif" href="/static/favicon.gif" />
    <link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'>
    <title> outloud.fm </title>
    <script type="text/javascript" src="/static/swfobject.js"></script>
    <script type="text/javascript" src="/static/web_socket.js"></script>
    <script type="text/javascript" src="/static/jquery.min.js"></script>
    <script type="text/javascript" src="/static/jquery-ui-custom.js"></script>
    <script type="text/javascript" src="/static/simplemodal.js"></script>
    <script type="text/javascript" src="/static/messaging.js"></script>
    <script type="text/javascript" src="/static/soundmanager2.js"></script>
    <script type="text/javascript">
      var roomname = '{{roomname}}'
      WEB_SOCKET_SWF_LOCATION = "/static/WebSocketMain.swf";
      WEB_SOCKET_DEBUG = true;
      var numbars = 16;
      var whilePlaying = function(){
        var bars =[];
        var b1 = 0, b2 = 0, b3 = 0, b4 = 0;
        var numbars = 16;                                                        
        for (var i=0;i<numbars;i++){
          var start = i*(256/numbars);
          var end = start + 16;
          var barval =0;
          for(var j=start;j<end;j++){
            barval += parseFloat(this.eqData[i]);
          }
          if(barval > numbars) barval = numbars;
          document.getElementById("bar_" + i).style.height=parseInt(barval + "px")
        }
      }
      soundManager.url = '/static/swf/';
      soundManager.debugMode = false;
      soundManager.flashVersion = 9;
      soundManager.flash9Options.useEQData = true;
      soundManager.flash9Options.useWaveformData = true;
      //soundManager.waitForWindowLoad = true;
      soundManager.useFlashBlock = false; 
      var startStream = function(){
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
       $(document).ready(function(){
         $('#options').click(function(){
           $('#optionsmodal').modal( {closeHtml:"", overlayClose:true});
         });
	$('#about').click(function(){
          $('#aboutmodal').modal( {closeHtml:"", overlayClose:true});
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
         {{^nowPlaying}}
         $('#currentfile').html('<div class="right">the silence is deafening&hellip; :(</div><div class="right">upload something!</div>');
         {{/nowPlaying}}
       })
    </script>
  </head>
  <body>
    <div id="navbar">
      <div id="branding"><span id="note"><img src="/static/notebrand.png"></span>&nbsp;&nbsp;outloud<span class="org">.fm</span>  </div>
      <div id="volwrapper">
          <div id="volicon" class="notmuted">
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
          <div id="visualization" style="width:160px">
            <div id="bar_0" class="bar">&nbsp;</div>
            <div id="bar_1" class="bar">&nbsp;</div>
            <div id="bar_2" class="bar">&nbsp;</div>
            <div id="bar_3" class="bar">&nbsp;</div>
            <div id="bar_4" class="bar">&nbsp;</div>
            <div id="bar_5" class="bar">&nbsp;</div>
            <div id="bar_6" class="bar">&nbsp;</div>
            <div id="bar_7" class="bar">&nbsp;</div>
            <div id="bar_8" class="bar">&nbsp;</div>
            <div id="bar_9" class="bar">&nbsp;</div>
            <div id="bar_10" class="bar">&nbsp;</div>
            <div id="bar_11" class="bar">&nbsp;</div>
            <div id="bar_12" class="bar">&nbsp;</div>
            <div id="bar_13" class="bar">&nbsp;</div>
            <div id="bar_14" class="bar">&nbsp;</div>
            <div id="bar_15" class="bar">&nbsp;</div>
          </div>
            <div id="bar_15"></div>
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
          <ul id="listenerslist" style="line-height:24px">
            {{#listeners}}
            <li id="user_{{name}}" style="line-height:24px">{{name}} &nbsp;<a href="http://twitter.com/{{name}}" target="_blank"><img src="{{pic}}" width="24px" height="24px"/></a></li>
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
      <div class="optionrow"><button id="clearchat">Clear chat history</button></div>
      <div class="optionrow"><button id="restartaudio">Restart Audio Stream</button></div>
    </div>
<div id="aboutmodal">
      <div style="color:#DFBA69;">What is this?<br><br></div>
 <div style="color:#efffd3;">OUTLOUD.FM is an effing sweet and exciting way to play music for your friends; allowing songs to be uploaded and curated in a realtime collaborative playlist. <br><br>
Bored and hungry? Simply send the URL of your OUTLOUD.FM room to your friends, and start uploading music! (OUTLOUD.FM will, however, do nothing for your hunger.)<br><br> We are based out of New York City, and would love to hear your comments, bug reports, and/or suggestions -- <a href="mailto:info@outloud.fm">info@outloud.fm</a> <br> </div>
  </body>
</html>
