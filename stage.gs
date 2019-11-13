var token = PropertiesService.getScriptProperties().getProperty('OAUTH_TOKEN');
var stageSheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('STAGE_SHEET_ID')); // Master //シーズン毎に保守

function doPost(e) {
  
  var verified_token = PropertiesService.getScriptProperties().getProperty('VERIFIED_TOKEN');
  var verificationToken = e.parameter.token || JSON.parse(e.parameter.payload).token || null;
  
  if (verificationToken !== verified_token)
    return ContentService.createTextOutput();
  
  var sheet = stageSheet.getSheets()[0];
  if (!sheet)
    return errorResponse('not_exist_stage_sheet');
  
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
  
  var season = range.getValues()[lastIndex][seasonColumnIndex];
  var round = range.getValues()[lastIndex][roundColumnIndex];
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
  
  var blocks = [];
  stageList.reverse().forEach(function( value ) {
    Logger.log( value );
    blocks.push(
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": value
        }
      }
    );
  });
  
  var text = "シーズン：#" + season + " ラウンド：" + round
  var response = {
    "response_type": "in_channel",
    "text": text,
    "attachments": [{
      "blocks":blocks
    }]
  };
  
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);

}

function getErrorJson(errorType) {
  var errorJsonText = 'error';
  switch (errorType) {
    case 'not_exist_stage_sheet':
      errorJsonText = 'ステージシートが見つかりませんでした。用意されるまでお待ちください';
      break;
    default:
  }
  return {"response_type": "ephemeral","text": errorJsonText};
}

function errorResponse(errorType) {
  return ContentService.createTextOutput(JSON.stringify(getErrorJson(errorType))).setMimeType(ContentService.MimeType.JSON); 
}
