var port = 80
var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var bodyParser = require('body-parser')
const os = require('os');
var createHash = require('sha.js')
var uptimer = require('uptimer')
const ipInfo = require("ipinfo");
var pg = require('pg');
var server = app.listen(process.env.PORT || 80);

var router = express.Router();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
var dburl = process.env.DATABASE_URL;
const { Client } = require('pg')
const client = new Client({
  connectionString: dburl,
})
client.connect()
//DB SET UP
//var ticks = [];
var users = [];
var wake = {};
var dataqueues = {};
var rooms = {};
var roomdata = {};
var players = {};
var emojis = {};
roomdata["admin"] = {"owner":"","name":"admin"};
rooms["admin"] = {"exists":true};
/*function tick(com) {
  function timeout() {
    setTimeout(function () {
        console.log("ok");
        if (com == "rtr_unixtime") {
          console.log({"type":"cmdrtr","value":"SystemTime: "+Date.now()});
          dataqueue.push({"type":"cmdrtr","value":"SystemTime: "+Date.now()});
        }
      timeout();
    }, 200);
  }
  timeout();
}*/
function adddata (type, value) {
  var arrayLength = users.length;
  for (var i = 0; i < arrayLength; i++) {
    dataqueues[users[i]].push({"type":type, "value":value});
    console.log(dataqueues);
  }
}
function addroomdata (type, value, room) {
  var arrayLength = users.length;
  for (var i = 0; i < arrayLength; i++) {
    rooms[room][users[i]].push({"type":type, "value":value});
  }
}
function genid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
var discover = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send({
  "name": "GSR Server",
  "ip": "notneeded",
  "version": "1"
});
}
var connect = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    client.query("SELECT * FROM bans WHERE fingerprint ='"+req.body.fingerprint+"'", function(err2, result1) {
          if(err2) return console.error(err2);
          console.log(result1);
          if (result1.rows.length != 0) {
            if (result1.rows[0].banned == "true") {
              res.send({"error":"banned"});
            } else {
              var id = genid();
              users.push(id);
              wake[id] = {"status":"online", "wakecount":0};
              var sha256 = createHash('sha256')
              var h = sha256.update(id, 'utf8').digest('hex')
              var wplay = players;
              players[id] = {"playerid":h, nickname:"anonymous", color:"white", online:"true", admin:"false", "fingerprint":req.body.fingerprint};
              dataqueues[id] = [];
              adddata("newplayer", players[id]);
              res.send({"type":"id","value":id,"players":wplay});
              ipInfo(req.headers['x-forwarded-for'] || req.connection.remoteAddress, (err, cLoc) => {
                  console.log(err);
                  adddata("chat", players[id].nickname+" from "+cLoc.city+", "+cLoc.region+" has connected.");
              });
              dataqueues[id].push({"type":"chat", "value":"<div style='color:Fuchsia;'>FuchsiaChat</div>"});
              dataqueues[id].push({"type":"chat", "value":"<div>Help>><br>/nick NICKNAME COLOUR - Changes your nickname. Note: nicknames can only be one word.<br></div>"});
              client.query("SELECT * FROM server WHERE id ='0'", function(err3, result2) {
                    if(err3) return console.error(err3);
                    console.log(result2);
                    dataqueues[id].push({"type":"chat", "value":result2.rows[0].motd});
              });
            }
          } else {
              var id = genid();
              users.push(id);
              wake[id] = {"status":"online", "wakecount":0};
              var sha256 = createHash('sha256')
              var h = sha256.update(id, 'utf8').digest('hex')
              var wplay = players;
              players[id] = {"playerid":h, nickname:"anonymous", color:"white", online:"true", admin:"false", "fingerprint":req.body.fingerprint};
              dataqueues[id] = [];
              adddata("newplayer", players[id]);
              res.send({"type":"id","value":id,"players":wplay});
              ipInfo(req.headers['x-forwarded-for'] || req.connection.remoteAddress, (err, cLoc) => {
                  console.log(err);
                  adddata("chat", players[id].nickname+" from "+cLoc.city+", "+cLoc.region+" has connected.");
              });
              dataqueues[id].push({"type":"chat", "value":"<div style='color:Fuchsia;'>FuchsiaChat</div>"});
              dataqueues[id].push({"type":"chat", "value":"<div>Help>><br>/nick NICKNAME COLOUR - Changes your nickname. Note: nicknames can only be one word.<br></div>"});
              client.query("SELECT * FROM server WHERE id ='0'", function(err3, result2) {
                    if(err3) return console.error(err3);
                    console.log(result2);
                    dataqueues[id].push({"type":"chat", "value":result2.rows[0].motd});
              });
            }
    });
}
var data = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    console.log("test");
    var glid = req.body.id;
    var fnd = false;
    var arrayLength = users.length;
    for (var i = 0; i < arrayLength; i++) {
      if (users[i] == glid) {
        fnd = true;
        console.log("got id");
        if (req.body.type == "chat") {
          if (req.body.value.match(/(@)\w+/)) {
            var rg = /(@)\w+/;
            var m = rg.exec(req.body.value);
            for (var p in players) {
              if (players.hasOwnProperty(p)) {
                if (players[p].nickname == m[0].replace('@','')) {
                  if (players[p].inroom == true && players[glid].room == players[p].room) {
                    rooms[players[p].room][p].push({"type":"notification", "nickname":players[req.body.id].nickname, "msg":req.body.value});
                  } else {
                    dataqueues[p].push({"type":"notification", "nickname":players[req.body.id].nickname, "msg":req.body.value});
                  }
                }
              }
            }
          }
          console.log("chat");
          if (players[glid].inroom == true) {
            if (players[glid].admin == "true") {
              var nc = "<span class='pulsate' style='text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff, 0 0 20px "+players[req.body.id].color+", 0 0 35px "+players[req.body.id].color+", 0 0 40px "+players[req.body.id].color+", 0 0 50px "+players[req.body.id].color+", 0 0 75px "+players[req.body.id].color+"; color:"+players[req.body.id].color+"'>"+players[req.body.id].nickname+"</span>";
              addroomdata(req.body.type, nc+": "+req.body.value, players[glid].room);
            } else {
              var nc = "<span style='color:"+players[req.body.id].color+"'>"+players[req.body.id].nickname+"</span>";
              addroomdata(req.body.type, nc+": "+req.body.value, players[glid].room);
            }
          } else {
            if (players[glid].admin == "true") {
              var nc = "<span class='pulsate' style='text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff, 0 0 20px "+players[req.body.id].color+", 0 0 35px "+players[req.body.id].color+", 0 0 40px "+players[req.body.id].color+", 0 0 50px "+players[req.body.id].color+", 0 0 75px "+players[req.body.id].color+"; color:"+players[req.body.id].color+"'>"+players[req.body.id].nickname+"</span>";
              adddata(req.body.type, nc+": "+req.body.value);
            } else {
              var nc = "<span style='color:"+players[req.body.id].color+"'>"+players[req.body.id].nickname+"</span>";
              adddata(req.body.type, nc+": "+req.body.value);
            }
          }
          res.send({"ok":"ok"});
        }
        if (req.body.type == "sendrtcid") {
          players[req.body.id].rtcid = req.body.value;
          res.send({"ok":"ok"});
        }
        if (req.body.type == "rtcnick") {
          for (var p in players) {
            if (players.hasOwnProperty(p)) {
              if (players[p].rtcid == req.body.value) {
                res.send({"nickname":players[p].nickname});
              }
            }
          }
        }
        if (req.body.type == "nickrtc") {
          for (var p in players) {
            if (players.hasOwnProperty(p)) {
              if (players[p].nickname == req.body.value) {
                res.send({"rtcid":players[p].rtcid});
              }
            }
          }
        }
        if (req.body.type == "cmd") {
          var sp = req.body.value.split(" ");
          if (sp[0] == "/nick" &&  sp[1] != undefined) {
            for (var p in players) {
              if (players.hasOwnProperty(p)) {
                if (players[p].nickname == sp[1]) {
                  if (players[req.body.id].inroom == true) {
                    console.log("inroomerr trig");
                rooms[players[req.body.id].room][req.body.id].push({"type":"chat", "value":"<div style='color:red;'>ERROR: Nickname in use.</div>"});
                break;
              } else if (players[req.body.id].inroom == false) {
                console.log("inroomerrelse trig");
                dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:red;'>ERROR: Nickname in use.</div>"});
                break;
              }
            } else {
              if (sp[2]) {
                if (players[req.body.id].loggedin == true) {
                  client.query("UPDATE users SET nickname='"+sp[1]+"', color='"+sp[2]+"' WHERE username='"+players[req.body.id].dbusername+"' RETURNING id, username, password, nickname, color, admin;", function(err2, result) {
              if(err2) return console.error(err2);
              console.log(result);
          });
              }
                players[req.body.id].nickname = sp[1];
                players[req.body.id].color = sp[2];
                if (players[req.body.id].inroom == true) {
                  console.log("inroom trig");
                  rooms[players[req.body.id].room][req.body.id].push({"type":"chat", "value":"<div style='color:CornflowerBlue;'>SERVER: Nickname Set</div>"});
                } else if (players[req.body.id].inroom == false) {
                  console.log("inroomelse trig");
                  dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:CornflowerBlue;'>SERVER: Nickname Set</div>"});
                }
              } else {
                if (players[req.body.id].loggedin == true) {
                  client.query("UPDATE users SET nickname='"+sp[1]+"' WHERE username='"+players[req.body.id].dbusername+"' RETURNING id, username, password, nickname, color, admin;", function(err2, result) {
              if(err2) return console.error(err2);
              console.log(result);
          });
              }
                console.log("actual set trig");
                players[req.body.id].nickname = sp[1];
                dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:CornflowerBlue;'>SERVER: Nickname Set</div>"});
                break;
              }
            }
          }
        }
          } else if (sp[0] == "/online") {
                var listb = "\\<span style='color:CornflowerBlue'>Users</span><br>";
                for (var p in players) {
                  if (players.hasOwnProperty(p)) {
                    if (players[p].online == true) {
                      listb += "<span style='color:#2ecc71'>● Online</span> | "+players[p].nickname + "<br>";
                    }
                  }
                }
                listb += "\\uptime:"+uptimer.getAppUptime();
                if (players[req.body.id].inroom == true) {
                  rooms[players[req.body.id].room][req.body.id].push({"type":"chat", "value":listb});
                } else {
                  dataqueues[req.body.id].push({"type":"chat", "value":listb});
                }
          } else if (sp[0] == "/online_admin" && players[req.body.id].admin == "true") {
                var listb = "\\<span style='color:CornflowerBlue'>Users</span><br>";
                for (var p in players) {
                  if (players.hasOwnProperty(p)) {
                    if (players[p].online == true) {
                      listb += "<span style='color:#2ecc71'>● Online</span> | "+players[p].nickname + " | " +p+ "<br>";
                    }
                  }
                }
                listb += "\\uptime:"+uptimer.getAppUptime();
                if (players[req.body.id].inroom == true) {
                  rooms[players[req.body.id].room][req.body.id].push({"type":"chat", "value":listb});
                } else {
                  dataqueues[req.body.id].push({"type":"chat", "value":listb});
                }
          } else if (sp[0] == "/loadavg") {
                if (players[req.body.id].inroom == true) {
                  rooms[players[req.body.id].room][req.body.id].push({"type":"chat", "value":"Load Average: "+os.loadavg()});
                } else {
                  dataqueues[req.body.id].push({"type":"chat", "value":"Load Average: "+os.loadavg()});
                }
          } else if (sp[0] == "/freemem") {
                if (players[req.body.id].inroom == true) {
                  rooms[players[req.body.id].room][req.body.id].push({"type":"chat", "value":"Free Mem: "+os.freemem()});
                } else {
                  dataqueues[req.body.id].push({"type":"chat", "value":"Free Mem: "+os.freemem()});
                }
          } else if (sp[0] == "/login") {
            client.query("SELECT * FROM users WHERE username ='"+sp[1]+"'", function(err2, result) {
          if(err2) return console.error(err2);
          console.log(result);
          if (sp[2] == result.rows[0].password) {
            players[req.body.id].dbusername = result.rows[0].username;
            players[req.body.id].nickname = result.rows[0].nickname;
            players[req.body.id].color = result.rows[0].color;
            players[req.body.id].admin = result.rows[0].admin;
            players[req.body.id].loggedin = true;
            dataqueues[req.body.id].push({"type":"chat", "value":"Logged In."});
          } else {
            dataqueues[req.body.id].push({"type":"chat", "value":"Password or Username is incorrect."});
          }
      });
            /*if (sp[1] == "xdx" && sp[2] == "&$") {
              players[req.body.id].admin = "true";
              dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:lightgreen;'>SERVER: Logged in as admin.</div>"});
            } else {
              dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:red;'>SERVER: Wrong admin password!!!</div>"});
            }*/
          } else if (sp[0] == "/newuser" && players[req.body.id].admin == "true") {
            client.query("INSERT INTO users(username,password,admin) VALUES('"+sp[1]+"', '"+sp[2]+"', '"+sp[3]+"') RETURNING id, username, password, nickname, color, admin;", function(err2, result) {
          if(err2) dataqueues[req.body.id].push({"type":"chat", "value":err2});
          console.log(result);
          dataqueues[req.body.id].push({"type":"chat", "value":"Created new user "+result.rows[0].username});
      });
          } else if (sp[0] == "/img") {
              if (sp[1]) {
                var nc = "<span style='color:"+players[req.body.id].color+"'>"+players[req.body.id].nickname+"</span>";
                if (players[req.body.id].inroom == true) {
                  addroomdata("chat", nc+": <img height='75px' src='"+sp[1]+"'></img>");
                } else {
                  adddata("chat", nc+": <img height='75px' src='"+sp[1]+"'></img>");
                }
              }
          } else if (sp[0] == "/kick" && players[req.body.id].admin == "true") {
              if (sp[1] && sp[1] != undefined) {
              for (var p in players) {
                if (players.hasOwnProperty(p)) {
                  if (players[p].nickname == sp[1]) {
                        dataqueues[p].push({"type":"kick","value":""});
                        adddata("chat", "<div style='color:red;'>SERVER: "+players[p].nickname+" was kicked by "+players[req.body.id].nickname+"</div>");
                    }
                  }
              }
              }
          } else if (sp[0] == "/kickid" && players[req.body.id].admin == "true") {
              if (sp[1] && sp[1] != undefined) {
                dataqueues[sp[1]].push({"type":"kick","value":""});
                adddata("chat", "<div style='color:red;'>SERVER: "+players[sp[1]].nickname+" was kicked by "+players[req.body.id].nickname+"</div>");
              }
          } else if (sp[0] == "/banid" && players[req.body.id].admin == "true") {
              if (sp[1] && sp[1] != undefined) {
                client.query("INSERT INTO bans(fingerprint,username,banned) VALUES('"+players[sp[1]].fingerprint+"', '"+players[sp[1]].nickname+"', 'true') RETURNING id, fingerprint, reason, banned, username;", function(err2, result) {
                  if(err2) dataqueues[req.body.id].push({"type":"chat", "value":err2});
                  console.log(result);
                  dataqueues[sp[1]].push({"type":"kick","value":""});
                  adddata("chat", "<div style='color:red;'>SERVER: "+players[sp[1]].nickname+" was banned by "+players[req.body.id].nickname+"</div>");
                });
              }
          } else if (sp[0] == "/room") {
              if (sp[1] == "join") {
                if (sp[2]) {
                  if (roomdata[sp[2]]) {
                    players[glid].inroom = true;
                    players[glid].room = sp[2];
                    rooms[sp[2]][req.body.id].push({"type":"chat", "value":"<div style='color:CornflowerBlue;'>Joined Room.</div>"});
                  } else {
                    dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:red;'>ERROR: Room doesn't exist :/ You can create one though!</div>"});
                  }
                } else {
                  dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:red;'>ERROR: Usage> /room join [roomid] </div>"});
                }
              } else if (sp[1] == "create") {
                var rid = genid();
                roomdata[rid] = {"owner":req.body.id,"name":req.body.roomname};
                rooms[rid] = {"exists":true};
                dataqueues[req.body.id].push({"type":"chat", "value":"New Room Created. Room ID: "+rid});
              } else if (sp[1] == "leave") {
                players[glid].inroom = false;
                players[glid].room = "";
                dataqueues[req.body.id].push({"type":"chat", "value":"Left Room."});
              }
          } else {
            dataqueues[req.body.id].push({"type":"chat", "value":"<div style='color:red;'>ERROR: Unknown Command</div>"});
          }
          res.send({"ok":"ok"});
        }
      }
    }
    if (fnd == false) {
      res.send({"error":"unauthed_token"});
    }
}
function offlineman(id) {
  clearTimeout(wake[id].timer);
  players[id].online = true;
  wake[id].timer = setTimeout(function(){
    players[id].online = false;
  }, 20000);
}
var poll = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    var glid = req.body.id;
    var fnd = false;
    var arrayLength = users.length;
    for (var i = 0; i < arrayLength; i++) {
      if (users[i] == glid) {
        if (players[glid].inroom == true) {
          res.send(rooms[players[glid].room][glid])
          rooms[players[glid].room][glid] = [];
          offlineman(glid);
        } else {
          res.send(dataqueues[glid]);
          dataqueues[glid] = [];
          offlineman(glid);
        }
        fnd = true;
      }
    }
    if (fnd == false) {
      res.send({"type":"unauthed_token"});
    }
}
var authtest = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    var glid = req.body.id;
    var fnd = false;
    var arrayLength = users.length;
    for (var i = 0; i < arrayLength; i++) {
      if (users[i] == glid) {
        fnd = true;
        res.send({"type":"success","value":"<div style='color:Fuchsia;'>FuchsiaChat</div><br><div>Welcome back, "+players[req.body.id].nickname+".</div>"});
      }
    }
    if (fnd == false) {
      res.send({"type":"unauthed_token"});
    }
}
/*var cmd = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    console.log(req.query.c);
    var jcmd = JSON.parse(req.query.c);
    if (jcmd.cmd.type == "tick") {
      console.log("cmd check tick");
      ticks.push(new tick(jcmd.cmd.command));
    }
    res.send("done");
}*/
app.post('/api/data/', data);
app.post('/api/authtest/', authtest);
app.post('/api/poll/', poll);
app.get('/api/discover/', discover);
app.post('/api/connect/', connect);
app.use('/', express.static(path.join(__dirname, 'client')))
console.log("Running on "+os.platform()+" / "+os.arch());
console.log("GETsomeREST - Listening...");
