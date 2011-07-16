var sc_clientId = "07b794af61fdce4a25c9eadce40dda83";
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
    var hours = Math.floor(ms / (1000 * 60 * 60)) % 60;
    var prettyDuration;
    if( hours>0 ){
      prettyDuration = hours + ':' + String("0" + minutes).slice(-2) + ":" + String("0" + seconds).slice(-2);
    }else{
      prettyDuration = minutes + ":" + String("0" + seconds).slice(-2);
    }
    var prettyDuration = (hours >0?hours+':' : '') + minutes + ":" + String("0" + seconds).slice(-2);
    var prettyDuration = (hours>0?hours+':' : '') + minutes + ":" + String("0" + seconds).slice(-2);

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
          .append( $('<span class="prevlink preview">preview</span>').data("id", data[i].id))
          .append( $('<span class="prevlink queue">queue</span>').data("id", data[i].id)))
      .appendTo('#searchresults')
      .data("url", data[i].permalink_url)
      .data("id", data[i].id);
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
    console.log("ready");
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
  });
})
