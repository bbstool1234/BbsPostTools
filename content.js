function GetCurrentDateString() {
  var date = new Date();
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

function EscapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function ReplaceText(elements, regex, replacements) {
  console.log(regex);
  console.log(replacements);
  $(elements).each(function () {
    var text = $(this).html();
    text = text.replace(regex, function(matched) {
      var replacement = replacements[matched];
      return replacement == undefined ? matched : replacement;
    });
    $(this).html(text);
  });
}

function GetUserSpec(context, user_name) {
  var user_spec = context['kUserSpec'][user_name];
  if (user_spec == undefined || user_spec['kAction'] == 'none') {
    return undefined;
  }
  return user_spec;
}

function CreateUserTitle(title) {
  return "<em class=\"aw-verified\">" + title + "</em>";
}

function TransformUserTitle(user_spec, author) {
  var value = user_spec['kTitle'];
  if (value == undefined || value.length == 0) {
    return;
  } 

  var title = $(author).next('.aw-verified');
  if ($(title).length != 0) {
    $(title).html(value);
  } else {
    $(author).after(CreateUserTitle(value));
  }
}

function TransformPostContent(user_spec, content) {
  var patterns = user_spec['kPatterns'];
  if (patterns == undefined) {
    return;
  }

  var keys = []
  var replacements = {}
  patterns.forEach(p => {
    keys.push(EscapeRegExp(p[0]));
    replacements[p[0]] = p[1];
  });
  var regex = new RegExp(keys.join("|"), 'g');

  ReplaceText(content, regex, replacements);
}

function TransformComment(context, comment) {
  var author = $(comment).find('.aw-user-name');
  if ($(author).length == 0) {
    return;
  }
  var author_name = $(author).html().trim();
  var user_spec = GetUserSpec(context, author_name);
  if (user_spec != undefined) {
    TransformUserTitle(user_spec, author);
    TransformPostContent(user_spec, $(comment).find('.markitup-box'));
  }
}

function TransformComments(context, comments) {
  $(comments).find('.aw-item').each(function () {
    try {
      TransformComment(context, this);
    } catch (err) { }
  });
}

function RegisterCommentsUpdateEvent(context, comments) {
  var events = [];
  comments.on('DOMNodeInserted', function() {
    events.push(this);
    setTimeout(function() {
      if (events.length == 0) {
        return;
      }
      var event = events.shift();
      if (events.length == 1) {
        comments.off('DOMNodeInserted');
        TransformComments(context, event);
        RegisterCommentsUpdateEvent(context, comments);
      }
    }, 10);
  });
}

function TransformReply(context, reply) {
  var author = $(reply).find('.mod-head .aw-user-name');
  if ($(author).length == 0) {
    return;
  }
  var author_name = $(author).html().trim();

  var user_spec = GetUserSpec(context, author_name);
  if (user_spec != undefined) {
    TransformUserTitle(user_spec, author);
    TransformPostContent(user_spec, $(reply).find('.markitup-box'));
  }

  var comments = $(reply).find('.mod-footer .aw-comment-list');
  if (comments.find('.aw-item').length != 0) {
    TransformComments(context, comments);
  } else {
    RegisterCommentsUpdateEvent(context, comments);
  }
}

function TransformReplies(context) {
  $('.aw-replies,.aw-replies-fold').find('.aw-item').each(function () {
    try {
      TransformReply(context, this);
    } catch (err) { }
  });
}

function TransformQuestion(context) {
  var author = $('.user-detail > .aw-user-name');
  if ($(author).length == 0) {
    return;
  }
  var author_name = $(author).html().trim();
  var user_spec = GetUserSpec(context, author_name);
  if (user_spec != undefined) {
    TransformUserTitle(user_spec, author);
    TransformPostContent(user_spec, $('.aw-question-detail .mod-head'));
    TransformPostContent(user_spec, $('.aw-question-detail .mod-body .markitup-box'));
  }

  var comments = $('.aw-question-detail .mod-footer .aw-comment-list');
  if (comments.find('.aw-item').length != 0) {
    TransformComments(context, comments);
  } else {
    RegisterCommentsUpdateEvent(context, comments);
  }  
}

function DoTransform(context) {
  TransformQuestion(context);
  TransformReplies(context);
}

function MaybeDoTransform() {
  chrome.storage.sync.get('is_activated', function (result) {
    if (!result['is_activated']) {
      return;
    }
    GetContext(function (context) {
      DoTransform(context);
    });
  });
}

function GetContext(callback) {
  chrome.storage.sync.get('context', function (result) {
    var context = result['context'];
    if (context == undefined) {
      context = {}
    }
    if (!('kUserSpec' in context)) {
      context['kUserSpec'] = {};
    }
    callback(context);
  });
}

function SetContext(context) {
  chrome.storage.sync.set({ 'context': context });
}

function GetOrCreateUserSpec(context, user_name) {
  var specs = context['kUserSpec'];
  var user_spec = specs[user_name];
  if (user_spec == undefined) {
    user_spec = {}
    specs[user_name] = user_spec;
  }
  return user_spec;
}

function SetUserTitle(info) {
  GetContext(function (context) {
    var user_name = info.selectionText;
    if (user_name == undefined || user_name == '') {
      return;
    }
    var user_spec = GetOrCreateUserSpec(context, user_name);
    var user_title = user_spec['kTitle'];
    if (user_title = undefined) {
      user_title = "";
    }

    var prompt = '设置用户"' + user_name + '"的标签';

    $('.bbstools-user-title-panel').data('user_name', user_name)
    $('.bbstools-user-title-label span').html(prompt);
    $('.bbstools-user-title-input').val(user_title);
    $('.bbstools-user-title-panel').show();
  });
}

function EscapseString(item) {
  if (!item.includes(' ')) {
    return item;
  }
  return '"' + item.replace('"', '""') + '"';
}

function SetKeywordReplacement(info) {
  GetContext(function (context) {
    var user_name = info.selectionText;
    if (user_name == undefined || user_name == '') {
      return;
    }
    var user_spec = GetOrCreateUserSpec(context, user_name);
    var patterns = user_spec['kPatterns'];

    var text = "";
    try {
      for (var i = 0; i < patterns.length; ++i) {
        var p = patterns[i];
        text += EscapseString(p[0]) + " -> " + EscapseString(p[1]) + "\n";
      }
    } catch (err) { };

    var prompt = '替换用户"' + user_name + '"帖子及签名中的关键词';

    $('.bbstools-replacement-panel').data('user_name', user_name)
    $('.bbstools-replacement-label span').html(prompt);
    $('.bbstools-replacement-input').val(text);
    $('.bbstools-replacement-panel').show();
  });
}

function ToggleBlockUser(info) {
  GetContext(function (context) {
    var user_name = info.selectionText;
    if (user_name == undefined || user_name == '') {
      return;
    }
    var user_spec = GetOrCreateUserSpec(context, user_name);
    var action = user_spec['kAction'] == 'none' ? 'replacement' : 'none';
    user_spec['kAction'] = action;
    SetContext(context);
    DoTransform(context);
  });
}

function HandleBlockRequest(info) {
  switch (info.menuItemId) {
    case 'kSetUserTitle':
      return SetUserTitle(info);
    case 'kReplaceKeywords':
      return SetKeywordReplacement(info);
    case 'kToggleBlockUser':
      return ToggleBlockUser(info);
  }
}

function HandleToggleRequest(is_activated) {
  if (is_activated) {
    return GetContext(function (context) {
      DoTransform(context);
    });
  }
  DoTransform({ "kUserSpec": {} });
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    switch (request.kind) {
      case 'kBbsPostBlockRequest':
        return HandleBlockRequest(request.info);
      case 'kBbsPostToggleRequest':
        return HandleToggleRequest(request.is_activated);
      case 'kBbsPostConfigureRequest':
        return HandleConfigureRequest();
    }
  }
);

