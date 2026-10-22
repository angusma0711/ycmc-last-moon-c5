# 狼人：最後的月夜 · C5

香港 P4–P6、8–11 人的面對面討論遊戲。獨立 HTML/CSS/JavaScript 專案，不改動現有其他課堂遊戲。

## 正式使用：與 Block practice 相同的 QR 流程

網站：https://ycmc-last-moon-c5.web.app/

1. 在電腦／e-board 開啟網站，選 8–11 人，按「建立遊戲課堂」。
2. 用私人 iPad 相機掃描大 QR code，開啟教師控制器，確認這是私人裝置。
3. 電腦顯示「iPad 已配對」後，按 **Open Presentation · 開啟遊戲大屏**。
4. iPad 設定身份及主持遊戲；電腦只顯示公開畫面，無需輸入或保存身份。

開始頁和教師控制台沿用 Block practice / ipad-presentation 的淺灰背景、白色圓角卡片、綠色大按鈕、單欄 iPad 排版及課堂連線狀態。大屏保留原本月夜場景及遊戲座位環；不把簡報翻頁機制硬套到遊戲規則。

QR 在本機使用 MIT 授權 qrcode-generator 產生，不會把控制網址送到第三方 QR 圖片服務。首次配對入口 10 分鐘有效；成功後原教師瀏覽器可恢復連線，其他匿名裝置不能搶用同一 QR。

### QR 配對的私隱界線

電腦先建立 `/pairings/<random-id>`，只包含 pairing key、人數、建立時間及掃碼後的公開 room 指標。原 iPad 另建 `/rooms/<room>` 並持有房間寫入權限；電腦的配對 owner 身份不會獲得遊戲 room 的寫入權限。

配對節點不能公開讀取或列舉；只有持有 QR key 的首次匿名控制器可以 claim。QR 是教師控制入口，請由導師掃描；掃碼後會隱藏配對 QR。秘密身份、夜間選擇及逐人選票仍只在 iPad localStorage，沒有放入配對節點。

同一局只使用一個教師分頁。重新載入控制網址後再次確認私人裝置，會恢復同一教師瀏覽器內的遊戲；更換瀏覽器／清除網站資料後，請重新建立課堂。沒有把秘密資料跨裝置複製的功能。

## 直接試玩

開啟 `eboard/index.html`，按「離線主持／原有教師台」，確認這是私人裝置。毋須安裝套件即可離線主持。

1. 「身份與情報」選人數，隨機分配或按實體身份卡輸入座位，按「驗證並儲存身份」。
2. 產生開局情報，在教師畫面核對並私下告知對應玩家。固定座位不可調換。
3. 「主持流程」開始第一夜；每夜輸入醫生保護，第二夜起輸入主狼襲擊。
4. 先私下預覽，再確認天亮公開。依序進行私人交流、公開討論、技能、投票。
5. 活躍玩家必須投票；幽靈可保留最後一票。平票會提供一次限定候選人重投。
6. 計票只在教師畫面預覽；確認後才向大屏公布票數、封印及勝利。
7. 「紀錄與重置」可撤銷、下載私人備份、恢復備份、重開或清除。

單一 e-board 離線主持會面臨實體私隱問題：切換教師畫面時學生仍看得到。請遮屏／停止投影，或使用紙本秘密紀錄；正式課堂建議採用下面的私人 iPad + Firebase 大屏流程。

## Firebase：iPad 控制，大屏一直顯示

**目前狀態（2026-10-18）：** 已部署到 https://ycmc-last-moon-c5.web.app/ 。Project `ycmc-last-moon-c5` 屬於 angusma0711@gmail.com，使用免費 Spark plan。Anonymous Authentication、Realtime Database（新加坡）及隨附 Security Rules 均已啟用，公開 Web 設定已內置，毋須貼 JSON。已通過真實 Firebase 權限測試，並驗證 Safari 教師端 → 獨立公開瀏覽器的即時提示更新。原有 Block practice project 沒有改動。

資料路徑：

```text
iPad：秘密身份、情報、夜間選擇、逐人選票、幽靈票、撤銷紀錄
    └─ localStorage（只在教師瀏覽器）
    └─ publicState() 白名單轉換
         └─ Firebase /rooms/<128-bit 隨機房間碼>/public
              └─ e-board：階段、座位狀態、倒數、公開紀錄

Firebase /rooms/<room>/owner：匿名教師 UID（主持擁有權）
```

- 大屏監聽公開節點，不接收教師 state，也不需要教師登入。
- Firebase Anonymous Authentication 將房間寫入權限綁定原教師瀏覽器的 UID，沒有學生帳號流程。
- 房間公開節點採「持有連結可讀」；網址有 128-bit 隨機碼，不能當成機密資料通道。不要把公開連結貼到網上。
- 大屏沒有教師按鈕；即使自行改網址打開教師介面，另一裝置也沒有 iPad 的秘密 state 或 Firebase 寫入擁有權。這依賴正確部署隨附 Rules。
- **不能開放整個 database 的 `.read`／`.write`。** Rules 阻止非擁有者修改、房間列舉及未授權欄位（如 `players/0/role`）。
- 公開角色清單只含種類與通用技能，沒有座位對應。公開畫面不傳 `ghostUsed`、`intel`、`pending`、`voteRecords` 或 `lastProtect`。

### 1. 建立 Firebase project

