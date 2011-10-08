$(document).ready(function(){
  $('.controlItem').live({
    mouseenter: function(){
      $(this).addClass("hover");
    },

    mouseleave: function(){
      $(this).removeClass("hover");
    }, 

  });

  $('#skipper').click(
    function(){
      if(nowplayingId && nowplayingMeta && nowplayingMeta.uid == uidkey){
        $.get( '/' + roomname + '/skip/', {s:nowplayingId}, function(){ });
      }
  });



  $('#favoriteHeart').click( function(){
    if(!nowplayingId) return null;
    var params = {};
    params['s'] = nowplayingId;
    console.log(params);
    if( !$(this).hasClass('on') ){
      console.log("liking");
      $.get( '/like/', params, function(){
        $(me).removeClass('off').removeClass('hover').addClass('on');
      });
    }else{
      console.log("unliking");
      $.get( '/unlike/', params, function(){
        $(me).removeClass('on').removeClass('hover').addClass('off');
      });
    }
  });

  function activateTab(tabselector){
    $('#centertabs > .active').removeClass('active')
    $(tabselector).addClass('active')
    if(tabselector != '#chatstab'){
      $('#chatscontainer').hide();
    }else{
      $('#chatscontainer').show();
    }

    if(tabselector != '#favoritestab'){
      $('#faveslist').hide();
    }else{
      $('#faveslist').show();
    }

  }

  var loadFaves = function(pageNum){
    var pageNum = parseInt(pageNum);
    var faveslist = $('#faveslist');
    faveslist.html('')
    $.getJSON('/favorites/', {p:pageNum}, function(data){
      if(!data.faves || data.numFavorites == 0){
        //TODO add a messages saying no favorites yet
        //return;
      }
      var numPages = Math.ceil(data.numFavorites/10);
      if(numPages > 1){
        ps = createPagination(numPages, pageNum);
        faveslist.append(ps);
      }
      var faveitems = $('<ul class="faveitems"></ul>');
      faveslist.append(faveitems)
      for(var i=0;i<data.faves.length;i++){
        var faveitem = createFaveItem(data.faves[i]);
        if(i%2 == 0){ faveitem.addClass("odd")}
        faveitems.append(faveitem);
      }
    })
  }

  $('#favoritestab').click(
      function(){
        activateTab('#favoritestab')
        loadFaves(0)
      }
  )

  $('#chatstab').click(
      function(){
        activateTab('#chatstab')
      }
  )


})

function createFaveItem(item){
  var container = $('<div class="faveitem"></div>')
  var meta = $('<div class="favemeta"></div>')
  var pic = $('<div class="albumart"></div>').appendTo(container)
  meta.appendTo(container)
  if(item.picurl){
    $('<img>').attr("height", "48").attr("width", "48").attr("src", item.picurl).appendTo(pic)
  }else{
  }
  if(item.title){
    $('<div class="title"></div>').text(item.title).appendTo(meta)
  }
  if(item.artist){
    var artistContainer = $('<div></div>').append($('<span class="meta">by</span>')).append(document.createTextNode(' '))
    artistContainer.append($('<span class="artist"></span>').text(item.artist)).appendTo(meta)
  }
  if(item.album){
    var albumContainer = $('<div></div>').append($('<span class="meta">from</span>')).append(document.createTextNode(' '))
    albumContainer.append($('<span class="artist"></span>').text(item.album)).appendTo(meta)
  }
  if(item.scid){
    var sccontainer = $('<div></div>')
    sccontainer.append($('<a class="sclink"></a>').text("from SoundCloud").attr('href', "/sctrack/" + item.scid)).appendTo(meta)
  }
  container.append($('<div class="clearer"></div>'))
  return container;
}

function createPagination(numPages, currentPage){
  var container = $('<div class="pagination" id="favespages"></div>');
  var ul = $('<ul></ul>').appendTo(container)
  var prev = null;
  var next = null;
  var lis = [];
  if(numPages > 1){
    prev = $('<li class="prev"><a href="#">&larr; Previous</a></li>')
    if(currentPage = 0) prev.addClass("disabled")
    ul.append(prev)
    next = $('<li class="next"><a href="#">Next &rarr;</a></li>')
    if(currentPage = numPages - 1) next.addClass("disabled")
  }
  for(var i=0;i<numPages;i++){
    var li = $('<li><a href="#">' + (i+1) + '</a></li>');
    if(i == (currentPage-1)){
      li.addClass("active")
    }
    ul.append(li)
  }
  if(next!=null){
    ul.append(next)
  }
  return container;
}

function humanizeTime(seconds) {
  var interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return interval + " years";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}

