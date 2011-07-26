var lastQuery;
var sc_clientId = "07b794af61fdce4a25c9eadce40dda83";
var trackSearchCallback = function(data){
  $('#search_spinner').hide();
  if( data.length == 0 ){
    $('<tr></tr>').append(
        $('<td class="noresults"></td>')
        .text('No tracks found on Soundcloud matching:'))
      .appendTo('#results_table');
    $('<tr></tr>').append(
       $('<td class="noresults_qry"></td>').text('\"' + lastQuery + '\"'))
      .appendTo('#results_table')
    return;
  }
  for(var i=0;i<data.length;i++){
    console.log(data[i], data[i].artwork_url != null);
    var artwork = $('<div class="trackresultart"></div>') 
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
                   //results_table
    $('<tr class="trackresult"></tr>')
      .append($('<td></td>').append(artwork))
      .append($('<td></td>').append($('<div class="lilheart">&nbsp;</div>').text(data[i].favoritings_count)))
      .append($('<td></td>').append($('<span class="trackresultinfo"></span>')
          .append($('<span class="songlength"></span>').text(prettyDuration))
          .append($('<span class="title"></span>').text(data[i].title))
          .append(document.createTextNode(' '))
          .append($('<span class="meta">by</span>'))
          .append(document.createTextNode(' '))
          .append($('<span class="artist"></div>').text(data[i].user.username))))
      .append($('<td width="80"></td>')
          .append($('<div class="prevlink preview scnotplaying">preview</div>').data("trackinfo", data[i]).hide()))
      .append($('<td width="60"></td>')
          .append($('<div class="prevlink queue">queue</div>').data("trackinfo", data[i]).hide()))
      .appendTo('#results_table')
  }
}


function search(){
  $('#search_spinner').show();
  var url;
  lastQuery = $('#user_query').val();
  url = "http://api.soundcloud.com/tracks.json?client_id=07b794af61fdce4a25c9eadce40dda83&filter=streamable&duration\[to\]=1200000&q=" + escape($('#user_query').val()) + "&callback=?", 
  $.getJSON(url, trackSearchCallback)
  $('.trackresult, .noresults, .noresults_qry').remove();
}

var currentlyPlaying = null;
var currentlyQueueing = null;

$(document).ready(function(){
  soundcloud.addEventListener('onPlayerReady', function(player, data){
    console.log("ready");
  });
  $('#user_query').keypress( function(e){
    if(e.keyCode==13 && $(this).val().length > 0 ){
      search($('#searchtype').val());
    } 
  })

  $('.trackresult').live({
    mouseenter: function(){
      $(this).addClass("schover");
      $(this).find('.preview, .queue').show();
    },

    mouseleave: function(){
      $(this).removeClass("schover");
      var previewdiv = $(this).find('.preview')
      if( !previewdiv.hasClass('scplaying') ){
        previewdiv.hide();
      }

      var queuediv = $(this).find('.queue')
      if( !queuediv.hasClass('queueing') ){
        console.log("doesn't have", queuediv.attr('class'))
        queuediv.hide();
      }else{
        console.log("has")
      }
    },
  });
})
