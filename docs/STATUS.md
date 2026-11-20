# 🌳 Komorebi 3D｜開発ステータス・次チャット引き継ぎ

> **2026-11-20 編集ボトムシート50:50・グリップ下スワイプ（main反映／Safari実機未確認）：** `map-labels.js` の編集フォームをゲーム領域の下半分 `height/max-height:50%` に固定し、ゲーム画面を上半分に残す。ボトムシート上端の36pxグリップ領域だけがPointer Eventsドラッグを受け、下方向90pxまたはシート高さ25%の小さい方以上で閉じる。満たさない操作は位置を戻し、本文スクロールと分離。背景マスクを薄くし、編集中のヘリ入力停止・閉じた後の解除は既存処理を維持。`dev.template.html`／`dev.html` のSafariキャッシュキー更新。**静的配線確認のみ。GitHub Actions／iPhone Safari実機で高さ・タッチ・スクロール・閉じ操作のPASSは未確認。**

> **2026-11-20 OSM編集比較機能・第一工程（main反映／実機未確認）：** テナント編集画面を画面下端のスクロール可能なボトムシートに変更。`maps/osm-test-links.js` を追加し、本番OSMのnode/way IDと実際に作成成功したテストOSM IDの対応をブラウザ内localStorageへ保存、次回編集時にコピー済み表示・テスト対象ID自動入力する。コピー／本番書込の安全条件や認証手順は変更なし。`map-labels.js` のSafariキャッシュキーを開発テンプレート・生成HTMLとも更新。**A/B比較モードの追加、テストlevelを使った3Dメッシュ差分反映、「3Dに反映」ボタンは未実装。** 静的配線確認のみ、Actions・Safari実機未確認。テストID対応は端末・ブラウザごとで、削除すると消える。

> **2026-11-19 Overpass手動通信診断ワークフロー追加（未実行）：** `.github/workflows/overpass-network-diagnostic.yml` に `workflow_dispatch` のみ、`contents: read` の診断を追加。GitHubホストランナー送信元IPv4（AWS checkip）、OSM 2ホストのDNS A/AAAA、IPv4/IPv6別の GET `/api/status` および軽量 POST `/api/interpreter` のHTTPコード・リモートIP・接続時間・curl終了コードをログ出力。最大5分・`matsudo.json` 不変更・既存の地図取得Actionsと独立。診断ワークフローが緑色でもAPI成功を意味しない。手動実行リンク `https://github.com/shuma-fujita/komorebi/actions/workflows/overpass-network-diagnostic.yml`。結果のIP帯制限はこの診断のみでは確定できず、必要なら運営確認。

> **2026-11-19 吉野家／日高屋の飲食店外観（main反映・Safari実機未確認）：** `objects/buildings/food/` をコンビニから独立新設し、`yoshinoya.js`（オレンジ主体のYOSHINOYA看板）・`hidakaya.js`（赤／黄のHIDAKAYA看板）・`osm-adapter.js`（`amenity=fast_food/restaurant` の日本語/英語ブランド判別、ポリゴン包含→外周1mの単独候補、OSM `level` による階別外観）・`common.js`（コンビニの共通窓・ドア・看板・外壁描画を再利用、同一階重複時はコンビニ優先）を追加。`map-builder.js` の建物外観にfoodの階別スパンを統合し、ブラウザ読み込みキャッシュキーを更新。保存済み `matsudo.json` で吉野家2店舗・日高屋2店舗の建物照合を確認。現在これらの店舗ノードに `level` はなく、コンビニと同じ未指定時の全体外観フォールバックとなる（各店舗への階数追加で限定階になる）。`tests/food-storefront.mjs` 追加。OSMデータ/API/Actions、コンビニ各ブランドの定義には手を加えていない。**実機描画は未確認。**

