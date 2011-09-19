<html>
  <head>
    <link href='/static/loggedin.css' rel='stylesheet' type='text/css'/>
    <script type="text/javascript" src="/static/jquery.min.js"></script>
    <script type="text/javascript" src="/static/loggedin.js"></script>
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
  
      var rooms = [];
      var roomcounts = [] ;
      var nowplayingsongs = [];

    </script>
  </head>
  <body>
    <div id="logo">
       <img src="/static/ol_copy.png">
    </div>
    <div id="bodywrapper">
      {{#userinfo}}
        <div id="leftside">
          <div class="userinfo">
            <div id="picwrapper">
              <span id="profileimg"><img src="{{pic}}"/></span><span class="username">{{name}}</span>
            </div>
            <div id="logout">
              <a href="/logout" id="logout">logout</a>
            </div>
          </div>
        </div>
      {{/userinfo}}
      <div id="rightside">
        <div id="roomcreatewrapper">
          <div class="containerheading">Create a Room</div>
          <div class="formcontainer" style="text-align:center";>
            <form action="/room" method="POST">
              <label for="roomname">Room Name:</label>
              <input type="text" name="roomname" id="roomname" placeholder="room name" value="{{roomname}}" />
              <div style="width:200px; margin-left:40px;">
                <input type="submit" id="go" value="Go!"/>
              </div>
            </form>
          </div>
          <div style="padding-top:20px; font-size:.9em">
            For the friendless and the early adopters -<br/> join us in the <a href="/dirtybeaches">public room</a>!
          </div>
        </div>

        <div id="recentroomswrapper">
          <div class="containerheading" style="padding-top:30px">Rooms You've Visited Recently</div>
          <div>
            <!-- http://s3.amazonaws.com/albumart-outloud/art/QWP0a2oZqxiyeiDfHm0Bsw%3D%3D -->
            <div class="recentroom" id="recentlist">
            </div>
          </div>
        </div>
      </div>
      <div class="clearer"></div>
    </div>
    <div id="footer">
      <a href="/static/about.html">about</a>
    </div>
  </body>
</html>
         
	 
        
       















