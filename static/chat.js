
var fetchMessages = function(){
    $.post('/a/message/updates', 
        function(data){
            for(msg in data.messages){
                message = data.messages[msg]
                console.debug(message);
                var newmsghtml;
                if( message.type=='chat'){
                  newmsghtml = $('<div class="message" id="' + message["id"] + '"><b>' + message["from"] + ': </b>' +  message["body"] + '</div>')
                }else if(message.type=='enq'){
                  newmsghtml = $('<div class="enqueued" id="' + message["id"] + '"><b>' + message["from"] + ' </b> added <span class="filename">' +  message["body"] + '</span> to the queue.</div>')
                }
                newmsghtml.appendTo('#chats')
                var objDiv = document.getElementById("chats");
                objDiv.scrollTop = objDiv.scrollHeight;
            }
            fetchMessages();
        },'json')
}

var sendMessage = function(){
    $.getJSON('/a/message/new?chat=' + escape($('#newchat').val()), function(data){console.debug(data)}, 'json');
    $('#newchat').val('');
}
