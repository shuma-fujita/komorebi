# 🌳 Komorebi 3D｜開発ステータス・次チャット引き継ぎ

> **2026-11-19 ビルタグに外周1m以内の店舗を警告付きで追加（main反映／実機未確認）：** ユーザー承認により、`maps/map-occupants.js` のテナント一覧照合を拡張。従来どおり建物ポリゴン内のPOIを優先し、外側でも外周最短距離1m以内で**候補建物が1棟のみ**、かつ他建物内部でない場合に限り一覧へ追加。`outsideFootprint:true`を付けた一覧用コピーで元OSM identityを維持。`maps/map-labels.js` の該当行のみ琥珀色背景・左罫線・`⚠ 建物外（外周1m以内・位置要確認）`を表示（通常テナント行・階数表示・OSM編集・スクロール操作・水色レール・A/Bモードは従来どおり）。カードsignatureに内外状態を含めて更新を確実にした。コンビニ3Dの既存100cm許容設定は変更しない。`tests/tenant-outside-warning.mjs`に9件の境界・曖昧・ネスト検証を追加。GitHubのコードを再評価し、入力8ケース・構文4・静的配線4の**16項目PASS**。両HTMLの`map-labels.js`参照キャッシュと`development-info.json`更新。**Actions・Pages配信・実機は未確認**。日発ビルのファミマが追加されるかは現地OSMノード位置・ラベル生成状況次第なので実機で確認する。

> **2026-11-19 ラブホテル建物全体ミルキーピンク着色を実装（main反映／実機未確認）：** ユーザー承認により `objects/buildings/love-hotel/const.js`（`LOVE_HOTEL_COLOR=0xF9DDE5`）と `osm-adapter.js` を新設。`amenity=love_hotel` が付いた有効な建物way、またはその建物ポリゴンに含まれる施設nodeからラブホテル建物を特定。nodeは25m空間グリッドで候補を絞り、重複した建物ポリゴンでは最小面積の建物に割り当て。`maps/map-builder.js` で描画前に1回だけ照合し、該当建物の既存6色パレット基本色をミルキーピンクに置換。外壁・屋根に適用し、従来の形状・高さ／テナントlevel推定・コンビニ専用階の描画・A/B描画・タップUIは変更なし（コンビニが共存する場合は該当階の専用外観が優先される）。`dev.template.html` と生成済み `dev.html` のbuilder参照キャッシュ更新。`tests/love-hotel-color.mjs`にway・node・建物外node・ネスト建物・描画色の回帰テスト12件を追加。GitHub取得コードを用いた合成データと構文の検証22項目PASS、Node CI／GitHub Actions／Pages配信／実機は未確認。`development-info.json` の松戸欄更新。**実機ではラブホテル建物の外壁・屋根が薄ピンクになり、通常ビル／コンビニが変化していないことを確認。**

> **2026-11-19 テナントlevelによる建物高・階別コンビニ外観の補完（main反映／実機未確認）：** ユーザー承認により、建物に有効な`height`も`building:levels`もない場合に限り、建物内のOSMテナントnodeの最大非負整数`level`＋1を推定階数とし、1フロア4mで高さを生成。`maps/map-tenant-levels.js` を追加し、25m空間グリッド＋建物ポリゴン内包でネストする最小建物へ所属を確定、生成開始前に一度だけ計算（生成の距離優先・時間分割や毎フレーム描画に追加判定なし）。`maps/map-builder.js` で推定階数を建物高と`resolveConveniencePaint`双方へ渡し、`objects/buildings/convenience/osm-adapter.js` で推定時のコンビニ外観を対象`level`範囲のみに制限。ほかの階は元のビル色、屋根処理も従来どおり。`way:72570799`の想定（ファミマlevel=0・グーイットlevel=1・高さ階数なし）の**合成入力**で全高8m・ファミマ0〜4mになることを確認（実際のOSM配信データによる確認ではない）。既存height/levels優先、ネスト建物・無効levelなど計18件の評価チェックPASS、関連JSと両HTMLの構文PASS。`tests/tenant-level-inference.mjs`追加（リポジトリ上のNode実行は未確認）。`dev.template.html`・`dev.html` のbuilderキャッシュ更新、`development-info.json` matsudo更新。**Actions／Pages配信／実機は未確認。** 実機で当該ビルが8mになり上階が通常ビル色か確認する。

> **2026-11-19 移動入力中の建物タップ許可（main反映／実機未確認）：** ユーザー承認により、小変更で `dev.template.html`／生成済み`dev.html` の `buildingTapPointers` の複数指除外判定を `activeGamePointers.size>1`（ゲーム全体）から `engineInputAdapter?.cameraPointers.size>1`（カメラ操作エリアのみ）へ変更。左移動パッドを押しながら右側で別指ビルタップしても1本目のカメラ指と扱い、建物選択／同一ビルタグ表示・非表示を妨げない。カメラエリア2本指では従来どおりピンチとしてタップ候補をブロックし、カメラスワイプ解除、テナントスクロール、OSM編集、3Dタップ最大1000m、カメラ中央自動200mは変更なし。両HTMLのmodule構文静的チェックPASS、入力指数の単純条件3ケースPASS。**GitHub Actions／Pages配信／iPhone等の実機動作は未確認。** 実機確認：左移動入力を保持しつつ右指でビルをタップしてタグ表示→同じビルを再タップして非表示→ヘリ移動の継続確認→右側2本指ピンチで誤タップしないこと。

> **2026-11-19 タップ選択のみ最大1kmに延長（main反映／実機未確認）：** `maps/map-focus.js` の `pickBuildingAtScreen` 既定 `maxDistance` を200m→1000mに変更。`pickFocusedBuilding`（カメラ中央自動選択）は従来どおり200mのまま。3D直線距離であり、手前建物を優先する既存レイ判定・ビルタグのタップ非表示/再表示・ヘリ移動・テナントUIは変更なし。`tests/map-focus.mjs` に600mタップ成功／1km超タップ失敗／遠方カメラ自動選択不可／近接建物優先を追加し幾何18件PASS。ラベル・ゲームHTMLの参照キャッシュを更新、両moduleの構文静的検証PASS。`development-info.json` matsudo更新。**GitHub Actions／Pages配信／実機は未確認。**

> **2026-11-19 カメラ／タップ共通ビルタグトグル（main反映・実機未確認）：** 直前のユーザー実機PASS済みタップ優先選択を拡張。`maps/map-labels.js` で `displayedSelection()` によるカメラ／タップ共通の表示判断と `manuallyHiddenKey`／`hiddenAtCameraKey` を追加。カメラ中央に表示中のビルAをタップしても、タップ優先表示中のビルAを再タップしてもタグ（点・線含む）を非表示、同じビルを再タップすれば再表示、別ビルBをタップすればB表示。非表示中のカメラA判定による即時復帰を防ぎ、カメラ焦点が**別の非null建物**へ120ms安定判定で移ったら手動非表示を解除し通常カメラ表示に戻す（焦点未確定のnull→建物は非表示解除しない）。カメラジェスチャー解除・ヘリ移動で維持・空タップで維持・店舗タップ／スクロール・固定上部タグ・水色スクロールバーは従来どおり。`dev.template.html`／生成済み `dev.html` の `map-labels.js` クエリキャッシュのみ更新、`development-info.json` matsudo更新。**GitHub再取得ソースの構文検証（module含む）と表示切替・スクロール接続の静的チェックPASS。Actions／Pages配信／実機動作は未確認。** 次の実機チェック：カメラA表示→Aタップで消える→A再タップで出る→Bへ視線変更で自動表示、タップB表示→B再タップで消える→スクロールバーを含む再表示、カメラスワイプとヘリ移動。

> **2026-11-19 ビルタップ優先選択を実装（main反映／実機未確認）：** 確定要件は通常カメラ中央焦点、壁・屋根をタップするとその建物タグを一時的に優先表示、別の建物タップで切替、空・地面タップでは維持、右側カメラスワイプ（8px超）・2本指ピンチ開始で解除、左側ヘリ移動では解除せず、店舗スクロール・OSM編集タップは従来のまま。`maps/map-focus.js` に `pickBuildingAtScreen` を追加して画面位置・視野角・カメラ姿勢から3Dレイを計算し、既存の建物プリズム交差判定で最前面を選択（200m制限）。`maps/map-labels.js` はカメラ焦点を独立更新しつつ、選択中は `tappedBuilding` を優先し、建物テナント一覧・水色点/線・固定タグを選択ビルに切り替える。選択ビルが画面外ならタグを隠し、タップ選択状態は維持。`dev.template.html` と生成済み `dev.html` にタップ候補のポインター移動追跡を追加、タグ編集／店舗スワイプに干渉せず、カメラのジェスチャー開始で選択解除。`tests/map-focus.mjs` に6件追加して計14件の純粋幾何検証PASS、両ゲームHTMLのmodule構文・ラベル構文PASS、コード配線静的確認PASS。参照JSキャッシュと`development-info.json` matsudoを更新。**GitHub Actions、Pages配信、端末実機は未確認。** 次の実機確認：中心ビルA→画面脇ビルBタップ→Bの店舗表示→ヘリ移動で保持→カメラスワイプでAへ復帰、ピンチ解除、空タップ維持、最前面優先、A/B表示。

> **2026-11-19 ビルタグ固定配置・点と線のみ追従（main反映／実機未確認）：** ユーザーの実機画像を基準に、画面上部中央（各ゲーム画面内、上端約28px）へビルタグを固定。`maps/map-labels.js` の毎フレームのタグ全件 `display:none` と建物投影位置に基づくラベル位置調整・占有判定を削除。代わりに、現在の焦点ビルのタグを固定表示し、建物座標／focusedHitからの3D投影による水色点と接続線は毎フレーム追従。固定タグ位置のDOM書き換えは画面位置やサイズが変わった時だけ。表示状態を保持して実際の非表示→表示時だけ `pane.scrollTop=0`、`display:flex` 後に `syncShopPane` で水色スクロールバーと上下矢印を初期化。連続表示中のスクロール位置は保持。`sizeItem()`のリサイズ計測も既存の表示状態を復元するよう変更。既存のタッチスワイプ、ヘリ操作、OSM編集、階数降順、最大高さ約10件、A/B比較は維持。`dev.template.html`／生成済み`dev.html`の読み込みクエリおよび`development-info.json`を更新。**GitHub再取得でJS構文・固定位置・表示遷移・アンカー・スクロール・参照クエリ等の静的チェックPASS。GitHub Actions、Pages配信、iPhone実機は未確認。**

> **2026-11-19 ビルタグ再表示直後にスクロールバーが消える不具合を修正（main反映／実機確認待ち）：** ユーザー実機で「視線を外して同じビルタグを再表示すると、水色スクロールバーが出ず、指スクロールを始めると出る」と報告。原因は非表示 (`display:none`) 中に `syncShopPane()` していたため、計測上の高さが0となり水色レールが隠れうること。`maps/map-labels.js` で非表示→表示時の `pane.scrollTop=0` は維持しつつ、**カードを `display:flex` にした後**で `syncShopPane(el)` を呼ぶ順に変更。通常の連続表示フレームでは初期化せず、既存のscrollイベントでもレール更新継続。`dev.template.html`／生成済み`dev.html` のクエリキャッシュを更新し、`development-info.json` matsudo欄も更新。**GitHub上でJavaScript構文・表示順序・既存機能とキャッシュの静的チェックPASS。GitHub Actions、Pages配信、iPhone実機PASSは未確認。**

> **2026-11-19 ビルタグが表示される瞬間だけテナントスクロール位置を初期化（main反映・実機未確認）：** ユーザーは①焦点が外れた時のリセットではなく②タグ非表示→表示時のリセットを採用。`maps/map-labels.js` は毎フレームタグを一旦 `display:none` にしてから表示判定するため、その前に `wasSummaryVisible` を取得。画面内判定を通過し実際にタグを表示する際、前回非表示だった場合にだけ `pane.scrollTop=0` と `syncShopPane` を呼ぶ。連続表示中は初期化せず既存指スクロールを維持。OSM編集・水色スクロールバー・最大高さ10件相当・画面サイズ処理・ヘリ操作は変更なし。`dev.template.html` と生成済み `dev.html` のキャッシュキー、`development-info.json` matsudoを更新。**GitHub mainから再取得した構文と表示遷移の静的検証PASS。GitHub Actions・Pages・新しい再表示時リセットの実機動作は未確認。**

