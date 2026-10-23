# C5 QA · 2026-10-18

## 已通過：規則測試

執行 `node --test tests/*.test.cjs`：**19 / 19 通過**。

- 8／9／10／11 人正確角色數量、無重複；每種人數 200 次隨機情報驗證。
- 檔案官名單不含自己、三人恰一邪惡；守望者用固定座位左右相鄰陣營；史官只知道另一好人。
- 錯誤身份配置、非 8–11 人、初始化／重開隔離。
- 第一夜禁止夜襲，結果確認前不公開。
- 醫生自保、不可連夜保護同人、醫生幽靈不可行動、保護命中。
- 主狼不可襲擊自己或幽靈；夜襲新增幽靈當日可用票。
- 白天順序、60 秒私人交流、180／240 秒公開討論。
- 五項一次性技能只能使用一次；議事官加 60 秒；不存在／幽靈角色不可使用。
- 不可投自己／棄權／幽靈／鐵匠保護者；村長秘密雙倍票。
- 平票限定重投一次、仍平票不封印；幽靈只沿用首次參與者、不重複扣票。
- 白天封印者下一輪起可投，已用幽靈票不可重用。
- 封印主狼好人勝、第五輪主狼存活狼勝、白天結算後活躍 ≤2 狼勝。
- 公開模型不含身份、夜晚選擇、情報、幽靈票使用狀態；JSON 備份往返可恢復。

## 已通過：真實 Chromium 瀏覽器整合測試

執行 `node tests/browser.cjs`，localhost:8787：通過，沒有 JavaScript page errors。

- 私密模式二次確認；11 人配置與情報。
- 夜晚先私下預覽、大屏確認前維持夜晚。
- 同一瀏覽器兩分頁的公開同步（BroadcastChannel／storage）。
- 10+ 人公開討論 240 秒，議事官延長至 300 秒。
- 完成投票，確認前不顯示封印，確認後大屏顯示好人勝。
- 大屏公開資料沒有玩家 role／ghostUsed，公開網址隱藏教師入口。
- 撤銷已公開結果、大屏回復；重開一局。
- iPad 1024×768、大屏 1920×1080：沒有橫向溢出，截圖已檢視。
- Service Worker 安裝後，切離線重新整理仍可載入遊戲。

另外完成 app.js 語法檢查及人工檢視本地背景、公開版面、教師版面。

## 已通過：正式 Firebase 部署與權限測試

2026-10-18，部署 project `ycmc-last-moon-c5`，Hosting：https://ycmc-last-moon-c5.web.app/ 。免費 Spark，Realtime Database 位於新加坡。

Firebase CLI 已確認 Rules 語法有效，成功 release Rules 及 Hosting。

執行 `node tests/firebase-live.cjs`，使用臨時匿名測試帳戶與隨機合成房間，以下全部通過：

- 主持建立房間；未登入公開頁可讀 public 快照。
- 拒絕列舉 rooms、讀取房間根節點、未授權讀取 owner。
- 拒絕未登入寫入、另一匿名 UID 寫入、重新指派 owner。
- 拒絕寫入秘密玩家 role 與 intel 欄位。
- 主持更新 round，公開讀取取得更新後值。
- 刪除測試房間，公開節點回傳 null。
- 測試完畢清理本次臨時匿名帳戶及測試房間。

另外使用 CUA 驗證正式網站：

- Safari 教師端取得內置 config，建立真正房間，顯示「已同步至大屏」。
- 另一個 Codex 內置瀏覽器開啟公開短網址，顯示「大屏已同步」，沒有教師入口。
- 在 Safari 點 Question，公開瀏覽器即時顯示「提問 Question」及相應句型；隨後切回 Evidence。
- 修正部署後舊 JavaScript 快取，加入 app.js 版本標記、no-cache headers 及更新離線 cache。
- Codex 內置瀏覽器教師匿名登入曾出現 auth/network-request-failed；Safari 登入及主持正常。建議教師使用 Safari／Chrome。

