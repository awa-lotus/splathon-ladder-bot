var verifiedToken = 'YeNPbSqudElHiJoENoExWCIl';
var token = 'xoxp-16607544897-19573399538-875629500611-05ed37c6f1814c381512581fd033e261';
var botToken = 'xoxb-16607544897-887099377504-QmenU7kACAAiM82AFjCawpIa';

function doPost(e) {
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  var p = JSON.parse(decodeURIComponent(e.parameter.payload));

  if (verificationToken !== verifiedToken) {
    var response = sendTokenError(p.response_url);
    ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    return;
  }
  
  /////////////////////////////////////////////////////////////////
  var testChannelId = 'CKGLEGW4T'; // #awa-test2チャンネル
  if (p.channel.id === testChannelId ) {
    
    if (p.callback_id === 'test_create_boshu') {

      
      return ContentService.createTextOutput();
    } else if (p.callback_id === 'read_boshu_text') {      
      var payload = {
        'response_type': 'in_channel',
        'replace_original': false,
        'text': JSON.stringify(p)
      }
      var url = p.response_url;
      var options = {
        'method' : 'post',
        'contentType' : 'application/json',
        'payload' : JSON.stringify(payload)
      };
      UrlFetchApp.fetch(url, options);
      
      //return ContentService.createTextOutput(JSON.stringify(e)).setMimeType(ContentService.MimeType.JSON);
      
      var createdDialog = createDialog(p);
      var headers = { "Authorization": "Bearer " + token };
      
      var options = {
        'method' : 'POST',
        'headers': headers,
        'payload' : createdDialog,
      };
      
      var url = "https://slack.com/api/dialog.open";
      var response = UrlFetchApp.fetch(url, options);

      return ContentService.createTextOutput();
    } else {
      
    }
    return ContentService.createTextOutput();
  }
  
  ////////////////////////////////////////////////////////////////
  
  var channelId = 'C0J4UF5RN'; // #boshuチャンネル
  if (p.channel.id !== channelId) {
    var response = sendChannelError(p.response_url);
    ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    return;
  }
  
  if (p.callback_id === 'create_boshu') {
    var userId = p.user.id
    var userName = p.user.name
    
    var userInfoUrl = 'https://slack.com/api/users.info?token=' + botToken + '&user=' + userId + '&pretty=1';
    var userInfo = JSON.parse(UrlFetchApp.fetch(userInfoUrl).getContentText());
    var teamId = userInfo.user.team_id;
    var imageId = userInfo.user.profile.image_original.split('_')[1];
    var userRealName = userInfo.user.profile.real_name;
    var iconUrl = 'https://ca.slack-edge.com/' + teamId + '-' + userId + '-' + imageId + '-128';
    
    var blocks = makeBlocks(p.submission, iconUrl, userRealName);
    var payload = {
      'response_type': 'in_channel',
      'replace_original': false,
      'blocks': blocks,
      'text': p.submission.title
    }
    var url = p.response_url;
    var options = {
      'method' : 'post',
      'contentType' : 'application/json',
      'payload' : JSON.stringify(payload)
    };
    UrlFetchApp.fetch(url, options);
    
    return ContentService.createTextOutput();
  } else {

    // 取得したメッセージからリアクション取得
    var url = 'https://slack.com/api/reactions.get?token=' + token + '&channel=' + channelId + '&timestamp=' + p.message_ts + '&pretty=1';
    var reactions = JSON.parse(UrlFetchApp.fetch(url).getContentText()).message.reactions;
    
    var text = '';
    
    reactions.map( function(row) {
      if (white_list.indexOf(row.name) != -1) {
        row.users.map( function(userId) {
          text = text + '<@' + userId + '> ';
        });
      };
    });
    
    var payload = {
      'response_type': 'in_channel',
      'replace_original': false,
      'text': text,
      'thread_ts': p.message_ts
    }
    
    var url = p.response_url;
    
    var options = {
      'method' : 'post',
      'contentType' : 'application/json',
      'payload' : JSON.stringify(payload)
    };
    
    var response = UrlFetchApp.fetch(url, options);
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendTokenError(url) {
  var payload = {
    'response_type': 'ephemeral',
    'replace_original': false,
    'attachments': [{
      'color': 'danger',
      'pretext': 'Invalid token Error.',
    }]
  }
  
  var options = {
    'method' : 'post',
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  return response;
}

function sendChannelError(url) {
  var payload = {
    'response_type': 'ephemeral',
    'replace_original': false,
    'attachments': [{
      'color': 'danger',
      'pretext': 'Invalid channel Error.',
    }]
  }
  
  var options = {
    'method' : 'post',
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  return response;
}
