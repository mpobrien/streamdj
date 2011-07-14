var trackSearchCallback = function(data){
  $('#search_spinner').hide();
  for(var i=0;i<data.length;i++){
    console.log(data[i], data[i].artwork_url != null);
    var artwork = $('<div style="width:24px;height:24px; float:left;"></div>') 
    if( data[i].artwork_url != null ){
      artwork.append($('<img src="' + data[i].artwork_url + '" width="24" height="24" style="vertical-align:middle"></img>'))
    }else{
      artwork.html('&nbsp;')
    }
    var ms = data[i].duration;
    var seconds = Math.floor(ms / 1000) % 60;
    var minutes = Math.floor(ms / (1000 * 60)) % 60;
    var prettyDuration = minutes + ":" + String("0" + seconds).slice(-2);

    $('<div class="trackresult notplaying"></div>')
      .append(artwork)
      .append($('<div class="lilheart">&nbsp;</div>').text(data[i].favoritings_count))
      .append($('<span class="songlength"></span>').text(prettyDuration))
      .append($('<span class="title"></span>').text(data[i].title))
      .append(document.createTextNode(' '))
      .append($('<span class="meta">by</span>'))
      .append(document.createTextNode(' '))
      .append($('<span class="artist"></span>').text(data[i].user.username)) 
      .append($('<div class="previewlinks"></div>').hide()
          .append( $('<span class="prevlink preview">preview</span>'))
          .append( $('<span class="prevlink queue">queue</span>')))
      .appendTo('#searchresults')
      .data("url", data[i].permalink_url);
  }
}


function search(){
  $('#search_spinner').show();
  var url;
  url = "http://api.soundcloud.com/tracks.json?client_id=07b794af61fdce4a25c9eadce40dda83&filter=streamable&q=" + escape($('#user_query').val()) + "&callback=?", 
  $.getJSON(url, trackSearchCallback)
  $('#searchresults > div').remove();
}

var currentlyPlaying = null;

$(document).ready(function(){
  soundcloud.addEventListener('onPlayerReady', function(player, data){
    player.api_play();
  });
  $('#user_query').keypress( function(e){
    console.log("starting search!");
    if(e.keyCode==13 && $(this).val().length > 0 ){
      search($('#searchtype').val());
    } 
  })

  $('.trackresult').live({
    mouseenter: function(){
      $(this).addClass("schover");
      $(this).find('.previewlinks').css('display','inline').show();
    },

    mouseleave: function(){
      $(this).removeClass("schover");
      $(this).find('.previewlinks').hide();
    },

    click:function(){
      if( currentlyPlaying ){
        $(currentlyPlaying).removeClass('scplaying').addClass('notplaying')
      }
      console.log("setting", currentlyPlaying)
      currentlyPlaying = this;
      console.log("set", currentlyPlaying)
      $(this).addClass('scplaying').removeClass('notplaying');
      soundcloud.getPlayer('yourPlayerId').api_load($(this).data('url'));
    }
  });
})