> **2026-11-19 ローソン／ローソンストア100のコンビニ外観を追加（main反映・Safari実機未確認）：** `objects/buildings/convenience/lawson.js` に青・白の看板、LAWSONの文字とミルク缶風ロゴ（共通文字／ロゴクアッド）を追加。`lawson-store100.js` に緑／白の看板、STORE100の文字と赤い100風ロゴを追加。`common.js` の `FOREST_SIGN_BRANDS` に両ブランドを追加し、OSM側は既存の `paintConvenienceSign`・`paintConvenienceGlazing`・共通自動ドア・店舗階 `level` の塗り分けを使用。`osm-adapter.js` の先行順序でStore100を汎用Lawsonより優先し、Natural Lawson除外は維持。`map-builder.js`／`dev.template.html`／`dev.html` のキャッシュ参照を更新、`tests/lawson-storefront.mjs` を追加。保存JSONに両ブランドの店舗ノードを確認。ブランド構成／文字グリフ／共通描画の静的検査PASS、GitHub Actions/Safari実描画は未確認。Map API通信やOSM JSONは変更なし。

> **2026-11-19 第37東京ビルの5階のみピンク（main反映・実機未確認）：** 保存済み500m OSMでは建物 way 130218750 `第37東京ビル` は `building:levels=6`、施設 node 10741542498 `まつど女学園` は `amenity=brothel, level=5`。従来はこのノードだけでビル全体がピンクになる問題があり、`objects/buildings/love-hotel/common.js` にレンダラー非依存の指定階外壁塗り分け処理を新設。`osm-adapter.js` で施設ノードを建物へ関連付けて階情報を返し、`map-builder.js` が従来のコンビニ外壁生成後に階限定のミルキーピンク（既存 `LOVE_HOTEL_COLOR=0xF9DDE5`）を描画する。**第37東京ビルについてユーザー指定の物理5階を優先し、OSM `level=5` の通常0始まりとは別に5階（6階建て18m相当の12〜15m部分）として描画**。他階・屋根・形状・高さ・コンビニ表示を維持。`amenity=love_hotel` や階タグなしのbrothelは従来の建物全体ピンクを維持。JSキャッシュ参照更新、`tests/love-hotel-floor.mjs` 追加。保存済み1717要素の実データで第37東京ビルの色分けspan/色を模擬テストPASS、Safari/Pages実描画は未確認。

> **2026-11-19 松戸500mのGitHub Actions手動更新を実装（main反映・未実行）：** 新規 `.github/workflows/matsudo-osm-manual.yml` は `workflow_dispatch` のみで、push・schedule・PRではOSM取得を起動しない。以前から移行済みの `komorebi3d/maps/fetch-map.py` を Ubuntu上で実行し、POST形式でPrivate Coffee→overpass-api.deの許可済み2ホスト（最大2巡）に接続。500m四方 `matsudo.json` の中心・bbox・建物/道路/施設件数を検証し、成功時だけ `main` の `matsudo.json` 単一ファイルをコミット・更新。失敗時は既存JSONを保持。通常の松戸入場は保存JSONを読むだけでOverpass APIには接続しない。**ワークフローはGitHubへ作成したが、実際のActions実行成功・ユーザー実機・Pages反映は未確認。** JSON更新コミットによってGitHub Pages配信のデプロイは起こり得るが、OSM取得Actionsは再実行されない。

> **2026-11-19 松戸OSMを完全手動接続へ変更（main反映・実機未確認）：** ユーザー指示。松戸ワープ時は `loadMatsudoMapInBackground()` が `loadMap(source:'old',live:false)` を実行し、保存済み `matsudo.json` のみ取得・表示する。外部Overpass APIへの**自動通信は禁止**。2kmタイルはこれまでどおり必要時ローカルJSONをロード。実行ステータスログに接続先セレクト（Private Coffee、overpass-api.de の二択）、「接続確認」「建物のみ取得」「最新250m地図を手動取得」「診断ログをコピー」を用意。二択以外は `resolveOverpassEndpoint` が拒否。診断は手動時のみ20秒上限・独立ログ・地図表示不変。250mライブ地図は手動ボタン時のみ `fetchManualOsmMap` → `loadMatsudoMapInBackground({live:true,server})` → `fetchLiveMatsudoMap` で選択中サーバーに最大120秒通信し、成功時250m地図へ表示更新、失敗時は既存500m保存JSONへフォールバック。ミニマップ250m表示も対応。両画面のJSキャッシュキー更新、テストに二大サービス限定を追加。**保存JSONのみの起動を模擬検証（外部API呼び出し0件）、構文・配線を静的確認済み。GitHub Actions・Pages・Safari実機は未確認。**


