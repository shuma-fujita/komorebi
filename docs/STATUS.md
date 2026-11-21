# 🌳 Komorebi 3D｜開発ステータス・次チャット引き継ぎ

> **2026-11-22 反映待ち警告文言の完全統一（Safari実機未確認）：** ユーザーより「反映待ち（動作確認OSM送信待ち）」等の長い動作確認表示は不要、「⚠ Geofabrik反映待ち」の1種類だけと再指定。直近mainの共通UIは既に後者のみだったが、旧モジュールのキャッシュ可能性を考慮し、`osm-pending-tag-visual.js` の旧 `PENDING_LOCAL_REVIEW_LABEL` エクスポートを削除、`map-labels.js` / `mock-ui.js` と dev.html の参照URLを一斉更新。画面上で本番と動作確認を表示分岐せず、内部保存のみ区別する。mock.htmlはビルダー生成ファイルのため変更しない。固定Engine、本番OSM送信なしは維持。

> **2026-11-22 黄色い警告表示の統一・省略防止：** ユーザー希望は localStorage 保存も本番保存も同じ「⚠ Geofabrik反映待ち」。`osm-pending-tag-visual.js` の単一文言は維持し、タグ行の警告に折り返しCSSを追加。`map-labels.js` の建物/テナントの判定を二系統フラグから一つの統合キー集合へ簡素化し、表示文言の分岐・重複は行わない。建物/テナントの警告にも折り返しCSSを明記。保存データの実体は本番成功と動作確認用で引き続き分離し、本番OSMへ送信しない。前回のActions失敗要因だった自動生成 `mock.html` は変更しない。今回の実機PASS・Pages配信は未確認。

> **2026-11-22 保存成功後の共通動作確認フロー（main反映／今回のSafari実機未確認）：** ユーザーはlocalStorage保存ボタンを使って「実際の本番OSM保存成功後の処理一式」を動作確認したい。正式な本番OSM保存成功の記録 `osm-production-pending` とローカル動作確認記録 `osm-review-storage-check` は内部では分離したまま、両経路の描画更新処理を `dev.html` の共通 `renderSavedOsmChange` へ統合（対象建物の部分3D再生成、ビル/店舗ラベル再照合、ミニマップ更新）。両経路から共通 `refreshSavedOsmPresentation` を通してビルタグ行と新2km建物・テナント一覧の黄色表示を更新する。見た目はユーザー希望どおり差異を設けず **「⚠ Geofabrik反映待ち」** を使用し、同じタグの警告を重複表示しない。建物外1m警告は保持。開放で元のタグに戻し黄色も解除（本番からの実保存記録がある場合は残す）。再ロード時の差分適用は従来の新2km map-loaderを利用。複数回のローカル再編集では保存前の基準タグと比較して累積変更タグを保持する。本番OSMへの通信は今回含めず、実際の送信・認証は検証対象外。旧2km・固定Engine・既存テストOSM送信は変更しない。ユーザー希望により専用模擬テストは実施せず、GitHub反映・Pages・Safari実機の確認は区別する。

> **2026-11-22 localStorage動作確認の反映待ちをビルタグ画面と3Dビル／テナント一覧に表示（実機確認待ち）：** ユーザーは前回のlocalStorage保存→3D即時反映・開放復元の実機PASSを報告。未表示だった黄色の「反映待ち」は既存UIが正式な本番OSM保存成功後の `komorebi3d:osm-production-pending:v1:` だけを参照し、動作確認用 `komorebi3d:osm-review-storage-check:v1:` を参照していなかったことが原因。今回 `osm-pending-tag-visual.js` を共通化し、正式差分には従来どおり「⚠ Geofabrik反映待ち」、動作確認用には虚偽の本番保存成功を示さない「⚠ 反映待ち（動作確認・OSM未送信）」を使用。新2kmの本番OSMタグ編集画面は保存した変更タグ行のみ黄色、3Dビルの建物カードには建物自身の反映待ち、テナント一覧は該当OSMテナント行だけ黄色。既存の建物外1m警告や正式な反映待ちとは共存。保存・開放後は両A/Bラベルレイヤーの反映待ち情報を即更新し、一覧の署名変化でカードを再描画。ページ再読み込み後も動作確認用localStorageを参照して表示。テストOSM・旧2kmは対象外。動作確認用の保存先と正式な本番保存成功記録は混同せず、OSM本番APIは未接続。固定Engineは変更なし。ユーザー希望で専用模擬テストは行わず、GitHub静的確認とSafari実機確認を区別。

> **2026-11-22 本番タグ確認ボタン常時表示＋localStorage動作確認から3D更新（main反映／ゲーム実機未確認）：** ユーザーの実機フィードバックにより、変更ゼロでもビルタグ画面の「変更内容を確認」を常時表示する。これまで動作確認専用 `komorebi3d:osm-review-storage-check:v1:` は保存・削除のみでゲームに反映していなかった。今回 `maps/osm-review-storage-check.js` の共通コンポーネントへ保存・開放成功後の通知コールバックを追加し、`map-labels.js` 経由で `dev.html` の3D更新に接続。新Geofabrik 2kmの該当OSM要素だけを `patchLiveGeofabrikMap` で局所更新し、開放では元のタグに戻して再生成。ページ再読込時は新JSONの本番未反映差分適用後に動作確認用差分を重畳し、動作確認用元タグをMapに保持する。地図の段階生成中の保存・開放は完了後に再同期する。旧2km、固定Engine、テストOSM送信、正式な `osm-production-pending:v1` は変更しない。保存ボタン成功表示と3D反映成否は区別する。本番OSMへの書き込みは未接続のまま。承認済みモックのボタン配置を変更せず、モックの確認ボタンも常時表示に合わせた。ユーザー希望により専用模擬テストなし。今回の最新ゲームのActions／Pages／Safari実機確認は未実施。

> **2026-11-22 本番OSM確認画面へのlocalStorage動作確認2ボタン接続（main反映／今回のゲームSafari実機未確認）：** ユーザーから前回のmockの実機PASSを受領。承認された共通UI `maps/osm-review-storage-check.js` を実際の `maps/map-labels.js` に導入。「本番OSM」タブで変更したタグを「変更内容を確認」した画面の最上部に「ローカルストレージに保存」「ローカルストレージ開放」を追加し、操作結果を表示。`getReview` は確認画面の下書きだけを渡し、保存先は `komorebi3d:osm-review-storage-check:v1:` の独立したテスト用キー。本番OSM APIへの送信や `recordConfirmedOsmTagChanges` の呼び出しは禁止のまま、正式なGeofabrik反映待ちには影響しない。「テストOSM」タブの確認画面では動作確認2ボタンを非表示にし、既存のテスト環境送信フローを維持。「編集に戻る」でボタンを隠して状態表示をクリア。前回のmock実機PASSと今回ゲーム本体の確認を混同しない。専用模擬テストはユーザー希望により実施せず、Actions／Pages／Safariゲーム実機は未確認。

> **2026-11-22 本番タグ確認画面のlocalStorageボタン（mock先行／ゲーム未接続）：** 本番タグ編集・差分JSON確認までの現行ゲーム画面はユーザー報告で実機PASS。次工程として確認画面の最上部に「ローカルストレージに保存」「ローカルストレージ開放」の2ボタンを追加するモックを作成。`maps/osm-review-storage-check.js` に保存・対象OSM要素の削除・成否表示を共通化し、`mock-ui.js` から利用する。保存先は `komorebi3d:osm-review-storage-check:v1:` で、本番OSM保存成功後だけ記録するStep1の `komorebi3d:osm-production-pending:v1:` と厳密に分離する。OSM API通信・本番保存成功扱い・3Dや黄色反映待ちの変更は行わない。モックのUI表示をユーザーが承認したらゲーム `map-labels.js` の本番確認画面へ同じ共通コンポーネントを接続する。専用模擬テストはユーザー希望により実施せず、GitHub反映・Pages・Safari実機確認は分けて報告する。


> **2026-11-22 本番OSMタブのタグ追加・未送信の差分確認（main反映／Safari実機未確認）：** 本番OSM側の既存編集フォームで「＋ タグを追加」を表示し、変更がある場合「変更内容を確認」を表示するようにした。テストOSMと同じ確認画面に差分JSONを出し、本番側では「確認用の下書きです。本番OSMには送信・保存していません。」と「編集に戻る」だけを表示する。テスト用送信ペインは本番側から開けない。本番OSM APIへの接続やlocalStorage差分登録は行わない。既存テストOSM側の操作と送信機能を維持し、差分計算・入力チェックは純粋な共通モジュール `maps/osm-tag-review.js` へ統合（タグ削除は従来通り未対応）。mock-uiの別ボタンからサンプルのタグ追加・確認フローを確認できる。既存のStep3モック・固定Engineは不変。確認用の下書きは編集画面内でのみ保持し、地図本体・本番OSMへ適用しない。ユーザー要望により専用模擬テストなし。GitHub Actions・Pages・iPhone Safariゲーム実機は未確認。

