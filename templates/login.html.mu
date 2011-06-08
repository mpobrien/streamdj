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
       <img src="/static/ol_med.png">
      </div>
    </div>


	    <div id="rightside">

        {{#userinfo}}
          <div>
            <div class="userinfo" style="float:left; width:100%">
              <div style="float:left">
                <span id="profileimg"><img src="{{pic}}"/></span><span class="username">{{name}}</span>
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
              Pick something with only letters and numbers, between </br>
              6 and 15 characters long.
            </div>
          {{/invalid}}
        {{/userinfo}}


        {{^userinfo}}
          <div id="headline">
          
            The coolest way to share</br> music with your friends.  
          </div>
          <div id="blurb">
            OUTLOUD.FM lets you create rooms where you can chat <br> and listen to music with your friends with a real time <br>collaborative playlist. Just sign in, pick a room name, and<br> start uploading music! 
          </div>
          <div class="slideshow" id="flavor_1"></div>
          <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.5.2/jquery.js"></script>
          <script src="/static/agile_carousel.a1.js"></script>
          <script>
            $.getJSON("/static/agile_carousel_data.php", function(data) {
                $(document).ready(function(){
                    $("#flavor_1").agile_carousel({
                        carousel_data: data,
                        carousel_outer_height: 330,
                        carousel_height: 330,
                        slide_height: 230,
                        carousel_outer_width: 510,
                        slide_width: 510,
                        transition_time: 300,
                        timer: 4000,
                        continuous_scrolling: true,
                        control_set_1: "numbered_buttons",
                        no_control_set: "hover_previous_button,hover_next_button"
                    });
                });
            });
          </script>
          <div id="start"> Get Started!  </div> 
            {{#errors}}
              <div style="color:red;text-align:center;font-size:16px;">{{msg}}</div>
            {{/errors}}
          <div id="login">
            <a href="/login/tw/?r={{room}}"><img src="/static/signtwitter.png"/></a> -or- <a href="/login/fb/?r={{room}}"><img src="/static/signfacebook.png"/></a>
          </div>
          <div id="disclaimer">
            We will <b>NEVER</b> publish to your account feed<br/> without you explicitly choosing to do so.
          </div>
        {{/userinfo}}
      </div>

    <div style="text-align:center; color:#efffd3; font-size:44px; padding-top:2cm;">
    </div>
    <div style="padding-top:50px; padding-bottom:30px;">
    </div>
    <div id="info">
    </div>
    <div id="footer">
      <a href="/static/about.html">about</a>
    </div>
  </body>
</html>
         
	 
        
       














