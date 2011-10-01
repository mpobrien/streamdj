<html>
  <head>
    <link href='/static/login.css' rel='stylesheet' type='text/css'/>
    <style>
      .error{
        font-size:12px;
        color:red;
        text-align:center;
        padding:15px;
      }
    </style>

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
    <div id="container">
      <div id="leftside">
       <img src="/static/ol_copy.png">
      </div>
    </div>
	    <div id="rightside">
        {{#userinfo}}
          <div>
            <div class="userinfo" style="float:left; width:100%">
              <div style="float:left">
                <span id="profileimg"><img src="{{avatarUrl}}"/></span><span class="username">{{displayName}}</span>
              </div>
              <div style="float:right">
                <a href="/logout" id="logout">logout</a>
              </div>
            </div>
          </div>
          <h1>Create or join a room</h1><br>
          <div class="formcontainer">
            <form action="/room" method="POST">
              <label for="roomname">Room Name:</label>
              <input type="text" name="roomname" id="roomname" placeholder="room name" value="{{roomname}}" />
              <div style="width:200px;margin-left:auto;margin-right:auto">
                <input type="submit" id="go" value="Go!"/>
              </div>
            </form>
          </div>
          <span class="disclaimer" style="line-height:1.8em;">
            For the friendless and the early adopters -<br/> join us in the <a href="/dirtybeaches">public room</a>!
          </span>
          {{#invalid}}
            <div class="error">
              The room name you chose is not valid.<br/><br/>
              Pick something with letters and numbers, between </br>
              4 and 25 characters long.
            </div>
          {{/invalid}}
        {{/userinfo}}


        {{^userinfo}}
          <div id="headline">
            The coolest way to share music with your friends.  
          </div>
           <div class="video">
              <iframe src="http://player.vimeo.com/video/29197507?title=0&amp;byline=0&amp;portrait=0" width="520" height="355" frameborder="0"></iframe>    
           </div>
         <div class="instructions">
            <div class="instructions_step">
              <span class="instructions_step_icon step_icon_1"></span>
              Create a room and invite your friends
            </div>
            <div class="instructions_step">
              <span class="instructions_step_icon step_icon_2"></span>
              Listen to music and chat in real-time
            </div> 
            <div class="instructions_step">
              <span class="instructions_step_icon step_icon_3"></span>
              Don't have MP3s? Browse SoundCloud! 
            </div>
         </div> 
          
         <div id="login">
           <a class="facebookbutton" href="/login/fb/?r={{room}}"></a> <br/><br/> 
           <a class="twitterbutton" href="/login/tw/?r={{room}}"></a>
          </div>
         <div id="disclaimer">
            We will <b>NEVER</b> publish to your account feed without you </br> explicitly choosing to do so.
          </div>
        {{/userinfo}}
      </div>

    </div>
    <div id="footer">
        <a href="/static/about.html">about</a> / <a href="http://blog.outloud.fm">blog</a>
      </div>

</body>
</html>
         

