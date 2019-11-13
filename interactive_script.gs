var token = PropertiesService.getScriptProperties().getProperty('OAUTH_TOKEN');
var verifiedToken = PropertiesService.getScriptProperties().getProperty('VERIFIED_TOKEN');
var mastarData = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_DATA_SHEET_ID'));
var captainsChannelId = '';
var challengeSheetId = '';
var entrySheetId = '';

function initIds(){
  var currentSeason = mastarData.getSheetByName('Current Season/Round').getRange('C2').getValue();
  var sheetMaster = mastarData.getSheetByName('MasterSheetID');
  const LAST_ROW_NUM = sheetMaster.getLastRow();
  var range = sheetMaster.getRange('A2:D'+LAST_ROW_NUM);
  
  for(var i=0; i<LAST_ROW_NUM-1; i++) {
    if(range.getValues()[i][0] == currentSeason) {
      challengeSheetId = range.getValues()[i][1];
      entrySheetId = range.getValues()[i][2];
      captainsChannelId = range.getValues()[i][3];
      break;
    }
  }
}

function doPost(e) {
  
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  var p = JSON.parse(decodeURIComponent(e.parameter.payload));

  if (verificationToken !== verifiedToken) {
    var response = sendTokenError(p.response_url);
    ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }
  
  initIds();
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
    case 'call_opponent_team_leader':
      if (captainsChannelId.equals(p.channel.id)) {
        payload = callOpponentTeamLeader(p);
      }else {
        payload = invalidChannelId();
      }
      
      break;
    default:
      payload = invalidCallback();
      break;
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

function setDateToMasterSheet(s) {
  const MATCH_ID_INDEX = 0;
  const SCHEDULE_COLUMN = 2;
  var currentRound = getCurrentRound();
  var challengesSheet = SpreadsheetApp.openById(challengeSheetId).getSheetByName(PropertiesService.getScriptProperties().getProperty('CHALLENGES_SHEET_PREFIX') + currentRound);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][MATCH_ID_INDEX].equals(matchId)) {
      var row_index = i+2;
      challengesSheet.getRange(row_index,SCHEDULE_COLUMN).setValue(s.date);
      break;
    }
  }
}

function setScoreToMasterSheet(s) {
  const MATCH_ID_INDEX = 0;
  const SCORE_COLUMN_C = 5;
  const SCORE_COLUMN_D = 8;
  var currentRound = getCurrentRound();
  var challengesSheet = SpreadsheetApp.openById(challengeSheetId).getSheetByName(PropertiesService.getScriptProperties().getProperty('CHALLENGES_SHEET_PREFIX') + currentRound);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][MATCH_ID_INDEX].equals(matchId)) {
      var row_index = i+2;
      challengesSheet.getRange(row_index,SCORE_COLUMN_C).setValue(s.score_c);
      challengesSheet.getRange(row_index,SCORE_COLUMN_D).setValue(s.score_d);
      break;
    }
  }
}

function getChallengeTeamName(s) {
  const TEAM_NAME_COLUMN = 4;
  var currentRound = getCurrentRound();
  var challengesSheet = SpreadsheetApp.openById(challengeSheetId).getSheetByName(PropertiesService.getScriptProperties().getProperty('CHALLENGES_SHEET_PREFIX') + currentRound);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][0].equals(matchId)) {
      var row_index = i+2;
      return challengesSheet.getRange(row_index,TEAM_NAME_COLUMN).getValue();
      break;
    }
  }
}

function getDefenceTeamName(s) {
  const MATCH_ID_INDEX = 0;
  const TEAM_NAME_COLUMN = 7;
  var currentRound = getCurrentRound();
  var challengesSheet = SpreadsheetApp.openById(challengeSheetId).getSheetByName(PropertiesService.getScriptProperties().getProperty('CHALLENGES_SHEET_PREFIX') + currentRound);
  const LastRow = challengesSheet.getLastRow();
  const rangeS = 'A2:A' + LastRow;
  var range = challengesSheet.getRange(rangeS);
  var matchId = s.matchLabel.split(' ')[0];
  
  for(var i=0; i<LastRow-1; i++){
    if (range.getValues()[i][MATCH_ID_INDEX].equals(matchId)) {
      var row_index = i+2;
      return challengesSheet.getRange(row_index,TEAM_NAME_COLUMN).getValue();
      break;
    }
  }
}

