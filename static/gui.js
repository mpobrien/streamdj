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

})