## 仍須真機課堂驗收

- 真正 iPad Safari ↔ 實體 e-board Chrome 的觸控與全螢幕操作。
- 真機分別斷網／重連、背景分頁、倒數及暫停的恢復情況。
- 原先本機 Chromium 測試涵蓋投票／夜襲完整流程；本次正式雲端 UI smoke test 只測房間與討論提示同步，沒有重新跑雲端完整一局。

## 限制

- 單一教師分頁與單一控制裝置；不支援多人同時主持或跨裝置秘密資料同步。
- 本機私密資料未加密，依賴私人 iPad 的裝置鎖；公開裝置不可進入教師頁輸入身份。
- 公開連結持有人可讀公開資料；匿名 UID 與 Security Rules 控制寫入權限。
- 初次載入／Firebase SDK 重新下載需要網絡；不可把離線快取當成跨裝置同步。
- 10／11 人擴充角色未做課堂平衡測試。

## QR 配對更新驗證

- 對照 Block practice 的 `StartPage.tsx`、`ControlPage.tsx`、`style.css` 及 controller-ipad.png，採用相同配對流程與卡片排版。未改動原 Block practice。
- `node tests/pairing-live.cjs`：14 項正式 Firebase 配對檢查通過；涵蓋錯誤 key、公開讀取 pairing key、第二裝置接管、過期 QR、非所屬 room 指標、原裝置恢復、電腦無 room 寫入權。測試後清理合成資料。
- Firebase Rules 語法檢查及正式 Rules／Hosting 部署成功。19 項原遊戲規則測試仍通過。
- CUA 實際 Chrome 訪客視窗建立 QR；另一獨立 Chrome angus 設定檔打開 QR 對應地址並 claim，控制器顯示「已同步至大屏」。
- 配對電腦收到「iPad 已配對」及正確的 Open Presentation 連結。
- 控制器切換 Question，第三個只讀大屏瀏覽器即時更新，沒有教師入口。
- QR 圖像及卡片控制台已人工檢視。這是開啟 QR 對應地址的跨瀏覽器測試，未宣稱已用實體 iPad 相機掃碼。
- Codex 內置瀏覽器的匿名登入仍可能 auth/network-request-failed；Safari／Chrome 實際建立 pairing 均成功。

- QR 控制器重新載入後，再次確認私人裝置，恢復同一課堂 B1A3F7 及原主持房間，顯示「已同步至大屏」。原本的 Question 提示保留，測試後切回 Evidence，仍未開始第一夜。

## GitHub Pages（2026-10-23）

- 正式入口：https://angusma0711.github.io/ycmc-last-moon-c5/
- Actions 首次部署成功；19 項規則測試通過。
- Chrome 從 Pages 建立 Firebase QR 課堂；控制連結保留 repository 子路徑。
- Safari 獨立瀏覽器開啟 QR 對應連結，成功取得教師房間；Chrome 顯示已配對。
- Pages 公開大屏收到 Safari 的 Question 提示更新，顯示「大屏已同步」。
- 本次以獨立瀏覽器驗證配對；實體 iPad 相機掃碼仍待課前驗收。

## Moonlit visual refresh（2026-10-23）

- New generated background; indigo/lavender/gold palette across startup, teacher controls and public board.
- Startup uses two columns on desktop and one column at tablet/mobile widths. QR keeps a solid white background.
- Visually checked startup and teacher flow at tablet-width preview; 19 rule tests pass.
- Pairing IDs, Firebase logic, private data and game engine unchanged; CSS/pairing asset versions and service-worker cache bumped.

## Simplified public board（2026-10-23）

- Night: only full-width arena, phase and timer; records and rules trigger hidden.
- Day/setup: no Evidence panel; records below arena in normal scrolling flow, with no nested log scroll.
- Roles/rules collapsed by default in a right-side drawer.
- Verified local teacher → public preview night → published dawn transition; day record appears only after confirmation. 19 engine tests pass.
