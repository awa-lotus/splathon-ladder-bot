var channelId = 'GK6TV32QM' // コマンドを使用するチャンネルID。適宜編集してください。#ladder3-captains シーズン毎に保守
var token = PropertiesService.getScriptProperties().getProperty('OAuth_token');
var masterSheet = SpreadsheetApp.openById('18tyoUiZZCCa1AVb7u9YrBBrr6YsODtmZ4oEMNJom6JQ'); // Master //シーズン毎に保守
var entryMasterSheet = SpreadsheetApp.openById('1ZQZKjhPijIHc9dKBeLsMZ-GlNueqK8Afh_q5FRLNhTU'); // Master //シーズン毎に保守
var targetSheetName = 'Challenges@R3'; //ラウンド毎に保守
// var spreadsheet = SpreadsheetApp.openById('1vSL5mFDbg45o7SMiUMmqmNzNQk7IN4AS5oI3h3nYOrE'); // Debug

function doPost(e) {
  var verified_token = PropertiesService.getScriptProperties().getProperty('verified_token');
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  
  if (verificationToken !== verified_token) {
    console.log(e);
    return ContentService.createTextOutput();
  }
      
  if (e.parameter.command === '/add-ladder-schedule' && e.parameter.channel_id !== channelId) {

    return ContentService.createTextOutput(JSON.stringify(getErrorJson('inavailable_channele'))).setMimeType(ContentService.MimeType.JSON);
    
  } else if (e.parameter.command === '/add-ladder-schedule') {
    
    var displayName = getDisplayName(e);
    
    var entrySheet = entryMasterSheet.getSheets()[0]; // フォームの回答なのでこっちはindexでいいはず
    if (!entrySheet)
      return ContentService.createTextOutput(JSON.stringify(getErrorJson('not_exist_entry_sheet'))).setMimeType(ContentService.MimeType.JSON); 
    
    var teamName = getTeamName(entrySheet, displayName);
    if (teamName.equals('none'))
      return ContentService.createTextOutput(JSON.stringify(getErrorJson('not_entry'))).setMimeType(ContentService.MimeType.JSON); 
    
    var challengesSheet = masterSheet.getSheetByName(targetSheetName); // シートの取得をindexにするかシート名で直接にするか...うまく運用できるならindexの方が保守は減る予想
    if (!challengesSheet)
      return ContentService.createTextOutput(JSON.stringify(getErrorJson('not_exist_challenge_sheet'))).setMimeType(ContentService.MimeType.JSON); 
    
    var matchList = getMatchList(challengesSheet, teamName); 
    if (matchList[Object.keys(matchList)[0]].length === 0)
      return ContentService.createTextOutput(JSON.stringify(getErrorJson('not_exist_match'))).setMimeType(ContentService.MimeType.JSON); 
      
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
    var s = p.submission;
    
    setDateToMasterSheet(s);

    // ダイアログでサブミットボタンを押したときの処理
    var url = p.response_url;
    
    var payload = {
      "response_type": "ephemeral",
      "replace_original": false,
      "attachments": [{
        "color": "#36a64f",
        "pretext": "以下の情報で登録しました",
        "fields": [
          {
            "title": "チーム名",
            "value": s.name,
            "short": false
          },
          {
            "title": "対戦カード",
            "value": s.matchLabel,
            "short": false
          },
          {
            "title": "対戦予定日時",
            "value": s.date,
            "short": false
          }
        ]
      }]
    }

    var options = {
      "method" : "post",
      "contentType" : "application/json",
      "payload" : JSON.stringify(payload)
    };

    response = UrlFetchApp.fetch(url, options);
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
      "callback_id": "ladder_match_dialog",
      "title": "Ladder対戦予定日時登録フォーム",
      "submit_label": "登録する",
      "elements": [
        {
          "type": "text",
          "label": "チーム名",
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
          "label": "対戦予定日時",
          "name": "date",
          "value": "2019/XX/XX XX:XX:00"
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

function setDateToMasterSheet(s) {
  const challengesSheet = masterSheet.getSheetByName(targetSheetName);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][0].equals(matchId)) {
      challengesSheet.getRange(i+2,2).setValue(s.date);
      break;
    }
  }
}

function getErrorJson(errorType) {
  var errorJsonText = 'error';
  switch (errorType) {
    case 'inavailable_channele':
      errorJsonText = '/add-ladder-scheduleコマンドは#ladder3-captainsチャンネルでのみ使用可能です';
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