> **2026-11-22 Step4 テナント一覧にGeofabrik反映待ち黄色警告（main反映／ゲーム実機未確認）：** `maps/map-labels.js` の建物テナント一覧に、本番OSMへの保存成功後に残るタグ差分を店舗のOSM type/idで照合し、黄色背景・左枠＋「⚠ Geofabrik反映待ち」を表示。既存の「⚠ 建物外（外周1m以内・位置要確認）」警告は維持し、該当時は両方表示。対象はGeofabrik新2kmのみ、旧2kmは変更しない。保存済み差分はラベルレイヤー生成時と本番保存成功フックで取得し、毎フレームlocalStorageを読み直さない。表示中の反映待ちが変われば署名差で該当一覧を更新する。OSMテストコピー・未保存ドラフトは黄色表示の根拠にしない。新JSON反映確認後はStep1が保存差分を削除し、次の地図ロードで通常表示へ戻る。既存Step3モックと固定Engineは変更しない。本番OSM送信は別工程で未実装。ユーザー希望により模擬テストなし、Actions・Pages・iPhone Safari動作未確認。

> **2026-11-22 OSMタグ反映待ち Step 3 ゲーム接続（main反映／ゲーム実機未確認）：** ユーザーが実機でPASSを報告した黄色モックのデザインを変更せず、`maps/map-labels.js` に実際のビルタグ編集行との接続を追加。`createMapLabels` は画面ごとの `mapSource` を受け取り、「新2km Geofabrik ＋ 本番OSM表示」の条件でのみ `getPendingOsmTagChange(type,id)` を参照し、保存成功後に残る変更キーのタグ行だけ `syncPendingTagRows` により黄色枠・背景＋「⚠ Geofabrik反映待ち」を表示する。テストOSMに切り替えると警告解除、旧2kmや未保存ドラフトを反映待ちと誤表示しない。タグ行再表示時に差分読み取り、保存成功フックからの `refreshPendingTags()` 呼び出しで開いた編集シートもDOM全再構成なしに警告を更新。Step 1の新JSON取り込み時の反映済み差分削除に伴い、次にタグ画面を開く際は黄色表示も消える。本番OSMの送信処理は未実装。Step 4テナント一覧警告は未実装。モック実機PASSは既報、今回のゲーム本体はActions・Pages・Safari実機未確認。ユーザー希望で専用模擬テストは実施しない。

> **2026-11-22 OSM未反映タグの黄色表示 Step 3（mock先行／ゲーム未接続）：** 既存のビルタグ編集画面と同じダークテーマを使い、変更したタグ行のみ黄色い枠・背景＋「⚠ Geofabrik反映待ち」を表示するデモを `mock-ui.js` に追加。プレビューの開閉と通常状態への切替が可能。独立した表示モジュール `maps/osm-pending-tag-visual.js` は、production＋新Geofabrikの場合のみ該当する変更キーの行を強調し、その他は元の色を維持。mockはゲーム・WebGL・OSM API・localStorageを一切操作せず、サンプルのway/123456を表示するだけ。ユーザー承認後に `map-labels.js` の実際のビルタグ行へ連携する。テナント一覧の警告はStep4。ユーザー希望により専用模擬テストは実施していない。Actions／Pages／iPhone Safariの動作は未確認。

> **2026-11-22 Geofabrik保存差分の3D即時反映 Step 2（main反映／Actions・実機未確認）：** Step 1のOSM version照合後、未反映localStorage差分を新2km JSONのタグへ重畳してから3Dマップを生成し、再読み込み・松戸再入場時にも表示を維持する。map-builderに既存バッチ内の建物別三角形範囲記録を追加。今後の本番OSM保存成功（type/id/version/changes）を受けるゲームAPI `onConfirmedOsmTagSave` から、対象建物の元三角形のみ削除し、周辺の道路・テナントを参照して対象建物を再生成して表示する。node店舗のタグ更新も該当建物外観・タグラベルに反映し、地図読み込み途中の変更は完成後に適用する。旧2km・固定Engine・現行OSMテスト送信機能は変更しない。OSM本番へ送信する機能はまだ無いので、このフックは将来の本番送信実装で接続する。黄色いビルタグ／テナント反映待ち表示はStep 3・4。ユーザー希望により模擬テストなし、Actions・Pages・Safari実機は未確認。


> **2026-11-22 OSM差分localStorage管理 Step 1（main反映／実行確認なし）：** `maps/osm-pending-changes.js` を新設。本番OSM APIで保存成功済みの編集についてのみ呼び出す登録API `recordConfirmedOsmTagChanges({type,id,version,changes})`、取得API、同一OSM要素の差分統合・新version保持、localStorage保存失敗時のメモリ保持＋通知コールバック、Geofabrik新2kmタイル読み込み成功時だけの差分吸収判定と個別削除を追加。`map-loader.js` の新地図検証後にクリーンアップを接続し、旧2kmには適用しない。新JSONのversionが古い／該当要素がない／version一致でも変更タグが一致しない場合は差分を保持。地図JSON全体や形状は保存しない。ストレージ使用件数・容量は表示しない。今回はStep 1のみで、OSM本番書き込み・3D即時反映・タグ行／テナント一覧の黄色警告は未接続。ユーザー希望により専用模擬テストは実施せず。Actions・Pages・iPhone Safari実機は未確認。



> **2026-11-21 キーボード時のJSスクロール補助と終了後のページ位置復元を撤去（main反映／iPhone Safari実機未確認）：** ユーザーの明示指示により、前工程で撤去した「フォーカス時のゲーム画面上端への自動ページスクロール」に加え、`editor-keyboard-layout.js` 内の **キーボード表示時の入力欄シート内自動スクロール、末尾の透明スクロール余白、終了後または編集画面破棄時の `window.scrollTo` によるページ位置復元**を全撤去した。関連する `coveredFieldScrollDelta`、`keyboardTrailingSpace`、`visualViewport.resize` イベント、`focusin/focusout` 管理およびタイマーも撤去。**維持：タッチ入力の `focus({preventScroll:true})`、既存のシート手動スクロール、30/70サイズ・つまみ操作、`?editorDiag=1` の読み取り専用診断。** Safariのキーボード表示・文字入力中のブラウザ標準スクロールをアプリから打ち消したり補正したりしない。関連模擬テスト3件PASS（フォーカス時のスクロール禁止、キーボード開閉時のJSスクロール／末尾余白なし、シート操作、A/Bカメラ）。モジュールキャッシュ更新済み、GitHub Actions／Pages反映・Safari実機検証は未確認。以後のゲーム位置合わせは保留。

> **2026-11-21 ゲームパネルのフォーカス時位置合わせを撤去（main反映／Safari実機未確認）：** ユーザーの明示指示「ゲーム画面パネルを定位置にスクロールする対応は一旦やめる」に従い、`maps/editor-keyboard-layout.js` の `focusin` でゲームパネル上端に合わせて `window.scrollTo` していた処理と `gamePanelTopScrollY` ヘルパーを削除。フォーカスによってページ全体を特定位置へ寄せない。一方、既に良好と報告のあった `focus({preventScroll:true})`、キーボード表示時の入力欄のシート内表示、B案の末尾余白、ゲーム／シートの30/70比、✓後の元ページ位置復元、`?editorDiag=1` の読み取り専用ログはすべて維持。既存のページ位置復元 `restorePagePosition` は「ゲームへスクロール」ではないため削除していない。キャッシュ更新を実施、JavaScript模擬回帰3件PASS（フォーカス時にページ移動なし・キーボード中の末尾余白・シートジェスチャー・カメラ）。GitHub Actions／GitHub Pages配信／iPhone Safariの最新変更の動作は未確認。**今後のゲーム上端への位置合わせは保留。**

> **2026-11-21 タグ入力時のフォーカス元を診断ログへ追加（main反映／Safari実機未確認）：** 前回の実機ログではフォーカスが短時間に2回発生したが、左キー→右の値だったか別行への移動だったか断定不能。ユーザー指示で **診断モード `?editorDiag=1` のみ**、`pointerdown` の押下対象と `focusin/focusout` の対象をそれぞれ `rowN:left-key` / `rowN:right-value` として記録し、`active=` も同じ形式で追加。これまでの画面座標ログは維持し、タグ名や値、文字入力内容、OSMデータは取得しない。編集画面・フォーカス・スクロールの通常動作は変更せず、診断モジュールのキャッシュ更新のみ。模擬イベント/座標回帰テストPASS、Safari実機とPages配信は未確認。次は上に見切れた状態からタップして `pointerdown` / `focusin` の組み合わせを確認する。

