# Harbour / Intercept — 十項升級報告（程式版 v37）

## 2026-11-03 — V53 Mission introduction
- Starting or restarting a sortie enters a 7.2-second cinematic: the chosen jet climbs from low over the harbour, with an external following camera and mission title, objective and changing briefing captions.
- The visible Skip button and Escape, Enter or Space immediately start the mission. Auto-completion transitions to the selected cockpit or chase camera. Combat, enemies, health and elapsed mission time are frozen during the introduction.
- Tests: explicit intro state, climb and captions, frozen enemies/time, skip button, keyboard skip, automatic completion; city and combat regressions; 12 shaders compile and six programs link with Mesa software GLES.
- Limits: starts in low-altitude flight rather than a runway or aircraft carrier launch; no new voiceover. Browser WebGL2 and real phone rendering/performance remain unverified.

## 2026-11-03 — V52 Nearby supply, missile smoke, varied opening
- When the supply ring is ready and more than 850 m away, place it around 470 m ahead with an altitude offset, checking multiple alternatives for a 76 m clearance from building collision boxes. Preserve the 45-second cooldown and existing rewards; the ring can remain distant if no clear candidate is found. HUD now shows its actual altitude.
- Replace tiny per-frame missile puffs with a brighter, longer-lived trail behind the missile, emitted at distance intervals with a lower-density Lite mode and a per-update cap.
- Each round reseeds combat randomness and varies the five initial enemies' distances, lateral offsets and city patrol positions. The first stays near the forward axis; spawn safety is retained. It is not a fully random mission layout.
- Tests: city regression, missile/building hit ordering, 12 opening formations with collision clearance, distant supply relocation/clearance, continuous missile trail, combat and auto-pursuit regressions; 12 GLES shaders compiled and 6 programs linked in Mesa. The environment's browser cannot supply WebGL2, so mobile gameplay, actual visual quality, frame rate and all possible terrain/route cases were not verified.

## 2026-11-03 — V51 Aircraft detail
- Smoothed player and F-16/F-15-inspired enemy fuselage profiles; added procedural panel seams, rivets, weathering and heat-darkened exhaust area plus Canvas-drawn markings.
- Added a transparent canopy, frame, seat and helmeted pilot; separately animated tailplanes and ailerons react to aircraft pitch/roll, and afterburner size reacts to speed. Enemy control surfaces follow their own flight orientation.
- Player aircraft shows six detachable stores representing remaining missile count, plus rocket pods based on remaining salvos. Enemy stores are decorative. Added damage-stage scorch patches; patches are preset locations, not precise projectile hit decals. Existing damage smoke remains.
- Study menu now includes an interactive hangar, draggable rotation, plus/minus zoom and wheel zoom. Existing aircraft selection controls which player jet is shown.
- Checks: JS syntax, city and combat regressions, hangar entry/zoom/mesh tests, actual 12-shader compile and 6-program link on Mesa GLES. Browser WebGL2 unavailable; no real scene screenshots or mobile GPU timing verified.
- Limits: controlled flight surfaces use aircraft attitude, not measured aerodynamic actuator positions. Glass is blended, not physically refractive; flame responds to speed, not actual throttle. Damage marks are staged, and cockpit view does not show the exterior. Geometry remains procedural and inspired by aircraft; not a licensed or photoreal model.

## 2026-11-02 — V50 全海域、天空與雲霧