> **2026-11-19 ビルタグの最大高さを10件相当に調整（main反映／実機未確認）：** ユーザー指定は1行テナント9件＋2行テナント1件が収まる高さの目安（店舗名の行数制限ではなく3〜4行以上の折り返しも許す）。`maps/map-labels.js` に初回生成時と画面サイズ変更時、実際の行CSSの行高・上下余白・罫線を読み取って `10 × 1行の行高 + 追加1行高` を一覧ペインの最大高さとする処理を追加。現行ビューポート上限を超えないようクランプし、店舗が少ないときは自然な高さ、長いときだけ既存の水色スクロールバー・上下山形アイコンと実機PASS済みスワイプ方式で閲覧。ビル名表示・OSM編集・ヘリ操作・A/B表示は維持。`dev.template.html` と生成済み `dev.html` のJS参照クエリ、`development-info.json` を更新。**GitHub main再取得で構文・静的条件10件PASS。GitHub Actions／Pages配信／今回の高さの実機動作は未確認。**

> **2026-11-19 テナント一覧に装飾スクロールバー＋上下矢印（main反映／実機未確認）：** ユーザーからアトレ松戸での店舗一覧指スクロール実機PASS報告あり。提供されたUI画像を目標に、`maps/map-labels.js` 内の店舗ペイン右側へ枠色 `#7bead8` の細い軌道・明るいつまみ・上下山形アイコンを追加。ペインが実際にオーバーフローする場合にのみ表示、`scrollTop / scrollHeight / clientHeight` からつまみ位置・長さを更新。装飾部は `pointer-events:none`、スクロールバー本体の操作機能は付けない。既存のタッチスワイプ・ヘリ操作・OSM編集・A/B切替・level降順表示は維持。`dev.template.html`／生成済み`dev.html` のラベルJSキャッシュキーと `development-info.json` matsudoを更新。**GitHub main再取得による構文・表示条件・配線の静的検証PASS。GitHub Actions、Pages配信、iPhone実機での新しい装飾UI確認は未実施。**

> **2026-11-19 アトレ松戸でテナント一覧の指スクロール不具合に対応（main反映・実機未確認）：** 実機では前へ／次へボタンの削除は反映されたが、テナント一覧をスワイプするとアプリ内ブラウザの外側ページがスクロールし、テスト操作パネルが現れる問題をユーザー報告。`map-labels.js` に表示中かつオーバーフローしているテナント一覧の矩形を特定する `scrollPaneAt(x,y)` を追加。`dev.template.html` と生成済み `dev.html` でドキュメント捕捉フェーズのtouchstart/move/end/cancelを使い、一覧上から始まったタッチだけ `preventDefault()` でページ移動を阻止し `pane.scrollTop` を手動更新。対象タッチのpointerdownはヘリ操作パッドへ伝えない。短い一覧、タグ外、テスト操作パネルおよびOSM編集モーダルの操作は従来どおり。ラベルJSのキャッシュキーと `development-info.json` のmatsudo欄を更新。**JavaScript構文・静的配線チェックPASS。GitHub Actions・Pages配信・iPhone/アプリ内ブラウザでのスクロール実機PASSは未確認。** 次はアトレ松戸で一覧スワイプ、ページ固定、ヘリ操作、店舗行タップを確認。

> **2026-11-19 テナント一覧の操作を必要時のみ指スクロールへ変更（main反映／実機確認待ち）：** ユーザー希望によりA/Bの店舗一覧の「▲ 前へ」「▼ 次へ」ボタンを削除。`maps/map-labels.js` の一覧ペインは高さ上限を画面に合わせ、内容がはみ出した時だけ子ペインに `pointer-events:auto`、`touch-action:pan-y`、ネイティブ縦スクロールを有効化。短い一覧は従来同様にポインター透過し、ゲーム操作と既存のタップ判定を維持。長い一覧の店舗行タップはペインのclickから該当OSM編集を開き、スクロール中はネイティブ挙動に委ねる。親のタグDOM・線SVGは従来どおりpointer透過。`dev.template.html`と生成済み`dev.html`の読み込みキャッシュキー、`development-info.json`のmatsudo欄を更新。**GitHub再取得によるJS構文・静的配線確認PASS。GitHub Actions／Pages配信／iPhone実機スクロールは未確認。**

> **2026-11-19 店舗一覧Aを標準・OSM level降順（main反映／実機未確認）：** A一覧の方が見やすいというユーザー実機フィードバックに従い、店舗表示モードを画面A/Bとも初期値Aに変更（テスト操作パネルでB個別へ変更できる比較機能は維持）。`map-occupants.js` の店舗ソートは数値levelが高い順、数値level未登録は後ろ、同条件は日本語店舗名順。`dev.template.html`、生成済み`dev.html`、`mock.template.html`、生成済み`mock.html`、`dev-panel-components.js` と `panels/test.html` の初期値とリセット処理を調整。`tests/map-occupants.mjs` の想定順を更新し、GitHub再取得による静的整合と簡易ソート実行PASS。**GitHub Actions・Pages・今回の実機動作は未確認。**

> **2026-11-19 焦点建物の全入居店舗A/B表示（main反映／今回の実機未確認）：** 直前の「カメラの焦点にある建物1棟だけタグ表示」は**ユーザー実機PASS**。ただしピアザ松戸ビル内店舗が見えないため、焦点建物判定を維持して A「ビル名＋OSM登録店舗の縦一覧」、B「店舗別の個別カード＋各店舗カードから建物接続点への水色線」の2方式を追加。画面A初期値=A、画面B初期値=B。テスト操作パネルに画面別の表示方式切替を設け、A/B比較表示中に同じ視点で見比べられる。店舗が多い場合はタップ操作の「▲ 前へ」「▼ 次へ」で内部一覧をスクロール可能。店舗行の短いタップで該当OSM要素を編集。輪郭内判定（小さな内包建物を優先）を `maps/map-occupants.js` に独立、焦点建物に限って再計算し、`map-builder.js` では同名でも異なる店舗OSM IDを保持、無名ビルの元タグも保持。`map-labels.js`、`dev-panel-components.js`、`panels/test.html`、`dev.template.html`と生成済み`dev.html`・`mock.html`を更新、`tests/map-occupants.mjs`を追加。**GitHub再取得によるJS構文・配線・輪郭/階数順の試験PASS。GitHub Actions、正式ビルド一致、Pages配信、実機A/Bは未確認。** POIは現行マップビルダーが生成するOSMの店舗・施設ノードを対象とし、OSM未登録施設や建物外ノードは推定で補完しない。固定Engineと元地図JSONは変更なし。

> **2026-11-19 松戸ビルタグをカメラ焦点の建物1棟に限定（main反映・実機未確認）：** `maps/map-focus.js` を新設し、画面中央のカメラ視線と建物の壁・屋根・底面の交差から手前の1棟を選択（最大距離200m、約80msごとの再判定・120msの切替猶予）。高い建物の屋上タグ座標が画面外でも、中央視線が当たった壁・屋根の3D交点に一時的に接続してタグを表示。`map-builder.js` の建物 `mapFeatures` にOSM type/ID・高さ・事前計算した外接範囲を追加。建物名のあるwayのみタグ対象、名前のない建物も手前で遮る。近くの同名POIで建物タグのOSM IDと屋上座標を上書きしない。`map-labels.js` の「近い順・最大20件表示」を廃止し、焦点建物に対応する建物タグのみ表示。店POIタグは通常表示しない（将来の建物内店舗リストは別工程）。水色の接続線・点、開発用OSM ID表示、従来のタップ／ドラッグとOSM編集モーダルは維持。段階表示中の建物情報は追加方式、終了時は確定版と同期。`dev.template.html` と生成済み `dev.html` は同じ配線に更新、固定Engineおよび地図JSON原本は不変。テスト `tests/map-focus.mjs` を追加。**GitHubコードの構文検査・静的配線確認PASS、純粋関数の視線交差8ケースを実行してPASS。Nodeによるリポジトリ全体のビルド、GitHub Actions、GitHub Pages、実機は未確認。** 次は実機で前面建物・空・建物切替・ラベルタップとカメラドラッグを確認。

> **2026-11-18 ビルタグ接続線の正式表示変更（main反映／実機確認待ち）：** 直前のデバッグ用「現在の3Dタグ座標の投影点」を通常表示の水色点（`#7bead8`）として採用し、従来の固定22px縦棒と旧点を削除。タグカードから投影点へ水色の実線（SVG、pointer-events:none）を描画するよう `maps/map-labels.js` を変更。元のタグ座標・建物/POI紐づけ・表示判定・編集モーダル・タッチ操作は変更せず、表示カード位置を従来に近づけるため29pxの空白を保持。開発用の接続点表示ON時のみ `building / poi` とOSM type/IDの文字を表示し、デバッグOFFでも新しい線と点は表示する。`dev.template.html` と生成済み `dev.html` のラベルJS参照クエリ更新。`development-info.json` のmatsudo欄更新。**GitHub main再取得による静的コード確認PASS。Nodeビルド、GitHub Actions、Pages配信、Safari／アプリ内ブラウザ実機は未確認。** 接続点は現状のラベル座標であって必ずしも建物上ではない。

> **2026-11-18 ビルタグ接続点の調査用デバッグ表示（main反映／実機未確認）：** テスト操作パネルに「📍 接続点を表示／隠す」を追加（初期OFF）。松戸の表示ラベルに限り、現在のOSMラベル3D座標を画面に投影した位置へ緑点、タグとの関係を黄色点線、`building / poi` とOSM type/IDを表示する。デバッグSVGはpointer透過で、タグの元座標・既存の縦線・OSM編集モーダル／操作判定・地図生成・固定Engineは変更していない。表示対象は従来表示されるラベルに限定。`map-labels.js` と `dev-panel-components.js`、`dev.template.html`／生成済み`dev.html`、`development-info.json` のmatsudo欄を更新。**GitHub main再取得による静的差分確認PASS。Nodeビルド／Actions／実機確認・Pages反映は未確認。** 緑点はあくまで現行ラベル座標であり、対象建物が正しいことを保証するものではない。

> **2026-11-18 ゲーム領域スクロール抑制・ユーザー実機PASS：** ユーザーからゲーム操作中のアプリ内ブラウザのページスクロール抑制について「実機PASS」と報告。`development-info.json` の `common` を実機PASSに更新。端末別・PC/通常Safari・他パネルやOSM編集モーダルの個別網羅テストまで確認済みとは扱わない。既存の固定Engine・ゲーム入力・タグ・地図データを変更せず、今回の更新は開発情報とSTATUSの記録のみ。

> **2026-11-18 ゲーム領域タッチ時のページスクロール抑制（main反映／実機未確認）：** ChatGPTアプリ内ブラウザでゲーム移動・カメラスワイプ時に外側ページがスクロールするとの報告。既存 `.touch-layer` / `.touch-zone` の `touch-action:none` に加え、共通 `layout.css` のゲーム表示領域 `.landscape-game .play-surface` に `touch-action:none;overscroll-behavior:contain` を追加。`dev.template.html` と生成済み `dev.html` に、左右ゲーム操作領域で開始したタッチIDのみを追跡し `document` 捕捉段階の非passive `touchmove` でスクロール既定動作を抑える処理を追加。touchend/cancel・blur・pagehideで追跡を解除。OSM編集モーダル内部・他の3パネルから始まるタッチは抑制対象外。固定Engine・ラベル操作判定・地図JSON・モックの入力JS・表示サイズは変更なし。開発情報 `common` 更新。**GitHub main再取得によるコード一致／静的確認PASS。実際のビルド実行、Actions、Safari／アプリ内ブラウザ実機PASS、Pages配信は未確認。** ChatGPTアプリ固有の親WebViewジェスチャーはページ側から完全抑制できない可能性がある。

