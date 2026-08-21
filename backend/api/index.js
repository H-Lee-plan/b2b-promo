// Vercel 서버리스 함수 진입점. src/server.js가 export하는 Express 앱을 그대로 감싼다.
// (app.listen()은 src/server.js의 require.main === module 가드 덕분에 여기선 호출되지 않는다.)
module.exports = require('../src/server.js');
