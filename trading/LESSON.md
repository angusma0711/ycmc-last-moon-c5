# 圖解股票：課前獨立教學頁

網址：https://angusma0711.github.io/ycmc-last-moon-c5/trading/learn.html

教師頁與公開 E-board 右上角都有「圖解股票 ↗」，在新分頁開啟，不會離開正在同步的公開畫面。從 E-board 開啟會保留純公開課堂 ID，教學頁可直接返回價格畫面；不傳遞教師權限。此頁沒有 Firebase、登入、寫入或遊戲狀態依賴。

六張插圖逐張講解：
1. 麵包店分為十等份，1 股代表其中 1/10 的公司擁有權（純示例）。
2. 交易者交換現金與股份。用 1,000 − 100 − 5 = 895 示範買入。
3. 選擇現價 120 或 80：升跌皆可能，不提供預測。
4. 現金不變，持股市值改變：895 + 120 = 1,015；或 895 + 80 = 975。
5. 賣出再扣費：895 + 120 − 5 = 1,010；或 895 + 80 − 5 = 970；持股歸零。
6. 將概念帶回三項虛構商品及紙卡：每輪一個買入／賣出／持有決定，買賣 1–3 件。

每頁只保留圖像、少量標籤及數字。教師可用箭頭鍵、章節按鈕或上一張／下一張操作；不自動播放。升跌選擇會延續到資產及賣出頁。價格選擇只是本頁的示例，不影響課堂。

重要概念界線：紙本股份卡是圖像比喻，並非真實交易必須使用紙張。5 幣是遊戲數字，並非真實證券市場統一收費。三項虛構商品不是公司股份。真實股價有多種影響因素，圖解不教授遊戲內隱藏公式。

教師備註包含學習目標、討論題及參考資料：
- 香港交易所：[股本證券](https://www.hkex.com.hk/global/exchange/faq/products/securities/equity-securites?sc_lang=zh-hk)
- 投委會：[買賣股票](https://www.ifec.org.hk/web/tc/investment/investment-products/stock/stock-trading/index.page)

圖像：`web/assets/stock-story.png`，以內建 image_gen 生成六格插圖；CSS 分格顯示，沒有改動原圖。完整 prompt 及生成方法見 [IMAGE-PROMPT.md](IMAGE-PROMPT.md)。精確文字／金額由 HTML 呈現，圖片提供替代文字。