function getOpponentTeamLeaderId(payload) {
  const MATCH_ID_INDEX = 0;
  const TEAM_NAME_COLUMN_C = 4;
  const TEAM_NAME_COLUMN_D = 7;
  var currentRound = getCurrentRound();
  var challengesSheet = SpreadsheetApp.openById(challengeSheetId).getSheetByName(PropertiesService.getScriptProperties().getProperty('CHALLENGES_SHEET_PREFIX') + currentRound);
  var LastRow = challengesSheet.getLastRow();
  var rangeS = 'A2:A' + LastRow;
  var challengeSheetRange = challengesSheet.getRange(rangeS);
  
  const MATCH_ID_LENGTH = 6;
  var matchIdIndexS = payload.message.text.indexOf("[" + currentRound);
  if (matchIdIndexS < 0)
    return 'match_id_error';
  
  var matchId = payload.message.text.slice(matchIdIndexS,matchIdIndexS+MATCH_ID_LENGTH);
  
  var displayName = getDisplayName(payload.user.id);
    
  var entrySheet = SpreadsheetApp.openById(entrySheetId).getSheets()[0];
  if (!entrySheet)
    return 'not_exist_entry_sheet';
      
  var myTeamName = getTeamName(entrySheet, displayName);
  var opponentTeamName = "";
  var teamNameC = "";
  var teamNameD = "";
  
  for(var i=0; i<LastRow-1; i++){
    if (challengeSheetRange.getValues()[i][MATCH_ID_INDEX].equals(matchId)) {
      var row_index = i+2;
      teamNameC = challengesSheet.getRange(row_index,TEAM_NAME_COLUMN_C).getValue();
      teamNameD = challengesSheet.getRange(row_index,TEAM_NAME_COLUMN_D).getValue();
      break;
    }
  }
  
  if(myTeamName.equals(teamNameC)) {
    opponentTeamName = teamNameD;
  }else if(myTeamName.equals(teamNameD)) {
    opponentTeamName = teamNameC;
  }else {
    return 'not_found_team';
  }
  
  const ENTRY_TEAM_NAME_INDEX = 0;
  const LEADER_NAME_COLUMN = 5;
  var LastRow = entrySheet.getLastRow();
  var rangeS = 'D2:D' + LastRow;
  var entrySheetRange = entrySheet.getRange(rangeS);
  var opponentTeamLeaderName = ""
  
  for(var i=0; i<LastRow-1; i++){
    if (entrySheetRange.getValues()[i][ENTRY_TEAM_NAME_INDEX].equals(opponentTeamName)) {
      var row_index = i+2;
      opponentTeamLeaderName = entrySheet.getRange(row_index,LEADER_NAME_COLUMN).getValue();
      break;
    }
  }
  
  var opponentTeamLeaderId = "";
  
  var url = 'https://slack.com/api/users.list?token=' + token + '&pretty=1';
  var usersList = JSON.parse(UrlFetchApp.fetch(url).getContentText());
  usersList.members.forEach(function( info ) {
    if(opponentTeamLeaderName.equals('@'+info.profile.display_name)) {
      opponentTeamLeaderId = info.id;
    }else if(opponentTeamLeaderName.equals(info.profile.display_name)) {
      opponentTeamLeaderId = info.id;
    }
  });
  return opponentTeamLeaderId;
}

function registerMatchDate(payload) {
  var submission = payload.submission;
  
  setDateToMasterSheet(submission);
  
  var payload = {
    'response_type': 'ephemeral',
    'replace_original': false,
    'attachments': [{
      'color': '#36a64f',
      'pretext': '以下の情報で登録しました',
      'fields': [
        {
          'title': 'ラウンド',
          'value': submission.round,
          'short': false
        },
        {
          'title': 'チーム名',
          'value': submission.name,
          'short': false
        },
        {
          'title': '対戦カード',
          'value': submission.matchLabel,
          'short': false
        },
        {
          'title': '対戦予定日時',
          'value': submission.date,
          'short': false
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
    'response_type': 'in_channel',
    'replace_original': false,
    'attachments': [{
      'color': '#36a64f',
      'pretext': '以下の情報で登録しました',
      'fields': [
        {
          'title': 'ラウンド',
          'value': submission.round,
          'short': false
        },
        {
          'title': 'チーム名',
          'value': submission.name,
          'short': false
        },
        {
          'title': '対戦カード',
          'value': submission.matchLabel,
          'short': false
        },
        {
          'title': '挑戦側:' + getChallengeTeamName(submission) + ' のスコア',
          'value': submission.score_c,
          'short': false
        },
        {
          'title': '防衛側:' + getDefenceTeamName(submission) + ' のスコア',
          'value': submission.score_d,
          'short': false
        }
      ]
    }]
  }
  return payload;
}

function callOpponentTeamLeader(payload) {  
  var opponentTeamLeaderId = getOpponentTeamLeaderId(payload);
  if(opponentTeamLeaderId.equals('match_id_error'))
    return invalidMatchId();
  else if (opponentTeamLeaderId.equals('not_exist_entry_sheet')) 
    return invalidEntrySheet();
  else if (opponentTeamLeaderId.equals('not_found_team'))
    return invalidUserToMatch();
    
  var payload = {
    'response_type': 'in_channel',
    'replace_original': false,
    'text': '<@' + opponentTeamLeaderId + '>',
    'thread_ts': payload.message_ts
  }
  return payload;
}

function getCurrentRound() {
  return mastarData.getSheetByName('Current Season/Round').getRange('D2').getValue();
}

function getDisplayName(userId) { 
 var url = 'https://slack.com/api/users.info?token=' + token + '&user=' + userId + '&pretty=1';
 var userInfo = JSON.parse(UrlFetchApp.fetch(url).getContentText());
 return userInfo.user.profile.display_name;  
}

function getTeamName(sheet, displayName) {
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

function invalidCallback() {
  return makeErrorPayload('Invalid Callback Id.');
}

function invalidChannelId() {
  return makeErrorPayload('このチャンネルでは使用できません。#ladder(n)-captainsチャンネルで使用できます。');
}

function invalidMatchId() {
  return makeErrorPayload('マッチIDを確認することができませんでした。お問い合わせは運営までお願いいたします。');
}

function invalidEntrySheet() {
  return makeErrorPayload('エントリーシートが見つかりませんでした。用意されるまでお待ちください。');
}

function invalidUserToMatch() {
  return makeErrorPayload('メッセージ主所属チームとマッチIDから参照されるチームが一致しませんでした。お問合せは運営まで。');
}

function makeErrorPayload(text) {
  var payload = {
    'response_type': 'ephemeral',
    'replace_original': false,
    'attachments': [{
      'color': 'danger',
      'pretext': text
    }]
  }
  return payload;
}
