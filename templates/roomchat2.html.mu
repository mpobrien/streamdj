<html>
    <head>
        <link href="/static/reset.css" rel="stylesheet" />
        <link href="/static/style2.css" rel="stylesheet" />
        <link rel="icon" type="image/gif" href="/static/favicon.gif" />
        <script type="text/javascript" src="/static/swfobject.js"></script>
        <script type="text/javascript" src="/static/jquery.min.js"></script>
        <script type="text/javascript" src="/static/jqueryui.js"></script>
        <script type="text/javascript" src="/static/simplemodal.js"></script>
        <script type="text/javascript" src="/static/messaging.js"></script>
        <script type="text/javascript" src="/static/soundmanager2.js"></script>

        <script type="text/javascript">
          var WEB_SOCKET_SWF_LOCATION = "/static/WebSocketMain.swf";
          var wsurl = '{{wsurl}}'
          var nowplayingId = null;
          var msgs = [{{{msgs}}}]
          var roomname = '{{roomname}}'
          var uidkey = '{{uidkey}}'
          var username = {{{username}}}
          var messagecount = msgs.length;
          var nowplayingstart = {{nowPlaying}};
          var lastMsgId = {{lastMsgId}};
          soundManager.url = '/static/swf/';
          soundManager.debugMode = false;
          soundManager.useFlashBlock = false; 
          soundManager.flashVersion = 9;
          var startStream = function(){
            console.log("yo");
            var soundOpts = { id: 'mySound', url: '{{listenurl}}', autoPlay: true, stream: true }
            if( currentVolume>0 ){
              soundOpts.volume = currentVolume;
            }
            x = soundManager.createSound(soundOpts);
            if( muted ) soundManager.setVolume('mySound', 0); 
             //soundManager.setVolume('mySound', 0); 
          }
          {{^nowPlaying}}
          $('#currentfile').html('<div class="right">the silence is deafening&hellip; :(</div><div class="right">upload something!</div>');
          $('#visualization').hide();
          $('#currentfile_opts').hide();
          nowplayingMeta = null;
          {{/nowPlaying}}
        </script>
        <script type="text/javascript" src="/static/web_socket.js"></script>

        <script type="text/javascript" src="/static/outloud.js"></script>
        <script type="text/javascript">
          $(document).ready(function(){
            setTimeout(function(){
                soundManager.onready(startStream);
              }, 1000);
            var favoritesopen = false;
            $('#options').click(function(){
              $('#optionsmodal').modal( {closeHtml:"", overlayClose:true});
            });
            $('.fbinvite').click(doFbInvite);
            $('.twinvite').click(doTwitterinvite);
         {{^nowPlaying}}
         $('#currentfile').html('<div class="right">the silence is deafening&hellip; :(</div><div class="right">upload something!</div>').addClass("notplaying").removeClass("playing");;
         $('#visualization').hide();
         $('#currentfile_opts').hide();
         nowplayingMeta = null;
         {{/nowPlaying}}
         {{#liked}}
         console.log("faving");
           if(nowplayingId){
             $('#nowplaying_favorite').removeClass("off").addClass("on");
           }
         {{/liked}}
         {{#voted}}
           if(nowplayingId){
             $('#thumbsdown').removeClass("t_off").addClass("t_on");
           }
         {{/voted}}
       })
      </script>
    </head>
    <body>
      <div id="header" style="color:white">
        <img src="http://outloud.fm/static/ol.png" height="40px" style="padding-top:5px"/>
        <a href="#" class="headerlink" id="faveslink">favorites</a>
      </div>
      <div id="settingsmenu">
        <div class="menuitem" id="nowplaying_skip">Skip this song</div>
        <div class="menuitem">Mute until next song plays</div>
      </div>
      <div id="main">
          <div id="leftside"><!--{{{-->
            <div id="favorites" style="display:none">
              <button id="closefavorites">&larr; Back to Player</button>
              <div id="favesheader">Favorites</div>
              <div id="favepages"></div>
              <div id="nofaves">
                You haven't added any songs to your favorites list yet.<br/>
                To add a song to this list so you can find it later,<br/>
                click on the <img src="/static/heart_deactive.png"/> next to a song while it's playing.
              </div>
              <div id="favelist"></div>
            </div>

            <div id="player">
             <div id="currentfile" class="notplaying">
               <div>the silence is deafening &hellip; :(</div>
               <div>upload something!</div>
             </div>

             <div id="progress"></div>
              <div id="volwrapper">
                  <div id="volicon" class="notmuted">
                  </div>
                  <div id="volcontrol">
                      <div id="volinside">&nbsp;</div>
                  </div>
              </div>
             <div id="queueholder">
               <div class="sectionheading">queue <span class="dragdropcopy">(drag and drop files to add)</span></div>
                <div id="queuelisting">
                  {{#queue}}
                    <div class="queuedsong" id="song_{{songId}}">
                      <div class="songinfo">
                        {{#meta}}<div class="title">{{Title}}</div>
                        <div class="artistinfo"> <span class="meta">by</span> <span class="artistname">{{Artist}}</span> </div>
                        {{/meta}}
                      </div>
                      <div class="uploaderinfo"> <span class="uploader">{{uploader}}</span> 
                      </div>
                      {{#mine}}<a class="delsong" id="delsong_{{songId}}" href="javascript:void(0)">(remove)</a>{{/mine}}
                      <div class="clearer"> </div>
                    </div>
                  {{/queue}}
                </div>
             </div>
           </div>
          </div><!--}}}-->

          <div id="centerright">
            <div id="centercolumn">
              <div id="chat"></div>
              <div id="chatbox">
                  <input type="text" id="newchat" name="newchat"  placeholder="say something!"/>
              </div>
            </div>
            <div id="rightside">
                <div id="invitelinks">
                  Invite friends with <span class="fbinvite"><img src="/static/facebook_small.png"/></span> <span class="twinvite" style="cursor:pointer;"><img src="/static/twitter_small.png"/></span> 
                  <div>Or copy and paste: <span class="roomlink">http://outloud.fm/{{roomname}}</span>
                  </div>

                </div>
                <div class="sectionheading" style="padding-top:10px;margin-bottom:5px;">listeners</div>
                <ul id="listeners">
                  {{#listeners}}
                  <li id="user_{{uid}}" style="line-height:24px"><a href="{{link}}" target="_blank"><img src="{{pic}}" width="24px" height="24px"/></a><span class="username">{{name}}</name></li>
                  {{/listeners}}
                  </div>
                </ul>
            </div>
          </div>


      </div>
    
    
    
    </body>
</html>