- 海面由平面改成動態網格：三組不同方向、速度嘅波浪，高畫質 94,944 頂點，低畫質 25,944 頂點；起伏上限約 ±0.82 米。加近景細浪法線、藍綠海色、低角度 Fresnel 反光及透光色。
- 加兩岸現有海岸線白沫、間歇浪尖白沫；小輪尾浪改用連續噪聲，船身、尾浪同海面共用波浪時間。白沫沿遊戲嘅兩條海岸線計算，未逐一處理碼頭、離岸物件碰撞。
- 天空改成漸層大氣、高層薄雲及低層積雲；積雲用高畫質四個高度切片／低畫質兩片，加入雲底陰影、受光邊緣及緩慢飄移。噪聲貼圖由 Canvas 2D 生成，不使用相片背景。
- 加按高度與距離變化嘅海港薄霧，遠山、樓宇及海天交界逐漸淡化；敵機霧效減弱以保留可見度。這是解析式高度霧，並非可穿越嘅完整體積霧。
- 新增「海面浪花 · 動態」與「海天雲霧 · 動態」觀景入口：主頁 → 中環近景檢視 → 選擇景點。新入口固定鏡頭但海天持續動畫；舊建築對照角度仍凍結環境時間。正式遊戲自動啟用全部效果，毋須新按鈕。
- 測試：JS 語法與差異檢查通過；城市、交通、武器撞樓、戰鬥、自動追擊、HUD 和目標投影回歸通過。新增波幅／時間連續性、兩個動態鏡頭、靜態建築鏡頭及畫質切換檢查。
- 真實著色器檢查：Mesa OpenGL ES 3.2 軟體驅動成功編譯 12 個著色器並連結 6 個程式；另對天空著色器作獨立離屏渲染並檢視。不是完整遊戲截圖，也不是手機 GPU 測試。
- 限制：雲層係多高度切片近似，未做完整體積光線步進；冇風暴、潮汐、岸邊噴濺粒子或物理流體。現有地形與建築佈局維持原狀。預覽瀏覽器未能提供 WebGL2，完整場景視覺驗收及手機幀率未驗證，不能聲稱已達照片級。發布結果以 Sites／GitHub 部署記錄為準。

日期：2026-10-29（香港）。原遊戲連結：https://harbour-intercept-ay.creamlotus4.chatgpt.site 。發布結果以本次 Sites 部署記錄為準。

1. **難度選擇**：出擊前選新手／標準／王牌。敵火受傷倍率 0.65／1／1.3；開火間隔倍率 1.5／1／0.7；得分倍率 0.8／1／1.4。預設標準，原有自動追擊仍預設無限次。
2. **連殺計分**：18 秒內連續擊落增加倍率，每次 +0.25，上限 3 倍；受傷／超時中斷。普通敵機基礎 100 分、重裝 180、王牌 350。HUD 顯示分數及連殺。
3. **三階段作戰節奏**：0–3 擊落為海港截擊，4–7 為重裝增援，8 起為王牌決戰。最後三個編號增援為王牌（8 點裝甲、110 速度、額外 0.65 開火間隔倍率），帶 ★ ACE 標記。仍是一局擊落 12 架；階段切換不會清除存活敵機，可能有交疊，並非三張獨立任務地圖。
4. **空中補給點**：海港綠色 3D 光環，185 米高度。HUD 顯示方向、距離及高度；進入中心 60 米內獲裝甲 +25、導彈 +2、火箭 +1、干擾 +1，不超過原容量。45 秒冷卻，不能停留無限即時補滿。
5. **機炮熱量**：連射累積熱量，達 100 暫停開火；冷卻至 25 恢復。新增熱量條，鼓勵短點射及切換武器。
6. **減速急轉**：按住 B 或手機「減速」，速度逐漸降至 70，轉向率提升 45%；減速優先於加速。不是瞬間掉頭。
7. **射擊預判及命中提示**：選中敵機後，依敵機當前速度計算機炮攔截位置，顯示淡藍虛線圈；命中顯示短暫叉號。敵機再轉向時預判並不保證命中。
8. **受損煙跡**：敵機裝甲低於 65% 出煙；自己機體低於 40% 亦有尾煙，追尾視角更容易看見。
9. **敵機解體效果**：擊落時增加旋轉金屬碎片、黑煙、擴散衝擊環；碎片有重力及有限生命，沿用粒子上限控制負擔。
10. **戰績評級及最高分**：結算顯示 S/A/B（勝利）或 D（失敗）、分數、最高連殺及補給次數。勝利加入時間及剩餘裝甲獎勵。最高分按難度儲存在此瀏覽器；不是帳戶同步排行榜，瀏覽器不容許儲存時仍可遊玩。

## 操作
G／自動：追擊固定敵機，手動轉向會取消；T／追蹤：標記目標。Space 機炮、Q 導彈、E 火箭、F 干擾、B 減速、Shift 加速、C 視角、P 暫停。手機使用對應按鈕。補給方向指示在畫面左下。

