<html>
  <body>

    <head>
      <link href='http://fonts.googleapis.com/css?family=Kreon' rel='stylesheet' type='text/css'/>
      <link href='/static/room.css' rel='stylesheet' type='text/css'/>
      <style>
        .error{
          font-size:18px;
          color:red;
          text-align:center;
          padding:15px;
        }
      </style>
    </head>

  
    <div id="roomform">
      <div style="text-align:center; color:#efffd3; font-size:44px; padding-bottom:40px;">
        outloud<span class="dotfm">.fm</span>
      </div>
      {{#invalid}}
        <div class="error">
          The room name you chose is not valid.<br/><br/>
          Pick something with only letters, numbers, and spaces that's between 6 and 15 characters long.
        </div>
      {{/invalid}}
      <div style="width:100%; margin-left:auto; margin-right:auto">
        <form action="/room" method="POST">
          <label for="roomname">Room Name:</label>
          <input type="text" name="roomname" id="roomname" placeholder="room name" value="{{roomname}}" />
          <div style="width:200px;margin-left:auto;margin-right:auto">
            <input type="submit" id="go" value="Go!"/>
          </div>
        </form>
      </div>
    </div>
  </body>
</html>
