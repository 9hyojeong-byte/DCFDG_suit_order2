/**
 * Google Sheets DB Sync Script
 * 
 * 구글 스프레드시트의 [확장 프로그램] > [Apps Script]에 이 코드를 복사해서 붙여넣으세요.
 * 
 * [배포 방법]:
 * 1. 우측 상단의 [배포] > [새 배포] 클릭
 * 2. 유형 선택 안내에서 톱니바퀴 아이콘을 눌러 [웹 앱] 선택
 * 3. 설정 입력:
 *    - 설명: 맞춤 주문 서베이 연동 웹앱
 *    - 웹 앱을 실행할 사용자: 나(본인 구글 계정)
 *    - 액세스 권한이 있는 사용자: 모든 사용자(Anyone) <- 중요!
 * 4. [배포] 버튼 클릭 후 웹 앱 URL 주소를 복사하여 서베이 웹앱의 설정 화면에 입력하세요.
 */

function doPost(e) {
  try {
    // 응답 도우미 함수
    function createResponse(data) {
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: "error", message: "전송된 데이터가 없습니다." });
    }
    
    // 데이터 파싱
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createResponse({ status: "error", message: "올바른 JSON 형식이 아닙니다: " + parseErr.toString() });
    }
    
    // 활성 스프레드시트 가져오기
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // 시트가 완전히 비어있을 경우 헤더를 자동으로 생성하고 꾸밉니다.
    var headers = [
      "주문 일시",
      "주문자 이름",
      "개인통관고유번호",
      "우편번호",
      "주소",
      "연락처",
      "제품명",
      "내피옵션",
      "색상",
      "성별",
      "두께",
      "사이즈",
      "수량",
      "정가",
      "공급가",
      "커스텀 및 요구사항 기재"
    ];
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      // 첫 행(헤더) 스타일링
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0F172A"); // Slate-900 배경색
      headerRange.setFontColor("#FFFFFF");      // 흰색 텍스트
      headerRange.setFontWeight("bold");       // 볼드체
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 32);               // 헤더 높이 넓히기
      sheet.setFrozenRows(1);                  // 헤더 행 고정
    }
    
    // 현재 일시 기록 (KST 대한민국 표준시 기준)
    var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd HH:mm:ss");
    
    // 주문자 이름 뒤에 '(25%)'를 붙여 구글 스프레드시트에 저장합니다.
    var ordererNameValue = (data.ordererName || "").toString().trim();
    if (ordererNameValue && ordererNameValue.indexOf("(25%)") === -1) {
      ordererNameValue = ordererNameValue + " (25%)";
    }

    // 한국 우편번호 및 전화번호 등 0으로 시작하는 문자열의 맨 앞 0이 구글 시트에서 생략되는 현상을 방지하기 위해 싱글 쿼테이션(')을 붙여 텍스트로 보존합니다.
    var postalCodeValue = (data.postalCode || "").toString();
    if (postalCodeValue.length > 0 && postalCodeValue.charAt(0) === '0') {
      postalCodeValue = "'" + postalCodeValue;
    }
    
    var phoneValue = (data.phone || "").toString();
    if (phoneValue.length > 0 && phoneValue.charAt(0) === '0' && !phoneValue.startsWith("'")) {
      phoneValue = "'" + phoneValue;
    }
    
    // 전송 받은 값을 시트 열 순서에 맞춰 설정
    var rowData = [
      timestamp,
      ordererNameValue,
      data.customsId || "",
      postalCodeValue,
      data.address || "",
      phoneValue,
      data.productName || "",
      data.liningOption || "",
      data.color || "",
      data.gender || "",
      data.thickness || "",
      data.size || "",
      Number(data.quantity || 1),
      Number(data.price || 0),
      Number(data.supplyPrice || 0),
      data.customNotes || ""
    ];
    
    // 시트에 데이터 행 추가
    sheet.appendRow(rowData);
    var newRowIndex = sheet.getLastRow();
    
    // 데이터 행 포맷 작업
    sheet.getRange(newRowIndex, 1).setHorizontalAlignment("center");  // 주문 일시 가운데 정렬
    sheet.getRange(newRowIndex, 2, 1, 2).setHorizontalAlignment("center");  // 이름, 통관번호 가운데 정렬
    sheet.getRange(newRowIndex, 4).setNumberFormat("@").setHorizontalAlignment("center"); // 우편번호를 텍스트 서식으로 유지하며 가운데 정렬
    sheet.getRange(newRowIndex, 6).setNumberFormat("@").setHorizontalAlignment("center"); // 연락처 텍스트 서식
    sheet.getRange(newRowIndex, 8, 1, 5).setHorizontalAlignment("center");  // 옵션들 가운데 정렬
    
    // 수량 및 가격 셀 지정 포맷 적용
    sheet.getRange(newRowIndex, 13).setNumberFormat("#,##0").setHorizontalAlignment("center"); // 수량
    sheet.getRange(newRowIndex, 14).setNumberFormat("₩#,##0").setHorizontalAlignment("right"); // 정가
    sheet.getRange(newRowIndex, 15).setNumberFormat("₩#,##0").setHorizontalAlignment("right"); // 공급가
    
    // 전체 칼럼 너비 자동 조정
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
      // 지나치게 넓어 지는 걸 방지하기 위해 최대 폭 제한 (원할 경우 조정 가능)
      if (sheet.getColumnWidth(col) > 300) {
        sheet.setColumnWidth(col, 300);
      }
    }
    
    return createResponse({
      status: "success",
      message: "주문 정보가 성공적으로 기록되었습니다.",
      row: newRowIndex,
      timestamp: timestamp
    });
    
  } catch (err) {
    return createResponse({
      status: "error",
      message: "처리에 실패했습니다: " + err.toString()
    });
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Google Sheets DB Sync 서비스가 실행 중입니다. 주문 등록을 위해 POST 요청을 사용하세요.")
    .setMimeType(ContentService.MimeType.TEXT);
}
