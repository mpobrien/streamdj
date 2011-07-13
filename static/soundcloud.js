var userSearchCallback = function(data){
  console.log("callback!");
  $('#search_spinner').hide();
  for(var i=0;i<data.length;i++){
    console.log(data[i]);
    $('<div class="userresult notplaying"></div>')
      .append($('<img class="albumartimg" src="' + data[i].avatar_url + '" width="24" height="24"></img>'))
      .append($('<span></span>').text(data[i].username + ' (' +data[i].track_count + ' tracks)' ))
      .appendTo('#searchresults')
      .data("user_id", data[i].id);
  }
}

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
      .appendTo('#searchresults')
      .data("url", data[i].permalink_url);
  }
}


function search(type){
  $('#search_spinner').show();
  var url;
  if( type != 'tracks') url = "http://api.soundcloud.com/users.json?client_id=07b794af61fdce4a25c9eadce40dda83&q=" + escape($('#user_query').val()) + "&callback=?"
  else url = "http://api.soundcloud.com/tracks.json?client_id=07b794af61fdce4a25c9eadce40dda83&q=" + escape($('#user_query').val()) + "&callback=?", 
  console.log("doing it", url);
  $.getJSON(url, type=='tracks' ? trackSearchCallback : userSearchCallback)
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

  $('.userresult').live({
    mouseenter: function(){
      $(this).addClass("schover");
    },

    mouseleave: function(){
      if(!$('#settingsmenu').is(':visible')){
        $(this).removeClass("schover");
      }
    },
    click: function(){
      console.log($(this).data('user_id'));
    }
  });

  $('.trackresult').live({
    mouseenter: function(){
      $(this).addClass("schover");
    },

    mouseleave: function(){
      if(!$('#settingsmenu').is(':visible')){
        $(this).removeClass("schover");
      }
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
