<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/> 
    <link href="/static/style.css" rel="stylesheet" />
    <link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'>
    <link rel="icon" type="image/gif" href="/static/favicon.gif" />
    <script type="text/javascript">
      if(!(window.console)){
        window.console = {log:function(){}, debug:function(){}};
      }
    </script>
    <title> outloud.fm </title>
    <script type="text/javascript" src="/static/swfobject.js"></script>
    <script type="text/javascript" src="/static/web_socket.js"></script>
    <script type="text/javascript" src="/static/jquery.min.js"></script>
    <script type="text/javascript" src="/static/jquery-ui-custom.js"></script>
    <script type="text/javascript" src="/static/simplemodal.js"></script>
    <script type="text/javascript" src="/static/messaging.js"></script>
    <script type="text/javascript" src="/static/soundmanager2.js"></script>

    <script type="text/javascript">
      var nowplayingstart = {{nowPlaying}};
      function confirm(message, callback) {
        $('#confirm').modal({
          closeHTML: "<a href='#' title='Close' class='modal-close'>x</a>",
          position: ["20%",],
          overlayId: 'confirm-overlay',
          containerId: 'confirm-container', 
          onShow: function (dialog) {
            var modal = this;

            $('.message', dialog.data[0]).append(message);

            // if the user clicks "yes"
            $('.yes', dialog.data[0]).click(function () {
              // call the callback
              if ($.isFunction(callback)) {
                callback.apply();
              }
              // close the dialog
              modal.close(); // or $.modal.close();
            });
          }
        });
      }
    </script>

    <script type="text/javascript">
      var roomname = '{{roomname}}'
      var uidkey = '{{uidkey}}'
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
      soundManager.useHighPerformance = true;
      soundManager.flashVersion = 9;
      soundManager.flash9Options.useEQData = true;
      soundManager.flash9Options.useWaveformData = true;
      //soundManager.waitForWindowLoad = true;
      soundManager.useFlashBlock = false; 
      var startStream = function(){
        x = soundManager.createSound({
          id: 'mySound',
          url: '{{listenurl}}',
          autoPlay: true,
          stream: true,
          useEQData: true, 
          whileplaying : whilePlaying
        });
        if( muted ){
          soundManager.setVolume('mySound', 0);
        }
      }
      soundManager.onready(startStream);
    </script>
    <script type="text/javascript">
       var wsurl = '{{wsurl}}'
       var msgs = [{{{msgs}}}]
       var username = {{{username}}}
       var messagecount = msgs.length;
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

      var twitterinvite = function(){
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
       $(document).ready(function(){
         console.log(msgs, messagecount)
         if(messagecount == 0){
           appendGreeting()
         }
         var favoritesopen = false;
         $('#options').click(function(){
           $('#optionsmodal').modal( {closeHtml:"", overlayClose:true});
         });
         $('.twinvite').click(
           function(){ twitterinvite() }
         );
         $('.fbinvite').click(
           function(){
             var fburl = 'http://www.facebook.com/dialog/feed?';
             fburl += 'link=' + escape('http://outloud.fm/' + roomname)
             fburl += '&app_id=123006794442539&'
             if(nowplayingMeta && 'pic' in nowplayingMeta){
               fburl += '&picture=' + 'http://s3.amazonaws.com/albumart-outloud/art/' + encodeURIComponent(nowplayingMeta.pic)
             }else{
               fburl += '&picture=' + escape('http://outloud.fm/static/ol_med.png');
             }
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
           });

         $('.delsong').live('click',
           function(div){
             var songId = $(this).attr("id").split("_")[1];
             var callback = function(){
               removeSongFromQueue(songId);
             }
             confirm("Are you sure you want to delete this song from the queue?", callback);
           });

         $('#closefavorites').click(function(){
           $('#favorites').hide('slide', 'fast',function(){
             favoritesopen = false;
             $('#player').show('slide', 'fast');
           });

         });
	       $('#about').click(function(){
          $('#aboutmodal').modal( {closeHtml:"", overlayClose:true});
         }); 
         function loadFavGenerator(pn){
           return function(){
             loadFavorites(pn);
           }
         }
         function loadFavorites(pageNum, doSlide){
           pageNum = parseInt(pageNum);
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
                     $('<span></span>').attr("class","by").text("by")).append(
                     $('<span></span>').attr("class","artist").text(message['Artist'])))
                 }
                 if( 'Album' in message){
                   newli.append($('<div class="fav_line"></div>').append(
                    $('<span>from</span>').attr("class","from")).append(
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
               $('#favorites').show('slide', 'fast', function(){
                 favoritesopen = true;
               });
             }
           })
         }

         $('#favoriteslink').click(function(){
           if(favoritesopen){
             $('#favorites').hide('slide', 'fast',function(){
               $('#player').show('slide', 'fast');
               favoritesopen = false;
             });
             return;
           }
           $('#player').hide('slide', 'fast',function(){
             loadFavorites(0, true);
           });
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
         $('#visualization').hide();
         $('#currentfile_opts').hide();
         nowplayingMeta = null;
         {{/nowPlaying}}
         {{#liked}}
           if(nowplayingId){
             $('#nowplayingheart').removeClass("off").addClass("on");
           }
         {{/liked}}
         {{#voted}}
           if(nowplayingId){
             $('#thumbsdown').removeClass("t_off").addClass("t_on");
           }
         {{/voted}}
       })
    </script>
    
<script type="text/javascript">

  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-23607493-1']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

</script>
  </head>
  
  <body>
    <div id="header">
      <div id="branding"><a href="/"><img src="/static/ol.png"></a></div>
      <div id="volwrapper">
          <div id="volicon" class="notmuted">
          </div>
          <div id="volcontrol">
              <div id="volinside">&nbsp;</div>
          </div>
      </div>
      <div id="links">
        <span class="link"><a href="#" id="about">help</a></span>
        <span class="link"><a href="#" id="options">options</a></span>
        <span class="link"><a href="#" id="favoriteslink">favorites</a></span>
        <span class="link"><a href="/logout">logout</a></span>
      </div>
    </div>

    <div id="wrapper1"><!-- sets background to white and creates full length leftcol-->
      <div id="wrapper2"><!-- sets background to white and creates full length rightcol-->
        <div id="maincol"><!-- begin main content area -->

          <div id="leftcol"><!-- begin leftcol -->
            <div id="player">
              <h1 class="colheading">
                <!--<div style="float:left">Now Playing</div>-->
                <div id="visualization" style="margin-left:0px;width:160px; float:left">
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
              </h1>

              <div id="nowplayingwrapper">
              <!-- <div id="likebox"><div id="nowplayingheart" class="heartbox off"></div></div>-->
                <div id="currentfile" {{#nowPlaying}}class="playing"{{/nowPlaying}}></div>
                <div id="albumart" style="margin:5px;text-align:left;display:none"> </div>
                <div id="currentfile_opts">
                <div class="clearer"></div>
                <div id="nowplayingheart" class="fileopt heartbox off"></div>
	          <div id="addtofaves">add to Favorites</div>
                  <div id="thumbsdown" style="display:none" class="fileopt thumbs t_off"></div>
                  <div class="clearer"></div>
                </div>
              </div>
	      <div class="clearer"></div>
              <h1 class="colheading">Queue</h1>
              <div id="queue">
                <div id="progress"></div>
                <div class="desc">drag and drop files to upload</div>
                <ul id="queueList">
                  {{#queue}}
                    <li class="queuedsong" id="song_{{songId}}">
                    {{#mine}}<div class="delsong" id="delsong_{{songId}}">&nbsp;</div>{{/mine}}
                      {{#meta}}<span class="title">{{Title}}</span> <span class="by">by</span> <span class="artist">{{Artist}}</span>{{/meta}}
                      {{^meta}}<span class="title">{{name}}</span>{{/meta}} <span class="upby">added&nbsp;by</span> <span class="uploader">{{uploader}}</span>
                    </li>
                  {{/queue}}
                </ul>
              </div>
            </div>
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
          </div><!-- end leftcol -->
          <div id="rightcol"><!-- begin rightcol -->
            <div id="invites">
              Invite friends with: <span class="fbinvite"><img src="/static/facebook_small.png"/></span> <span class="twinvite" style="cursor:pointer;"><img src="/static/twitter_small.png"/></span> 
            </div>
            <h1 class="colheading">Listeners</h1>
            <ul id="listenerslist" style="line-height:24px">
              {{#listeners}}
              <li id="user_{{uid}}" style="line-height:24px"><a href="{{link}}" target="_blank"><img src="{{pic}}" width="24px" height="24px"/></a><span class="username">{{name}}</name></li>
              {{/listeners}}
            </ul>
          </div><!-- end righttcol -->
          <div id="centercol"><!-- begin centercol -->
            <div id="chatwrapper">
              <div id="chat">
              </div>
              <div id="sender">
                <input type="text" id="newchat" placeholder="say something..."/>
              </div>
            </div>
          </div><!-- end centercol -->
        </div><!-- end main content area -->

        <div id="footer">
        </div>
      </div><!-- end wrapper1 -->
    </div><!-- end wrapper2 -->
    <div id="aboutmodal" style="display:none">
      <div style="color:black; text-align:left; font-family:Verdana, sans-serif; font-size:12px">
        <b>My audio is skipping. :( </b><br>
	   -That sucks! Just refresh the page OR click on Options --> Restart Audio Stream<br><br>
        <b>My song got skipped/didn't play.</b><br>
	   -Poor guy! It's possible that your song was a corrupted file, or unsupported format.  We're working hard on making the site work with any file you throw at it. If you REALLY want to play the song, you could run it through the iTunes mp3 converter (info here: <a href="http://support.apple.com/kb/ht1550" style="color:blue">http://support.apple.com/kb/ht1550</a> ). We support mp3, m4a, or wma.<br> <br>
        <b> I found a bug that's not listed here. This site sucks. What do I do?</b><br>
-Please let us know about any bugs or suggestions you have that would make OUTLOUD.FM better for you. Email us at <a href="mailto:info@outloud.fm" style="color:blue">info@outloud.fm</a> (please include some basic info -- browser + version, operating system, astrological sign, favorite color). Or find us on Twitter <a href="http://twitter.com/outloudfm" style="color:blue">@outloudfm</a> 
       </div>
     </div>
    <div id="optionsmodal" style="display:none">
      <div class="heading">Options</div>
      <div class="optionrow"><button id="clearchat">Clear chat history</button></div>
      <div class="optionrow"><button id="restartaudio">Restart Audio Stream</button></div>
    </div>
		<div id='confirm'>
			<div class='header'><span>Confirm</span></div>
			<div class='message'></div>
			<div class='buttons'>
				<div class='no simplemodal-close'>No</div><div class='yes'>Yes</div>
			</div>
		</div>
  </body>
</html>
