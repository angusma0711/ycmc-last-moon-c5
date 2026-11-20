# 《秘密股票交易所》V4

8–11 人、預設 8 回合的虛構課堂策略遊戲。學生用紙卡；只有教師使用裝置。獨立靜態網站，沒有改動 Midnight 13 或 Lupin 的遊戲碼。

## 網址與操作

- 教師：https://angusma0711.github.io/ycmc-last-moon-c5/trading/
- 公開頁：上述路徑下的 `display.html?session=<128-bit random id>`；由教師控制台產生連結及 QR。
- 紙卡：`paper.html`，A4 八行列印版；10 回合須補兩行續頁。

1. 在教師手機／平板／電腦開啟教師頁，選 8–11 人及 6／8／10 回合。預設只用學生編號。
2. 建立課堂，點「連接 E-board · QR」。在另一台電腦開啟公開連結；公開頁不需登入，不能操作。
3. 收集紙卡，在一張表格輸入整班決定。未輸入者持有。每輪每人只有一個決定。
4. 按「預覽整輪結算」，核對無效交易及價格，再按「確認並公開結算」。無效交易明確拒絕，其餘有效交易照常結算。
5. 每輪以同一開市價成交、扣每件 5 幣手續費，再計收市價與總資產。最後一輪亦會更新價格，沒有多出一輪交易。
6. 修正已結算紙卡：教學工具 → 撤銷最近一輪 → 確認 → 重新輸入整輪。E-board 同步回復。
7. 定時匯出 JSON；匯入會驗證完整歷史並建立新課堂／新公開連結，不覆寫原課堂。

## 私隱、同步及復原

- Firebase Anonymous Authentication 提供真正的教師 UID 授權；隨機課堂編號只提供難猜的公開閱讀連結，**不**授予教師權限。
- `tradingRooms/<id>` 根節點及 `privateState` 只有建立者可讀寫。公開頁只訂閱 `/public`，不載入 engine 或 host 模組。
- DTO 使用明確欄位白名單，只含已結算價格、價格歷史、聚合買賣件數、排名、現金及總資產。沒有持貨、個別交易、未提交紙卡或教師憑證。
- 一次 Firebase transaction 原子寫入私人狀態與公開 snapshot。根節點 revision 必須嚴格 +1；舊 revision、重複操作及其他教師寫入會被拒絕。
- 多個同教師分頁同時結算時，只有第一個成功；其他分頁同步後重新核對。未提交草稿只留在該教師瀏覽器，按課堂＋revision 儲存，刷新可恢復。
- 斷線時保留上次公開畫面並顯示狀態；教師暫停結算。已送出的 transaction 若等待重連，請等結果或重開頁面讀取已提交狀態，毋須再輸入第二次。
- 教師權限保存在原瀏覽器的 Firebase 登入。清除瀏覽器資料／更換裝置不會從公開連結取回教師權限；請事前匯出備份。此 MVP 不提供跨裝置教師接管。
- 公開連結沒有到期機制。只使用編號／簡單暱稱，勿輸入真實學生資料；舊課堂如需刪除可由 Firebase Console 刪除其節點。
- 本遊戲的「秘密公式」指不在學生畫面或其下載模組出現；靜態網站不是防止技術使用者查閱教師原始碼的保密系統。

## 本機啟動及 Firebase 設定

無 build 步驟、無額外 npm dependencies。Node 22+ 執行測試；Python 3 啟動靜態伺服器：

```sh
cd lesson-06-secret-trading
npm test
npm start
# http://localhost:8797/
```

`web/config.js` 的 Firebase Web config 是公開專案識別資料，不是 admin secret。靜態部署不需要私密 environment variables。使用其他專案時填入 `MOON_FIREBASE_CONFIG` 的 `apiKey`、`authDomain`、`databaseURL`、`projectId`、`appId` 等 Firebase Web app 欄位。

