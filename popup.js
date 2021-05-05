function ToggleCheckBox(activated) {
  $('#activation-toggle').prop('checked', activated);
}

function LoadActivationState() {
  chrome.storage.sync.get('is_activated', function (result) {
    var activated = false;
    if ('is_activated' in result) {
      var value = result['is_activated'];
      if (typeof value === "boolean") {
        activated = value;
      }
    } else {
      // Default turn on.
      activated = true;
      chrome.storage.sync.set({ is_activated: true });
    }
    ToggleCheckBox(activated);
  });
}

function HandleToggleEvent() {
  var is_activated = this.checked;
  chrome.storage.sync.set({ is_activated: is_activated });
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { kind: 'kBbsPostToggleRequest', is_activated: is_activated });
  });
}

function HandleConfigureEvent() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { kind: 'kBbsPostConfigureRequest' });
  });
}

$(document).ready(function () {
  $("#activation-toggle").change(HandleToggleEvent);
  $("#edit-button").click(HandleConfigureEvent);
  LoadActivationState();
});