## 驗證
- `node --check dist/game.js` 通過。
- `node tests/combat-regression.cjs` 通過。使用模擬 DOM/WebGL 的程式測試：既有敵火實際命中直飛玩家、轉向和干擾避開同一射擊、自動追擊及次數限制、碰撞／墜落、手機比例投影、追蹤方向。
- 新增測試：連殺加分、超時及受傷中斷、難度傷害、王牌增援、補給及冷卻、過熱停止射擊及冷卻恢復、減速、煙跡、最高分不被較低分覆蓋、重新出擊重設。
- 10 個 GLSL ES 3.00 shaders 以 EGL 編譯通過；這不是 iPhone 效能測試。
- 雲端預覽頁可載入，但瀏覽器未能提供 WebGL2，故實際互動畫面及新增 UI 排版未完成瀏覽器視覺驗收，沒有聲稱已拍到新版實機遊戲截圖。未驗證 iPhone 幀率及觸控手感。

此輪集中戰鬥體驗和戰鬥特效，沒有新增寫實建築或新生成材質，亦沒有將遊戲升級成照片級香港地圖。

## 2026-10-31 — HKU study-view correction
- Replaced the always-visible scene list with a compact chooser, initially collapsed and automatically collapsed after scene selection or next-view navigation. The chooser remains independently scrollable on small displays.
- Changed HKU view from a high oblique courtyard angle to a lower front-facing entrance angle.
- Added an interpreted entrance terrace, six columns, a canopy beam, and four planted tree beds to the existing campus model.
- Validation: JavaScript syntax check and mocked city/chooser regression checks. These checks do not verify actual GPU rendering, camera occlusion, or historical accuracy.
- Limits: campus remains a simplified procedural concept, with unsurveyed geography and generic surrounding buildings/terrain. No photorealism claim. Real WebGL screenshot comparison remains unverified in this environment. This update targets Sites; GitHub Pages is not synchronized by this deployment.

## 2026-10-31 — Sheung Wan reference-led first block
- Added paired red-framed glazed towers over a shared podium, offshore ferry terminal platform, covered connecting bridge and four pier fingers.
- Reserved the new building areas from generic tower generation. Added 45 narrow-frontage tenements with shop signs, awnings, balcony slabs, air-conditioning boxes and roof enclosures, alongside three street segments and tram rails.
- Added a dedicated `上環海旁／信德中心` study view accessible from the collapsed scene chooser.
- References: HKTB harbourfront photograph https://www.discoverhongkong.com/eng/place-to-go/travel.guide-victoria-harbour-hk-island-section.html ; HKU 2015 waterfront archive https://arthistory.hku.hk/HKinTransition/image_detail.php?id=21941 ; HKTB dried seafood street https://www.discoverhongkong.com/eng/place-to-go/travel.guide-dried-seafood-street-and-tonic-food-street.html . Reference photography is not embedded as a game texture.
- Validation: JavaScript syntax and mocked city regression, sampled existing vehicle route clearance, scene selection and render-call execution. Mock WebGL does not verify actual appearance or GPU shader compilation.
- Limits: approximate game coordinates and building dimensions, not a surveyed reconstruction. Existing shoreline/mountain system remains; Western Market retains its prior concept model. No verified same-angle real GPU comparison, no photorealism claim. Sites publication only, not GitHub Pages synchronization.

