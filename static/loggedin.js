$(document).ready(
    function(){
      if( rooms && rooms.length > 0){
        for(var i=0;i<rooms.length;i++){
          var room = rooms[i];
          var nowplaying = nowplayingsongs[i];
          var numlisteners = roomcounts[i];
          if(!numlisteners) numlisteners = 0;
          if( room != null ){
            var roomentry = 
            $('<div class="roomname"></div>')
              .append( $('<a href="/' + room + '">' + room + '</a>'))
              .append( document.createTextNode(' ') )
              .append($('<span class="listenercount">(' +numlisteners+ ' listeners)</span>'));
            if( nowplaying ){
              roomentry.append(
                $('<div class="recentnowplaying"></div>')
                  .append(document.createTextNode('&#9836;&nbsp; '))
                  .append($('<span class="title"></span>').text(nowplaying['Title']))
                  .append(document.createTextNode(' '))
                  .append($('<span class="meta">by</span>'))
                  .append(document.createTextNode(' '))
                  .append($('<span class="artist"></span>').text(nowplaying['Artist']))
              );
            }
            roomentry.appendTo('#recentlist')

            /*<div class="roomname">*/
            /*<div class="albumart" style="float:right">*/
            /*<img src="http://s3.amazonaws.com/albumart-outloud/art/QWP0a2oZqxiyeiDfHm0Bsw%3D%3D" width="40" heigh="40"/>*/
            /*</div>*/
            /*<a href="/dirtybeaches">dirtybeaches</a> <span class="listenercount">(14 listeners)</span>*/
            /*<div class="recentnowplaying">*/
            /*&#9836;&nbsp;<span class="title">Believer</span> <span class="meta">by</span> <span class="artist">John Maus</span>*/
            /*</div>*/
            /*</div>*/
            
          }
        }
      }
    }
);