> **2026-11-19 Overpass切り分け用の手動診断（main反映／Safari実機未確認）：** 通常の松戸250m・単独overpass.private.coffee・取得120秒・保存済み500m JSONフォールバックは変更なし。軽量診断モジュール `maps/map-overpass-diagnostic.js` を追加し、「接続確認」（松戸駅中心のごく小さなnode bboxに`out count`）と「建物のみ取得」（250m bboxのbuilding wayに`out count`）を手動実行可能にした。いずれも独立の20秒上限、取得した要素の件数のみ応答、HTTPステータス・経過時間・失敗理由を別ログ `overpass-diagnostic` に表示する。自動診断や3D差し替えは行わず、同じ既存Overpassホストへの読取専用通信で、診断ログは地図ログと分離。実行ステータスパネルに2つのボタンを追加（ゲームAPIの`runMapDiagnostic`経由）。`dev.template.html`と`dev.html`の共通UIスクリプト参照キャッシュも更新。`tests/map-overpass-diagnostic.mjs`追加。**模擬HTTP 200/502、構文、ゲームAPI配線は確認PASS。実公開API通信・GitHub Actions・Pages・Safari実機は未確認。** 次の実機確認は、実行ステータスの2ボタンをそれぞれ押し、独立した結果ログをコピーすること。


> **2026-11-19 松戸ライブOSMを250m四方・API上限120秒へ変更（main反映／実機未確認）：** ユーザー指示に従い、松戸駅中心(35.78444,139.90061)のライブOSM範囲を従来500m四方から250m四方に縮小。bbox=[35.783317,139.899226,35.785563,139.901994]、`map-overpass.js` の単独 `overpass.private.coffee` 待機上限60→120秒、Overpassクエリ上限65→125秒。第2サーバー接続なし。ライブ応答に `areaSizeM:250` を付与し、3D生成のhalfSize=125とミニマップmapSpan=250を採用。取得失敗時には従来の保存済み500m JSONを変更せず使い、halfSize=250／mapSpan=500のままとする。2km選択時は従来どおり1000／2000。A/B地図のラベル・モック・テンプレートと生成版を更新。テスト期待値も250m/120秒へ変更。**設定と配線の静的確認PASS。実通信／GitHub Actions／Pages／Safari実機は未確認。**


> **2026-11-19 単独Overpassの取得上限を60秒へ延長（main反映／実機未確認）：** ユーザー実機で第1サーバー `overpass.private.coffee` が30,009msでタイムアウトし、保存済みJSONへの切替・3D生成404msを確認。指示に従い、同じ1サーバーのみ利用してブラウザ側上限30→60秒、Overpassクエリ指定35→65秒に変更。第2サーバー接続なし。失敗時の `matsudo.json` フォールバックと地図生成は従来どおり。`map-loader.js`／`dev.template.html`／`dev.html` のキャッシュキーを更新し、テスト期待値も更新。**構文・設定の静的確認PASS。実API、GitHub Actions、Pages、Safari実機は未確認。**


> **2026-11-19 最新方針：Overpassは第1サーバーのみ30秒（main反映／実機未確認）：** ユーザー指示により第2接続先`overpass-api.de`を撤去。松戸500m起動時は`overpass.private.coffee`へ1回だけリクエストし最大30秒待機。Overpassクエリ上限35秒。失敗・タイムアウト・データ不足は以前と同じ保存済み`matsudo.json`へ切替。切替後の第2サーバー接続は行わない。`map-overpass.js`本体、テスト、`map-loader.js`／`dev.template.html`／`dev.html`のブラウザーキャッシュキーを更新。模擬HTTP502で1回のみの通信・失敗ログを確認PASS。**実際のOverpass応答・GitHub Actions／Pages・iPhone Safari実機は未確認。** 旧2kmタイル・森・固定Engine・既存JSONは未変更。


