const VERSION = " v1.1.0";
const Title = "Title";

function showVersionPopup(){
  Xrm.Navigation.openAlertDialog({
    title: Title,
    text: `Code running:\n${VERSION}`
  }).then(
    function(){ console.log(`[${VERSION}] confirmed by user`); },
    function(err){ console.error("Popup closed with error:", err); }
  );
}
