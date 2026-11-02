# V45 中環街市至西港城示範街區

## 已實作
- 共用示範區邊界排除舊式程序樓群及零散補樓，避免兩套地段互相重疊。
- 46 幢窄面街樓、92 個店舖門面，退台、屋頂服務房、冷氣機、雨棚及雨水管。
- 中環街市低層水平立面、四翼及開放庭院；保留既有西港城模型。
- 德輔道中示意電車街、軌道、架空線、路口斑馬線、交通燈、兩個候車亭、中英路牌及上環站指示牌。
- 兩輛電車、一輛巴士、一輛的士沿示範路線移動；檢視模式固定時間。
- 46 個細節分組：高畫質 650 遊戲單位、流暢模式 320 單位內且視點高度低於 260 時才繪製。主要樓體一直存在。
- 三個固定視角：街市至西港城全景、德輔道中店舖低空、中環街市庭院。

## 操作
主頁 → 中環近景檢視 → 選擇景點 → 上述任一新景點。

## 驗證
- node --check dist/game.js：通過。
- node tests/city-detail.cjs：通過。保留既有車流與地標測試；新增街廓不重疊、路口淨空、建築碰撞、172 次新車流淨空抽樣、三個新視角測試。
- 測試採用模擬 WebGL，驗證 JavaScript 與幾何／碰撞邏輯，不代表 GPU 著色器編譯或畫面品質已驗證。
- 預覽入口顯示 V45。雲端瀏覽器無 WebGL2，未取得真實 3D 高低空截圖；手機幀率、材質視覺與固定角度實景對照尚未驗收。

## 限制
是遊戲比例的示範街區，不是 GIS 或逐棟測繪。並未完成整個中上環重建。店舖是原創示意名稱；上環站為指示牌，未重建真實出口樓梯或出口編號。沿線交通採簡化循環路徑，未加入路口交通燈 AI。新細節分組是距離裁剪，尚非全城多級 LOD。
此次沒有生成新照片素材，所有新幾何與招牌由程式和 Canvas 製作。

## 參考
- 中環街市官方街區資料：https://www.centralmarket.hk/data/data-local/download/Central%20Market%20Rendezvous_TC.pdf
- 港鐵中環街道圖：https://www.mtr.com.hk/archive/ch/services/maps/cen.pdf
- 香港電車官方西行路線圖：https://www.hktramways.com/images/googleMap/HK-tram-route-map-WB.pdf
- 古蹟辦西港城：https://www.amo.gov.hk/en/historic-buildings/monuments/hong-kong-island/monuments_42/index.html

這些參考用於相對街道關係與建築類型，不聲稱目前模型逐項符合實景。
