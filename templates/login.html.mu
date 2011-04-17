<html>
  <head>
  <link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'/>
  <link href='/static/login.css' rel='stylesheet' type='text/css'/>
  </head>
  <body>

    <div id="container">
      <div id="leftside">
        outloud<span class="dotfm">.fm</span>
        <div> <img src="/static/note.png"/> </div>
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
          <h1>Create or join a room</h1>
          <div class="formcontainer">
            <form action="/room" method="POST">
              <label for="roomname">Room Name:</label>
              <input type="text" name="roomname" id="roomname" placeholder="room name" value="{{roomname}}" />
              <div style="width:200px;margin-left:auto;margin-right:auto">
                <input type="submit" id="go" value="Go!"/>
              </div>
            </form>
          </div>
        {{/userinfo}}

        {{^userinfo}}
          <div>
            <a href="/login"><img src="/static/twitter.png"/></a>
            <a href="/login" style="padding-left:10px">Log In via Twitter</a>
          </div>
          <br/>
          <span class="disclaimer">
            We'll never publish anything<br/> without your explicit permission first.
          </span>
        {{/userinfo}}
      </div>
    </div>









    <div style="text-align:center; color:#efffd3; font-size:44px; padding-top:2cm;">
    </div>
    <div style="padding-top:50px; padding-bottom:30px;">
    </div>
    <div id="info">
    </div>
  </body>
</html>