## 2026-10-31 — Three neighbouring Sheung Wan landmarks
- Added individually authored Wing On Centre: broad department-store podium, gold-beige facade, dark continuous horizontal glazing, vertical divisions, entrance canopy and bilingual Canvas sign.
- Added COSCO Tower: tall bevelled glass shaft, stone ribs, mechanical crown, entrance louvers and bilingual sign.
- Added Grand Millennium Plaza Low Block with stone facade divisions, adjoining paved piazza, shallow fountain basin and planted corners. The open centre remains between the high and low blocks.
- Removed generic generation from these footprints; reused the existing material pipeline and expanded the Canvas sign atlas from 8 to 11 rows. No externally hosted runtime photo dependencies.
- Added dedicated Wing On and COSCO/Grand Millennium Plaza study buttons and cameras. New tower bodies participate in aircraft collision detection.
- References: architect Hsin Yieh https://www.hsinyieh.com/commercial/grand-millennium-plaza-%2F-cosco-tower ; contractor https://www.hiphing.com.hk/en/projects/details.php?id=41 ; Wing On official address https://www.wingon.hk/business ; facade photo references https://www.luxstate.com/hk-commercial/hong-kong/sheung-wan/wing-on-centre . Storey counts differ between sources, so game dimensions are not presented as surveyed dimensions.
- Checks: JavaScript syntax and mocked city regression, new scene buttons/cameras, centre approach sightlines against collision boxes and collision participation of new towers. These do not validate GPU rendering or full-frame occlusion.
- Limits: simplified reference-led models at approximate game coordinates; not photogrammetry, survey geometry or complete district reconstruction. True WebGL screenshot comparison and phone frame rate remain unverified. Sites deployment does not synchronize GitHub Pages.

## 2026-10-31 — Western district low-flight streets
- Corrected the one-sided tenement treatment: the street-facing backs now have shop glazing, mullions, canopies and horizontal facade details. Added side windows, drainpipes and rooftop parapets to all 45 authored tenements.
- Connected three western road segments to continuous paved footways; added two cross lanes through the intentional gaps, pedestrian crossings and tactile-colour curb strips.
- Added tram catenary poles/wires, kerbside lamps, two covered stops with benches and stop posts.
- Added two local trams, a taxi and a bus using the existing detailed vehicle meshes. Simplified back-and-forth routes; study views freeze traffic for inspection. This is not a traffic simulation or a surveyed tram route.
- Added `上環電車街低空` study view and exposed western traffic/street counts through read-only diagnostics.
- Validation: JS syntax, existing mocked city regression and additional four-vehicle sampled clearance checks plus scene selection. GPU rendering, full-frame visual quality and mobile frame rate remain unverified.
- Limits: this improves the authored western block; it does not complete all Central/Sheung Wan streets, terrain or measured urban reconstruction. No new photographic textures. Published through Sites only.

## 2026-11-01 — Western skyline massing replacement
- Researched online reference photography: Western District View (7 Aug 2013), https://commons.wikimedia.org/wiki/File:Western_District_View_201308.jpg ; Connaught Road West street photographs (2015), https://arthistory.hku.hk/HKinTransition/image_detail.php?id=22173 ; contractor waterfront context photograph https://www.chunwo.com/zh-hk/what-we-construct/contract-no.-ss-k523-construction-of-open-space-at-eastern-street-north-sai-ying-pun . Older images inform typology, not current surveyed building inventory. Google Street View was not accessed.
- Replaced 73 generic western parcels with 219 narrower building masses, including 34 slender tower forms and 68 lower walk-up forms. Three lots per parcel create nearer-continuous street edges with service slots. Existing reserved landmark areas remain excluded.
- Added offset service spines, narrower upper towers over podiums, genuine upper-storey setbacks, terrace parapets, shopfronts and independent roof overruns. Ground-floor geometry fills more of each parcel instead of leaving isolated towers amid blank paving.
- Added explicit podium/low-rise collision bounds, keeping setbacks separate from the lower mass. Added `上環向西樓群` study angle aimed along the affected corridor.
- Validation: JavaScript syntax; mocked city tests for selection/render-call execution, 18 existing and four western traffic routes, landmark centre sightlines and replacement coverage. Actual GPU screenshots and mobile performance remain unverified.
- Important limits: these are reference-led district building types, NOT 219 individually identified real buildings. Existing coastline, highway topology and terrain are not reconstructed. No real-photo/game same-angle visual acceptance has been completed. Sites update only.

