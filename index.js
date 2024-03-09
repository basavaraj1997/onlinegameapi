import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

const clients = {}; // Map connection IDs to group names

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(data)
        if (data.type === 'joinGroup') {
            const { roomName } = data;
            clients[ws._socket.remoteAddress] = roomName;
            wss.clients.forEach((client) => {
                if (client !== ws && clients[client._socket.remoteAddress] === roomName) {
                    client.send(JSON.stringify({
                        type: 'groupJoined',
                        newUserName: roomName,
                        groupName: roomName
                    }));
                }
                availableGroupsUpdated(ws);
            });
        } else if (data.type === 'leaveGroup') {
            const { roomName } = data;
            delete clients[ws._socket.remoteAddress];
            console.log(`Client left group: ${roomName}`);
            availableGroupsUpdated(ws)
        } else if (data.type === 'sendMessage') {
            const { user, message } = data;
            console.log(`Message sent to all: ${user}: ${message}`);

            wss.clients.forEach((client) => {
                client.send(JSON.stringify({
                    type: 'receiveMessage',
                    user,
                    message
                }));
            });
        } else if (data.type === 'sendMessageToGroup') {
            const { groupname, sender, message } = data;
            wss.clients.forEach((client) => {
                if (clients[client._socket.remoteAddress] === groupname) {
                    client.send(JSON.stringify({
                        type: 'receiveMessage',
                        sender,
                        message
                    }));
                }
            });
        }
    });
    const availableGroupsUpdated = (ws) => {
        const groupNames = [];
        for (const remoteAddress in clients) {
            if (clients.hasOwnProperty(remoteAddress)) {
                const roomName = clients[remoteAddress];
                groupNames.push(roomName);
            }
        }

        wss.clients.forEach((client) => {
                client.send(JSON.stringify({
                    type: 'availableGroupsUpdated',
                    groups: groupNames
                }));
        });
    }

    ws.on('close', () => {
        const roomName = clients[ws._socket.remoteAddress];
        if (roomName) {
            console.log(`Client left group: ${roomName}`);
            delete clients[ws._socket.remoteAddress];

            wss.clients.forEach((client) => {
                if (client !== ws && clients[client._socket.remoteAddress] === roomName) {
                    client.send(JSON.stringify({
                        type: 'joinedGroup',
                        message: `${ws._socket.remoteAddress} has left the group ${roomName}.`
                    }));
                }
            });
        }
    });



});

// server.listen(process.env.PORT || 8080, () => {
//     console.log(`Server listening on port ${process.env.PORT || 8080}`);
// });
