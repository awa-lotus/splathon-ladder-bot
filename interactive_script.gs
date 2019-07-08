var masterSheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_SHEET_ID')); // Master //シーズン毎に保守
var targetSheetName = PropertiesService.getScriptProperties().getProperty('TARGET_SHEET_NAME'); //ラウンド毎に保守
var verifiedToken = PropertiesService.getScriptProperties().getProperty('VERIFIED_TOKEN');

function doPost(e) {
  
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  var p = JSON.parse(decodeURIComponent(e.parameter.payload));

  if (verificationToken !== verifiedToken) {
    var response = sendTokenError(p.response_url);
    ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ダイアログでサブミットボタンを押したときの処理

  var submission = p.submission;
  var payload = {};
  
  switch (p.callback_id) {
    case 'ladder_register_match_date':
      payload = registerMatchDate(p);
      break;
    case 'ladder_register_score':
      payload = registerMatchScore(p);
      break;
    default:
      payload = invalidCallback();
      break;
  }
  
  var url = p.response_url;

  var options = {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  
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

function setScoreToMasterSheet(s) {
  const challengesSheet = masterSheet.getSheetByName(targetSheetName);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][0].equals(matchId)) {
      challengesSheet.getRange(i+2,5).setValue(s.score_c);
      challengesSheet.getRange(i+2,8).setValue(s.score_d);
      break;
    }
  }
}

function getChallengeTeamName(s) {
  const challengesSheet = masterSheet.getSheetByName(targetSheetName);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][0].equals(matchId)) {
      return challengesSheet.getRange(i+2,4).getValue();
      break;
    }
  }
}

function getDefenceTeamName(s) {
  const challengesSheet = masterSheet.getSheetByName(targetSheetName);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][0].equals(matchId)) {
      return challengesSheet.getRange(i+2,7).getValue();
      break;
    }
  }
}

function registerMatchDate(payload) {
  var submission = payload.submission;
  
  setDateToMasterSheet(submission);
  
  var payload = {
    "response_type": "ephemeral",
    "replace_original": false,
    "attachments": [{
      "color": "#36a64f",
      "pretext": "以下の情報で登録しました",
      "fields": [
        {
          "title": "チーム名",
          "value": submission.name,
          "short": false
        },
        {
          "title": "対戦カード",
          "value": submission.matchLabel,
          "short": false
        },
        {
          "title": "対戦予定日時",
          "value": submission.date,
          "short": false
        }
      ]
    }]
  }
  return payload;
}
  
function registerMatchScore(payload) {
  var submission = payload.submission;
  
  setScoreToMasterSheet(submission);
  
  var payload = {
    "response_type": "in_channel",
    "replace_original": false,
    "attachments": [{
      "color": "#36a64f",
      "pretext": "以下の情報で登録しました",
      "fields": [
        {
          "title": "チーム名",
          "value": submission.name,
          "short": false
        },
        {
          "title": "対戦カード",
          "value": submission.matchLabel,
          "short": false
        },
        {
          "title": "挑戦側:" + getChallengeTeamName(submission) + " のスコア",
          "value": submission.score_c,
          "short": false
        },
        {
          "title": "防衛側:" + getDefenceTeamName(submission) + " のスコア",
          "value": submission.score_d,
          "short": false
        }
      ]
    }]
  }
  return payload;
}

function sendTokenError(url) {
  var payload = {
    "response_type": "ephemeral",
    "replace_original": false,
    "attachments": [{
      "color": "danger",
      "pretext": "Invalid token Error.",
    }]
  }
  
  var options = {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  return response;
}

function invalidCallback() {
  var payload = {
    "response_type": "ephemeral",
    "replace_original": false,
    "attachments": [{
      "color": "danger",
      "pretext": "Invalid Callback Id."
    }]
  }
  return payload;
}