var kReplacementPanel = '\
<div class="bbstools-replacement-panel">\
<div class="bbstools-replacement-label"><span></span></div>\
<textarea class="bbstools-replacement-input" placeholder=\'被替换词 -> 替换词\n"带 空 格 被 替 换 词" -> "替 换 词"\'>\
</textarea>\
<div class="bbstools-button-bar">\
<button class="bbstools-confirm-button slide">\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
</button>\
<button class="bbstools-cancel-button slide">\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
</button>\
</div>\
</div>\
';

var kSetUserTitlePanel = '\
<div class="bbstools-user-title-panel">\
<div class="bbstools-user-title-label"><span></span></div>\
<textarea class="bbstools-user-title-input">\
</textarea>\
<div class="bbstools-button-bar">\
<button class="bbstools-confirm-button slide">\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
</button>\
<button class="bbstools-cancel-button slide">\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
</button>\
</div>\
</div>\
';

function ParseWords(line) {
  var words = [];
  var state = 0;
  var word = 'IDLE';
  var i = 0;
  var len = line.length;
  while (true) {
    while (i < len && line[i] == ' ') ++i;
    if (i >= len) break;

    if (line[i] != '"') {
      var start = i;
      while (i < len && line[i] != ' ') ++i;
      words.push(line.substring(start, i));
      continue;
    }

    ++i;
    var word = '';
    while (i < len) {
      var ch = line[i++];
      if (ch == '"') {
        if (i == len || line[i] != '"') break;
        ++i;
      }
      word += ch;
    }
    words.push(word);
  }
  return words;
}

