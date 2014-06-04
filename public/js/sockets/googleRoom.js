var socket      = io.connect('http://localhost:3000');
var map;
var mapListeners = [];

$(document).ready(function(){
    var roomId = $('.container.google-room-chat').attr('id');
    var chatManagement = new Chat(socket);
    var mapsManagement = new GoogleMaps(socket, roomId);

    //
    // SOCKETS MANAGEMENT
    //

    /** Emitted when first time connected */
    socket.emit('google/connected', {roomId : roomId});

    /**
     * initalization of chat and map
     */
    socket.on('google/initialization', function(data){
        map = mapsManagement.initalize(data);
        addGoogleMapsEvents(map);
        //inicjalna data, tworzenie mapy zapendowanie messaegow
    })

    /**
     * Called when message is received message
     */
    socket.on('google/chat/message/receive', function(data){
        chatManagement.receiveMessage(data);
    })

    /**
     * Set center
     */
    socket.on('google/map/zoom/set', function(data){
        google.maps.event.removeListener(mapListeners['zoom_changed']);
        mapsManagement.onZoomChangedSet(data);
        mapListeners['zoom_changed'] = google.maps.event.addListener(map, 'zoom_changed', mapsManagement.onCenterChangedGet);
    });

    socket.on('google/map/center/set', function(data){
        mapsManagement.onCenterChangedSet(data);
    }.bind(this));

    //
    // DOM EVENTS
    //
    $('#message_send').on("click", function(event){
        chatManagement.sendMessage(roomId);
    }.bind(this));

    //
    //GOOGLE MAPS EVENTS
    //
    var addGoogleMapsEvents = function() {
        mapListeners['zoom_changed'] = google.maps.event.addListener(map, 'zoom_changed', mapsManagement.onZoomChangedGet);
        mapListeners['dragend']      = google.maps.event.addListener(map, 'dragend', mapsManagement.onCenterChangedGet);
        google.maps.event.addDomListener(window, "resize", function() {
            var center = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(center);
        });
    }
})