1. Firebase Console → Authentication → Sign-in method → 啟用 Anonymous。
2. 建立 Realtime Database，將正式網站 host 加入適當的授權網域。
3. 將 `database.rules.json` 的 `rules.tradingRooms` 合併到**目前**資料庫規則；不要用舊備份覆蓋其他遊戲命名空間。`tools/rules.py` 提供只新增本命名空間的 merger。
4. 本專案現有 Firebase 已完成部署及兩個獨立瀏覽器同步測試。管理 token／refresh token 不在原始碼或 GitHub。
5. 將 `web/` 內容部署到普通 HTTPS 靜態主機，或現有 Pages 專案的 `eboard/trading/`。QR 使用當前部署 URL；本機、file 或 LAN 預覽不產生 QR。
6. 若移除 config，只能使用標示清楚的同瀏覽器 local demo；不會聲稱跨裝置可用。缺 config 的示範沒有後端授權，不能用於正式教學。

部署使用現有 GitHub Pages workflow；其他遊戲原封保留。Firebase SDK 固定 12.4.0，從 Google gstatic 載入；QR generator 使用既有 MIT library，見 THIRD-PARTY-NOTICES.md。

## 模組

- `engine.mjs`：純函數、整數運算、交易驗證、結算、undo、backup replay、公開白名單。
- `host.mjs` / `index.html`：教師私有流程及單一批次表格。
- `display.mjs` / `display.html` / `view.mjs`：只讀公開畫面，沒有價格演算法依賴。
- `cloud.mjs`：Firebase 授權、監聽、revision transaction、清楚標記的本機示範。
- `tests/trading.test.cjs`：規則、排序無關性、資料白名單、所有回合選項及策略模擬。
- `tests/browser.cjs`：兩個獨立 browser contexts、完整 11 人八回合、權限、刷新／重連、撤銷及版面。

```sh
# 已安裝 Playwright 與 Chrome 的環境；可用 PLAYWRIGHT_MODULE 指定模組位置
node tests/browser.cjs
TRADING_URL=https://angusma0711.github.io/ycmc-last-moon-c5/trading/ node tests/browser.cjs
```

測試只建立合成課堂及臨時匿名帳戶，finally 清理自己建立的資料。

## 策略檢查與教學取捨

同策略全班模擬（11 人、8 回合，每次買賣 3 件；並非證明市場平衡）：

| 策略 | 最終每人總資產 |
|---|---:|
| 全程持有現金 | 1,000 |
| 黃金鐘奇數輪買、偶數輪賣 | 1,060 |
| 藍水晶奇數輪買、偶數輪賣 | 1,120 |
| 紅藥水奇數輪買、偶數輪賣 | 640 |

黃金鐘每個兩輪循環每件固定賺 5，毋須預測同學行動，確實可被利用；藍水晶的模擬收益依賴全班相同交易行動，不能當作保證。**V4 規則保持原樣。** 如果希望取消黃金鐘的無風險循環，最小修改建議為把循環幅度由 ±15 改為 ±10，剛好抵消買賣兩次手續費；須教師先批准，程式尚未作此改動。也可把規律保留作「發現規則、以證據調整策略」的教學重點。

建議節奏：8 分鐘介紹、8 × 5 分鐘回合、5 分鐘排名、7 分鐘討論。未加入倒數自動提交、音效、OCR 或學生登入。

## 課前圖解股票（新增）

[獨立教學頁](https://angusma0711.github.io/ycmc-last-moon-c5/trading/learn.html)使用六張插圖及簡短標籤，介紹股份擁有權、買入、升跌、現金與總資產、賣出及遊戲決定。教師／公開頁右上角的「圖解股票 ↗」在新分頁開啟；本頁不讀寫遊戲資料。可切換 120／80 的價格例子，亦支援全螢幕及鍵盤導覽。內容界線、教學目標與數字見 `LESSON.md`；生成插圖與完整 prompt 見 `IMAGE-PROMPT.md`。