> **2026-11-19 Overpass取得待機を30秒に延長（main反映・実機未確認）：** 前回のユーザー実機では第1サーバーが8秒タイムアウト、第2サーバーは約1秒でHTTP502。旧GitHub運用時の短すぎるタイムアウトの経験を踏まえ、`maps/map-overpass.js` の合計上限を15秒→30秒、主系上限を8秒→15秒、予備系に残り最大15秒を配分。Overpassクエリ側の `[timeout:20]` も `[timeout:35]` に変更。2段階接続、失敗時の保存済み500m JSON切替、キャンセル、地図生成・固定Engine・森は変更なし。`map-loader.js`／`dev.template.html`／`dev.html` のキャッシュキーを更新。`tests/map-overpass.mjs` に上限値のテスト追加。**GitHub反映済み／実通信・Safari実機・Actionsは未確認。**


> **2026-11-19 Overpass API二段階接続（main反映／実機未確認）：** ユーザー実機ログで`overpass-api.de`がHTTP502（1068ms）となり、保存済み500m JSONへの切替が成功したことを確認。`maps/map-overpass.js`の接続先を第1`overpass.private.coffee`／第2`overpass-api.de`に変更。全体待機上限15秒を共有し第1接続先は最大8秒、応答が失敗した場合のみ第2を試す。HTTP失敗、タイムアウト、応答形式不正、地図データ不足は次接続先へ。各ホストのHTTP・所要時間・失敗理由・最終取得先を記録し、両方失敗した場合は従来の`map-loader.js`の保存済み500m JSON切替を維持。キャンセル時は再試行・JSON切替をしない。重要ログ固定表示に各接続先の試行内容も追加、`dev.template.html`／`dev.html`のloader参照キャッシュを更新。`tests/map-overpass.mjs`に2接続先の切替と全失敗ケースを追加。**取得モジュールの模擬HTTP502→200動作・ログはPASS。GitHub Actions／Pages／Safari実機／実際の公開API取得時間は未確認。** 地図生成・森・固定Engine・2kmタイル原本は変更なし。


> **2026-11-19 地図ログの重要項目固定・全履歴コピー（main反映／実機未確認）：** 旧実装は`addMapDebug()`の32行上限で、OSM最新500mのOverpass HTTP／所要時間／JSONフォールバックの情報が、3D生成詳細ログで消えていた。`dev.template.html`と生成版`dev.html`を変更し、全履歴を最大512行まで保持、重要イベント（OSM取得開始・HTTP・取得完了・失敗時フォールバック・JSON HTTP／検証・3D生成完了など）を別配列で最大24行保持、直近表示は12行にする。`dev-panel-components.js`の実行ステータスには「📌 取得結果・重要ログ」を独立表示し、「全ログを見る／直近ログに戻す」「📋 全ログをコピー」を追加。コピーは画面に表示されている直近ログではなく全履歴から行う。ログデータはセッション単位で初期化、森・固定Engine・OSM取得・地図生成には変更なし。Safariキャッシュキー更新。**構文と配線を静的確認PASS。実機Safari・Pages・Actionsは未確認。** 次の実機チェック：松戸入場後、3D完了後もOSMのHTTPと取得結果が残り、全ログ閲覧／コピーが冒頭を含むことを確認する。


> **2026-11-19 松戸500mライブOSM取得（main反映／実機未確認）：** 松戸ワールド入場時、既存500m地図ソース（old）は `maps/map-overpass.js` から公開Overpass APIへ建物・道路・鉄道・店舗の小範囲問い合わせを1回行い、OSM要素を既存`map-builder.js`入力形式に変換する。500m範囲は保存済み`matsudo.json`と同一bbox。15秒上限、HTTP失敗・429・応答形式不正・データ不足の際は保存済み`matsudo.json`に自動切替（キャンセル時は切替しない）。API所要時間・OSM反映時刻・切替理由を既存地図ログへ記録。A/B初期地図を500mにし、2kmはユーザー選択時のみ読込。 `map-loader.js`、`dev.template.html`、`dev.html`、共通テストパネル、モック、およびモックUI状態を更新。 `tests/map-overpass.mjs`に変換・範囲・キャンセル・HTTP模擬テストを追加。**静的配線照合はPASS。Nodeテスト実行・Overpass実通信時間・GitHub Actions・Pages配信・Safari実機は未確認。** 旧地図JSON・2km原本・固定Engine・森は変更なし。次の実機確認：松戸入場後の「OSM最新500m」ログ（HTTP／取得・変換／OSM反映時刻）と3D建物・道路・店舗表示、失敗時のJSON切替、森との往復、2km選択時の描画を確認する。