> **2026-11-21 ビルタグのフォーカス時にゲームパネル上端を画面上端へ寄せる（GitHub main反映／iPhone実機未確認）：** ユーザーから「B案の下段タグ用キーボード限定余白は良好。最後に入力欄へフォーカスした瞬間、ゲーム画面パネルを画面の一番上へ通常スクロール（固定なし）」と指示。 `maps/editor-keyboard-layout.js` の `focusin` で対象入力欄が切り替わったときだけ `game.closest('.landscape-game')` の`getBoundingClientRect().top`と`visualViewport.offsetTop`からページスクロール先 `Math.max(0,round(window.scrollY+gameTop-vvTop))` を計算し、必要な場合だけ `window.scrollTo(window.scrollX,targetY)` を**一度だけ**実行。ゲーム本体・Canvas・親パネルのposition/heightは変更せず、`fixed`も使用しない。文字入力時や`VisualViewport.resize/scroll`時にゲーム位置補正を反復しない。先に実機PASS報告されたフォーカス時`focus({preventScroll:true})`、キーボード中だけのシート末尾余白、入力欄の必要最小限の内部表示、A/Bカメラ、つまみスワイプ、✓後の元ページ位置復元を維持。モジュールキャッシュ更新済み。ページ位置423・ゲーム上端-203→位置220・ゲーム上端0、および重複フォーカス・入力・別フィールドへの移動の模擬回帰テストと既存スワイプ・カメラ試験3件PASS。**GitHub Actionsの公開結果とSafari実機確認は未確認。**

> **2026-11-21 松戸・下段タグがキーボード上までスクロールできない問題：B案（main反映／Safari実機未確認）：** ユーザー実機では上段・中段の入力挙動は概ね良好だが、下段タグは70%シートの末尾でスクロール余地がなく、キーボードの上まで上がれない。合意した対策は**キーボード表示中だけシート末尾に透明なスクロール余白を追加し、キーボード終了時に取り除く**方式。 `maps/editor-keyboard-layout.js` が、`visualViewport` の上に重なるシート下端の隠れ部分（`sheetRect.bottom - (vv.offsetTop+vv.height)`）＋24pxだけ、`aria-hidden` の空divを`form`末尾に追加する。実測座標（`sheetBottom=495, viewportBottom=313`）なら余白206px。追加はresize/focus時の既存`requestAnimationFrame`内で行い、キーボードを閉じるか編集を閉じると削除。**ゲーム・ボトムシートのposition/height、A/Bカメラ、フォーカス時の`preventScroll`、従来の「隠れている入力欄だけシート内部で表示する処理」は変更しない。新たな自動スクロール・scrollTo打ち消しは追加しない。** JavaScript模擬試験3件PASS（下段のスクロール範囲拡大、再開閉、既存グリップ、A/Bカメラ）。GitHub Actions/Pages配信とiPhone Safari実機の効果は未確認。次は下段タグを操作できる位置まで手動でスクロールできるかを確認。

> **2026-11-21 松戸・文字入力でページが39px動く原因と修正（main反映／iPhone実機再確認待ち）：** ユーザー実機の `?editorDiag=1` ログで、`focus({preventScroll:true})` の効果によりフォーカス時は `scrollY=423` のまま。キーボードが開くと `VisualViewport.height=313` だが `name` 入力欄の `bottom=362` で49px隠れた状態。文字入力直後の `page-scroll` で `scrollY=423→462`、`VisualViewport.offsetTop=0→39`、`sheet.scrollTop=0` のまま、ゲームとシートも39px移動。**ブラウザの入力カーソル表示のための自動ページスクロールが強い原因と判断。** 対応は文字入力後の`scrollTo`打ち消しや`fixed`ではなく、`visualViewport.resize`でキーボード領域が確定したときに**入力欄の底が可視領域を越えた分だけシート内を1度スクロール**。実測例は `362-(313-24)=73px`（24px余裕）。一律にタグをシート最上段へ寄せる旧③は復活させず、入力欄が隠れていないならスクロールしない。フォーカス時の `preventScroll`・ゲームパネル100%＋下から70%シート・A/Bカメラ・つまみ操作・✓後の元ページ位置復元を維持。スクロールイベント・`input`イベント内での再補正は行わない。診断には`sheetScrollMax`を追加。JavaScript模擬テスト3件PASS（旧スクロール抑制・新しい73px補正・スワイプ・A/Bカメラ）。**GitHub Actionsと実機Safariで文字入力スクロールが止まったかは未確認。**

> **2026-11-21 松戸ビルタグ入力：Safari自動スクロール切り分け実験（GitHub main反映／実機未確認）：** ユーザーの実機では、タグ行を70%シート内で上へ寄せる③のJS処理が効かず、Safariがフォーカス時にページ全体を自動スクロールすることが優先課題。**原因を分離するため③は完全撤去**（`sheet.scrollTop` の自動変更・`focusedTagRowScrollDelta`・`editorMotion` の更新連動を廃止）。ゲーム100%上へ下から70%のシートを重ねる通常仕様、A/Bビルプレビュー30%、つまみスワイプ、ゲームパネル通常配置は維持。今回の単独実験は、タッチ入力開始時に対象入力へ同期的に `focus({preventScroll:true})` を適用し、プログラムからの既存タグ値フォーカス・新規タグフォーカスも同オプションへ変更。タッチイベントの`preventDefault`、`position:fixed`、ページ`scrollTo`連続補正は使用しない。Safari/WebKitはスクリプトによるフォーカススクロール禁止をサポートするが、**iOSキーボード表示によるVisualViewport移動・ページ自動スクロールまで必ず停止できるとは限らず、実機検証待ち**。従来のキーボード終了後のページ位置復元は維持。コード構文／JS模擬試験はPASS、ただしGitHub Actions/Pages配信・Safari/ChatGPT内ブラウザ実機の効果は未確認。さらに症状が残る場合は既存`?editorDiag=1`で`window.scrollY`と`visualViewport.offsetTop`を区別して測る。