> **2026-11-18 ビルタグ操作改善のユーザー実機PASS：** ビルタグ上からの移動・カメラ操作と、タップ・クリックによるOSM編集モーダル起動についてユーザーより実機PASS報告。確認した端末別・操作別の網羅範囲は未記録のため、PC/Safari各条件を一律PASS扱いしない。

> **2026-11-18 ビルタグ入力透過・タップ判定（GitHub main反映／実機検証待ち）：** ユーザー承認により `maps/map-labels.js` の表示タグをpointer透過に変更。表示中タグカード矩形へのヒットテストと既存OSM編集モーダルを開くAPIを追加し、`dev.template.html`／生成済み `dev.html` の左右タッチ領域で移動8px以内の主ポインターの短いタップ／マウス左クリックだけを判定する。ドラッグ、右クリック、マルチタッチ、開始と終了で異なるタグは編集対象から除外。編集モーダル表示中は入力をpause、閉じるとresume。固定Engine、OSM編集送信仕様、地図JSON、描画処理、森のモデルは変更なし。`development-info.json` のmatsudo欄を更新。**main再取得による構造・テンプレート↔生成版入力部分の一致確認PASS。Node実行テスト・GitHub Actions・Safari/PC実機・Pages配信確認は未実施。** 実機ではタグ上から左移動／右視点ドラッグ、短いタップで編集、2指ピンチ、PC左クリック／ドラッグ／右クリック、モーダル開閉後の復帰を検証する。

> **2026-11-17 Phase 2を取り消し（ユーザー依頼／Safari再確認待ち）：** Phase 2のEngine三択UI・Cゲーム接続・ゲーム側RendererFactory固定SHA変更と配信HTMLなど一式を取り消し、Phase 1完了コミット `890e501` と同じコード・表示へ復帰。CのEngine側基盤は保持するがゲーム画面には未接続、A/B比較画面は従来の2択。復元は履歴を消さない新規コミットで実施。ユーザー報告「色々おかしい」による緊急切り戻し。Phase 2の修正作業は中断し、再開前に原因を調査する。GitHub復元後のSafari実機・Pages配信の確認は未実施。既存のUI軽微修正のSafari確認待ちは継続。

> **2026-11-17 A/B/C描画構成 Phase 1（Engine側基盤／ゲーム表示不変）：** ユーザーQ7承認。CはThree.jsベースのKomorebi Styleとし、新規 `engine/renderer/MeshRendererC.js` を `MeshRendererB` の派生クラスとして追加。Bのシーン・カメラ・レンダリング・破棄処理は再利用し、C専用 `createMaterial()` / `makeMesh()` を分離。Phase 1の材質はBと同一 `MeshLambertMaterial` 設定で、C独自の見た目はまだ未実装。`RendererFactory.js` は `createRenderer('C',{profile:'mesh'})` に対応し、boxは明示的に非対応。`engine/tests/render-c.test.mjs` を追加。**既存 `MeshRendererA.js` / `MeshRendererB.js`、ゲーム `dev.template.html` / `dev.html`、ゲームからの固定Engine参照、A/B UI、地図・ヘリ・カメラは変更なし。** Cはゲーム画面には未接続。次はPhase 2（C接続、見た目を確認）で、別途許可を取得。Nodeテスト実行・ブラウザ動作・Safari実機は未確認。直前のUI軽微修正は別途Safari実機確認待ち。

> **2026-11-17 UI軽微修正（GitHub反映／Safari実機確認待ち）：** ユーザー希望によりテスト操作ボタン `↻ リセット（開発用）` を `↻ 条件リセット` に改称。起動診断 `#launch-diagnostic` はページ上端の独立バナーを廃止して `📊 実行ステータス` 内の `#collision-status` 直後に移動。実行時のJavaScript/WebGL判定・Engine準備表示・エラー表示は同じIDで維持。`page-shell.html` から診断差し込み箇所を除去し、`build-dev.mjs` が `panels/runtime.html` に設けたマーカーへdev時のみ診断HTMLを挿入。mockには従来どおり診断を表示しない。`dev.html` と `mock.html` の生成済み表示を同期、開発情報 common を更新。Engine・地図・ヘリ・描画ロジックは変更なし。Step3-A照明環境共通化はユーザーよりiPhone Safari実機PASS報告済み。今回のUI変更は実機未確認。

> **2026-11-17 Step 3-A 共通照明環境（静的反映／Safari実機PASS）：** ユーザーQ4承認。`RenderSettings.js` の既存 `lighting` 検証を利用し、ゼロベクトル方向を禁止。`MeshRendererA.js` の太陽方向と環境光／直射光基準値をGLSL uniformで受け取り、A独自の簡易陰影計算と既存ベース輝度の換算（0.77/0.84、0.23/1.15）は保持。`MeshRendererB.js` は共通値でThree.jsのAmbientLight/DirectionalLightを設定し、Lambert材質を維持。共通値は方向[-7,13,5]・環境光0.84・直射光1.15、A/Bで計算方式は非統一。`dev.template.html` と生成済み `dev.html` の共通設定を同期しRendererFactoryのみ固定参照 `d74c71d37b0da4d44daa788d6a2543f3ea7df65b` に更新（入力/カメラ/Coreなど旧Engine参照は維持）。霧と視界距離、森・松戸の地図生成、ヘリ操作は不変。開発情報 `development-info.json` common更新、Node単体テストコード追加。**Nodeテスト実行・GitHub Pages配信は未確認。ユーザーよりStep 3-AのiPhone Safari実機PASS報告済み。** Step 2の霧・背景色共通化はユーザーよりSafari実機PASS報告済み。

> **2026-11-17 Step 1・2 共通描画設定（GitHub反映／Safari実機PASS）：** ユーザー承認によりRenderer A/BでFogと背景色を共通化した。Step 1の設定APIを通じ、Step 2では設定指定時のみ描画へ適用。Fogはカメラビュー空間の奥行きに基づくlinear方式、松戸1000〜2200m、森120〜220m。Snapshotの描画距離は松戸2200m、森220mのまま。ゲームのRendererFactory参照だけ新固定SHA 7183cc541d5a83e8e008671a6010c79a97bdd790 に変更し、他のEngine参照は旧固定SHAを維持。dev.template.htmlと生成済みdev.htmlを同期、development-info.json commonも更新。照明・色変換はまだ統一されておらずStep 3候補。**Node全テスト実行・配信確認は未実施。** ユーザーよりStep 2のSafari実機PASS報告済み。110svhも実機PASS。

> **2026-11-17 Engine共通描画設定 Step 1（実装／検証待ち）：** ユーザーQ3承認。新規 `engine/renderer/RenderSettings.js` でcamera・fog・background・lighting・colorProcessing・resolutionの任意設定を検証し、複製・読み取り専用化する。`MeshRendererA`／`MeshRendererB` は `createRenderer(...,{profile:'mesh',settings})` から同一形式の設定を保持するが描画には**まだ適用しない**。省略時は`renderSettings=null`、従来の霧・背景・照明・カメラ・DPR挙動は不変。設定値の共通化と実際の見た目の一致は次工程。固定Engine `56bb2bc...` のCDN参照、`dev.template.html`／`dev.html`、ゲーム処理・地図・ヘリは変更しない。`engine/tests/render-settings.test.mjs` を追加。**ローカルNodeテスト／GitHub Actions／Safari実機の結果は未確認。** なお110svhのiPhone 13 Safari実機PASSはユーザー報告済み。

> **2026-11-17 iPhone縦画面ゲームパネル110svhへ再調整（静的反映／Safari実機PASS）：** ユーザー希望で120svhから110svhへ変更。対象は縦画面・幅600px以下のゲームパネルが初期配置されたスロットのみ。共通 `layout.css` と生成版 `dev.html`／`mock.html` の高さルールを同期し、開発情報 `development-info.json` の `common` も更新。120svhは2026-11-17にユーザーよりiPhone 13 Safari実機PASS報告あり。110svhはユーザーよりiPhone 13 Safari実機PASS報告あり。従来の100svh・120svhは履歴であり現在値ではない。テスト操作、横画面／PC、固定Engine、ヘリ・描画処理には変更なし。GitHub Actions／Safari実機確認は別。

> **2026-11-17 ゲームパネル外枠・ヘルプ表示HTML共通化（静的PASS／Safari実機PASS）：** ユーザー了承により `komorebi3d/panels/game.frame.html` を新設し、`game.html` / `game.mock.html` で重複していた `.landscape-game` 外枠・ヘルプボタン・ヘルプ表示を単一ソース化。両game HTMLにはそれぞれの表示本体のみを残し、`build-dev.mjs` が共通frameの `<!-- @game-view -->` に組み込んだ後、従来の `<!-- @game-touch -->` を展開。タッチ領域の挿入位置（devはplay-surface内、mockはplay-surface外）は従来どおり維持。**両生成済みHTMLに共通frameから生成したゲームパネル文字列が各1回・完全一致することを確認。** `dev.html` / `mock.html` の生成済みファイル自体は変更なし。CSS・Engine・ゲームJS・モック疑似描画・パネル移動には変更なし。**ユーザーより2026-11-17にSafari実機PASS報告あり。** 実際のビルドコマンド／Actionsは未確認。ゲームパネル外枠・ヘルプ表示HTMLの共通化は完了。


> **2026-11-17 旧モック生成ファイル整理（静的PASS／Safari実機待ち）：** ユーザー承認により未使用の `komorebi3d/build-mock-panel.mjs` と生成済み `komorebi3d/mock-panel.html` を削除。`build-dev.mjs` は `--mode=mock` → `mock.html`、`--mode=dev` → `dev.html` を生成し、旧2ファイルは参照しない。README・ルール・STATUSに旧ファイル参照なし、`.github/workflows` もなし（外部リンクまでは保証しない）。GitHub main の最新ツリーで**旧2ファイル削除済み／現行 `mock.html`・`dev.html`・`build-dev.mjs` は存在**を静的確認。現行モック・dev のHTML/CSS/JS、固定Engine、4パネル構造に変更なし。**Safari実機／Actions未確認**。現行モックとdevの表示・操作が従来どおりかを実機で確認する。


> **2026-11-17 4パネル外枠HTML共通化（静的PASS／Safari実機PASS）：** ユーザー承認により `komorebi3d/page-shell.html` を新設し、`mock.template.html` / `dev.template.html` で二重管理していた `.mock-root > .mock-frame > .shell` とタイトル・4パネルスロットの外側HTMLを一本化。各テンプレートは `<!-- @page-shell -->` のみ参照し、`build-dev.mjs` が `--mode=mock` / `--mode=dev` に応じて展開する。dev固有の起動診断は `dev-launch-diagnostic.html` に分離、見出しのdev固有属性もビルド時に保持。**共通外枠展開後の両テンプレートが変更前Git履歴の元テンプレートと全文完全一致（mock 2,972文字・dev 67,773文字）することを確認。** 生成済み `mock.html` / `dev.html` は変更不要・変更なし。4パネル各HTML/CSS・共通CSS・パネル移動・モック疑似表示・実ゲームJS・固定Engineに変更なし。静的PASS、**ユーザーより2026-11-17にSafari実機PASS報告あり**。ビルドコマンドの実行／Actionsは未確認。共通外枠HTML化は完了。


> **2026-11-17 ビルドモード名 `product` → `dev`（静的PASS／実機未確認）：** ユーザー承認により `komorebi3d/build-dev.mjs` の受け付けモードを `dev` / `mock` に変更し、省略時のデフォルトを `dev` に変更。`--check` の案内も更新。`dev` は従来どおり `dev.template.html` → `dev.html`（4パネル・実ゲーム）、`mock` は `mock.template.html` → `mock.html`（4パネル・疑似ゲーム）を生成。旧 `--mode=product` は無効。将来の商用ゲームパネル専用 `production` は今回未実装。ゲームHTML・JS・CSS・Engine SHA、既存 `dev.html` / `mock.html` は変更なし。**モード設定・分岐・出力先の静的チェックPASS。ビルド実行／Safari実機／Actionsは未確認。**