function ParseReplacementPatterns(text) {
  var patterns = [];
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; ++i) {
    var words = ParseWords(lines[i]);
    if (words.length < 3 || words[0].length == 0 || words[1] != '->') {
      continue;
    }
    patterns.push([words[0], words[2]]);
  }
  return patterns;
}

function SaveKeywordReplacement(callback) {
  var patterns = ParseReplacementPatterns($('.bbstools-replacement-input').val());
  var user_name = $('.bbstools-replacement-panel').data('user_name');
  GetContext(function (context) {
    var user_spec = GetOrCreateUserSpec(context, user_name);
    user_spec['kAction'] = 'replacement';
    user_spec['kPatterns'] = patterns;
    callback(context);
  });
}

function SaveUserTitle(callback) {
  var user_name = $('.bbstools-user-title-panel').data('user_name');
  GetContext(function (context) {
    var user_spec = GetOrCreateUserSpec(context, user_name);
    user_spec['kTitle'] = $('.bbstools-user-title-input').val();
    callback(context);
  });
}

function RegisterReplacementPanel() {
  $('body').append(kReplacementPanel);
  $('.bbstools-replacement-panel .bbstools-confirm-button').click(function () {
    SaveKeywordReplacement(function (context) {
      SetContext(context);
      DoTransform(context);
      $('.bbstools-replacement-panel').hide();
    });
  });
  $('.bbstools-replacement-panel .bbstools-cancel-button').click(function () {
    $('.bbstools-replacement-panel').hide();
  });
}

function RegisterUserTitlePanel() {
  $('body').append(kSetUserTitlePanel);
  $('.bbstools-user-title-panel .bbstools-confirm-button').click(function () {
    SaveUserTitle(function (context) {
      SetContext(context);
      DoTransform(context);
      $('.bbstools-user-title-panel').hide();
    });
  });
  $('.bbstools-user-title-panel .bbstools-cancel-button').click(function () {
    $('.bbstools-user-title-panel').hide();
  });
}

var kConfigurationPanel = '\
<div class="bbstools-configuration-panel">\
<div class="bbstools-configuration-label">\
<span class="bbstools-configuration-info">配置文件</span>\
<span class="bbstools-configuration-error">(格式错误)</span>\
</div>\
<textarea class="bbstools-configuration-input" placeholder="JSON Configuration"></textarea>\
<div class="bbstools-button-bar">\
<button class="bbstools-confirm-button slide">\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
</button>\
<button class="bbstools-cancel-button slide">\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
</button>\
</div>\
</div>\
';

function SaveConfiguration(callback) {
  var configuration = $('.bbstools-configuration-input').val();
  var context = { 'kUserSpec': {} };
  if (configuration.trim().length != 0) {
    try {
      context = JSON.parse(configuration);
    } catch (err) {
      return $('.bbstools-configuration-error').css('visibility', 'visible');
    }
  }
  SetContext(context);
  callback(context);
}

function RegisterConfigurationPanel() {
  $('body').append(kConfigurationPanel);
  $('.bbstools-configuration-panel .bbstools-confirm-button').click(function () {
    SaveConfiguration(function (context) {
      SetContext(context);
      DoTransform(context);
      $('.bbstools-configuration-panel').hide();
    });
  });
  $('.bbstools-configuration-panel .bbstools-cancel-button').click(function () {
    $('.bbstools-configuration-panel').hide();
  });
  $('.bbstools-configuration-input').keyup(function () {
    $('.bbstools-configuration-error').css('visibility', 'hidden');
  });
}

function HandleConfigureRequest() {
  GetContext(function (context) {
    $('.bbstools-configuration-input').val(JSON.stringify(context, null, 2));
    $('.bbstools-configuration-error').css('visibility', 'hidden');
    $('.bbstools-configuration-panel').show();
  });
}


$(document).ready(function () {
  MaybeDoTransform();
  RegisterReplacementPanel();
  RegisterUserTitlePanel();
  RegisterConfigurationPanel();
  $('body').css('visibility', 'visible');
});
