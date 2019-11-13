var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
var stageSheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('STAGE_SHEET_ID')); // Master //シーズン毎に保守
var targetWord = '対戦スレ';

function doPost(e) {
  var postData = JSON.parse(e.postData.getDataAsString());
  
  // Event Subscriptionsに必要な部分
  if(postData.type == 'url_verification') {
    return ContentService.createTextOutput(postData.challenge);
  } else if　(
    postData.event.channel == PropertiesService.getScriptProperties().getProperty('LADDER_CHANNEL_ID') // 指定のチャンネルだけを観測する
    && postData.event.bot_id != PropertiesService.getScriptProperties().getProperty('BOT_SLACK_ID') // botが発言者の場合には反応しない
    && postData.event.text.indexOf(targetWord) > -1 // 指定ワードにだけ反応
  ) {
    return reply(postData);
  }
  
  return 0;
}

function getErrorJson(errorType) {
  var errorJsonText = 'error';
  switch (errorType) {
    case 'not_exist_stage_sheet':
      errorJsonText = 'ステージシートが見つかりませんでした。用意されるまでお待ちください';
      break;
    default:
  }
  return {'response_type': 'ephemeral','text': errorJsonText};
}

function errorResponse(errorType) {
  return ContentService.createTextOutput(JSON.stringify(getErrorJson(errorType))).setMimeType(ContentService.MimeType.JSON); 
}

function reply(postData){
  var slackUrl = 'https://slack.com/api/chat.postMessage';
  
  var sheet = stageSheet.getSheets()[0];
  if (!sheet)
    return errorResponse('not_exist_stage_sheet');
  
  var ladderInfo = getLadderInfo(sheet);
  
  var blocks = [];
  ladderInfo['stageList'].forEach(function( value ) {
    blocks.push(
      {
        'type': 'section',
        'text': {
          'type': 'plain_text',
          'text': value
        }
      }
    );
  });
  
  var text = 'シーズン：#' + ladderInfo['season'] + ' ラウンド：' + ladderInfo['round'];
  var payload = {
    'channel': postData.event.channel,
    'text': text,
    'attachments': [{
      'blocks':blocks
    }],
    'thread_ts': postData.event.ts
  };

  var options = {
    'method'  : 'POST',
    'contentType' : 'application/json; charset=UTF-8',
    'headers' : {'Authorization': 'Bearer '+ token},
    'payload' : JSON.stringify(payload)
  };
  
  return UrlFetchApp.fetch(slackUrl, options); 
}

function getLogFile() {
  if (this.logFile === undefined) {
    this.logFile = DocumentApp.openById(this.LOG_FILE_ID);
  }
  return this.logFile;
}

function getLadderInfo(sheet) {
  var stageInfo = {};
  const LastRow = sheet.getLastRow();
  const lastIndex = LastRow - 2;
  const rangeS = 'A2:E' + LastRow;
  const seasonColumnIndex = 0;
  const roundColumnIndex = 1;
  const orderColumnIndex = 2;
  const stageColumnIndex = 3;
  const ruleColumnIndex = 4;
  var range = sheet.getRange(rangeS);
  var stageList = [];
  
  stageInfo['season'] = range.getValues()[lastIndex][seasonColumnIndex];
  stageInfo['round'] = range.getValues()[lastIndex][roundColumnIndex];
  for(var i=lastIndex; ; i--){
    
    var spaceCnt = 11 - range.getValues()[i][stageColumnIndex].length;
    var space = '';
    for(var sc = 0; sc < spaceCnt; sc++){
      space += '　';
    }
    
    stageList.push(range.getValues()[i][orderColumnIndex] + ' ' +  range.getValues()[i][stageColumnIndex] + space + ' ' + range.getValues()[i][ruleColumnIndex]);
    if (range.getValues()[i][orderColumnIndex] == 1 )
      break;
  }
  
  stageInfo['stageList'] = stageList.reverse();
  
  return stageInfo;
}
