var ejs = require('ejs');
var fs  = require('fs');

module.exports = function(sockets) {
    this.ioSockets = sockets;


    /**
     * On connection arrived
     * @param type
     * @param callback
     */
    this.connected = function(options, callback){
        var type = options.type;
        if(type == 'rooms') {
            this.connectedRooms(callback, options.socket);
        }
    };


    /**
     * Get all rooms with html template
     * @param callback
     */
    this.connectedRooms = function(callback, socket) {
        var roomManagement = require('../modules/RoomManagement');
        var roomHelper     = new roomManagement();

        roomHelper.index(function(rooms){
            var html           = '';
            for(var i=0; i<rooms.length; i++){
                rooms[i].onlineUsers = (this.ioSockets.clients(rooms[i].id)).length;
                var ejsTemplate = fs.readFileSync(__dirname + '/../views/room_template.ejs', 'utf8');
                html            += ejs.render(ejsTemplate, {room: rooms[i], loggedUser: socket.handshake.user.username});
            }
            callback(html);
        }.bind(this));
    };


    this.ioSockets.on('connection', function(socket){

        socket.on('connected', function(object){
            socket.join('rooms');
            object.socket = socket;
            this.connected(object, function(html){
                socket.emit('rooms/index', html);
            }.bind(this));
        }.bind(this));

        socket.on('room/create/server', function(room){
            var roomManagement = require('../modules/RoomManagement');
            var roomHelper     = new roomManagement();

            var name     = room.name;
            var password = room.password;

            roomHelper.addRoom({
                roomName: name,
                password: password,
                username: socket.handshake.user.username
            }, function(results){
                var errors = (typeof results.errorList !== "undefined" && results.errorList.length > 0) ? results : false;
                if(!errors) {
                    errors = {
                        errorList : ['Room has been created.'],
                        type      : 'success',
                        room      : results
                    };
                }
                if(typeof errors.room === "undefined") {
                    socket.emit('rooms/create/client', JSON.stringify(errors));
                }else {
                    var ejsTemplate = fs.readFileSync(__dirname + '/../views/room_template.ejs', 'utf8');
                    var html     = ejs.render(ejsTemplate, {room: errors.room, loggedUser: errors.room.owner});

                    this.ioSockets.in('rooms').emit('rooms/index', html);
                    socket.emit('rooms/create/client', JSON.stringify(errors));
                }
            }.bind(this));
        }.bind(this));

        socket.on('room/remove', function(id){
            var roomManagement = require('../modules/RoomManagement');
            var roomHelper     = new roomManagement();

            var object = {
                username: socket.handshake.user.username,
                id      : id
            };
            roomHelper.removeRoom(object);
        });

        socket.on('room/join', function(data){
            var roomManagement = require('../modules/RoomManagement');
            var roomHelper     = new roomManagement();

            roomHelper.findById(data, function(room){
                if(room.password == data.password) {
                    socket.emit('room/join/get', {redirect : '/rooms/' + data.roomId})
                }else {
                    socket.emit('room/join/get', {failure: 'Wrong password', id: 'joinModal' + data.roomId})
                }
            });
        })

    }.bind(this));

};