用你的 Google 帳戶到 [Firebase Console](https://console.firebase.google.com/)：

1. 建立 project，加入一個 **Web app**。
2. Authentication → Sign-in method → 啟用 **Anonymous**。
3. Realtime Database → 建立 database。不要用開放的測試 Rules；部署本專案 `database.rules.json`。
4. Project settings → Your apps → Web app SDK setup and configuration，取得 `firebaseConfig`，並加入 Realtime Database 的 `databaseURL`。

不要提供 Google 密碼、service account JSON 或 Admin SDK 私鑰。Firebase Web 設定屬前端設定，權限由 Authentication + Rules 控制。

教師介面接受嚴格 JSON（屬性名用雙引號，不含 `const firebaseConfig =`）：

```json
{
  "apiKey": "你的 Web apiKey",
  "authDomain": "你的-project.firebaseapp.com",
  "databaseURL": "https://你的-database.asia-southeast1.firebasedatabase.app",
  "projectId": "你的-project",
  "appId": "你的 Web appId"
}
```

### 2. 部署到 Firebase Hosting

使用已安裝的 Node.js 與 Firebase CLI，在本資料夾執行：

```sh
npm install -g firebase-tools
firebase login
firebase deploy --project YOUR_PROJECT_ID --only database,hosting
```

`firebase.json` 已指定公開資料夾 `eboard`，不會部署私人備份或測試。

也可在 Console 的 Realtime Database → Rules 貼上 `database.rules.json` 並 Publish。靜態頁面仍須透過 HTTPS 託管，供 iPad／e-board 開啟。直接 file:// 模式不啟動 Firebase。

### 3. 課堂配對

1. iPad 開啟 Hosting 網址，進入教師控制。
2. 「連接大屏」直接按「連接 Firebase 並建立／恢復房間」。設定已內置，無需貼 JSON。
3. 複製產生的 **公開顯示網址**，在 e-board 的 Chrome/Safari 開啟。
4. e-board 按全螢幕。**不要鏡像 iPad 畫面**，兩台裝置各開自己的頁面。
5. 在 iPad 操作遊戲；注意頁首「已同步至大屏」，並核對大屏已更新。
6. 本機預覽只用於同瀏覽器另一分頁，不能作為 iPad 跨裝置連線。

同一局只使用一個教師分頁。重新整理 iPad 後，進入教師模式會嘗試恢復已儲存房間。跨瀏覽器／清除網站資料會失去原匿名 UID；使用原瀏覽器，或另建新局、新房間。身份資料沒有雲端備份，建議開局後下載私人備份。

### 4. 斷線與計時

- iPad 斷線仍可本機主持，Firebase 會在目前頁面保持開啟時排隊送出公開更新；頁首標示尚未同步。
- e-board 保留最後收到的畫面，**不會知道斷線期間新結果**。恢復連線後讀取最新快照。
- 計時以截止時間運算，Firebase 提供 server time offset，避免分頁切換令倒數停住。斷線期間大屏原有倒數仍會繼續，無法收到新的暫停／重設。
- 第一次線上載入成功後，Service Worker 快取本地遊戲檔案；離線重新整理可載入本機遊戲。Firebase CDN SDK 沒有離線打包；重新整理後恢復雲端連線需要網絡。
- 本機資料保留不等於雲端更新已成功。網絡故障時以教師紀錄為準，必要時使用紙本，恢復後確認大屏狀態。

### 5. 刪除資料

「關閉雲端房間」刪除該 Firebase 房間，保留 iPad 本機遊戲。大屏保留最後畫面並標示房間已關閉。

「清除本機與雲端資料」會先刪除已連接房間，再刪除此瀏覽器的遊戲 localStorage。若有房間但尚未恢復連線，需先連接以確認雲端刪除成功。其他裝置保留的公開快照，可清除此站網站資料移除；已下載的私人備份須自行刪除。離線快取只含程式及背景，不含私人遊戲資料。

## 規則與教育設計

完全沿用所提供 C5 規則，取消公開三人公告及偽造情報。10 人議事官、11 人證詞官均標示未平衡測試。夜襲不會提前觸發狼方人數勝利，僅在白天結算後判定；封印主狼優先判好人勝。

討論提示可切換 Evidence / Question / Reasoning。學生須指出資訊來源、分辨事實與推測、說明判斷理由；毋須揭示真實身份。Debrief 供導師口頭收集學習證據，系統不收集學生姓名或發言內容。

原文件要求「全部本機、無帳號依賴」，本次依使用者新增要求加入可選 Firebase 跨裝置同步。匿名登入只用於教師房間權限；離線模式仍可不連 Firebase 使用。

## 測試與檔案

```sh
npm test
# Browser integration（先開另一個 terminal 啟動本機伺服器）
python3 -m http.server 8787 --directory eboard
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

- `eboard/engine.js`：規則、公開資料白名單。
- `eboard/app.js`：教師 UI、大屏、Firebase、備份與復原。
- `database.rules.json`：Realtime Database 權限與公開欄位驗證。
- `QA.md`：已測試項目及待驗收項目。
- `assets-prompt.md`：背景生成提示及來源。

官方參考：[讀寫及監聽資料](https://firebase.google.com/docs/database/web/read-and-write)、[Security Rules](https://firebase.google.com/docs/database/security)、[匿名登入](https://firebase.google.com/docs/auth/web/anonymous-auth)。

## 已部署版本的使用注意

教師端建議 Safari／Chrome。Codex 內置瀏覽器曾出現匿名登入 auth/network-request-failed，但公開只讀頁可正常同步。換到真正 iPad 時，請在 iPad 建立自己的房間，再將該房間的大屏網址送到 e-board；不要沿用另一台電腦的主持房間。新版本加入短網址及檔案版本標記；遇到舊快取請重新整理。