> **2026-11-17 ゲーム画面タッチ領域共通化（静的PASS／Safari実機PASS）：** ユーザー了承で `panels/game.touch.html` を新設し、`game.html` と `game.mock.html` の両方から同じ左右タッチ領域（`#pad`／`#camera-pad`）を生成時に挿入。タッチ領域CSSを `game.css` から共通 `layout.css` に移動。モック側では `dev-panel-components.js` の `mountMockTouchInput()` でPointer down/move/up/cancel・キャプチャを受け取るが、画面やゲーム状態には反映せずEngineは読み込まない。本体のEngine TouchStick／InputManager／カメラ入力処理、ゲーム処理・固定Engineは変更なし。`mock.template.html` のみモック入力受信初期化を追加。生成済み `mock.html`／`dev.html` と生成ソースの**HTML全文一致・CSS全文一致を静的確認済み**。**ユーザーより2026-11-17にSafari実機PASS報告あり。Actionsは未確認。** 共通タッチ領域とEngineなしモックの入力受信は実機確認済み。


> **2026-11-17 パネル移動初期化の共通化（静的確認PASS／Safari実機PASS）：** ユーザー承認に基づき `dev-panel-layout.js` に `mountDefaultPanelLayoutEditor(doc)` を追加。4つの `data-panel-slot` 直下の `data-panel-id` を読み、現在のパネル配置から `mountPanelLayoutEditor(...,{preserveSlotSize:true})` を共通起動する。`mock.template.html` と `dev.template.html` の初期配置定数重複・初期化呼び出し差分を整理し、両方で同一関数を呼ぶ。モック・本体の生成済みHTMLも同期。本体の `applyPanelLayout(PANEL_LAYOUT)` はゲームモジュール起動前にDOMを配置する別処理なので温存。実ゲーム・固定Engine・CSSは変更なし。**両テンプレートと生成済みHTMLに共通呼び出しが1回ずつ存在し、旧呼び出しが残っていないことを静的確認。** ユーザーより2026-11-17にSafari実機PASS報告あり。Actions未確認。パネル移動初期化の共通化は完了。


> **2026-11-17 ゲームパネルCSS二重管理の整理（静的PASS／Safari実機PASS）：** ユーザーが棚卸しの②「game.mock.css と game.css の重複解消」を承認。ゲーム枠（背景・境界・サイズ・フレックス・ヘルプ色とオーバーレイ表示）を共通 `layout.css` へ移し、両ゲームCSSから重複指定を除去。モックの1000px以上で重複していた外枠・表示領域のルールも整理。`game.mock.css` は黒い疑似描画・画面ラベル等、`game.css` はWebGL Canvas・タッチ入力レイヤー・デバッグマップ・Canvasサイズ調整を保持。`mock.html`／`dev.html` をCSS生成元に同期し両モード全文CSS一致、共通枠の単一ソース・描画固有CSSの分離も静的確認。HTML/JS/固定Engine/パネル移動処理は変更なし。**ユーザーより2026-11-17にSafari実機PASS報告あり。Actionsは未確認。** CSSの二重管理整理は完了。


> **2026-11-17 モック正本レイアウト一括共通化（静的PASS／Safari実機待ち）：** ユーザーの明示的な方針「一度モック踏襲で共通化し、表示の崩れはその後修正」を採用。`dev.template.html`／生成 `dev.html` の外枠をモック同様の `.mock-root > .mock-frame > .shell` に揃え、モック承認済みレイアウト／空スロット／実行ステータス余白／画面枠CSSを `layout.css` に一本化。`mock-layout.css`、`dev-layout.css`、`mock-approved.css` を削除し、`build-dev.mjs` は双方とも同じ `layout.css` を参照。モックの黒い疑似ゲーム画面用CSSは `panels/game.mock.css` に移し、本体のCanvasサイズ適合CSSは `panels/game.css` に追加。ゲーム処理・固定Engine・パネル移動JSは未変更。両生成HTMLのCSSと最新の生成元CSSが全文一致することを静的確認。**外枠と高さ制御をモックに寄せたため、以前実機PASSした本体PC横の画面内フィット等が変わる可能性あり。Safari実機／Actions／全ブレークポイントのブラウザ実測は未確認。** 次は表示崩れをユーザー実機確認で洗い出し、モックを正として修正する。


> **2026-11-17 レイアウトCSS共通化 Step 2（静的PASS／Safari実機PASS）：** ユーザー承認に基づき、モックの650px（2列1:1）／1000px（2列2:1）レスポンシブ判定と主スロット高さ・実行ステータス列数・下段8px間隔を `layout.css` の共有 `@container` に集約。モックは従来通り `.mock-root` をコンテナとし、製品は `.shell{container-type:inline-size}` を設定して同じ閾値を使う。`mock-layout.css` の重複した2列／PCルールを削減、`dev-layout.css` の900px列指定や1000px列・ステータス重複指定を削減。固定Engine・ゲームJS・パネル移動JSは変更なし。**ただし横画面幅900px以上／高さ600px以上にある画面内フィットの高さ制御は維持しているため、高さまですべて一致したわけではない。** 生成 `dev.html` と `mock.html` のCSSが最新ソースと全文一致、モックHTML全体も生成元と一致（静的PASS）。**ユーザーより2026-11-17に実機PASS報告あり。Actionsは未確認。** 次工程では横画面の高さ制御とモックの差分を調べ、レイアウトの二重管理をさらに減らす。


> **2026-11-17 レイアウトCSS共通化 Step 1（静的PASS／Safari実機PASS）：** 承認されたモック正本・レイアウト一本化方針の第一段階として `komorebi3d/layout.css` を新設し、モック・本体の縦積み基本配置、パネル間8px gap、上段のパネル余白リセットを共通ソースへ移動。`build-dev.mjs` は両モードでこの共通CSSを読み込む。`mock-layout.css` と `dev-layout.css` の同等指定を削除し、生成済み `mock.html`／`dev.html` を更新。生成CSSは両方とも生成元と全文一致、モックHTMLは生成元と全文一致（静的PASS）。ゲームJS・固定Engine・モック疑似描画は変更なし。**実機PASS済み動作を守るため、650px／1000pxの幅切替条件は今回変更しない。** ユーザーより2026-11-17に本段階のSafari実機PASS報告あり。次はモック基準の幅切替（650px／1000px）の共通化を段階的に検討する。Actions未確認。


> **2026-11-17 テスト操作パネルの完全共通化（静的PASS／Safari実機待ち）：** ユーザーから前工程の実行ステータス枠修正についてSafari実機PASS報告あり。モック専用の `panels/test.mock.html` / `panels/test.mock.css` を削除し、モックも本体と同じ `panels/test.html` / `panels/test.css` で生成。`build-dev.mjs` のモック専用テストUI抽出処理を廃止。モックは既存 `dev-panel-components.js` の `mountTestControlsPanel(root,null)` によりGame APIなしのローカル状態で操作可能。ゲーム面は既存の疑似描画を維持し、A/Bモード・設定の選択に追従。本体のゲーム処理・固定Engine・`dev.html` は変更なし。`mock.html` は最新生成元と全文一致、CSSとテストパネルDOMが単一ソースであることを静的確認。**ユーザーより今回の共通テストUIについてSafari実機PASS報告あり。Actionsは未確認。** 注意：共通化によりモックの見本ボタンの見た目・操作状態は本体HTML仕様に変わるため、ゲーム負荷なしの操作・レイアウト・スライダー・スクロール・A/B疑似画面を実機確認する。


> **2026-11-17 実行ステータス枠の共通CSS修正（静的PASS／実機待ち）：** ユーザーより縦画面で実行ステータスの枠が消えたと報告。原因：`runtime.css` の背景・枠線・内余白は横画面900px以上／高さ600px以上の条件付き、モック側だけは `mock-layout.css` で常時指定されていた。モック基準の枠・背景・余白を `common.css` の `.runtime-status` に移し、モック固有の重複ルールを削除。`dev.html`／`mock.html` をCSS生成元に同期。描画JS／固定Engine／パネル移動JSは未変更。**Safari再実機・Actions未確認。** 共通化の現状：実行ステータス・開発情報HTMLとパネル移動JSは共通、ゲーム・テストUIとレイアウトCSSは一部別系統。将来はゲーム疑似表示などのモック固有処理以外の共通化を継続する。


> **2026-11-17 Step 3-A パネル間隔調整（静的PASS／実機待ち）：** ユーザーよりスマホ縦のゲーム高さ実機PASS、ただしモックと本体のパネル間余白不一致の報告。モックの `.landscape-hero`／`.landscape-main` は8pxのgap・下段8px余白・上段buildのmargin 0を使用。本体の縦画面CSSへ同等のgap・上段パネルのmargin 0・下段margin-top 8pxを追加。変更は本体 `dev-layout.css` と生成済み `dev.html` のCSSのみ（ゲームJS／Engine／モック未変更）。**Actionsと今回の余白調整後のSafari実機は未確認。** 横画面・PCの配置差分は別途継続確認。


> **2026-11-17 Step 3-A 高さ差分の報告と縦画面修正（静的PASS／実機待ち）：** ユーザーから「スマホ縦画面で本体ゲーム画面高さがモックと異なる」報告。調査で、モックの `max(640px,100vh-330px)` と本体の `min(640px,75svh)`・キャンバス比率依存に差があることを確認。本体の縦画面CSSにモック基準のパネル高さ・ページ余白（合計18px）・ゲーム面とcanvasの全面表示ルールを追加。モック本体のソース・ゲームJS・固定Engineは変更せず、本体 `dev.html` のCSSを生成元と全文一致確認。**Safari実機・Actions未確認。** 全幅監査では、モックがコンテナ幅650/1000pxで切り替える一方、本体は横向きかつ高さ600px以上の幅900/1000pxで切り替えるため、タブレット縦・小さい横画面・PC境界条件はまだ一致していない。これらは次の検証・調整対象として残す。


> **2026-11-17 UI共通化 Step 3-A（静的反映／実機待ち）：** モックと本体で重複していた `.landscape-main .panel-slot-main` の幅・最小高さ・overflow、スロット直下のパネル高さ、テストパネルのoverflow制御を `common.css` に集約。`mock-layout.css`／`dev-layout.css` のレイアウト切替条件（コンテナ幅650/1000px、横向き900/1000px）は維持。共通 `dev-panel-layout.js` やWebGL／固定Engineには変更なし。生成元からCSSを再構築して `mock.html`・`dev.html` に反映。**幅ごとの表示とパネル入れ替えのSafari実機PASS待ち**、Actions未確認。次は実機PASS後に幅ごとのレイアウト差異を詰める。


> **2026-11-17 UI共通化 Step 2（静的PASS／Safari実機PASS）：** モック基準で共通 `common.css` にパネル間隔・PC列比率・実行ステータス列数・テスト操作パネルの色と見出し装飾を集約。`mock-layout.css`／`dev-layout.css` は既存のコンテナ幅／横画面メディア条件を保持し、`panels/test.mock.css`／`panels/test.css` の重複指定を整理した。`mock.html`・`dev.html` のCSSはGitHub `main` 上の生成元と全文一致（静的チェックPASS）。ゲームロジック・固定Engine・地図描画は変更なし。**ユーザーより変更後のSafari実機PASS報告あり。GitHub Actionsの実行結果は未確認。** 次段階は幅別・パネル移動時のレイアウト挙動をモック基準で共通化する。

> **2026-11-17 UI共通化（段階実装中）：** モックをデザイン正本として、実機PASS済みゲーム画面の0px外周余白・A/B間1px・中央角丸6pxを `common.css` の共通デザイン値に抽出。モックの生成順序問題を解消し、最終CSSを `mock-approved.css` として生成元に保存。生成元から組み立てたCSSと `mock.html`／`dev.html` のCSS全文一致を静的確認。ゲームのJS・WebGL・固定Engineは未変更。**共通化はゲーム画面のデザイントークン段階まで。ユーザーより2026-11-17に変更後の実機PASS報告あり。パネル全体・レスポンシブ配置・テスト操作UIの完全共通化は未実施。GitHub Actionsの実行結果は未確認。**