更新日：2026-11-19

> この文書は**現時点の仕様・進行中の作業・次の課題・確認待ち**を記す。完了済み工程の細かい試行錯誤、差し戻した案、旧バグの修正過程はGit履歴で追う。**「コード反映」「静的テストPASS」「GitHub Actions PASS」「ユーザー実機PASS」は別の状態**として扱う。古い記録の「未実装・未確認」を後のPASSより優先しない。

## 1. 現在実装されている機能

### ワールド・開発UI
- 開発入口：[`komorebi3d/dev.html`](https://github.com/shuma-fujita/komorebi/blob/main/komorebi3d/dev.html)。森／松戸の統合ワールド、4パネル（開発情報・ゲーム・テスト操作・実行ステータス）、パネル移動・交換・復元、F5時のワールド復元。
- A/Bゲーム画面の描画Engine（WebGL／Three.js）と地図データ（旧500m／新2km）は独立して比較可能。各画面に独立ミニマップを表示。**ゲーム画面A/B比較は維持。**
- Renderer C（Komorebi Style）は基盤のみ。ゲームへの接続は切り戻し済みで、実動作中の描画方式として扱わない。
- 操作：ヘリ移動・カメラ操作・移動境界（森／松戸）、タッチ入力、テナント一覧操作中のページスクロール抑止。

### 地図の取得・3D生成
- ブラウザからの地図用OSM／Overpass直接取得・自動フォールバックは廃止。現在は静的JSONを取得する。**OSMタグ編集用APIは別機能なので維持する。**
- 旧500mの `maps/data/matsudo.json` と、`maps/data/tiles-2km/index.json` に登録された2kmタイルを読み分ける。`maps/map-loader.js` の `TEST_TILE_ID` は2026-11-16に `0_0`（松戸中央）へ復帰。タイル原点はEPSG:6677固定グリッドに基づき自動計算。
- 松戸駅を基準とした半径25kmデータから**2kmタイル559枚を生成**した履歴がある。ただし2026-11-16のリポジトリ移行記録では**main上に84枚のみ存在し残り再アップロード待ち**とある。現在の実ファイル数・索引との一致は未再照合なので、559枚が現在のmainにすべて存在するとは断言しない。
- 近距離優先で地物を処理し、`createMapBuildSteps` によって3D・ラベルを段階表示。処理の目安は1回6ms（厳密上限ではない）。ヘリが前回基準位置から50m以上移動したら未生成地物の優先順位を更新。
- POIの近距離早期公開・最終統合高速化、近距離表示優先／遠距離バッチ集約（Step 5-G）を実装。地図読込・生成・表示の計測と**「🧪 地図JSON読み込みログ」およびコピー機能を保持**。

### 建物・店舗・ビルタグ
- 建物・道路・鉄道・施設／店舗ラベルを生成。コンビニ専用の3D外観（看板・窓・ドア等）、ラブホテル建物のミルキーピンク外壁・屋根を実装。
- 建物に有効な `height`／`building:levels` がない場合、内部テナントの整数 `level` 最大値＋1から階数を補完（1階4m）。コンビニ外観は対象階だけに適用し、ほかの階は通常ビル色。
- ビルタグは各ゲーム画面の**上部中央に固定**。対象建物へ伸びる水色の点・接続線だけが画面投影に追従する。
- 焦点ビルの**入居施設一覧**を表示。階数降順、長い一覧の指スクロール、必要時のみ表示する装飾スクロールバー・上下矢印、タグが非表示→再表示になった際のスクロール位置初期化を備える。
- 建物ポリゴン内の店舗を優先し、外周1m以内で候補が一棟のみ等の条件を満たす店舗は**建物外の位置確認警告**付きで一覧へ追加。照合距離は `maps/building-poi-match-const.js` の共通定数にまとめた。
- カメラ中央の自動焦点選択は200m以内。建物タップ選択は最大1000m以内で、最前面を優先。タップ選択・同じビル再タップによるタグ非表示／再表示・カメラジェスチャーでの優先選択解除に対応。左側ヘリ操作中も右側の別指で建物をタップ可能。
- **旧「焦点ビル内の店舗表示A/B比較」は削除済み。** 現行は一覧方式のみ。ゲーム画面の描画A/B比較とは混同しない。

### OSM編集・自動テスト
- 既存のOSM node／wayなどのタグを閲覧・編集でき、テストOSMへOAuth（PKCE／write_api）経由でコピー・送信できる。本番OSMへは書き込まない。
- テストOSMへの送信範囲は、既存施設の未設定 `level` の新規追加（0〜8）に限定。既存levelの変更・削除や他タグ送信、relationコピーは対象外。changesetコメントはタグ差分から自動生成する設計。
- 地図生成のノンデグテスト（`tests/map-nondeg.mjs`、`.github/workflows/map-nondeg.yml`）と各機能の回帰テストを用意。個々の静的チェックPASSをGitHub Actionsや実機PASSと同一視しない。

## 2. 現在進めている開発

**主題：2kmタイル地図の描画最適化から、将来の隣接タイル・シームレス移動へ進む準備。**

- 近距離優先生成・逐次公開・POI統合高速化・Step 5-Gの近距離即時／遠方バッチ集約まで実装した。**直近の描画最適化を無条件に未実装へ戻さない。**
- Step 5-GはユーザーのSafari実機PASS報告あり。上野2kmでは地物22,815件、建物10,391／道路4,421／鉄道283／ラベル7,166の出力一致を確認。ヘリ移動中の操作にも問題なしとの報告。上野はPCで非常に重いとの報告もあり、全環境で軽いと断定しない。
- **画面外オブジェクトの削除・アンロードはまだ確定事項にしない。** カメラから見えない描画負荷の最適化と、将来のタイル保持・破棄戦略を分けて検討する。
- 次の大きな実装候補は、隣接2kmタイルの追加取得・連結表示。現状は選択された一枚の2kmタイルを描く方式であり、**シームレスな隣接タイル移動は未実装**。

## 3. 未実装・今後やること

1. **タイル現物の確認：** 移行後の `main` 上の2kmタイル枚数と `index.json` を再照合。欠落があれば安全に補完する。559枚生成完了と全枚数の現リポジトリ保存完了を混同しない。
2. **隣接タイルの設計・実装：** 先読み距離・同時保持数・読み込み／アンロード条件・ワールド／タイル境界・移動制限の扱いを決める。視界やプレイヤー位置に応じた生成優先と破棄を分離する。
3. **重複排除：** 隣接タイル境界をまたぐOSM建物・道路・relationの二重メッシュ／ラベル／編集対象生成を防ぐ。
4. **描画負荷の再測定：** 描画範囲・カリング・バッチ粒度・保持オブジェクト数を計測して必要なものだけ最適化。ヘリ操作が既に滑らかな環境では操作感の改善を根拠なく断言しない。
5. **その他の継続課題：** Engine／ワールドのCI拡充、変更前後の短い回帰チェック、リリース世代復元手順、将来のゲーム機能拡張。

## 4. 実機確認待ち・既知の問題

### ユーザー実機PASSとして記録済み
- 森／松戸統合、旧500m地図、A/B旧500m・中央2km比較、2km `0_0` 座標計算後の松戸表示、パネル操作・F5復元。
- 近距離3D生成Step 3／POI早期公開、Step 4-AのActions初回PASS、POI統合高速化Step 5-AのActions／Safari PASS、Step 5-GのSafari PASS。
- アトレ松戸のテナント一覧の指スクロール、ビルタグの建物タップ優先選択など、個別にユーザーからPASS報告があった範囲。**これを後日の拡張機能全体のPASSに拡張しない。**

### 2026-11-19にmain反映済み・後続の実機確認が必要な変更
- **店舗表示A/B切替撤去：** テスト操作パネルから旧切替UIが消え、一覧・階数順・外周警告・スクロール・OSM編集が維持されるか。
- **外周1m警告と共通定数：** 日発ビル付近などで警告行・ファミマ専用外観が意図どおりで、通常建物に誤割当されないか。
- **ラブホテル着色：** 対象の外壁／屋根だけがミルキーピンクになり、通常建物とコンビニ専用階が変わらないか。
- **テナントlevel補完：** 想定の建物が8m、ファミマが0〜4mの外観となるか。合成テストのPASSは実OSMデータでの確認ではない。
- **建物選択操作：** 最大1kmタップ、同じビルタップによるタグ表示切替、左移動入力を維持した右指建物タップ、ピンチ誤選択防止。
- **ビルタグ最終UI：** 上部固定、点／線追従、再表示時のスクロールバーとscrollTop、最大高さの端末実機確認。
- **運用面：** 上記変更のGitHub Actions・Pages配信・Safari／iPhoneでの検証が未報告のものは、静的テストPASSだけで完了扱いにしない。

### その他の既知の確認事項
- 2026-11-16の `TEST_TILE_ID='0_0'` 復帰後の端末表示、リポジトリ移行後の固定Engine参照。
- changesetコメントのテストOSM実API保存。既に使用したローソン `node/4365808698`（changeset `724665`）へは重複送信しない。
- ヘリの高度・透明度・衝突・移動境界の網羅試験、1000匹NPC負荷時のFPS、開発情報パネルの読込中／空文字／失敗時挙動など。

## 5. 現行コード・保護対象

| 対象 | パス・注意点 |
| --- | --- |
| 開発版正本 | `komorebi3d/dev.template.html` → 生成版 `komorebi3d/dev.html`。変更時は一致を確認 |
| 地図ローダー | `komorebi3d/maps/map-loader.js`（`TEST_TILE_ID`）、`maps/tile-grid.js` |
| 地図生成・POI・ラベル | `maps/map-builder.js`、`maps/map-tenant-levels.js`、`maps/map-occupants.js`、`maps/map-focus.js`、`maps/map-labels.js` |
| 建物外観・照合 | `objects/buildings/convenience/`、`objects/buildings/love-hotel/`、`maps/building-poi-match-const.js` |
| UI・診断 | `panels/test.html`、`panels/runtime.html`、`dev-panel-components.js`、`development-info.json` |
| 地図データ | `maps/data/matsudo.json`、`maps/data/tiles-2km/index.json` とタイル本体。原本は不用意に変更しない |
| OSMテストAPI | `maps/osm-test-api.js`。地図取得Overpass廃止を理由に削除しない |
| 固定Engine | `shuma-fujita/komorebi@56bb2bc2743f5a4441fa28783becf4e6fa6fbc4e`。固定参照と `engine/` を保護 |
| モック | `komorebi3d/mock.html`（UI確認用・安定版とは別） |

## 6. 次チャットでの進め方・更新ルール

1. [`docs/rules/README.md`](rules/README.md)、[`docs/rules/chat.md`](rules/chat.md)、[`docs/rules/development.md`](rules/development.md)、このSTATUSを読み、実際のGitHub `main` のコード・データで現況を確かめる。
2. **「🧪 地図JSON読み込みログ」を残す**というユーザーの明示希望を守る。森・固定Engine・元500m JSON・タイル原本を不用意に変更しない。
3. 新しい変更は小さく実装し、コード反映・静的テスト・Actions・実機PASSを分けて記録。ユーザーが報告していない実機PASSを創作しない。
4. STATUSはこの6章を原則として更新し、古い試行錯誤を日付順に先頭へ積み上げない。詳細な履歴・差し戻し内容はGitコミットで確認する。
