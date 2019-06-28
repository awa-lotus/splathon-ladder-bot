var channelId = PropertiesService.getScriptProperties().getProperty('CHANNEL_ID'); // #ladder
var token = PropertiesService.getScriptProperties().getProperty('OAuth_token');
var masterSheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_SHEET_ID')); // Master //シーズン毎に保守
var entryMasterSheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('ENTRY_SHEET_ID')); // Master //シーズン毎に保守
var targetSheetName = PropertiesService.getScriptProperties().getProperty('TARGET_SHEET_NAME'); //ラウンド毎に保守
// var spreadsheet = SpreadsheetApp.openById('1vSL5mFDbg45o7SMiUMmqmNzNQk7IN4AS5oI3h3nYOrE'); // Debug

function doPost(e) {
  var verified_token = PropertiesService.getScriptProperties().getProperty('verified_token');
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  
  if (verificationToken !== verified_token)
    return ContentService.createTextOutput();

  if (e.parameter.command === '/set-ladder-score' && e.parameter.channel_id !== channelId) {

    return errorResponse('inavailable_channele');
    
  } else if (e.parameter.command === '/set-ladder-score') {
    
    var displayName = getDisplayName(e);
    
    var entrySheet = entryMasterSheet.getSheets()[0]; // フォームの回答なのでこっちはindexでいいはず
    if (!entrySheet)
      return errorResponse('not_exist_entry_sheet');
    
    var teamName = getTeamName(entrySheet, displayName);
    if (teamName.equals('none'))
      return errorResponse('not_entry');
    
    var challengesSheet = masterSheet.getSheetByName(targetSheetName); // シートの取得をindexにするかシート名で直接にするか...うまく運用できるならindexの方が保守は減る予想
    if (!challengesSheet)
      return errorResponse('not_exist_challenge_sheet');
    
    var matchList = getMatchList(challengesSheet, teamName); 
    if (matchList[Object.keys(matchList)[0]].length === 0)
      return errorResponse('not_exist_match');
      
    var createdDialog = createDialog(e, matchList);
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
        
    var p = JSON.parse(decodeURIComponent(e.parameter.payload));
    var url = p.response_url;
    
    var payload = {
      "response_type": "ephemeral",
      "replace_original": false,
      "attachments": [{
        "color": "danger",
        "pretext": "不明なエラーが発生しました。運営までお問い合わせください",
        "fields": []
      }]
    }

    var options = {
      "method" : "post",
      "contentType" : "application/json",
      "payload" : JSON.stringify(payload)
    };

    var response = UrlFetchApp.fetch(url, options);
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    
  }
}

function getDisplayName(e) { 
 var userId = e.parameter.user_id;
 var url = 'https://slack.com/api/users.info?token=' + token + '&user=' + userId + '&pretty=1';
 var userInfo = JSON.parse(UrlFetchApp.fetch(url).getContentText());
 return userInfo.user.profile.display_name;  
}

function getTeamName(sheet, displayName) {
  // displayName = 'しらたま'; // Debug
  const LastRow = sheet.getLastRow();
  const rangeS = 'D2:Q' + LastRow;
  var range = sheet.getRange(rangeS);
  const columnSize = range.getValues()[0].length
  var isBreak = false;
  var teamName = 'none';
  
  for(var i=0; i<LastRow-1; i++){
    for(var j=1; j<columnSize; j++){
      if (j % 2 === 0)
        continue;
      else if (range.getValues()[i][j].equals(displayName)) {
        teamName = range.getValues()[i][0];
        isBreak = true;
        break;
      }
      else if (range.getValues()[i][j].equals('@'+displayName)) {
        teamName = range.getValues()[i][0];
        isBreak = true;
        break;
      } 
    }
    if (isBreak)
      break;
  }
  return teamName;
}

function getMatchList(sheet, teamName) {
  const LastRow = sheet.getLastRow();
  const rangeS = 'A2:G' + LastRow;
  var range = sheet.getRange(rangeS);
  const columnSize = range.getValues()[0].length
  var isBreak = false;
  var matchListHash = {};
  matchListHash[teamName] = []
  
  for(var i=0; i<LastRow-1; i++){
    for(var j=1; j<=2; j++){
      if (range.getValues()[i][j*3].equals(teamName)) {
        matchListHash[teamName].push(range.getValues()[i][0] + ' ' + range.getValues()[i][2] + ' ' + range.getValues()[i][3] + ' vs ' + range.getValues()[i][5] + ' ' + range.getValues()[i][6]);
        break;
      }
    }
  }
  return matchListHash;
}

function createDialog(e, matchList){
  var trigger_id = e.parameter.trigger_id;
  var options = getOptions(matchList);
  var dialog = {
    "token": token,
    "trigger_id": trigger_id,
    "dialog": JSON.stringify({
      "callback_id": "ladder_register_score",
      "title": "Ladder対戦結果登録フォーム",
      "submit_label": "登録する",
      "elements": [
        {
          "type": "text",
          "label": "あなたのチーム名(そのままでお願いします)",
          "name": "name",
          "value": Object.keys(matchList)[0]
        },
        {
          "type": "select",
          "label": "対戦カード",
          "name": "matchLabel",
          "options": options
        },
        {
          "type": "text",
          "subtype": "number",
          "label": "挑戦側(左)スコア",
          "name": "score_c"
        },
        {
          "type": "text",
          "subtype": "number",
          "label": "防衛側(右)スコア",
          "name": "score_d",
        }
      ]
    })
  };
  return dialog;
}

function getOptions(matchList) {
  var options = [];
  matchList[Object.keys(matchList)[0]].forEach(function(match){
    options.push(
      {
        "label": match,
        "value": match
      })
  });
  return options;
}

function getErrorJson(errorType) {
  var errorJsonText = 'error';
  switch (errorType) {
    case 'inavailable_channele':
      errorJsonText = '/set-ladder-scoreコマンドは#ladderチャンネルでのみ使用可能です';
      break;
    case 'not_exist_entry_sheet':
      errorJsonText = 'エントリーシートが見つかりませんでした。用意されるまでお待ちください';
      break;
    case 'not_exist_challenge_sheet':
      errorJsonText = '最新のチャレンジシートが見つかりませんでした。用意されるまでお待ちください';
      break;
    case 'not_entry':
      errorJsonText = 'あなたはLadder#3にエントリーされていません！問い合わせの場合は運営まで';
      break;
    case 'not_exist_match':
      errorJsonText = '対戦カードが見つかりませんでした。問い合わせの場合は運営まで';
      break;
    default:
      
  }
  return {"response_type": "ephemeral","text": errorJsonText};
}

function errorResponse(errorType) {
  return ContentService.createTextOutput(JSON.stringify(getErrorJson(errorType))).setMimeType(ContentService.MimeType.JSON); 
}
