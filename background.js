function SendInfoToActiveTabe(info) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { kind: 'kBbsPostBlockRequest', info: info });
  });
}

chrome.contextMenus.create({
  title: '设置用户"%s"标签',
  id: 'kSetUserTitle',
  contexts: ['selection'],
  onclick: SendInfoToActiveTabe
});

chrome.contextMenus.create({
  title: '替换用户"%s"帖子中的关键词',
  id: 'kReplaceKeywords',
  contexts: ['selection'],
  onclick: SendInfoToActiveTabe
});

chrome.contextMenus.create({
  title: '开始/停止过滤用户"%s"',
  id: 'kToggleBlockUser',
  contexts: ['selection'],
  onclick: SendInfoToActiveTabe
});
