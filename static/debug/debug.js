var outbox = document.getElementById("outbox");
var inbox = document.getElementById("inbox");

function log(msg) {
    outbox.value += "\n"+msg;
    outbox.scrollTop = outbox.scrollHeight;
}

var socket;

var commands = {
    connect: function () {
        socket = io(document.location.origin, {
            transports: ["websocket"],
        });
        allEventify(socket);
        socket.on("disconnect", () => {
            log("Disconnected");
        });
        socket.on("*", (x,y) => {
            log(x+": "+JSON.stringify(y));
        });
        log("Connect");
    },
    login: function ([_,tok]) {
        log(tok);
        socket.emit("login", {
            token: tok,
        });
    }
};

inbox.addEventListener("keydown", function (e) {
    if (e.keyCode == 13) {
        if (inbox.value.trim()=="")
            return;
        let s = inbox.value.trim().split(" ");
        if (s[0] && commands[s[0]]) {
            commands[s[0]](s);
        } else {
            log("Unknown: [\""+s.join("\", \"")+"\"]");
        }
        inbox.value = "";
    }
});

function allEventify(sock) {
    var onevent = sock.onevent;
    sock.onevent = function (packet) {
        var args = packet.data || [];
        onevent.call (this, packet);    // original call
        packet.data = ["*"].concat(args);
        onevent.call(this, packet);      // additional call to catch-all
    }
}