> **2026-11-17 運用変更：** UI検証はGitHub Pagesの `komorebi3d/mock.html` を直接使用し、モック専用チャット運用を終了。`mock.chat.html` は削除し、`build-dev.mjs` のチャット用生成モードも廃止。開発は「00｜統合開発」に集約。コミット後は Actions／本体／モックの3リンクを送る。既存の本体・モックへの実機PASSと、今回の生成スクリプト変更の検証は区別する。

> 更新日：2026-11-15（JST）／コードの正本：[`Komorebi-3D/komorebi` の `main`](https://github.com/Komorebi-3D/komorebi/tree/main)  
> **現在の最優先作業：Step 5-GはSafari実機PASS（近場表示の追従含む）。反映回数2,714→1,396回、反映処理3,409→2,175ms、全体95,177→94,486ms（速度差は有意といえない）、終盤フレーム52.7→52.5ms（ほぼ不変）。スマホ負荷の改善候補として正式採用。追加計測は既存Step 5-F負荷ログに累積メッシュ・頂点数のみ追記し、静的確認・Safari実機未確認。開発目標は「処理時間を短く、スマホにも優しい」。測っていないCPU利用率・消費電力・OSメモリ量は推測値を表示しない。Step 4-C遠方公平性制御は保留、②隣接タイル取得は未実装。**  
> この文書は「現状・完了事項・未確認事項・次の実装」に集中する。旧実装の時系列や試行錯誤はGit履歴を参照する。コミットSHAや開発情報の最新表示は実際の `main` を確認すること。

**Step 4-A 内部リファクタリング（2026-11-15）：** ユーザーより専用GitHub Actions初回PASSの報告を受け、`maps/map-builder.js` の既存距離順ソートと未処理要素の逐次取り出し・元インデックスから生成優先ランクへの対応を `createFeatureWorkQueue` に分離。現段階ではキューの優先順位は開始時固定、元ソート式とtie-breakを維持し、メッシュ生成・バッチ・POI統合・ラベル・6msフレーム処理は変更しない。`dev.template.html` と生成版 `dev.html` のimportクエリを更新済み。main再取得で変更箇所の静的整合PASS。**リファクタ後のGitHub Actionsノンデグ結果／Safari実機は未確認**。両方PASS後にStep 4-A完了とし、Step 4-Bの動的優先順位へ進む。

**Step 4-B実装（2026-11-15、検証待ち）：** `maps/map-builder.js` の `createFeatureWorkQueue` で、前回の優先順位設定地点からヘリが50m以上移動したとき、未生成地物だけを現在地との距離順に再優先化。元OSM indexで同距離タイを解決し、生成済みの地物はキューから除外。再ソートは距離計算とマージソートの512操作ごとに `type:'priority'` をyield、`dev.template.html`／`dev.html` が従来6ms予算でyield処理し、描画・入力を回せる設計。生成バッチ割当は古い固定順位を参照せず、実際に処理したOSM index→バッチを保持し最終ラベル／ミニマップ特徴量を再割当。既存の32行ログ仕様は維持。検証には `tests/map-dynamic-priority.mjs` を追加：49m不変／50m境界／400m遠方優先／往復50m以上／生成件数・ラベル・ミニマップ特徴量・バッチ帰属の一貫性。従来の松戸500m・上野2kmの固定Step 3ノンデグ比較と合わせて `.github/workflows/map-nondeg.yml` に登録。ソース再取得の静的確認PASS（構文実行・自動テスト結果はまだ未確認）。**GitHub Actions・Safari実機のPASS報告前に完了扱いにしない。** 将来のStep 4-Cは遠方地物の飢餓防止、公平性の調整。

**Step 5 原因計測（2026-11-15、実機待ち）：** 上野2km最大約5.35秒の処理スパイクを切り分けるため、`maps/map-builder.js` に任意の `profile` 計測を追加（地物1件の処理・最大OSM ID、最終並べ替え、POI統合、表示バッチ再割当、mesh集約）。`dev.template.html`／生成版`dev.html` で初期準備、未生成地物の50m再優先化処理、画面へのバッチ反映、最終ラベル画面再照合を合計/最大ms集計し、地図生成完了直前に6行の「計測」ログとして出力。既存6ms分割処理、生成順、ラベル、32行ログ保持、固定Engineは不変。`profile` がない既存の自動ノンデグテストは元の生成経路を走る。ソース再取得の静的整合PASS。**Actionsノンデグ結果とSafari実機の測定結果は未確認。** ユーザーは計測版のActions確認後、上野2kmのヘリを操作せず完了まで放置し、「🧪 地図JSON読み込みログ」をコピーして共有する。

**Step 5-A POI統合高速化（2026-11-15／Actions・Safari実機PASS）：** 直近の放置実機計測で上野2kmの `final-poi 4,952ms`、最大処理スライス `4,976ms` と判明（生成地物22,815件／建物10,391／道路4,421／鉄道283／ラベル7,166）。`map-builder.js` の最終 `labels.find(...)` 全件走査を、名前正規化をキーとする `labelsByName` 索引と候補内 `find` に変更。名前ごとの配列は旧 `labels` の順序で構築し、統合で既存ラベルの座標が変わっても同一参照を維持、新規POIは配列末尾と索引へ同時追加して従来の先頭一致／同名15m以内判定／ラベル表示順序を維持。建物生成、50m移動再優先、6ms分割、32行ログ、計測項目は不変更。`dev.template.html`／生成版 `dev.html` のモジュールキャッシュキーを更新。既存 `map-nondeg.yml` の松戸500m・上野2km固定Step 3とのバイト一致、Step 4-Bの移動テストによってノンデグを検証する。**GitHub ActionsノンデグPASS（ユーザー報告）／Safari実機PASS**：ヘリ放置テストで `final-poi 6ms`（前回4,952ms）、最大スライス29ms（前回4,976ms）、全体83,842ms、建物10,391・道路4,421・鉄道283・ラベル7,166で件数一致。Step 5-Aを完了扱いとする。

**Step 5-B 描画待ち計測（2026-11-15／検証待ち）：** 最新のSafari放置試験で上野2km全体83,842ms、地物処理16,510ms、バッチ表示3,069ms、最終POI統合6ms。約64秒の未分類時間に、2,552回の `requestAnimationFrame(()=>setTimeout(resolve,0))` 待機がどれだけ含まれるか調べるため、`dev.template.html` と `dev.html` の同じ位置に待機計測ラッパーを追加。従来のrAF→setTimeout(0)順序・await回数・6ms予算・生成処理・50m再優先化・A/B表示・32行ログ上限は維持。`wait-batch`（バッチ後のawait）、`wait-priority`（移動中ソートのawait）、`wait-raf`（rAFコールバックまで）、`wait-timer`（その後タイマー解放まで）、未分類差分を生成完了ログに追加。rAF待ちはフレームスケジューリング等を含みGPU描画単独の時間ではない。**Actions・Safari実機結果は未確認**。次はActions確認後、Safariで上野2kmのヘリ放置テストを行い、ログを共有。動作PASS後にのみ最適化手段を検討。

**Step 5-C 実機評価・差し戻し（2026-11-15）：** Safari放置テストで `MessageChannel` 方式であることをログ確認。全体92,207ms・バッチ待機71,358ms・表示2,641回となり、Step 5-B基準の86,271ms・待機65,774ms・2,588回より改善せず（単発試験のため差の原因は断定しない）。ユーザー明示指示により、`dev.template.html`／`dev.html` の `waitForMapPaint()` を `requestAnimationFrame`→`setTimeout(resolve,0)` に差し戻し、`wait-postraf` を従来の `wait-timer` ログに戻した。`maps/map-builder.js`、6ms予算、50m再優先化、POI高速化、建物・ラベル生成、32行ログは変更なし。**差し戻し後の静的整合確認実施中、Actions・Safari再実機未確認。** 次に待機方式ではなく待機回数の削減を検討する。

**Step 5-D バッチ内訳診断（2026-11-15／Actions・Safari検証待ち）：** Step 5-C差し戻し版の放置実機で `wait-timer` を確認。1回目の放置97,611ms（表示2,736回・待機76,003ms）、直前91,159ms（表示2,636回・待機70,287ms）となり、同方式でもバッチ数と所要時間が変動する。`map-builder.js` の `flushBatch` はメッシュ・ラベル・地図要素が0のバッチも返し、呼び出し元は従来どおり全バッチでawaitする構造。そこで `dev.template.html`／`dev.html` のみ、空バッチ数・メッシュなしバッチ数・1バッチ当たり処理地物数（平均/最小/最大/2件以下/5件以下）・6ms予算超過時の12ms超/24ms超回数を3行の集計ログとして追加。地図生成、最終結果、6ms予算、rAF→setTimeout(0)待機、表示回数、50m再優先化、POI高速化、32行ログ仕様は変えていない。**Actions・Safari実機未確認**。まずヘリ無操作で上野2kmの計測ログを取得し、空バッチ待機を削れるか（または処理予算以外の原因か）を判断してから変更する。

**Step 5-D 実機計測結果（2026-11-15）：** Safari放置テスト、上野2km・22,815件、`priority-work` 0回、全体109,199ms、地物18,702ms、画面反映3,839ms、バッチ待機86,319ms（rAF50,717ms／timer35,602ms）、表示2,850回。空バッチ0回・メッシュなし0回・2件以下104回・5件以下840回（約29.5%）、平均8.0件、最大30件、6ms予算超過のうち12ms超12回・24ms超0回、POI7ms。生成完了：建物10,391・道路4,421・鉄道283・ラベル7,166。ユーザーよりA/Bミニマップ正方形修正のSafari実機PASS報告も受領。空バッチ除去では改善余地がなく、次の候補は6ms予算と操作性を維持したままバッチ分割／待機回数を減らせるかの調査・小規模実装。**Step 5-DのActions結果は未確認。**

**Step 5-E 進捗区間計測（2026-11-15／静的確認中・Actions・Safari実機待ち）：** Step 5-D放置実機の全体109,199ms（地物18,702ms・待機86,319ms・表示2,850回）を受け、同じ22,815地物でも連続試験で全体時間が長くなる原因の切り分け用に、進捗0–25%／25–50%／50–75%／75–100%の4区間別に処理地物件数・表示回数・地物処理時間・表示反映時間・待機合計および平均待機時間（rAF・timer内訳）を4行追加。区間は処理済み件数で判定し、境界を跨ぐバッチは完了側の区間に一括計上する。`dev.template.html` と `dev.html` の計測のみ変更。6ms予算・rAF→setTimeout(0)・バッチ数・map-builder・50m再優先化・POI処理・32行ログ上限は変えない。次はヘリ放置で上野2kmを1回実測して進捗区間間で平均待機とバッチ数を比較する。**実機・GitHub Actionsは未確認**。

**Step 5-F 画面負荷診断（2026-11-15／Actions・Safari検証待ち）：** Step 5-Eの上野2km放置ログでは全体146,468ms、地物22,276ms、バッチ3,296回、待機118,959ms。進捗4区間の平均待機は9.9→19.3→41.7→56.2ms、バッチ数は603→642→1,009→1,042回。生成結果は建物10,391・道路4,421・鉄道283・ラベル7,166で一致。次の原因調査として `dev.template.html` と `dev.html` の計測コードのみ追加し、同じ4区間で各バッチのメッシュ登録数・時間、ラベル追加数・更新時間、ミニマップ更新時間、既存ゲームrAFの連続コールバック間隔（件数・平均・最大・33ms超・50ms超）、ゲーム描画呼出し処理時間を集計し完了時に8行出力。フレーム間隔はrAF callback間の時間でGPU描画時間そのものではない。描画処理時間もJSからの描画呼出し時間でありGPU完了時間は含まない。進捗境界は従来のバッチ完了時点で切り替え、バッチ内の処理件数・表示回数・待機は従来集計と同じ。新しいrAFやタイマーは起動せず、地図生成順・6ms予算・既存rAF→setTimeout待機・50m再優先・POI・32行ログ上限・固定Engineは不変。**Actions・Safari未確認。**

**Step 5-G 近距離即時／遠方表示集約（2026-11-15／Actions・Safari検証待ち）：** ユーザー了承で `dev.template.html` と `dev.html` の画面反映側のみ変更。ヘリから300m以内にかかる建物・道路・鉄道の座標バウンディングボックスまたはラベルがあるバッチを「近距離」とし即時反映、近距離か確実に判断できないバッチも即時反映する。近距離にかからない「遠方」のバッチだけ最大2回分を保留して、ジオメトリ登録、ラベル更新、ミニマップ更新を一括実行。近距離バッチが入れば保留分も同時に確定。最終保留分は必ず反映する。メッシュIDのバッチ連番・ラベル／地図要素の順序、最終件数、両画面で同じデータを使う経路は変えない。**重要：6ms生成予算および元の各バッチ後のrAF→setTimeout(0)待機を維持するため、待機回数は削減しない。** 追加ログは `distance-check` 合計/最大と Step5-G近距離・遠方バッチ数、実画面反映回数、2バッチ合流回数、元の待機回数。従来Step 5-D/E/F計測・32行ログ上限も維持。map-builder、固定Engine、50m再優先化・POI生成は未変更。300mは初回の安全側試験値であり実機効果を確約しない。まず上野-6_-4ヘリ無操作の同一条件で、生成件数・合流の有無・メッシュ／FPS推移・全体時間・最大スライスを確認し、その後ヘリ操作時の近場表示追従を検証する。**Actions/Safari実機は未確認。**

**Step 5-G Safari実機PASS・軽量追加診断（2026-11-15）：** ユーザー報告：上野2kmタイル地物22,815件／建物10,391・道路4,421・鉄道283・ラベル7,166は完全一致、ヘリ移動中も問題なし。Step 5-F対Step 5-Gの同条件放置ログで、画面反映回数2,714→1,396回（-48.6%）、反映合計3,409→2,175ms（-36.2%）、6msバッチ後の待機回数2,714→2,713回、待機合計73,709→74,118ms、全体95,177→94,486ms、終盤フレーム平均52.7→52.5ms。性能差の有意性やCPU・電力・メモリ削減は未測定で断定しないが、反映コスト削減と視覚的正常性が確認できたため正式採用。開発目標は処理時間短縮とスマホ負荷低減の両立、同等時間なら実測できた負荷軽減を優先。Macなしの測定方針として既存Step 5-FのFPS・フレーム間隔・ゲーム描画時間・メッシュ追加数を使い、**累積メッシュ数と頂点数だけ**を同じ4行の負荷ログ末尾に追記。GPU・端末全体のメモリ使用量、CPU利用率、消費電力の代替指標として誤認しない。新しいログ行・監視ループ・タイマー・生成処理は追加しない。追加診断のActions・Safari実機は未確認。

## 1. 現在地（次のチャットはここから）

- **開発入口：** [`komorebi3d/dev.html`](https://github.com/Komorebi-3D/komorebi/blob/main/komorebi3d/dev.html)。森・松戸の統合ワールド、4パネル（開発情報／ゲーム／テスト操作／実行ステータス）、描画方式A/B比較、テスト操作を提供。
- **Engine固定：** `shuma-fujita/komorebi@56bb2bc2743f5a4441fa28783becf4e6fa6fbc4e`（表示値 `56bb2bc`）。旧リポジトリ `komorebi-3d/komorebi@d4a392a` から移行し、Engineは旧固定版より新しい版（旧リポジトリ `29c17a9` 以降の `engine/`）。移行後の実機確認は未実施。`engine/` や固定jsDelivr参照を不用意に変更しない。
- **松戸の現行地図取得：** `komorebi3d/maps/map-loader.js` が旧 `matsudo.json` と、`tiles-2km/index.json` から解決する中央タイル `0_0` を取得。松戸入場時に順次読み込み、旧はhalfSize=250、新はhalfSize=1000で3D生成。A/B画面の地図設定で描画を選択する。初回の0_0比較はユーザー実機PASS。2026-11-14にローダーの `TEST_TILE_ID='0_0'` から選択タイルを読み、ビルダーが `map.tile` に基づきEPSG:6677グリッドの中心を自動算出するようリファクタ済み（リファクタ後の実機未確認）。
- **ブラウザからのOSM直接API取得：削除済み。** Overpass接続先・再試行・OSM/JSON自動フォールバック・「自動／OSM最新／JSON」切替・`mapSourceMode`・`setMapSourceMode` は現行ゲームから削除済み。
- **ワールド分離：** 松戸地図取得のセッションは `cancelMatsudoMapRequest()` と `isCurrentMatsudoMapRequest()` で管理。ワールド切替時に旧要求を中断・失効させる。森側にOSM API通信の可否判定を置かない。
- **ログは維持：** 実行ステータスに **「🧪 地図JSON読み込みログ」** とコピー機能がある。現在はJSON取得のHTTP結果・要素検証・3D生成・表示・エラーを記録する。**次のタイル化でもログパネル自体は削除しない。**
- **A/B画面設定の開発中（2026-11-14）：** 新しい画面別設定UIを `panels/test.html`／`dev-panel-components.js` に統合し、`build-dev.mjs` が共通UI部分をモックに抜き出す方式へ整理した。`dev.html` と `mock.html`／`mock.chat.html` は更新済み。画面ごとのEngine A/B選択・再初期化処理を接続し、切替時はcanvasを交換する。JavaScript構文チェック済み。画面別表示とEngine切替の全組合せの網羅検証は別。**画面ごとの旧500m／新2km中央タイルの描画選択を接続済み**。Engine選択とは独立。画面別ラベルとミニマップ縮尺を追加し、A/B比較はユーザー実機PASS。
- **次の地図データは準備済み：** `komorebi3d/maps/data/tiles-2km/` に **2kmタイル559枚＋ `index.json`** が `main` 保存済み。中央タイル1枚の取得と描画選択は実装済み（初回ユーザー実機PASS）。隣接タイルの移動連動読み込み・描画は**未実装**。
- **直近のユーザー実機報告（2026-11-14）：** A/Bの旧500m／中央2kmタイル比較、森100m／松戸2000mの共通 `GroundBounds` による移動境界はユーザー実機PASS。今回の自動タイル原点リファクタ後も、B=0_0 の松戸表示はユーザー実機PASS。
- **最終のユーザー実機報告（2026-11-14）：** ①森・松戸の地図取得ライフサイクル疎結合化、②森の中央2枚扉の取っ手濃い青グレー化、③松戸のブラウザOSM API／3モード削除後の従来500m JSONによるワールド動作は、いずれも**ユーザー実機PASS**。個別HTTP通信・中断ログの網羅確認と2kmタイル動作は別。
- **開発情報の表示変更：** `development-info.json` は読み込み中「確認中…」、成功時は文字列をそのまま表示（空文字は空欄）、失敗時「取得失敗」。静的照合済み、個別の実機PASS報告は未取得。

## 2. 2km分割JSON移行：A/B比較実機PASS・BタイルID自動切替の実装は静的PASS

### 2.1 目標

`matsudo.json` の単一500mデータ読み込みを、事前にダウンロード・分割しGitHub `main` に保存した **2kmタイルJSON** 参照へ置き換える。ブラウザからOSM/Overpass APIを直接呼び出さず、静的JSONだけを取得する。森ワールド、固定Engine、既存地図ファイルには不要な変更を加えない。

### 2.2 保存済みデータと参照元

- **索引：** `komorebi3d/maps/data/tiles-2km/index.json`。キーは `generatedAt`（UTC）と `tiles`（`"x_y": "tile_x_y_YYYYMMDDHHMMSS.json"`）のみ。現時点で559エントリ。
- **タイル本体：** `komorebi3d/maps/data/tiles-2km/tile_x_y_YYYYMMDDHHMMSS.json`。既存のOSM要素とメタデータを保持し、境界をまたぐ地物は複数タイルに完全複製され得る。
- **作成仕様の正本：** `komorebi3d/maps/split-map-tiles.py` 冒頭コメント。松戸駅 (35.78444, 139.90061) を基準としたEPSG:6677の固定2kmグリッド。座標変換・タイルID算出はこの仕様と生成物を照合する。
- **元の500m地図：** `komorebi3d/maps/data/matsudo.json` は当面維持し、実機での比較・切戻しに使えるよう、移行工程では原本を上書きしない。

### 2.3 実装前に確認し、順に進めること

1. **データ形式の実確認：** `index.json`、中央タイルを含む実タイルJSON、分割Python仕様、`map-builder.js` の入力形式を照合。現行の `map.elements` とタイルデータの差分・座標系・OSM way/relation の参照構造を確認する。
2. **タイル参照とJSONローダー：** まず索引を読み、現在地に必要なタイルファイルだけを取得。559枚を無条件に全件読み込まない。AbortControllerと古い応答の破棄、HTTP/解析/検証エラーを維持。
3. **表示領域と座標：** 現行 `map-builder.js`・ミニマップ・移動境界は500m前提。タイルの2km範囲、松戸駅から離れた座標、隣接タイルへの移動・追加取得・不要タイルの破棄をどう接続するか実装時に定める。単に取得URLを変更するだけで広域表示できるとは扱わない。
4. **重複地物への対応：** 隣接タイルに重複した建物・道路・relationを、メッシュ・ラベル・OSMタグ編集・ミニマップで二重生成しない方法を決めて検証。
5. **ログ維持・整理：** **「🧪 地図JSON読み込みログ」** は残す。新しいタイル処理に必要な情報（索引・タイルID/ファイル名・取得/失敗・件数・地図生成/表示）を整理する。不要な旧500m専用メッセージの変更は、この工程で行う。
6. **小さい単位で検証：** 松戸初期位置のタイル表示 → 森との往復・通信中断 → 隣接タイル移動と境界 → 重複防止・ラベル・OSM編集 → A/B描画・端末負荷。静的PASSとSafari実機PASSを混同しない。

**今回の第一段階（2026-11-14）：** A=旧500m、B=中央2kmタイル1枚を初期選択とし、どちらの画面も切替可能。地図ソース別メッシュ、A/B別ラベル、ミニマップ縮尺、HTTP・生成ログを追加。移動境界は森100m四方・松戸2000m四方で共通の固定Engine `GroundBounds` を使用。Aの描画がない領域へも移動可能。A/Bの同一フレームIDを維持。初回A/B実機PASS済み。今回のリファクタでは0_0の旧方式／新方式のOSMサンプルから作るメッシュ・ラベル・地図要素が完全一致し、座標計算もpyproj(EPSG:6677)との数値照合PASS。リファクタ後の松戸表示もユーザー実機PASS。中央実タイルはGitHubコネクタの大容量ファイル取得制約で全文解析できていない。

**今回のリファクタ（2026-11-14）：** `maps/map-loader.js` の `TEST_TILE_ID` だけでBのタイルを指定（現在は `'0_0'`）。`index.json` で対応ファイルを解決しJSON内のID/サイズを照合。新設 `maps/tile-grid.js` が `split-map-tiles.py` と同じ固定EPSG:6677グリッドの中心座標を計算し、`map-builder.js` がタイルメタ情報から表示原点を自動設定する。0_0は旧原点を正確に維持し、Aは従来どおり。将来は `TEST_TILE_ID='-6_-4'` に1か所変更するだけで上野側タイルへ切替可能（模擬ローダーテストPASS、上野実機表示は未実施）。マスタJSON559枚・index・分割Python・固定Engine・カメラ初期値は未変更。`dev.template.html` と `dev.html` の生成モジュール部分一致を確認。

**未決定・今後の設計事項：** 先読み範囲／同時保持タイル枚数／ロード・アンロード条件／メッシュの結合粒度／既存500m境界の扱い。実装前にコードと実データで適切な段階分けを行う。具体的な性能値や動作のPASSはまだない。

**上野負荷テスト切替（2026-11-14）：** Bの `TEST_TILE_ID` を `0_0` から `-6_-4` に1行変更。索引では `tile_-6_-4_20261114023930.json` を参照する。ローダー構文チェック・索引/JSON検証の模擬テストPASS。JSONマスタ・index・座標投影・A・Engine・カメラは変更なし。Safari表示・実測負荷は未確認。

**上野切替の表示修正（2026-11-14）：** ユーザーよりBが松戸のまま・開発情報も松戸のままとの報告。`map-loader.js` 本体の `TEST_TILE_ID='-6_-4'` はmainで確認済み。`dev.template.html`/`dev.html` の `map-loader.js` importクエリが従来と同じだったため、Safariの旧モジュールキャッシュが疑われる（原因の実機確証は未取得）。参照URLのバージョンを更新し、`development-info.json` の松戸欄を上野テスト表示へ更新。main再取得と構文チェックはPASS。GitHub Pages配信・Safari実機での上野表示は再確認待ち。JSONマスタとindexは変更なし。

**松戸中央タイルへの再復帰（2026-11-16）：** リポジトリ移行後、上野 `-6_-4` のタイルがPCで非常に重いとのユーザー報告により、Bの `TEST_TILE_ID` を `0_0` に戻し、`dev.template.html`／`dev.html` のmap-loader importバージョンを `matsudo-0_0-20261116` に更新。構文チェックPASS／実機確認待ち。なお移行時のアップロード漏れで2kmタイルは559枚中84枚のみ `main` にあり、残りは再アップロード待ち。

**松戸中央タイルへの復帰（2026-11-15）：** 上野 `-6_-4` の実機表示PASS・3D生成約22秒・JSON 22,815件を記録。次の目的を隣接タイルへのシームレス移動とし、Bの `TEST_TILE_ID` を `0_0` に戻した。Safariキャッシュ対策として `dev.template.html` と生成版 `dev.html` のmap-loader importバージョンを同時更新。`development-info.json` の松戸欄も更新。上野テストで得た基準ログは保持。コード構文PASS／復帰後のSafari実機確認待ち。マスタJSON・index・固定Engineは変更なし。

**近距離優先3D生成 Step 1（2026-11-15）：** `maps/map-builder.js` の既存の地物別3D生成処理を共通利用し、呼び出し時の自機位置 `game.x/game.z` から近い順（各地物のOSM座標の外接矩形中心との距離、同距離は元のJSON順）に地物を処理するよう変更。A=500m/B=2km両方に適用。ラベル・POI統合・ミニマップ用地物は旧JSON順を維持。サンプル地図で従来版と三角形集合・ラベル・地物・件数の一致を500m/2km双方で検証PASS、JS構文PASS、`dev.template.html` と生成版 `dev.html` のゲームモジュール整合PASS。現段階では最後にまとめて表示する同期生成のまま。**Step 1はユーザー実機PASS（2026-11-15）。Step 2の逐次表示／Step 3のゲーム処理への制御返却は未実装。** JSONマスタ・index・分割Python・Engine・カメラは変更なし。

**近距離優先3D生成 Step 2（2026-11-15）：** A/B共通の `map-builder.js` に、Step 1の近距離順の全地物を最大24区間＋地面の表示バッチとして返す `displayBatches` を追加。各地物の建物・道路・鉄道メッシュは従来と同じ計算で、完成形だけがバッチに入る。 `dev.template.html` / `dev.html` はバッチごとにGPU描画オブジェクトを追加し、次バッチまで `requestAnimationFrame` で画面更新を許可。ラベルは既存オーバーレイを更新し、ミニマップも段階的に追従。完成時のラベル・ミニマップ用データは元の順序に戻す。ワールド切替時は従来のAbortControllerとトークン確認を維持。合成OSMテストで従来の三角形・ラベル・ミニマップ用地物・件数の一致、バッチの連続性、全ラベル収録を検証PASS。HTML生成コード整合とJS構文PASS。**Step 2は3D生成CPU計算自体を小分けにはしていないので、生成完了前の待ちは残る。生成中のゲーム操作を止めないStep 3は未実装。Safari実機未確認。** 固定Engine・JSONマスタ・索引・分割Pythonは未変更。

**建物3D＋ビルタグ一体表示の改善（2026-11-15）：** Step 2はユーザーSafari実機PASS。今回の改修では既存の `map-builder.js` が返す地物単位の近距離表示バッチを維持し、`dev.template.html`／生成版 `dev.html` の同じバッチ内で3Dメッシュとタグデータを登録してから、次の画面更新までに現在画角のタグを位置計算・表示準備する。 `map-labels.js` に `appendLabels(labels)` を追加し、バッチごとの `setLabels` 全消去・再構築を廃止。既存DOMカードとタグ編集イベントを保持し、画面外のラベルHTMLは従来同様に遅延生成。マップ切替のフル設定 `setLabels` は維持。**構文チェック／template↔devモジュール整合／ラベル差分追加API模擬試験PASS。今回の差分についてSafari実機未確認、0.1秒の遅延改善量は未測定。** 3D生成CPUの分割は行っておらずStep 3で実装予定。JSONマスタ・Engine・森は未変更。

**近距離優先3D生成 Step 3（2026-11-15）：** `maps/map-builder.js` に `createMapBuildSteps` ジェネレータを追加し、従来の `buildMap` は同ジェネレータを同期的に最後まで処理する薄いラッパーとして維持（ジオメトリ実装は共通）。A/B共通の `dev.template.html`／`dev.html` は `MAP_BUILD_BUDGET_MS=6` を初期値として、各OSM地物（建物・道路・鉄道など）を1件ずつ完成させ、時間予算に達したらバッチを公開して `requestAnimationFrame→setTimeout(0)` 経由で描画・入力フレームへ制御を返す。完成済み3Dメッシュとタグデータは同じバッチで公開。 `map-labels.js` の `appendLabels` に加えて `reconcileLabels` を設け、最後のPOI名・タグ統合でも変更のないタグDOMを破棄しない。地図生成ログに予算超過回数、最大計測スライス時間／件数、事前準備時間、全体時間を追加。ワールド切替後の旧要求はトークン・AbortControllerで抑止。**合成OSM 326地物で従来の三角形・ラベル・地物・件数の一致と、48回の途中公開を検証PASS。JS構文、生成HTMLゲームコードの一致、ラベル統合API模擬試験PASS。Safari実機未確認。** 注意：6msは地物の途中で打ち切る厳密上限ではなく、複雑な1地物やバッチのGPU登録、初期の距離ソート・道路/コンビニ前処理は6msを超える可能性がある。実機で応答性・画面出現の速さ・上野全体時間を検証して調整する。固定Engine・JSONマスタ・森は未変更。隣接タイル機能②は未実装。

**Step 3初回実機失敗・修正（2026-11-15）：** ユーザーSafariログで A=500m（1717件）／B=2km `0_0`（7684件）ともJSON取得・検証PASS後、地図生成開始直後に `TypeError: Spread syntax requires ...iterable not be null or undefined`。原因は `maps/map-builder.js` の地面初期バッチに `labels` / `mapFeatures` がなく、ゲーム側が `displayed.labels.push(...batch.labels)` で失敗したため。初期バッチに `labels:[]` / `mapFeatures:[]` を追加し `dev.template.html` / `dev.html` のmap-builder importキャッシュバージョンを更新。合成地図180建物＋90道路を用いた両halfSize（250/1000）の全バッチ展開回帰テストPASS、表示用ラベル数・三角形数が同期生成結果と一致。HTMLモジュール整合PASS。**修正版Safari実機未確認**。今後は初期バッチから最終バッチまでの表示側展開検証を必須にする。

**Step 3：近距離POIタグ途中公開修正（2026-11-15）：** Step 3のユーザー実機PASS後、ヘリ初期視点の `TAPA's Bar` タグが2km生成完了間際に初登場する問題を報告。 `matsudo.json` では `node/1445158731`、`amenity=bar`、初期位置から約43.5m、近距離処理順位52/1717。原因：従来の `poiLabels` は最後の全件統合まで段階表示バッチに入らなかった。 `map-builder.js` に単独POIの早期公開候補を準備する軽量前処理を追加。同名・15m以内の建物／POIは従来と同じ重複統合を優先し、単独POIだけ生成バッチ中にラベル公開。最終的なPOI×建物統合処理は変更せず、A/B共通のStep 3・6ms予算・建物3D生成・OSM編集機能を維持。**500m実JSON（1717要素）で TAPA's Bar が56件処理時の第8バッチで公開、全831ラベル・マップ地物・件数・三角形数は修正前と一致、途中ラベルのOSM ID重複なしを検証PASS。** 500m/2km相当の合成データで同名建物×POI・重複POI・離れた同名POIの最終ラベル一致を検証PASS。JS構文・dev.template↔devゲームモジュール整合PASS。**2km実JSONの直接比較・今回のSafari実機確認は未実施**。 `map-builder.js` のキャッシュバージョン更新済み。固定Engine・JSONマスタ・森は未変更。

**Step 3＋近距離POIタグ、ユーザー実機PASS（2026-11-15）：** A/B共通のPOI早期公開改修が実機PASS。松戸2km中央タイル `0_0` の実行ログは `7684`地物、`810`表示回、`808`回の6ms予算超過、最大計測スライス `252.0ms`（ログに併記の最大件数は57件であり、同じスライスとは限らない）、事前準備 `35.0ms`、全体 `20619ms`。完了時は建物4134／道路2049／鉄道50／ラベル1442。**6msは厳密な上限でなく、最大252msの原因は未特定。** 表示バッチ過多によるオーバーヘッドも実測・調査対象。今回のPASSを静的検証と区別して記録。②隣接タイル取得は引き続き未実装。

**一時的な上野2kmタイル検証設定（2026-11-15）：** ユーザー指示によりフリーマップ3ワールド実装は保留。既存「松戸」ボタンのまま、`komorebi3d/maps/map-loader.js` の `TEST_TILE_ID` のみ `0_0` → `-6_-4` へ変更。B側に割り当てられる新2km地図ソースが上野になり、A側の旧500m `matsudo.json` は不変（各画面のA/Bエンジン選択とは独立）。559タイルの索引に `tile_-6_-4_20261114023930.json` の登録を確認。 `dev.template.html` と `dev.html` の `map-loader.js` importクエリだけ更新しSafari旧キャッシュを回避。共通Step 3生成・6ms設定・森・固定Engine・地図JSONマスタは無変更。JS構文／HTMLモジュール整合／索引登録の静的確認PASS、**上野Safari実機は未確認**。戻す際は `TEST_TILE_ID='0_0'` とmap-loader importクエリの更新を行う。

**上野2km Step 3 Safari実機PASS・性能ログ（2026-11-15）：** ユーザー実機報告「概ね問題なし」。上野 `-6_-4` は22,815地物、3,174表示回、3,172予算超過回、最大計測スライス5,806.0ms・最大件数29件（必ずしも同じスライスとは限らない）、事前準備206.0ms、全体149,555ms。最終件数は建物10,391／道路4,421／鉄道283／ラベル7,166。松戸2km `0_0` は7,684地物／810表示回／最大252.0ms／全体20,619ms。比較すると要素数約2.97倍、全体時間約7.27倍。終盤の7:56:13（22,756/22,815）→7:56:19（完了）に約6秒の空きがあり、全地物処理後のPOI重複統合が最大5,806msの有力候補だが原因は未計測・未確定。次は事前準備／1地物生成／バッチ登録／最終POI統合の各時間を切り分けて調査し、表示バッチ数の最適化も検討する。**この実機PASS後はコード未変更。**

**Step 4向けA/B比較初期設定（2026-11-15）：** テスト開発パネルのA/B双方について、地図データ初期値を新2km（`new`）、描画Engine初期値をWebGL（`A`）へ統一。`panels/test.html` のチェック表示、`dev.template.html` の `screenConfigs`、生成版 `dev.html` の両方を更新。main再取得で設定一致とパネルHTML部分一致を確認（静的PASS）。Safari実機未確認。既存A/B比較表示は実装済みで、2画面の視覚的検証の改良・Step 4動的生成優先は未実装。固定Engine・森・地図JSON原本は変更なし。

**A/B独立ミニマップ（2026-11-15、Safari実機未確認）：** ユーザーより直前のA/B新2km・WebGL初期設定は実機PASS報告。続いてQ1=Aの明示許可により、共通の1枚ミニマップをA/Bそれぞれの画面内左上へ配置（`panels/game.html`／`panels/game.css`）。`dev-panel-components.js` は画面別Canvas/2Dコンテキストを保持し、`dev.template.html`／生成版 `dev.html` は両画面の地図設定に応じて各地図・自機位置を描画。A/B比較・片画面表示を切り替えた際の再描画に対応し、Safariキャッシュ対策としてモジュールimportバージョンを更新。既存のStep 3・固定Engine・OSM原本・森モデルは無変更。ソース整合の静的検証とSafari実機確認を区別する。**Step 4の生成優先アルゴリズム自体はまだ未実装。**

**A/B独立ミニマップのビルタグ誤投影修正（2026-11-15、実機未確認）：** ユーザー実機でミニマップ表示後に「看護師宿舎2号棟」などのOSM編集可能なビルタグがミニマップ内に現れる事象を報告。`maps/map-labels.js` の `.view-panel canvas` が3D Canvasと追加ミニマップCanvasの合計4枚を列挙し、インデックスによるA/B割当を誤る原因と判断。`.view-panel > canvas` に変更して3D Canvasのみを対象とした。`dev.template.html`／生成版 `dev.html` のmap-labels importクエリを更新してSafariキャッシュに対応。main再取得によるDOM構造・セレクタ・import整合の静的確認PASS。Safari実機でタグ位置、A/B双方のタグ編集とミニマップ表示を再確認する。固定Engine・地図JSON・生成処理は無変更。

**A/Bミニマップ正方形比率修正（2026-11-15）：** ユーザー実機で前回のビルタグ誤投影問題が解消したことを確認。独立ミニマップのCanvasまで `.views.single canvas` 等の3D画面用CSSが適用され、正方形の地形表示が長方形に崩れる症状を報告。`panels/game.css` と `dev-layout.css` の幅・高さ・aspect-ratio指定を `.view-panel > canvas`（3D描画Canvasのみ）に限定し、生成版 `dev.html` へ反映。ソース再取得によるCSSセレクタと生成版一致の静的PASS。Safari実機による正方形表示の確認は未実施。地図JSON・固定Engine・Step 3生成処理は無変更。

**Step 4-A 自動ノンデグ基準準備（2026-11-15）：** 現行Step 3の固定Gitコミット `e8dae1e27fc02a69c68e7c2e789113977dfca6e5` を参照側とする `tests/map-nondeg.mjs` および `.github/workflows/map-nondeg.yml` を追加。比較対象は松戸500m `matsudo.json` と上野2km `index.json` 指定の `-6_-4`。同じ現行JSONを入力し、32要素ごとの決定的flushで生成物のmesh位置・法線・色・ラベル・マップ特徴量・バッチ割当・yield進捗・件数をSHA-256とJSONで照合。基準コードの複製は作らない。workflowはpush（対象paths）または手動実行で2 checkoutを比較し、差分時fail、両側の記録をartifactとして保存。現行地図生成コード／ゲーム画面は無変更。GitHub Actionsでの実行成否、基準実行結果はまだ未確認（静的ソース確認のみ）。**Step 4-Aのリファクタリング自体は未着手**、実機検証も未実施。

## 3. 完了・確認済みの主な工程

| 日付 | 工程 | 現在の状態 |
| --- | --- | --- |
| 2026-11-09〜10 | Game APIと4パネルの疎結合化、配置・交換・削除・再追加、開発版とチャット内モック | ユーザー操作PASS。非標準配置全パターンの網羅は別 |
| 2026-11-10 | F5再読み込みで直前の森／松戸を復元（座標と高度は初期値） | ユーザー実機PASS |
| 2026-11-11 | 森・松戸統合、地図処理の `map-loader.js`／`map-builder.js`／`map-labels.js` 分割、旧松戸独立版廃止 | 基本動作はユーザー実機PASS |
| 2026-11-11 | 松戸の屋上名ラベル表示の接続不具合修正 | ユーザー実機PASS |
| 2026-11-12 | コンビニ外観共通化、森の比較用店舗、窓・看板・ドア等の調整 | 実装済み。個別工程の実機PASS範囲は一律としない |
| 2026-11-13 | OSMタグ編集UI・テストOSMへのコピーと`level`追加 | ユーザー操作成功報告あり。changesetコメントの実API検証は未完了 |
| 2026-11-13〜14 | 松戸駅から半径25kmのOSMデータ取得・2kmグリッドへの分割 | GitHub Actions実データ実行成功 |
| 2026-11-14 | タイル559枚と索引を `main` に格納（560ファイル、11回の分割コミット） | GitHub保存完了。ゲーム表示は未実装 |
| 2026-11-14 | 森・松戸の地図読込疎結合化、森の中央扉取っ手を濃い青グレー化 | ユーザー実機PASS |
| 2026-11-14 | 松戸のブラウザOSM直接API・取得モード・自動フォールバックを削除し、500m `matsudo.json` 専用へ整理 | **ユーザー実機PASS** |
| 2026-11-14 | 開発情報パネルの取得中／取得成功（空文字含む）／取得失敗表示を整理 | コード静的照合済み。実機未報告 |
| 2026-11-14 | A/B旧500m・中央2kmタイルの別データ描画、ラベル・ミニマップ接続 | ユーザー実機PASS |
| 2026-11-14 | 2kmタイルID切替・EPSG:6677中心座標の自動計算 | 0_0差分なし静的テストPASS、ユーザー実機PASS |

### 広域地図データの生成・保存結果

- 取得元データ約2,344,556 OSM要素。タイル分割の成功実行：[`43547496368`](https://github.com/Komorebi-3D/komorebi/actions/runs/43547496368)。
- **559タイル、JSON合計897,894,074バイト**。 `matsudo-2km-tiles` の成果物から `komorebi3d/maps/data/tiles-2km/` へ公開。
- 保存用Actions成功実行：[`43548293473`](https://github.com/Komorebi-3D/komorebi/actions/runs/43548293473)。**11コミット**、1回90MB未満、最大バッチ89,852,414バイト。
- `index.json` は最小2キー構成を実物で確認済み。**保存済み生成物は完成**しているため、昔の「分割未実行」「GitHub保存未実施」は現状では誤り。
- Python分割・テストは `komorebi3d/maps/split-map-tiles.py` と `komorebi3d/maps/tests/test_split_map_tiles.py`、Actionsは `.github/workflows/split-matsudo-tiles.yml` と `.github/workflows/publish-matsudo-tiles.yml`。広域取得元は `fetch-map-radius25km.py` および対応workflow。

## 4. 松戸OSMタグ編集・テストAPI：現在の仕様と残課題

- 地図ラベルから既存OSM要素のタグを編集する。通常編集はnode/way/relationの新規作成やジオメトリ変更ではない。確認操作ではタグの差分・全タグをJSONで表示。未送信の下書きの永続化は現行仕様では行わない。
- OSM本番へのAPI書込みは行わない。テスト環境へのコピーは検証専用で、本番OSMは公開GETで参照。node/wayのコピーに対応し、relationのコピーは未対応。テスト環境OAuth（PKCE／write_api）を使用。
- テストOSMでの送信は、既存の店舗・施設要素に未設定の `level` を新規追加する場合だけ（`level=0`〜`8`）。既存levelの更新・削除やその他のタグ送信は対象外。
- changeset `comment` はタグ差分から自動作成（例：`add - level : 2`）。**実API上での自動コメント保存をまだ確認していない**。
- ユーザー確認済み例：本番のローソンをテストOSMへコピーし、`node/4365808698`・`changeset/724665` が発行され、対象読み込みとlevel送信の反映を確認（2026-11-13）。この要素に重複コピー／再送信しない。
- 関連ファイル：`maps/map-labels.js`、`maps/osm-test-api.js`、`maps/map-builder.js`。**ブラウザの地図取得用Overpass APIを削除したことと、タグ編集・テストOSM APIは別機能**。後者をタイル移行に便乗して削除しない。

## 5. その他の未完了・検証待ち（優先度は地図移行より後）

- **P1：** changesetコメント自動生成のテストOSM実APIでの確認。未使用の別テスト要素で検証（既存ローソンは再送信しない）。
- **P1：** おばけヘリの飛行高度・0/500m上限・透明度・衝突／移動境界など詳細な実機テスト。松戸ワールドの通常起動PASSと網羅試験は別。
- **P1：** 1000匹NPC負荷時のFPS・描画距離・表示数とA/B描画差、ミニマップの実機性能検証。
- **P1：** Engine・ワールドの継続CIテストと短い回帰チェックリスト。
- **P2：** リリース世代の復元手順、測定結果に応じた性能改善、将来のゲーム機能拡張。
- **個別未報告：** 開発情報パネルの新しい「確認中…／取得失敗／空文字」挙動について実機PASSは未報告。コンビニ外観の各細部も過去の未確認記録を一括PASS扱いにしない。

## 6. 現行コード・保護対象

| 対象 | パス・注意点 |
| --- | --- |
| 開発版正本 | `komorebi3d/dev.template.html` → 生成版 `komorebi3d/dev.html`。更新時は両者の整合を確認 |
| 地図取得 | `komorebi3d/maps/map-loader.js`：旧500m＋指定2kmタイル `TEST_TILE_ID` 対応 |
| 地図生成／OSMラベル | `komorebi3d/maps/map-builder.js`／`komorebi3d/maps/tile-grid.js`（投影座標）／`komorebi3d/maps/map-labels.js` |
| UI・診断ログ | `komorebi3d/panels/test.html`、`panels/runtime.html`、`dev-panel-components.js` |
| タイル保存先 | `komorebi3d/maps/data/tiles-2km/index.json` と559枚のJSON |
| 開発情報 | `komorebi3d/development-info.json`（`engine`、`forest`、`matsudo`、`common`） |
| 固定Engine | `shuma-fujita/komorebi@56bb2bc2743f5a4441fa28783becf4e6fa6fbc4e`。固定参照と `engine/` を保護 |
| 実機PASS済みの状態 | Git履歴で管理。旧v0.6／v0.7テストHTMLは整理済み |
| モック | `komorebi3d/mock.html` はUI確認用。チャット専用HTMLは廃止済み。安定版とは別 |
| 削除済み旧アーカイブ | `dev-before-decouple.html` は `1144253b7af98ad6c28f5c4bdf4f3434f2cb9aaa` のGit履歴から復元可能 |

## 7. 新しいチャットでの進め方

1. [`docs/rules/README.md`](rules/README.md) と [`docs/rules/chat.md`](rules/chat.md)、[`docs/rules/development.md`](rules/development.md)、そして**このSTATUS**を読む。最新コードをGitHub `main` で再取得する。
2. タイル座標自動計算リファクタ後の B=0_0 松戸表示はユーザー実機PASS。2026-11-16、上野 `-6_-4` がPCで非常に重いとのユーザー報告により、`maps/map-loader.js` の `TEST_TILE_ID` を `0_0` に戻した（map-loader importバージョンも更新／構文チェックPASS・実機確認待ち）。
3. **「🧪 地図JSON読み込みログ」を残すことが明示的な希望。** ログは新しい取得方式に合わせて見直すが、削除しない。
4. 森ワールド、固定Engine、元500m JSON、559タイルの原本を不用意に変更しない。ユーザー実機PASSと未検証部分を区別し、必要なファイルだけ小さく変更する。
5. GitHub書込みはユーザーの明示許可に沿って行い、静的検証と実機確認を区別して `STATUS.md` を更新する。今回のチャットから次へ移ったという理由だけで、新機能を実装済み扱いにしない。
