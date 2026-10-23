# ScanMatch

**카메라로 바코드를 비추면, 내 엑셀 표의 내용이 바로 보입니다. HTML 파일 하나, 서버·설치 없음.**

### ▶ 앱 열기: **<https://wmyung.github.io/scanmatch/?lang=ko>** (영어: <https://wmyung.github.io/scanmatch/?lang=en>)

위쪽의 **EN / 한** 버튼으로 언제든 언어를 바꿀 수 있습니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![바로 쓰기](https://img.shields.io/badge/바로%20쓰기-wmyung.github.io%2Fscanmatch-2ea44f)](https://wmyung.github.io/scanmatch/)

휴대폰·태블릿·노트북을 **바코드 → 표 조회기**로 만듭니다.

- **엑셀/CSV 올리기, 구글 시트 링크, 직접 입력** — 첫 열이 바코드(QR, DataMatrix, Code128, EAN 등)인 표면 됩니다.
- **스캔** — 사진 한 장에서 수십 개를 읽고, 찾은 행의 정보를 *사진 위*와 카드로 보여 줍니다. 완료 표시로 진행률을 셉니다.
- **짝 확인** — 코드 A(튜브)를 보여 준 뒤 코드 B(방금 붙인 라벨)를 보여 주면, 맞으면 큰 **○**, 틀리면 큰 **✕**와 그 라벨이 어디 것인지 알려 줍니다.
- **랙** — 96웰 랙이나 9×9 박스를 위에서 한 장 찍으면 각 튜브를 행·열 자리에 넣고, **번호 규칙으로 못 읽은 칸을 추정**(색 구분)해 **엑셀**로 저장합니다. 위치 열을 넣으면 **순서 검증**이 됩니다.

실제 연구실 작업(바이오뱅크 튜브 약 1,000개 라벨링·발송)에서 만든 도구를, 특정 연구실 내용을 모두 빼고 누구나 쓸 수 있게 다시 만들었습니다.

**써 보기:** <https://wmyung.github.io/scanmatch/> → *데이터* → *예시 불러오기* → [예시 사진](samples/photos) 촬영

## 쓰는 법
1. **데이터**에서 `.xlsx`/`.csv`를 올리거나, 구글 시트 링크(“링크가 있는 모든 사용자 보기”)를 넣거나, 내장 시트에 직접 붙여넣습니다.
2. **바코드 열**을 고르고, 필요하면 **비교 열**(짝 확인)과 **위치 열**(랙 순서 검증)을 고릅니다.
3. **촬영** 또는 **실시간**. 노트북에서는 [촬영]이 웹캠을 켜고, 한 번 더 누르면 찍습니다.

키보드: `Space` 촬영 · `L` 실시간 · `1` 스캔 · `2` 짝 확인 · `3` 랙 · `Esc` 닫기

## 개인정보
- 서버·계정·분석 도구가 없고, 직접 고른 구글 시트를 가져올 때 말고는 외부로 요청하지 않습니다.
- 표·완료 표시·스캔 기록은 지우기 전까지 이 브라우저의 로컬 저장소에만 있습니다.
- 이 저장소의 예시 데이터와 사진은 모두 `tools/make_samples.py`로 만든 **가상 데이터**입니다.

## 개발
```bash
python3 tools/build.py          # src/* → index.html
python3 tools/make_samples.py   # 가상 예시 데이터·사진 다시 만들기
python3 tools/test.py           # 헤드리스 크롬 종단 테스트
```

MIT 라이선스. 포함된 외부 코드는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 보세요.
