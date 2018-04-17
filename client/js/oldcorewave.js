var discoveredDevices = [];
var activeDevice = {};
SC.initialize({
  client_id: 'a93d6af28486493898d16641e4752795'
});
$.ajaxSetup({ timeout: 4000 });
function waveFinder() {
//IP Adresses ending in 0 or 255 are not scanned, because they cannot be assigned. Therefore the scanned range is 1 - 254.
  for (i = 1; i < 254; i++) {
    //Most Common IP Addresses
    //?rand="+Date.now(); is used to prevent cached data.
    $.get( "http://192.168.1."+i+":3000/api/discover/?rand="+Date.now(), function( data ) {
      if (data.device == "WaveDevice") {
        discoveredDevices.push(data);
        var posn = discoveredDevices.length -1;
        $(".devices").append("<div class='device' onclick='connect("+posn+");' ><i class='material-icons'>speaker</i><div class='devicename'>"+data.name+"</div><div class='deviceip'>"+data.ip+"</div></div>");
      }
    });
  }
  /*if (discoveredDevices == null) {
    //Second Most Common IP Addresses
    for (i = 1; i < 254; i++) {
      //?rand="+Date.now(); is used to prevent cached data.
      $.get( "http://192.168.1."+i+":3000/api/discover/?rand="+Date.now(), function( data ) {
        if (data.device == "WaveDevice") {
          discoveredDevices.push(data);
          var posn = discoveredDevices.length -1;
          $(".devices").append("<div class='device' onclick='connect("+posn+");' ><i class='material-icons'>speaker</i><div class='devicename'>"+data.name+"</div><div class='deviceip'>"+data.ip+"</div></div>");
        }
      });
    }
  } else if (discoveredDevices == null) {
    //Third Most Common IP Addresses, typically used in private organisations.
    for (i = 1; i < 254; i++) {
      //?rand="+Date.now(); is used to prevent cached data.
      $.get( "http://10.0.0."+i+":3000/api/discover/?rand="+Date.now(), function( data ) {
        if (data.device == "WaveDevice") {
          discoveredDevices.push(data);
          var posn = discoveredDevices.length -1;
          $(".devices").append("<div class='device' onclick='connect("+posn+");' ><i class='material-icons'>speaker</i><div class='devicename'>"+data.name+"</div><div class='deviceip'>"+data.ip+"</div></div>");
        }
      });
    }
  }*/
}
//example command { 	"cmd": { 		"type": "tick", 		"command": "rtr_unixtime" 	} }
function sendcmd(com) {
  $.get( "http://"+activeDevice.ip+":3000/api/cmd/?c="+com+"&rand="+Date.now(), function( data ) {
  });
}
function pushconsole(input) {
  $(".console").text($(".console").text()+input+"\n");
  var textarea = document.getElementById('console');
  textarea.scrollTop = textarea.scrollHeight;
}
function loadDevice() {
  $(".app").append('<div class="page" id="device"><div class="pagename">'+activeDevice.name+'</div><br><div class="search-box"><input id="search-input" type="text" name="name" placeholder="Search..."></div><div class="results"><ul id="ul-results"></ul></div></div>');
}
function connect(pos) {
  activeDevice = discoveredDevices[pos];
  poll();
  document.getElementById("init").style.display = "none";
  loadDevice();
}
function connectip(ip) {
  activeDevice = {"name": "Wave", "ip": ip, "device": "WaveDevice"};
  poll();
  document.getElementById("init").style.display = "none";
  loadDevice();
}
function poll() {
  function timeout() {
    setTimeout(function () {
      $.get( "http://"+activeDevice.ip+":3000/api/poll/?rand="+Date.now(), function( data ) {
        for (i = 0; i < data.length; i++) {
          if (data[i].type == "cmdrtr") {
            pushconsole(data[i].value)
          }
        }
      });
        timeout();
    }, 1000);
  }
  timeout();
}
//sc stuff
function search() {
  $.get( "http://"+activeDevice.ip+":3000/api/poll/?rand="+Date.now(), function( data ) {
    for (i = 0; i < data.length; i++) {
      if (data[i].type == "cmdrtr") {
        pushconsole(data[i].value)
      }
    }
  });
}
$( document ).ready(function() {
  $("#search-input").keypress(function(e) {
      if(e.which == 13) {

        var q = $('#search-input').val();
        scSearch(q)

      }
  });
});
