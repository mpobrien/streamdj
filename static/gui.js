$(document).ready(function(){

  $('.scpreview').live({
    click:function(){
    }
  })
  $('#settingspanel input').change(function(){
    $('#savesettings').removeClass("disabled")
  })

  $('#savesettings').click(
    function(){
      var params = {}
      params.notify_chat = $('#notifyonchat').attr('checked') ? "1" : "0"
      params.notify_song = $('#notifyonsong').attr('checked') ? "1" : "0"
      settings.notify_chat = $('#notifyonchat').attr('checked')
      settings.notify_song = $('#notifyonsong').attr('checked')
      $.getJSON('/savesettings/', params, function(data){
        var newalert = $('<div style="margin:5px; text-align:center; font-weight:bold;font-size:1.2em" class="alert-message block-message success">OK, Your settings have been saved!</div>')
        var closer = function(x){
          return function(){
            $(x).fadeOut(function(){
              $(this).remove();
            })
          }
        }(newalert)
        $('#savesettings').addClass('disabled').after(newalert)
        setTimeout(closer, 1000);
      })
    });

  $('.scqueue').live({
    click:function(){
      if(isqueueingId) return;
      numinqueue = $('.delsong').length;
      if( numinqueue >= 5){
        alert("Sorry, you've already got 5 songs in the queue already! Let one play before adding more.");
        return;
      }
      //$('.queue').addClass('qdisabled')
      $('.scqueue').addClass('disabled')
      currentlyQueueingItem = $(this);
      var scid = $(this).parents('.controls').data("scid")
      isqueueingId = scid;
      $(this).removeClass('qdisabled').addClass('queueing')
      $.get( '/' + roomname + '/scqueue/', {t:scid}, function(){
      });
    }
  })

  $('.controlItem').live({
    mouseenter: function(){
      $(this).addClass("hover");
    },

    mouseleave: function(){
      $(this).removeClass("hover");
    }, 

  });

  $('#favespages li').live({
    click:function(){
      var page = $(this).data("pagenum");
      if(page >= 0){
        loadFaves(page);
      }
    }
  })
  
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
    if( !$(this).hasClass('on') ){
      $.get( '/like/', params, function(){
        $(me).removeClass('off').removeClass('hover').addClass('on');
      });
    }else{
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
      loadFaves(0);
    }

    if(tabselector != '#settingstab'){
      $('#settingspanel').hide();
    }else{
      $('#settingspanel').show();
      setupSettings();
    }
  }

  var loadFaves = function(pageNum){
    var pageNum = parseInt(pageNum);
    var faveslist = $('#faveslist');
    faveslist.html('').show()
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

  $('#settingstab, #favoritestab, #chatstab').click(
    function(){
      activateTab('#' + $(this).attr('id'))
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
    container.append($('<div class="controls"><div class="btn small scpreview" style="display:block">Preview</div><div class="btn small scqueue" style="display:block">Queue</div></div>').data("scid",item.scid))
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
    if(currentPage == 0){ 
      prev.addClass("disabled")
    }else{
      prev.data("pagenum", currentPage-1)
    }
    ul.append(prev)
    next = $('<li class="next"><a href="#">Next &rarr;</a></li>')
    if(currentPage == numPages - 1){
      next.addClass("disabled")
    }else{
      next.data("pagenum", currentPage+1)
    }
  }
  for(var i=0;i<numPages;i++){
    var li = $('<li><a href="#">' + (i+1) + '</a></li>');
    if(i == currentPage){
      li.addClass("active")
    }else{
      li.data("pagenum", i)
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

function setupNotify(){
  if( window.webkitNotifications.checkPermission() > 0 ){
    $('#desktopenabler').show();
    $('#notifyonsong').attr('disabled', true);
    $('#notifyonchat').attr('disabled', true);
  }else{
    $('#desktopenabler').hide();
    $('#notifyonsong').attr('disabled', false);
    $('#notifyonchat').attr('disabled', false);
  }
}

function setupSettings(){
  setupNotify();
  $('#notifyonsong').attr("checked", settings.notify_song > 0)
  $('#notifyonchat').attr("checked", settings.notify_chat > 0)
}

