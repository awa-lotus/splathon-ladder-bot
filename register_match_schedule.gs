var token = PropertiesService.getScriptProperties().getProperty('OAuth_token');
var mastarData = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_DATA_SHEET_ID'));
var channelId = '';
var entrySheetId = '';
var challengeSheetId = '';

function doPost(e) {
  
  var verified_token = PropertiesService.getScriptProperties().getProperty('verified_token');
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  
  if (verificationToken !== verified_token)
    return ContentService.createTextOutput();
  
  initIds();
      
  if (e.parameter.command === '/ladder-add-schedule' && e.parameter.channel_id !== channelId) {

    return errorResponse('inavailable_channele');
    
  } else if (e.parameter.command === '/ladder-add-schedule') {
    
    var displayName = getDisplayName(e);
    
    var entrySheet = SpreadsheetApp.openById(entrySheetId).getSheets()[0];
    if (!entrySheet)
      return errorResponse('not_exist_entry_sheet');
    
    var teamName = getTeamName(entrySheet, displayName);
    if (teamName.equals('none'))
      return errorResponse('not_entry');
    
    var currentRound = getCurrentRound();
    var challengesSheet = SpreadsheetApp.openById(challengeSheetId).getSheetByName(PropertiesService.getScriptProperties().getProperty('CHALLENGES_SHEET_PREFIX') + currentRound);
    if (!challengesSheet)
      return errorResponse('not_exist_challenge_sheet');
    
    var matchList = getMatchList(challengesSheet, teamName); 
    if (matchList[Object.keys(matchList)[0]].length === 0)
      return errorResponse('not_exist_match'); 
      
    var createdDialog = createDialog(e, matchList, currentRound);
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
  const rangeS = 'D2:M' + LastRow;
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

function createDialog(e, matchList, currentRound){
  var trigger_id = e.parameter.trigger_id;
  var options = getOptions(matchList);
  var dialog = {
    "token": token,
    "trigger_id": trigger_id,
    "dialog": JSON.stringify({
      "callback_id": "ladder_register_match_date",
      "title": "Ladder対戦予定日時登録フォーム",
      "submit_label": "登録する",
      "elements": [
        {
          "type": "text",
          "label": "現在のラウンド(そのままでお願いします)",
          "name": "round",
          "value": currentRound
        },
        {
          "type": "text",
          "label": "チーム名(そのままでお願いします)",
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

function initIds(){
  var currentSeason = mastarData.getSheetByName('Current Season/Round').getRange('C2').getValue();
  var sheetMaster = mastarData.getSheetByName('MasterSheetID');
  const LAST_ROW_NUM = sheetMaster.getLastRow();
  var range = sheetMaster.getRange('A2:D'+LAST_ROW_NUM);
  
  for(var i=0; i<LAST_ROW_NUM-1; i++) {
    if(range.getValues()[i][0] == currentSeason) {
      challengeSheetId = range.getValues()[i][1];
      entrySheetId = range.getValues()[i][2];
      channelId = range.getValues()[i][3];
    }
  }
}

function getCurrentRound() {
  return mastarData.getSheetByName('Current Season/Round').getRange('D2').getValue();
}

function getErrorJson(errorType) {
  var errorJsonText = 'error';
  switch (errorType) {
    case 'inavailable_channele':
      var currentSeason = mastarData.getSheetByName('Current Season/Round').getRange('C2').getValue();
      errorJsonText = '/ladder-add-scheduleコマンドは#ladder' + currentSeason + '-captainsチャンネルでのみ使用可能です';
      break;
    case 'not_exist_entry_sheet':
      errorJsonText = 'エントリーシートが見つかりませんでした。用意されるまでお待ちください';
      break;
    case 'not_exist_challenge_sheet':
      errorJsonText = '最新のチャレンジシートが見つかりませんでした。用意されるまでお待ちください';
      break;
    case 'not_entry':  
      var currentSeason = mastarData.getSheetByName('Current Season/Round').getRange('C2').getValue();
      errorJsonText = 'あなたはLadder#' + currentSeason + 'にエントリーされていません！問い合わせの場合は運営まで';
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