> **2026-11-21 GitHub Pages deploy実行失敗の原因調査・ジョブ分離（main反映／新実行の公開成否未確認）：** [Actions実行 #44852925924](https://github.com/shuma-fujita/komorebi/actions/runs/44852925924) の生ログでは、構文・UI・回帰テスト・成果物アップロードはすべてPASS、`actions/deploy-pages@v4` が同一runでアップロードした `github-pages` アーティファクトを最初は0件と判定し失敗。失敗ジョブを再実行すると、同run内の旧成果物と新成果物が2件となり、複数存在エラーで再失敗。アプリ修正ではなく、**ビルドとデプロイを別jobへ分離し `deploy.needs: build` でアップロード完了への依存を明示**した。GitHub mainへのワークフロー変更は反映、変更コミットが新しいrunを生成する。新runのActions成功／GitHub Pages実際の公開は未確認。EngineやUIやゲームには未変更。

> **2026-11-21 ビルタグ編集・iPhoneキーボード中の高速画面往復を原因再現して修正（GitHub main反映／実機再確認待ち）：** ユーザー実機スクショで、nameフォーカス中にA/B建物プレビューが2つの位置を高速で交互表示し入力欄が見えない問題を確認。直前のパネル内シート方式で新設した `editor-keyboard-layout.js` は、`window.scroll`/`visualViewport.scroll` のたびに `window.scrollTo(scrollY+gameTop-vv.offsetTop)` を実行。Safariのページスクロールに応じ `visualViewport.offsetTop` が変わる条件を**実コードで模擬**すると、`scrollY=52→380→52→380…` の連続往復を再現できた。修正は**キーボード表示中のJSによるページスクロール補正を完全撤去**し、Safariのスクロールへ追従する。キーボードサイズ変化後90ms落ち着いてから選択中タグ行をシート内部で中央寄せし、入力欄が画面外の場合だけ標準 `scrollIntoView` をフォーカスごとに一度呼ぶ。✓後のキーボード消失時は元のページスクロール位置へ戻す。ゲームパネル/Canvas/host の位置・高さは不変で、ボトムシートはゲームパネル内、形状は `sheet-motion.js` の単独管理、つまみの上下スワイプ継続、追加ボタンなし。リグレッションテストを `vv.offsetTop` 連動時でも編集中に `window.scrollTo` が発火しないこと／連続位置往復しないこと／入力欄の一度限りのブラウザ標準スクロール／✓後復元／ゲームスタイル不変へ修正し、JavaScript模擬テスト2件PASS。**GitHub Actionsの実行結果、GitHub Pagesデプロイ完了、SafariおよびChatGPT内ブラウザ実機改善は未確認。**


> **2026-11-21 iPhone実機スクショで✓後の表示不具合を再確認・編集セッション固定へ設計変更（main反映／実機再確認待ち）：** 先の数値ログは `scrollY`・`gameTop` の開閉前後一致を示したが、ユーザーの実機スクショでは✓後に開発情報パネルが上部に露出しA/Bゲームが下に移動しており、見た目は未修正。原因は `editor-keyboard-layout.js` が**フォーカス中だけゲームをfixedにし、キーボード✓で編集画面がまだ開いているにもかかわらずゲームを通常フローへ戻す**ライフサイクル設計。スクロール差分を戻すだけでは解決しないため、編集開始時から編集画面を閉じるまでゲームをviewport上部に固定し、✓ではタグシート高さとスクロールだけを復元、終了時のみ通常フローへ戻す構成に変更した。body固定は使わず、背景パネルや親overflow・エンジン・地図・OAuthには変更なし。テストを更新し、「編集開始時の固定／キーボード中／✓後も固定／入力切替／編集終了時だけ解除／キーボード中に閉じた場合の遅延解除／デスクトップ非固定」をJS検証でPASS。**iPhone Safariで表示が正しくなったことはまだ確認していない。**

> **2026-11-21 iPhoneビルタグ編集・実測ログに基づくスクロール復元修正（main反映／Safari実機未確認）：** `?editorDiag=1` のSafari数値ログで、編集開始時 `scrollY=495 / gameTop=-131`、キーボード中 `scrollY=753 / vv.offsetTop=258 / vv.height=313`、✓後1.5秒経っても `scrollY=753 / gameTop=-389` と記録。ページの自動スクロール +258px とゲームの上方向へのずれ -258px が一致。旧実装は `focusout` 直後（まだキーボード表示中）のrAFでゲームの `fixed` を解除し、スクロールを復元しない。対策として `editor-keyboard-layout.js` が入力フォーカス開始時のページX/Y・visualViewport値を保存し、`focusout` 後のviewport回復を待ってゲームの通常配置とページ位置を同じフレームで復元する。入力欄の切り替えでは解除しない。編集画面を直接閉じた場合も、viewport回復後にページ位置を戻す。以前不具合を起こした `body{position:fixed}` は再導入しない。実測値に対応する回帰テスト（495→753→495、入力切替・直接閉じ）を追加し、`map-labels.js` と `dev.html` のモジュールキャッシュを更新。**コード反映済み。Actions自動テスト・GitHub Pagesデプロイの成否とiPhone Safari実機PASSは未確認。**

> **2026-11-21 ビルタグ編集のiPhoneキーボード不具合：前回修正を切り戻し・実測調査中：** ユーザーの最新実機3枚で、①編集画面を開くと背景ページが固定されて操作できず、②name欄フォーカス後に入力欄が隠れ、③✓後にゲーム画面が想定位置へ戻らないことを確認。直接原因の一つは前回 `maps/editor-keyboard-layout.js` に追加した、**編集画面を開いた時点での `body{position:fixed;top:-scrollY}`**。ゲームが画面下側にあるとタグシートも画面外に固定され、使用可能なシート高さの計算からgameTopが大きく差し引かれる。この実験的なbody固定・相対top補正・overflow変更を撤去し、前段階の「入力中だけゲームfixed／タグ行を中央寄せ／blurで元に戻す」挙動へ一旦切り戻した。ただし**✓後の位置ずれは未解決**。再び推測で位置補正を加えないため、`?editorDiag=1` の時だけ `maps/editor-keyboard-diagnostics.js` を動的読み込みし、実機で window.scrollY / visualViewport / ゲーム・親スロット・編集シートの座標を数値記録する。入力値やタグ文字列は記録しない。通常のゲームでは診断UIなし。`tests/editor-keyboard-layout.mjs` はページ固定の残留を防ぐ単体テストに変更。**自動テストPASSとSafari実機PASSは別。調査ログ取得後に根本設計を確定する。**

> **2026-11-21 mock先行の共通UI正本へ再構成（GitHub反映／新方式実機未確認）：** ユーザーの要件定義は**mockでUIを先に作り、承認したUIをゲームへ反映**する順序。Git履歴から、従来の`build-dev.mjs`は共通パネル・CSSからdevとmockを構成する意図だったと確認。現行iPhone PASS版のゲーム表示に合わせ、`panels/test.html`から廃止済み店舗表示UIを撤去して本体と一致、`layout.css`のゲーム正本にない旧CSSを整理。`page-shell.html`・`panels/*.html`・`common.css`・`layout.css`・`theme.css`・`panels/*.css`から生成した共通CSS・パネルHTMLが、現行`dev.html`と**文字列完全一致**することを検証。新`komorebi3d/build-ui.mjs`の`--mock`で共有UIから黒い非描画mockだけを生成、`--sync-dev`で承認後に**dev.htmlのCSSとパネルHTMLのみ**同期（ゲームJS・Engine・OAuth・地図読込は触れない）、`--check-mock`/`--check`で同期検証。ゲーム固有Canvasをmockへ入れず、mock固有JavaScriptは`mock-ui.js`。Pages Actionsは`--check`のみで**HTMLを書き換えず**、OAuth Secretsからの配信用Client ID設定は継続。不要となった旧`build-dev.mjs`は削除し、`komorebi3d/README.md`に手順を明記。ワークフロー更新SHA `bf6dbc8`のActions `44831324731` **Success**（UI両ページ整合・Secret注入・Pages公開）。ユーザー報告の従来iPhone Safari起動・OAuthログイン・A/B選択枠揃え実機PASSは保持。**今回の新方式のiPhone Safari実機確認は未実施**。

> **2026-11-21 A/B地図選択ボタンの枠ずれ修正（GitHub反映／Safari実機未確認）：** iPhoneスクショで旧2km・新2km（Geofabrik）の選択枠が縦方向に食い違うことを確認。原因は `inline-flex` のラベルが1行テキストと2行テキストで異なるベースラインに揃っていたこと。`dev.html` の地図ソース選択用ラベルを `vertical-align:top` にして枠の上辺を一致させ、双方 `height/min-height:52px` と文字中央揃え・Geofabrikの改行を維持。共通 `panels/test.css` と生成 `mock.html` も同期。radioの旧/new値、地図処理、3D、OAuth、mock黒画面・エンジン非起動は変更なし。**Actions・Safari実機の表示は別途確認**。

> **2026-11-21 A/B地図選択の高さ・中央揃えを統一（GitHub反映／実機未確認）：** ユーザー指摘の「新2km（Geofabrik）」だけ高さが違って見える問題に対し、`dev.html` と共通断片 `panels/test.css` の地図ソース選択用radioラベル（旧2km／新2km双方）を `height/min-height:52px`、縦横中央揃えにした。既存2行の「新2km」「（Geofabrik）」は維持して文字を中央揃え。mockを正本から再生成して同期。地図ソース値、3D、OAuth、mock黒画面・非描画を変更なし。**Actions・実機での最終見た目確認は別途必要。**

> **2026-11-21 A/B地図選択ラベルのはみ出し対策（GitHub反映／Safari実機未確認）：** iPhone実機スクショでA/B比較の「新2km（Geofabrik）」が横にはみ出すことを確認。`dev.html` の地図データ選択A/B双方で「新2km」と「（Geofabrik）」を2行に分けるspanと限定CSSを追加。旧／新ソースのradio値、地図読み込み処理、3D、OAuthは変更なし。共通UI断片 `panels/test.html` と `panels/test.css` にも同表示を同期し、`mock.html` を正本 `dev.html` から再生成。mockゲーム領域は黒・Canvasなし・エンジン実行なしを維持。静的HTML確認済み。**GitHub Actionsによる公開チェック・Safari実機での表示は別途確認**。

> **2026-11-21 mock／ゲームUI二重管理解消（GitHub反映／Safari実機確認待ち）：** `komorebi3d/dev.html` を唯一のゲーム・共有UI正本として維持（ゲーム本体の変更なし）。`build-dev.mjs` をmock専用で再設計し、`dev.html` の共通レイアウト・全パネルのHTML・CSSから `mock.html` を生成する方式へ変更。ゲーム表示部分のみ黒いダミー領域＋`panels/game.touch.html`へ置換し、dev専用起動診断を除外。mock固有のUI操作コードを `mock-ui.js` に分離し、旧 `mock.template.html` を削除。生成結果のmockにはゲームCanvas 0個・ゲーム実行スクリプト0個・黒い画面用CSSあり。Pagesワークフローに `node --check` と `node komorebi3d/build-dev.mjs --check` を追加し、mockがdevのUI正本とズレていたら公開前に停止する（**ゲームdev.htmlは再生成しない**）。Secretsから公開用OAuth設定ファイルを生成する仕組みは維持。ゲーム固定Engine・森林・2km地図原本・PKCE・OSMタグ送信コードは不変。従前のユーザー報告iPhone Safariゲーム起動＋テストOAuthログイン実機PASSは保持。**新mock画面の実機動作・今回のPages公開版とActionsのPASSは、別途確認が必要。**

> **2026-11-21 devゲームの二重管理撤去（GitHub `main` 反映／新構成実機未確認）：** ユーザーの明示了承のもと、唯一のゲーム正本は `komorebi3d/dev.html` として固定。以前にPagesワークフローから `node komorebi3d/build-dev.mjs` のdev再生成ステップを削除済み。今回は残っていた `komorebi3d/dev.template.html` を削除し、`komorebi3d/build-dev.mjs` を**モック専用**に変更（`--mode=mock` または引数なしで `mock.template.html` → `mock.html`、`--mode=dev` は拒否）。将来、旧Overpass・旧地図ロジックがテンプレートから再復活する経路を除去。`komorebi3d/README.md` に運用明記。ゲーム正本 `dev.html`・`mock.html`・固定Engine・森林・地図JSON原本・OAuth PKCE・Client ID Secrets注入・Pages公開方式は変更しない。前段階でユーザー報告のiPhone Safariゲーム起動＋OSMテストOAuthログイン実機PASSあり。**今回のActions結果・今回の新構成のiPhone Safari実機再確認は別途確認。**

> **2026-11-21 `dev.html` 単一正本のPages配信へ移行（main反映／新構成の実機検証待ち）：** ユーザー了承のもと、`.github/workflows/deploy-komorebi-pages.yml` の `node komorebi3d/build-dev.mjs` を撤去し、Git管理の `komorebi3d/dev.html` を再生成・上書きせずそのまま `_site` へコピーして公開する方式に変更。従前、`dev.template.html` に残っていた削除済みOverpassモジュール参照が公開時に復活し、iPhone Safariで水色画面／404になっていた。2km A/Bへテンプレート整合した後、ユーザーが**iPhone実機でゲーム起動PASS**および**OSMテスト環境OAuthログイン成功**を報告。今回の変更で固定Engine・森林・地図原本・ゲーム本体・OAuth PKCE/S256・`OSM_TEST_CLIENT_ID` Secretsから公開アーティファクトへの設定生成は不変。テンプレート・ビルドスクリプト・`mock.html` は依存調査を経て後日整理し、今回は削除しない。**今回のGitHubコード変更反映と、Actionsデプロイ・新構成のSafari実機PASSは別途確認する。**

> **2026-11-21 水色画面の404原因に対応（2km A/B正本へのテンプレート整合／実機未確認）：** Safari実機診断で `maps/map-overpass-diagnostic.js` HTTP404 が判明。原因は削除済みOverpass診断ファイルを `dev.template.html` が静的importし、Pagesビルド時に正常なGit管理版 `dev.html` を古い内容で上書きしていたこと。ユーザーの合意に従い、`dev.template.html` から旧250m/500mライブOverpass／手動診断のimport・呼び出し・Game API公開を撤去し、現行 `dev.html` の**旧OSM 2km(A)／新Geofabrik 2km(B)** 読み込み・初期設定・地図ログ表示へ整合。`dev.html` は既に2km正本なので変更せず。固定Engine、森林、地図JSON原本、OSMテストOAuth・PKCE、GitHub Pagesワークフローは変更なし。**GitHub反映済み、静的整合チェックPASS。Actions／Pages配信／iPhone Safari起動は未確認。** 次は最新Actionsのデプロイ成否を確認し、成功後にiPhone Safariで水色画面・404が消えたか検証する。Actionsアップロード後の成果物取得失敗は独立問題として継続調査。

> **2026-11-21 iPhone Safariの水色画面／JavaScriptリソース読み込み失敗の診断改善（main反映／実機確認待ち）：** ユーザー実機で `診断：JavaScript読み込みエラー：リソースを読み込めませんでした` が表示されゲーム未起動。原因ファイルは未特定。許可を得て `dev.template.html` と生成版 `dev.html` の**診断スクリプトのみ**を更新。ゲームモジュール開始フラグ、読み込み失敗URL・イベントエラーの記録、未開始9秒後の直接import一覧取得・HTTP/CORS/タイムアウト/Content-Type確認を追加。画像など無関係な読み込みエラーは起動停止原因と見なさない。固定Engine参照・レンダリング本体・OAuth/PKCE・地図原本は不変。**GitHub反映／静的参照整合性確認済み。Actions、Pages反映、iPhone Safariでの実際の診断表示・起動は未確認。** 次はデプロイSuccess後にSafariの診断メッセージ全文を確認し失敗先を絞る。


> **2026-11-21 現在地：OSMテストOAuth共通Client ID方式（Actions PASS／iPhone Safari未確認）：** GitHub Pagesの公開元をGitHub Actionsへ切り替え、管理者が `OSM_TEST_CLIENT_ID` Secretを登録済み。ユーザー指定のrun [44799224347](https://github.com/shuma-fujita/komorebi/actions/runs/44799224347) は全ステップ成功。その後、iPhone Safariの「ゲーム画面が水色のまま／診断：JavaScript未実行」報告を受け、OAuth設定ファイルをゲーム起動時の静的importから切り離し「テスト環境へログイン」押下時だけ動的importに変更。モジュール初期化前の診断表示も追加し、失敗時にエラーの手がかりを残す（mainに反映）。この修正を含むrun [44800013029](https://github.com/shuma-fujita/komorebi/actions/runs/44800013029) は **Success**。Client IDはGit履歴へ保存せず、公開アーティファクト側だけへ書き込む（ブラウザでは公開識別子として閲覧可能）。コピー・level送信のClient ID入力欄と個人OAuthアプリ登録リンクは撤去、認証は共通Client ID＋PKCE/S256・state照合・固定redirect・sessionStorageを維持。本番OSMへは書き込まない。**配信ビルド成功は確認済みだが、公開ページの実ブラウザでの起動・OAuthログイン・テスト環境コピー・iPhone Safari実機PASSは未確認。** 次は新しいSafari表示の診断文言とゲーム起動、認証、コピーを順に検証する。セットアップ：`docs/OSM_TEST_OAUTH_SETUP.md`。固定Engine／地図原本は変更していない。

> **2026-11-21 iPhoneキーボード表示時のA/Bプレビュー上端の間欠的な空白対策（main反映／Safari再確認待ち）：** 実機PASS報告と画像で、ゲーム枠内の右上ヘルプアイコンよりA/Bキャンバス上端が下がり隙間が出る症状を確認。`editor-keyboard-layout.js` はキーボードフォーカス時に外側 `.landscape-game` をfixed化する一方、子 `#play-surface` はflexの高さ・中央揃えに依存していた。iOS VisualViewportの非同期リサイズ時に親子の高さが不一致になり上端がずれる仮説に基づき、**入力フォーカス中だけ** `#play-surface` を `position:absolute; inset:0; width/height:100%` で枠上端に固定。元のinline styleを保存しフォーカス解除・editor終了で復元。外側キャンバスの形状、A/B比率30:70、3Dカメラ、OSM認証／送信処理は不変。`map-labels.js`・`dev.template.html`・生成済み`dev.html` のキャッシュキー更新。**コード反映済み、発生条件の完全な再現・iPhone実機の改善確認は未完了。**


> **2026-11-21 ビルプレビューの可変比率・最大フィット計算修正（main反映／実機未確認）：** `maps/building-editor-preview.js` の従来の上下投影距離計算は、上部プレビュー比率に応じたカメラの投影中心移動を完全に反映しておらず、回転中の見切れや必要以上の余白につながる可能性があった。ビルの幅・奥行き・高さから得た外接直方体8頂点が360°のどのyawでも上部の比率 `p`（30%／40%／50%／60%）内に収まり、かつ回転中は距離を一定に保つ解析的な最小距離へ変更。縦方向の上／下の画面境界・横方向の左右境界・近クリップ距離を独立に評価し、最大の必要距離を採用。`BUILDING_PREVIEW_RATIO` は現在0.3、A/Bの共通カメラと拡大縮小操作は維持。`tests/building-editor-fit.mjs` に比率・アスペクト比・建物形状・360°での投影中心／見切れ／最小余白／固定距離の回帰テストを追加し、`dev.template.html` と `dev.html` のJSキャッシュ参照を更新。**独立の幾何シミュレーションで4比率・複数形状・360°角度の投影と余白を確認PASS。追加Nodeテストの実行、GitHub Actions、iPhone Safari実機は未確認。**


> **2026-11-21 編集ビル3Dの画面比率対応センタリング（main反映／実機未確認）：** `maps/building-editor-layout.js` に `BUILDING_PREVIEW_RATIO=0.3` を定義。`building-editor-preview.js` の従来50:50固定カメラ（全キャンバスの25%にビルを表示）を、画面上のプレビュー比率 `p` に応じた上部可視領域の中心 `p/2` に投影する方式へ変更。視野範囲の縦フィット計算も `p` から導出。`map-labels.js` のプレビュー領域・タグシート、`sheet-motion.js` のドラッグ境界、`editor-keyboard-layout.js` のキーボード処理も共通比率に統一。30:70／40:60／50:50／60:40を想定したカメラ中心・回転・ズームの回帰テストとキーボードサイズテストを追加。`dev.template.html`・生成済み`dev.html`のモジュール参照を更新。OSM本番／テスト送信・固定Engine・マップ原本は変更なし。**GitHub反映済み／Nodeテスト実行・GitHub Actions・Safari実機は未確認。**


> **2026-11-21 OSMコピーOAuth未認証警告の表示位置修正（main反映／実機未確認）：** 「Komorebi側のOAuth認証が未完了です…」を従来のコピー途中ステータス表示から切り離し、「確認してコピーを作成」の直下に独立したエラー枠で表示。タグ追加後のテストOSM送信失敗と同じ `komo-osm-feedback[data-status-kind=error]` を使用。表示中だけ赤枠とし、認証再試行・コピー再試行で解除。認証・送信ロジックは変更なし。`building-tag-editor-theme.js` に非表示時のスタイルを追加、`map-labels.js` / `dev.template.html` / `dev.html` のキャッシュキー更新。**実機Safari・Actions・実OAuth未確認。**


> **2026-11-21 ビルタグ編集30:70へ変更（main反映／Safari実機未確認）：** A/Bビルプレビュー30%、タグ編集70%へ変更。`map-labels.js` のプレビュー操作面とフォーム初期高さ、`sheet-motion.js` のドラッグ／スナップ基準、`editor-keyboard-layout.js` のキーボード時の30%プレビュー維持と70%シート上限を一貫して更新。キーボードが表示されたら残余領域にタグ編集を収める（不足時にプレビュー比率を変える別の計算は追加しない）。`dev.template.html`・生成済み`dev.html`・テスト・開発情報の参照更新。OSM保存・A/Bビルモデル・固定Engineは不変。**GitHub反映済み、実機表示・キーボード補助バー重なりの解消は未確認。**


> **2026-11-21 ビルタグ編集画面の40:60比率（main反映／実機未確認）：** 編集時のA/Bビルプレビュー上40%、タグボトムシート下60%へ変更。`map-labels.js` の操作領域／初期表示、`sheet-motion.js` の通常位置・ドラッグ境界、`editor-keyboard-layout.js` のキーボード時のプレビュー保持寸法とタグ領域の上限、`dev.template.html` と生成版 `dev.html` のキャッシュキーを更新。キーボード表示中はビルプレビュー40%とキーボード上の残余タグ編集領域を目指す。**キーボード表示中に画面が押し上げられる問題が解消したかはSafari実機未確認。**


> **2026-11-21 OSM編集中のビル3D左右比較を実装（main反映／実機未確認）：** ビルタグ編集画面で A=修正前のオリジナルプレビュー固定、B=編集中のタグに応じたプレビューを生成。`map-labels.js` に `onEditorDraftChange` を追加し、キー・値がそろったタグの `input` イベントから（フォーカス移動・確定不要で）編集内容を発行。未入力値は元データに戻すか新規キーを除外。`dev.html`/`dev.template.html` は元建物と店舗リストを保持し、右側だけ `requestAnimationFrame` で同フレーム内の変更をまとめて `createBuildingEditorPreview(...,draft)` 再生成。左は再生成なし、左右同じカメラパラメータで回転・ズーム同期、変更後の高さが増えたときは両画面のカメラ距離を共通化。`building-editor-preview.js` は対象OSM店舗nodeのタグのみを複製上書きし、`level` の0基準を維持して（例 level=1は2階、level=10は11階）必要に応じて右建物の高さと建物階数をプレビュー内だけで拡張。既存のコンビニ壁面階層塗り分けに反映。建物wayのタグ編集も右側へ反映。生成3Dのrevision IDを更新。元のOSMデータ、本番・テストサーバー送信条件・エンジンは変更なし。dev.templateとdevの機能対応。**JS構文PASS／モックのlevel=0→4m、level=1→8m、level=10→44m・11階、ソース不変・メッシュID一意PASS／実機Safari、コンビニ外壁レンダリング、Actions未確認。**


> **2026-11-21 OAuth／OSMテスト送信エラー表示の可読性修正（main反映／実機未確認）：** iPhoneのビルタグ編集シートで「認証開始エラー: 開発用OSM OAuthアプリのClient IDを入力してください。」が薄桃色背景と淡い文字になり読めない件を修正。原因は `map-labels.js` のインライン色指定がダークテーマの `.komo-copy-pane p` / `.komo-review p` の `!important` カラーに負けること。`decorateStatus` は `data-status-kind=error/normal` を更新するだけにし、`building-tag-editor-theme.js` に暗赤背景・明るい文字・赤系枠線のエラー専用CSS（`!important`）を追加。コピー作成・認証・テスト送信エラーに共通適用、通常メッセージはテーマ色に。`map-labels.js` と `dev.html` / `dev.template.html` のモジュールキャッシュキー更新。OAuth認証・コピー・level送信のロジックは変更なし。**JS構文・参照・CSSの静的チェックPASS／実機SafariとActions未確認。**


> **2026-11-21 テストOSM OAuthリダイレクト先固定（main反映／OAuth実認証・実機未確認）：** `maps/osm-test-api.js` の `redirectUri()` は従来 `location.origin+location.pathname` でアクセスした画面パスに依存していた。開発用OAuthアプリに登録するコールバックURLを **`https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html`** に固定（`OSM_TEST_REDIRECT_URI`）。PKCE `state` と `code_verifier` のセッション保持、認可リクエストの `redirect_uri`、トークン交換の `redirect_uri`、コールバックURL照合の各処理で同じ固定URLを使用。別ドメインから開始した場合はsessionStorageが引き継げないため説明付きエラーにする。OAuth認証後の `code/state` は従来どおり履歴から除去。`maps/map-labels.js` と `dev.html`/`dev.template.html` のキャッシュキー更新。テストOSM以外への送信・書込仕様は変更なし。**JS構文・静的連携確認PASS／実際の外部OAuth認証・テスト環境コピー・Safari実機・Actionsは未確認。**


> **2026-11-21 OSMタグ編集画面の表示順設定を実装（main反映／実機未確認）：** 新規 `komorebi3d/maps/osm-tags.order` で `name`、`name:ja`、`name:en`、`name:*`、`level` の順に優先表示。未一致項目および同一ルール内は元のOSMタグ登録順を維持。`*` は任意長文字列で、`addr:*` や `*:name` のような将来のルール追加に対応。新規 `maps/osm-tag-order.js` にルール解析・安定優先順位ソート・初回1回の設定取得（取得失敗時は元の順）を実装。`maps/map-labels.js` の編集UI `renderTags()` のみでソートし、本番OSMとテストOSMの全タグを削除せず表示。OSM保存・認証・level追加制限・通常ゲームのビルタグ表示・A/B・3段階シート・ビル回転操作は変更なし。`dev.html` と `dev.template.html` のモジュールキャッシュキー更新。**JavaScript構文・優先順・元順維持・ワイルドカード・元データ不変の模擬テストPASS／実機Safari・Actions未確認。**


> **2026-11-21 未使用OSMタグignore機能の完全撤去（main反映／実機未確認）：** `komorebi3d/maps/osm-tags.ignore` を削除し、`maps/map-labels.js` の `parseOsmTagIgnore`・`loadOsmTagIgnore`・`visibleOsmTags`・`ignoreRules` 受け渡しを撤去。タグチップは現在の通常ゲームの建物＋店舗一覧で非表示になっていたため、生成ループ・`visibleTags` 保存・ヘッダーDOMも削除（建物名・店舗名・編集ボタンの動作は維持）。`dev.html`／`dev.template.html` の初期地図読込とA/Bソース切替からignoreファイルのフェッチを撤去し、A/B切替では直接ラベル再構築を呼ぶ。ネオンOSMタグ編集シートは元々 `baseTags` の全タグを直接表示するため影響なし。本番／テスト切替、保存安全策、ビル自動回転・表示抑制フラグ等は維持。**JS構文とignore参照0件・編集全タグ経路の静的確認PASS／Actionsと実機Safari未確認。**


> **2026-11-21 ビルタグ表示フラグの処理簡素化（main反映／実機未確認）：** この機能は既存不具合の修正ではなくユーザー指定の要件追加。通常マップで「空白または表示中の同じビルをタップ→非表示ON」「ビルをタップ→非表示OFF＋表示」「非表示中はカメラ角度で自動復帰しない」という条件のみ。`maps/map-labels.js` の `tagHidden` は真偽値だけを描画更新時に確認し、ビル識別子は既存の「同じビルの再タップ判別」に必要な比較のみ使用。非表示設定時に `viewport.items` を全件走査して非表示化していた冗長処理を削除し、現在表示中の `summary` のみ即座に隠す。A/B状態同期と遅延生成時のフラグ継承は維持。`dev.html` と `dev.template.html` キャッシュ更新。**構文・静的確認PASS／実機・Actions未確認。**


> **2026-11-21 通常ゲームのビルタグ非表示フラグを永続化（main反映／実機未確認）：** `maps/map-labels.js` の以前の `manuallyHiddenKey`/`hiddenAtCameraKey` は、カメラが別ビルに向くと非表示状態を勝手に解除していた。これをID非依存の `tagHidden` に置換。ビルタグ表示中の同じビル再タップで非表示（従来動作維持）、ビル外・地面等の空白をタップしても非表示、フラグオン中はカメラを別ビルに向けても自動表示しない。任意ビルのタップでのみフラグ解除し、そのビルを表示。既存タグカードは非表示に切り替えた瞬間に消す。`dev.html`/`dev.template.html` に共通 `buildingTagHidden` と全A/Bレイヤー同期を追加。マップ読み込み遅延で新しく作ったラベルレイヤーにもフラグ継承。タップの8px移動許容と操作対象除外（タグカード／テナント一覧）、ビルプレビュー、ヘリ操作は保持。**JS構文・フラグ遷移の模擬試験PASS／iPhone Safari/ChatGPT内ブラウザ実機とActions未確認。**


> **2026-11-21 編集中に別ビルのネオンタグが混入する追加原因を修正（main反映／実機未確認）：** ファミマの編集A/Bプレビューで「第2日発ビル／磯丸水産」の通常ラベルが表示された実機報告を受け、`dev.html` と `dev.template.html` の `applyMatsudoScreenLabels` を修正。これまでは編集開始時に存在する `matsudoLabels.A/B` のみに `setPreviewActive(true)` を適用しており、非同期地図読み込みや画面初期化によって**編集開始後に新規生成されるラベルレイヤー**は初期値 false で通常タグを出せた。今後は新しいレイヤーを生成した直後に `setPreviewActive(activeOsmEditors>0)` を適用し、編集モードを常に継承。既存の `map-labels.js` のレイヤー一括非表示・通常時復帰と合わせてA/B双方の遅延生成をカバー。タグ編集、30秒/周の自動回転、タップ停止／再開、3段階シート、iOSスクロール制御は変更なし。**新規作成レイヤーの編集中非表示／通常時表示の模擬テストPASS、iPhone Safari・ChatGPT内ブラウザ・Actionsは未確認。**


> **2026-11-21 編集ビルプレビューのタップ停止・再開（main反映／実機未確認）：** `maps/building-preview-gestures.js` を更新し、ビルの上半分プレビューで短いタップをするたび自動水平回転を停止／再開。初回は従来どおり30秒/周で回り始め、タップで停止・次のタップで同じyawから再開。指の微小揺れ9pxまではタップとみなし、スワイプ・2本指ピンチ・キャンセルでは自動回転を勝手に再開しない。端末のreduce motion設定を尊重し、閉じるとRAFとジェスチャー解除。`maps/map-labels.js` のアクセシビリティ説明と参照バージョン更新、`dev.template.html`・`dev.html` のJSキャッシュ更新。ビルプレビューA/B同期、ネオンタグ非表示、タグ編集シート50/100/閉じる、ヘリ復帰は維持。**構文チェックと停止→再開→スワイプ→ピンチ→再タップの模擬イベントPASS。iPhone Safari実機とActions未確認。**


> **2026-11-21 編集ビルのA/Bプレビュー中に通常マップのネオンタグが混入する問題（main反映／実機未確認）：** `maps/map-labels.js` の `setPreviewActive` が従来 `viewport.summary` だけを非表示にし、事前に生成した `viewport.items` が残る可能性を解消。プレビュー開始時にタグ専用 `layer.style.display='none'` で通常マップのラベル・ネオンタグ全体を不可視にし、終了時は `display=''` に復帰。編集ボトムシートは `host` 直下の別要素なので隠さない。A/Bどちらも既存の `setPreviewActive(true/false)` を利用。ビル自動水平回転、ピンチ、0:100ボトムシート、編集タグ、ヘリ復帰は変更なし。`dev.html`／`dev.template.html` のキャッシュキー更新。JS構文、A/Bでのタグ非表示と復帰の模擬試験PASS。**ActionsとiPhone Safari／ChatGPT内ブラウザ実機未確認。**


> **2026-11-20 0:100編集シートのスクロールが背後テスト操作画面へ伝わる問題を修正（main反映／実機未確認）：** `maps/sheet-scroll-guard.js` を新設し、編集中のマスク上でタッチ・ホイールのスクロール可否を判定。編集シート内部がスクロール可能な方向はネイティブ動作を許可し、上端・下端またはシート外では `preventDefault` で背後のテスト操作画面／ページへのスクロールチェーンを防ぐ。フォームに `-webkit-overflow-scrolling:touch` を追加。シート終了時にイベントを解除。`maps/map-labels.js` のみへ接続、`dev.template.html`／`dev.html` キャッシュキー更新。50:50→0:100→50:50→閉じる、ネオンタグ入力・iOSキーボード、A/B自動回転・ピンチには手を加えていない。**JS構文・境界スクロールの模擬テストPASS／iPhone Safari・ChatGPT内ブラウザとActions実機未確認。**


> **2026-11-20 タグ編集ボトムシート3段階ドラッグ（main反映／実機未確認）：** `maps/sheet-motion.js` をつまみの half(50:50) / full(0:100) / dismiss のステートマシンへ変更。50%状態からつまみを上へ56px程度引くと100%へ、100%から下へ65px程度引くと50%へスナップ、50%をさらに下へ90px以上（またはフリック）引くと閉じる。100%から1回の連続ドラッグで50%より下へ90px以上通り越した場合も閉じる。ドラッグ中は高さと位置を指へ追従、Web Animations APIでスナップ、reduce-motion設定では即座に切替。つまみのEnter/Spaceは50/100トグル、Escapeで閉じる。`maps/map-labels.js` で接続し `dev.template.html`/`dev.html` キャッシュキー更新。既存のOSMタグ入力・キーボード対策、A/Bビルプレビュー・自動回転・ピンチ、閉じた際のヘリ視点復帰は変更なし。**純JS構文チェック・模擬イベントでhalf→full→half→dismissと破棄をPASS、ActionsとiPhone Safari/ChatGPT内ブラウザの実機PASSは未確認。**


> **2026-11-20 iPhoneのタグ入力時ズーム＆キーボード対応（main反映／実機未確認）：** `maps/building-tag-editor-theme.js` で編集シート中のinput/select/textareaを16px以上に固定しiOS Safariのフォーカス自動ズームを回避。`maps/map-labels.js` のタグ入力も16pxへ変更。読み取り専用だった本番OSMのタグ値を一時的なローカル下書きとして入力可能にし、既存タグのキーをタップしたときは値欄へフォーカス、本番への送信／保存は引き続き禁止。テストOSM取得後のタグ値入力・追加・level限定送信、削除ボタンなし、50%シート、A/B自動回転は維持。`dev.html`／`dev.template.html` のモジュールキャッシュキー更新。**構文・静的参照チェックPASS、iPhone Safari／ChatGPT内ブラウザとActions実機未確認。**


> **2026-11-20 ビル編集ボトムシートをネオン配色のOSMタグUIへ変更（main反映／実機未確認）：** 参考画像に合わせ、`maps/map-labels.js` と新規 `maps/building-tag-editor-theme.js` で暗緑＋ネオン桃/水色/紫のタグ行、見出し右の「テスト環境へコピー」→×、本番OSM/テストOSM切替、タグ一覧、タグ追加ボタンを実装。タグ削除ボタンはなし。実機PASS済みの50%ボトムシート、つまみのフリック、上部A/Bビル単独自動水平回転・ピンチ・ヘリ復帰は維持。本番OSMは読み取り専用。テストOSM選択時は保存済み本番→テスト対応IDの実データをテストAPIから取得し、未コピー/取得失敗時には本番タグをテストと偽って表示しない。コピー時は既存のOAuth・確認・コピー処理を保持。編集したテストタグの確認は可能だが、テストAPIへの実送信は既存の **POI `level` 0〜8 の追加のみ** （任意タグ追加は現段階で確認プレビューのみ、ユーザーへ明記）。`dev.html` と `dev.template.html` の参照キャッシュ更新。JS構文・参照・削除ボタン不在の静的確認PASS。**ActionsとiPhone Safari/ChatGPT内ブラウザ実機未確認。**


> **2026-11-20 編集ビルのゆっくり自動水平回転（main反映／実機未確認）：** ユーザーの『説明なしで回転可能なUIだと気づかせたい』要望に対応。`maps/building-preview-gestures.js` に約30秒/周の自動yaw回転を追加し、選択建物の編集開始後に起動。1本指スワイプ／2本指ピンチの最初のタッチで、その編集セッションの自動回転を永久停止して手動操作へ移行。`prefers-reduced-motion: reduce` では自動回転を開始せず、非表示タブでは時間が飛ばないようにし、編集終了時はrequestAnimationFrame・ジェスチャーを解除。`map-labels.js` から起動し、`dev.template.html` と `dev.html` のキャッシュキー更新。A/B同期、上半分の3Dビル単独表示、上下回転なし、閉じた際のヘリ・カメラ復帰維持。**構文チェックと模擬タッチ／フレーム停止チェックPASS、実機Safari・ChatGPT内ブラウザとActionsは未確認。**


> **2026-11-20 編集ビルの表示余白0%（main反映／実機未確認）：** `maps/building-editor-preview.js` の全方向フィットの上下左右バッファを0.5%から0%へ変更（`maxX=1, upperY=1, lowerY=0`）。360°回転時の固定距離、ピンチズーム、上半分中央配置、ヘリ視点復帰は維持。9種類の仮建物寸法について360°を0.5°刻みで投影した計算テストでは見切れ0、距離変化0。`dev.template.html`／`dev.html` のJSキャッシュキー更新。計算上は全方向フィットするが、端のピクセル丸めや実機描画まで保証するものではない。**Safari／ChatGPT内ブラウザ実機とActionsは未確認。**


> **2026-11-20 編集ビルのバッファ0.5%へ（main反映／実機未確認）：** `maps/building-editor-preview.js` の360°水平回転に対する初期表示の上下左右余白を1%→0.5%に縮小（`maxX=.995, upperY=.995, lowerY=.005`）。回転中のカメラ距離固定・ピンチ倍率・編集終了時のヘリ視点復帰を維持。`dev.template.html`／`dev.html` のキャッシュキー更新。実機未確認。


> **2026-11-20 編集ビル初期表示の余白1%へ（main反映／実機未確認）：** `maps/building-editor-preview.js` の360°水平回転に対する投影フィットの上下・左右余白を4%から1%へ縮小し、距離をさらに1.5%引く追加倍率を撤去。初期表示を最大寄りに調整しつつ、回転中のカメラ距離固定・ピンチ倍率・上半分中央の配置・ヘリ視点復帰を維持。`dev.template.html`／`dev.html` のJSキャッシュキー更新。7種の仮寸法の360°回転距離固定テストPASS、実機Safari／ChatGPT内ブラウザ・GitHub Actions未確認。


> **2026-11-20 編集ビル初期倍率を360°見切れない最大寄りへ（main反映／実機未確認）：** `maps/building-editor-preview.js` の初期距離算出を、水平・上下の投影不等式を全yawに対して解いた角度非依存の最大フィット計算に変更。建物の幅・奥行・高さ・A/B Canvas縦横比から距離を求め、上半分表示範囲の上下/左右に約4%の安全余白（計算上さらに1.5%の距離余裕）を残す。回転中の自動ズームなし、ピンチ倍率の適用、上下回転なし、元のヘリ視点への復帰を維持。`dev.template.html`／`dev.html` キャッシュキー更新。8種の仮寸法×360°模擬検証で距離一定・初期倍率の見切れなし、構文チェックPASS。**実機Safari・ChatGPT内ブラウザ／GitHub Actionsは未確認。**


> **2026-11-20 編集ビルの回転中の周期的なサイズ変化を修正（main反映／実機未確認）：** `maps/building-editor-preview.js` で回転角ごとに8頂点を使い1.2倍刻みでカメラ距離を再計算していた処理を撤去。建物の幅・奥行から全角度に共通する水平外接半径と高さを求め、A/B Canvasの縦横比と上半分の可視領域から**回転角に依存しない初期距離**を算出。横スワイプではyawだけ変え、ピンチ倍率は距離にのみ適用、上半分中心・水平回転のみ・編集終了時のヘリ復帰は維持。`dev.template.html`／`dev.html` のモジュールキャッシュキー更新。仮寸法4ケース×360°の計算テストでカメラ距離一定・2倍ズーム比維持、構文チェックPASS。**GitHub Actions・実機Safari／ChatGPT内ブラウザPASSは未確認。**


> **2026-11-20 編集ビルの横スワイプ回転・ピンチ拡大縮小（main反映／実機未確認）：** `maps/building-preview-gestures.js` を新設し、編集中の上半分だけを覆う透明なタッチ領域で1本指の横移動による水平角（yaw）の変更、2本指の距離変化による倍率0.55～3倍の拡大縮小を受け付ける。縦方向の指移動によるpitch/roll変更はしない。`maps/building-editor-preview.js` の専用カメラにyaw/zoomを追加し、A/B両方に同じ角度・倍率を反映。`map-labels.js` はジェスチャー領域の配置・イベント破棄を担当し、ボトムシートのつまみや本文スクロールから分離。閉じたら角度・倍率を破棄し、ヘリカメラ・通常A/Bモードへ復帰。`dev.template.html`／`dev.html` の参照を更新。**外部ライブラリなし、専用JS構文確認PASS。GitHub ActionsやSafari／ChatGPT内ブラウザの実機動作は未確認。**


> **2026-11-20 編集ビルを上半分中央へ配置（main反映／実機未確認）：** 50:50ボトムシートが下半分を覆うので、ビル単独プレビューの従来の画面全体中心(y=50%)を、可視上半分の中心(y=25%)へ変更。`maps/building-editor-preview.js` の専用カメラでカメラのeye/targetを投影上方向の逆へ平行移動し、A/B各Canvasの縦横比と選択ビルの幅・奥行・高さ（8頂点）に基づき、可視領域内に収まる距離を反復算出する。固定Engine、元のゲームカメラ・ヘリ位置・OSM原本・画面比率は変更なし。`dev.template.html`／`dev.html` キャッシュキー更新。**コード反映のみでSafari／ChatGPT内ブラウザ実機とGitHub ActionsのPASSは未確認。**


> **2026-11-20 編集時の選択ビル単独3Dプレビュー（main反映／実機未確認）：** `maps/map-builder.js` の建物 feature に非列挙の `previewSource`／`previewTile` を保持し、`maps/building-editor-preview.js` を新設。テナントタップ時、選択ビルの元OSM形状と対応する店舗POIから既存 `buildMap` を使ってそのビルだけのメッシュを生成（全マップ地面メッシュを除外）。`map-labels.js` は選択建物＋店舗一覧を開閉コールバックへ渡し、A/Bラベルを一時非表示。`dev.template.html`／`dev.html` は編集中のA/B両画面に専用引きカメラと選択ビルのメッシュのみを描画し、ヘリ・周囲の建物・通常地形を出さない。編集を閉じると専用メッシュ参照を解除し、保存済みのA/B表示モードと現在のゲーム座標／カメラに戻る（ゲーム座標自体は変更しない）。**テストOSM編集差分の3D反映は未実装。既存地図描画で選ばれたビルと、単独再生成した店舗外観は周辺道路データの違いにより完全一致しない可能性あり。** 静的接続確認のみ、GitHub Actions・iPhone Safari・ChatGPT内ブラウザ実機未確認。


> **2026-11-20 テナント編集時のA/B 2画面表示（main反映／実機未確認）：** `dev.template.html`・`dev.html` でテナント編集ボトムシートの開閉とA/B比較描画を連動。編集開始時だけ既存の `compare` 表示へ一時切替、Bのみ表示など元のモードを記憶して、編集終了時に復元。切り替えは `persist:false` のため従来のユーザー選択をlocalStorageへ上書きしない。編集中、2画面の3D背景は読み込み済みの新2km地図を共通使用し、ミニマップも同じ地図ソースを使用。元のA/B地図設定は書き換えない。**現時点ではテストOSMのタグ差分・3D反映は未実装で、建物ラベルのA/Bソース統一も未対応。** 50:50ボトムシート・スワイプモーション・入力停止は従来処理。コード静的照合のみ、Safari／ChatGPT内ブラウザ実機PASS・Actions確認は未実施。


> **2026-11-20 ボトムシート慣性アニメーション（main反映／実機未確認）：** `komorebi3d/maps/sheet-motion.js` を新設し、つまみのPointer Events／指追従／直近110msの速度測定／約90pxの距離判定／素早い下フリックでの閉じ／Web Animations APIのスライドアウト／短距離操作時の軽い弾性復帰を分離。`prefers-reduced-motion` を尊重し、編集画面破棄時にイベント・アニメーションを解除。`map-labels.js` はモーションモジュールを接続し、50:50比率・固定グリップ・フォーム内スクロール・既存OSM編集は維持。`dev.template.html`・`dev.html` のキャッシュキーを更新。**静的接続確認のみ／GitHub Actions、実機Safari・ChatGPT内ブラウザでのアニメーションPASSは未確認。**

> **2026-11-20 OSM編集ボトムシートのつまみ固定（main反映／実機未確認）：** `maps/map-labels.js` のドラッグ用グリップを `position:sticky;top:0;z-index:5` にして、50%高のフォーム内でタグ一覧をスクロールしても上端に留まる。グリップの背景を不透明にしてスクロール内容の重なりを防止。下ドラッグで閉じる既存の判定・本文スクロール・50:50比率は維持。`dev.template.html` と `dev.html` のブラウザキャッシュキー更新。静的照合のみ実施、GitHub Actions・Safari実機確認は未実施。

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


更新日：2026-11-21

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

- **2026-11-21 OSMタグ入力中のキーボード対応（main反映／実機未確認）：** `maps/editor-keyboard-layout.js` を追加し、iPhoneなどタッチ端末でタグ入力にフォーカスすると、A/Bのゲーム画面枠を `visualViewport.offsetTop` に追従させて固定。ビルプレビュー上50%を維持し、フォームはキーボード上に残る高さを上限として縮小、編集中のタグをフォーム内部でスクロール。フォーカス解除・編集終了時は元の寸法と位置へ復元。`map-labels.js`、`dev.template.html` と生成済み `dev.html` の参照更新、サイズ計算の回帰テスト追加。既存のOSM送信、A/Bビル形状計算、回転・ピンチ、50%/100%シート操作仕様は変更しない。**GitHub反映済み／iPhone Safariでのキーボード表示・スクロール・復帰・フルシート操作は未確認。**

## 2. 現在進めている開発

- **2026-11-21 Geofabrik関東PBFの日次自動更新（main反映／初回自動実行未確認）：** 毎日10:17 JST（UTC 01:17）に関東PBF取得Actionsを自動実行し、既存の手動実行も保持。取得成功→松戸2kmのtile 0_0 JSON生成→検証・GitHub公開→GitHub Pages明示dispatchの順に連携する。PBF自体をGitへコミットしない。公開ワークフローの自己ファイルpushトリガーは、旧B artifactの予期せぬ再公開を防ぐため撤去。旧2kmの原本・固定Engine・ゲームUI・OSM OAuthは変更しない。GitHub Actionsの連鎖成功、Pages反映、iPhone Safari実機は未確認。

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

- **キーボード対応の要実機確認：** iPhone Safariでタグ入力を開始し、A/Bビルが画面外へ押し上げられず、入力欄がキーボード上の残余領域で見えること。キーボードを閉じる／編集画面を閉じる／タグ間移動／50%から100%のドラッグ後の復帰も確認する。


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