## 2026-11-01 — Empty western street coverage fix
- Root cause found: generic western buildings extended to x=-4400, but the secondary east/west street surface loop started at x=-2300. The gap left visible base terrain between otherwise detailed western buildings.
- Extended the street surface loop west to x=-4400, including asphalt, lane/kerb markings, pavements and its existing street furniture. Clearance now considers low structures above street level rather than only individual shapes taller than 20 units.
- Registered the actual western parcels and connected 54 eligible frontages to the road edge using continuous paving, paving joints and raised kerbs.
- Added collision-checked cross-lane surface segments; these are partial clear connectors, not a fully connected surveyed road network.
- Aggregated 11 continuous road runs and added 12 moving vehicles restricted to those runs. Added `西面內街路面` inspection camera.
- Checks: JS syntax; mocked render/scene-selection tests; frontage and route coverage; sampled collision clearance for all 12 new vehicles; existing city, landmark and traffic regressions pass.
- Limits: real WebGL image quality and mobile performance remain unverified. Road positions remain adapted to procedural blocks, not surveyed Hong Kong street geometry. Vehicle looping does not simulate junction rules. Sites publication only.

## 2026-11-01 — Central transit recognition
- Found prior station signs were small, one-sided and used a plain M. Replaced the placeholder with a drawn rail-style emblem and added double-sided elevated station-name pylons at the existing Hong Kong/Central entrance models.
- Added an interpreted Central tram corridor with asphalt, double tracks, yellow kerb markings, catenary, adjacent pavements, crossings and a station-to-pavement connection.
- Added two signed bus shelters and two tram shelters/refuges with benches and stop poles. Expanded the Canvas sign atlas with bus/tram labels.
- Added two moving Central trams limited to contiguous clear track runs. Added direct study buttons for the transit corridor and both existing station entrances.
- Research: official MTR Central street-map URL https://www.mtr.com.hk/archive/en/services/maps/cen.pdf (search result found; PDF extraction failed); official tram journey-planning page https://www.hktramways.com/en/plan-your-ride . Exact exit locations and surveyed tram alignment were NOT verified or implemented.
- Checks: JS syntax and mocked city regression, actual facility counts, new view handlers and sampled tram/building clearance. Real WebGL visual acceptance and phone performance remain unverified.
- Limits: one authored transport corridor, not all Central roads. Stylised station identity and approximate placement; no claimed real exit letters, live bus routes or junction simulation. Sites publication only.

## 2026-11-01 — Global flat-grey ground material replacement
- Replaced the shared type-10 base-ground default across both banks with world-scale, staggered warm-stone paving. Existing inland-road masks retain their road/kerb/crossing layout, with asphalt shading replacing their flat fill.
- Added material types 18/19 for paving/asphalt and a one-time global geometry classification pass. Eligible neutral upward-facing type-0 surfaces at ground level receive the new materials across every region, not only named study viewpoints.
- Added per-slab tone differences, grout, subtle large-scale weathering and distance/derivative fading to reduce distant fine-pattern shimmer. Asphalt receives restrained aggregate variation and roughness.
- Preserved paint colours, vegetation, facade/roof geometry and specialised materials. Existing wet promenade materials remain separate.
- Validation: JS syntax, mocked city/traffic regressions and ground-material classification tests including exclusions for road paint, roofs, walls and vegetation. Real GLSL compilation, GPU visual QA and phone frame rate are not verified; no local GLSL validator is available.
- Limits: this replaces eligible ground materials, not geography or block layout. It does not turn the remaining open spaces into surveyed streets or parks. Some specialised/raised surfaces intentionally retain their original material. Sites deployment only.

## 2026-11-01 — Central vacant parcel infill
- Root cause: large reserved rectangles around landmarks prevented ordinary building generation across whole areas, leaving blank paved parcels between road lines.
- Added an interpreted Central infill pass using actual building collision boxes, keeping a clearance around solids, the existing procedural road grid, tram corridor, station entrances and elevated terrain. It places medium-height narrow buildings, rooftop setbacks, ground-floor shops and facade details on qualifying vacant sites.
- Existing city, traffic, tram, station and ground-material mocked regressions pass; generated 359 buildings and 718 shopfronts before the final duplicate-collision optimisation. These are procedural infill, not individually identified real Hong Kong buildings. No true GPU screenshot, aerial comparison, loading-time or mobile performance measurements were available.
- Limits: road exclusions are based on the existing procedural grid and do not prove every auxiliary road or overpass is clear; an actual visual flythrough is needed. This is not a surveyed city reconstruction. Sites deployment only.
