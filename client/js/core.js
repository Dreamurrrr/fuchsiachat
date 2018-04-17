$.ajaxSetup({ timeout: 4000 });
var ip = "fuchsiachat.herokuapp.com";
var id = "";
var playerid = "";
var playerscanv = {};
var x = 0;
var y = 0;
var msgb = "";
function pushconsole(input) {
  /*$(".console").text($(".console").text()+input+"\n");
  var textarea = document.getElementById('console');
  textarea.scrollTop = textarea.scrollHeight;*/
  console.log(input);
}
function connect(fingerprint) {
  $(".app").append("Connecting...<br>");
  $.post( "http://"+ip+"/api/connect/?rand="+Date.now(),{"fingerprint":fingerprint},function( data ) {
    if (data.type == "id") {
      $(".app").append("Authenticated Successfully.<br>");
      console.log(data.type);
      id = data.value;
      playerid = sha256(id);
      var wpl = data.players;
      pushconsole("Token: " + data.value);
      pushconsole("Playerid: " + playerid);
      poll();
    } else if (data.error == "banned") {
      $("body").empty();
      $("body").append("Banned.");
    }
  });
}
function rms(text) {
  var bottom = false;
  if ($(".app")[0].scrollTop === ($(".app")[0].scrollHeight - $(".app")[0].offsetHeight)) {
    bottom = true;
  }
  $(".app").append(text+"<br>");
  if (bottom == true) {
    $(".app").scrollTop($(".app")[0].scrollHeight);
  }
}
function poll() {
  function timeout() {
    setTimeout(function () {
      $.post( "http://"+ip+"/api/poll/?rand="+Date.now(), {"id":id}, function( data ) {
        for (i = 0; i < data.length; i++) {
          if (data[i].type == "chat") {
            rms(data[i].value);
          } else if (data[i].type == "notification") {
            if (!("Notification" in window)) {
            } else if (Notification.permission === "granted") {
              var notification = new Notification(data[i].value);
            }
            else if (Notification.permission !== "denied") {
              Notification.requestPermission(function (permission) {
                if (permission === "granted") {
                  var notification = new Notification(data[i].value);
                }
              });
            }
          } else if (data[i].type == "kick") {
            $("body").empty();
            $("body").append("Kicked.");
          }
        }
      });
        timeout();
    }, 100);
  }
  timeout();
}
function sendchat(text) {
  if (text.startsWith("/login")) {
    $.post( "http://"+ip+"/api/data/?rand="+Date.now(), {"id":id,"type":"cmd","value":text}, function( data ) {
    });
  } else 
  if (text.startsWith("/")) {
    $.post( "http://"+ip+"/api/data/?rand="+Date.now(), {"id":id,"type":"cmd","value":text}, function( data ) {
    });
  } else {
    $.post( "http://"+ip+"/api/data/?rand="+Date.now(), {"id":id,"type":"chat","value":text}, function( data ) {
    });
  }
}
new Fingerprint2().get(function(result, components) {
  connect(result);
})
$(function() {
   $(window).keypress(function(e) {
       var key = e.which;
       console.log(key);
       if (key == 13) {
         sendchat(msgb);
         msgb = "";
         $(".hvr").empty().append(msgb);
       } else {
          msgb += String.fromCharCode(key);
          var qm = msgb.split(" ");
          if (qm[0]=="/login" && qm[1] != undefined && qm[2] != undefined) {
            var ast = "";
            for (y = 0; y < qm[2].length; y++) {
              ast += "*";
            }
            $(".hvr").empty().append(msgb.substring(0, msgb.length-qm[2].length)+ast);
          } else {
            $(".hvr").empty().append(msgb);
          }
       }
   });
});
$(function() {
   $(window).keydown(function(e) {
       var key = e.which;
       console.log(key);
       if (key == 8) {
         console.log("back");
         var qm = msgb.split(" ");
         if (qm[0]=="/login" && qm[1] != undefined && qm[2] != undefined) {
          var ast = "";
            for (y = 0; y < qm[2].length-1; y++) {
              ast += "*";
            }
            msgb = msgb.substring(0, msgb.length-1);
            $(".hvr").empty().append(qm[0]+" "+qm[1]+" "+ast);
         } else {
          msgb = msgb.substring(0, msgb.length-1);
          $(".hvr").empty().append(msgb);
         }
       }
   });
});
$(function() {
  document.addEventListener("paste", function (e) {

      var pastedText = undefined;
      if (window.clipboardData && window.clipboardData.getData) { // IE
          pastedText = window.clipboardData.getData('Text');
      } else if (e.clipboardData && e.clipboardData.getData) {
          pastedText = e.clipboardData.getData('text/plain');
          console.log(pastedText);
      }
      e.preventDefault();
      msgb += pastedText;
      $(".hvr").empty().append(msgb);
      return false;
  });
});
