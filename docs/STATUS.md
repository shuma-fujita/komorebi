# 🌳 Komorebi 3D｜現在地・次の開発

> 更新：2026-11-22。ここは**次のチャッピーが最初に読む作業案内**。今後やることを最優先に、現行仕様・注意点・経緯の要点だけを記す。試行錯誤の時系列や廃止済みの仕組みは掲載しない。仕様の正本はGitHub `main` の実コード、恒久的な運用ルールは [`docs/rules/`](rules/README.md)。

## 1. 次にやること（優先順）

### ① Geofabrik関東PBFの次回定時更新を確認する（最優先・未検証）
- **2026-11-22の事実：** A（`.github/workflows/geofabrik-kanto-pbf-manual.yml`）は毎日10:17 JSTに`schedule`指定。11/22は **16:59 JSTにscheduleイベントで実行**されたが、Geofabrik PBFのダウンロードが **HTTP 404 ×5回で失敗**（[run #45000703536](https://github.com/shuma-fujita/komorebi/actions/runs/45000703536)）。BはA失敗によりSKIPPED。GitHubがなぜこの時刻に起動したかは未特定。遅延と推測できても根因確定とは扱わない。
- **修正済み：** Geofabrik公式の[関東データ配布ページ](https://download.geofabrik.de/asia/japan/kanto/index.html)が案内する`https://download.geofabrik.de/asia/japan/kanto/kanto-latest.osm.pbf`へ、Aのcurl取得先と`SOURCE.txt`記録の双方を修正した。Aのcron・ジョブ手順・B/Cへの連携は変更しない。
- **一時診断の後片付け：** `.github/workflows/diagnose-schedule-trigger-20261122.yml` を削除（Aの`schedule`実行が確認できたため）。13:07〜15:52の診断12回はActions履歴に起動記録なし。再実行予定は残さない。
- **次の確認：** Aの次回自動実行が成功するか、Aのartifact生成→BのJSON生成→Cのコミット・Pages公開→配信中`index.json`とタイルJSONの更新をそれぞれ検証する。**URL修正後のA実行・自動更新はまだPASS扱いしない。** GitHubの`schedule`は遅延・スキップされ得るため予定時刻直後の不在だけで断定しない。

### ② 直近の地図・OSM編集変更を実機で確認
- **新規・マクドナルド2階PNG壁面（実機未確認）：** 松戸駅前のOSM node `2992364618` → ピアザ松戸ビル way `72709443` の2階外壁に `assets/textures/brands/mcdonalds.png` をUVマッピング。壁全周を画像の赤で覆い、主要4面の中央に正方形ロゴを1つずつ表示する。頂点色の赤壁はPNG読込前のフォールバック、編集プレビューの黄Mは従来ポリゴン。固定Engineには触れず、アプリ側の独立したA(WebGL1)/B(Three.js)テクスチャ描画レイヤーを使用。1階・3階以上・他のビルは対象外。Safariで両エンジン、ロゴの向き・縦横比・境界の継ぎ目・読み込み失敗時の表示を確認する。
- **地図表示：** A/B各画面右下の読み込み済み `tile_0_0_*.json` ファイル名が、選択した旧／新2km地図に正しく追従するか。`index.json` の選択値を表示し、追加取得はしない。コード実装済み・Safari実機確認待ち。
- **タグ編集・localStorage：** 保存・開放から3Dビル／タグ行／テナント一覧への反映、黄色の「⚠ Geofabrik反映待ち」、再読み込み後の維持・開放後の復帰、統一した `osm-tag-changes:v2` の一連の動作をSafariで確認する。静的・自動テストと実機結果は分ける。
- **テストOSM送信：** 任意のchangeset `source`（未指定／`survey`／`local knowledge`／自由入力）、`created_by=Komorebi Builder`、本番／テストのOSM要素ページリンクを、既に実機PASS済みの範囲と未確認の変更を区別して確認する。要素ページリンクは2026-11-22にユーザー実機PASS済み。
- **キーボード：** 新規タグのキー欄でEnter／✓を押すと同じ行の値欄へ進む操作は2026-11-22にSafari実機PASS。その他のiPhoneスクロール対応は、現在の簡素な実装を起点とし、旧実験案を再導入しない。

### ③ 地図タイルの現物と索引を整合させる
- **2026-11-22の `main` 実物確認：** 旧2km `maps/data/tiles-2km/index.json` は559タイルを参照するが、該当JSON本体は**84枚（475枚不足）**。新Geofabrik比較用 `maps/data/tiles-2km-geofabrik/` は中央 `0_0` の1枚。559枚の生成履歴をGitHub上の保存完了と取り違えない。
- 補完手段・索引修正はデータ保護と公開サイズを確認してから提案する。**このSTATUS整理ではタイルや索引を変更しない。**

### ④ 隣接タイルのシームレス化を設計する
- 現状は選択した2km中央タイル `0_0` を表示。隣接タイルへの連続移動は未実装。
- 次工程では先読み距離、同時保持数、読込・破棄条件、OSM要素／ラベルの境界重複排除を設計する。カメラ外の描画省略とタイルデータのアンロードは分け、必要な計測をしてから実装する。
- 近距離優先の段階生成・POI早期公開・遠距離バッチ集約（Step 5-G）は既に実装済みでSafari実機PASS。完了工程をやり直さない。

## 2. 現在の実装と正本

| 領域 | 現行仕様・参照先 |
| --- | --- |
| ゲーム正本 | [`komorebi3d/dev.html`](../komorebi3d/dev.html)。森／松戸、ヘリ操作、WebGLのA／Three.jsのB／A/B比較。固定Engineのモジュールを参照 |
| UI | 共通部品と [`komorebi3d/build-ui.mjs`](../komorebi3d/build-ui.mjs) で `mock.html` を作る。4枠（開発情報・ゲーム・テスト操作・実行ステータス）、5種類目のlocalStorage管理は枠に追加して使用。パネル配置・localStorage一覧／検索／旧キー個別削除はユーザー実機PASSの報告あり |
| 地図 | [`maps/map-loader.js`](../komorebi3d/maps/map-loader.js)。旧2km／新Geofabrik 2kmを静的JSONから取得、A/B独立選択、段階的な3D生成。ブラウザ起動時のOverpass自動地図取得はしない。**「🧪 地図JSON読み込みログ」・コピー機能を維持** |
| ビル・店舗 | 選択建物のタグ編集、テナント一覧、階情報・店舗外観、編集前／編集ドラフトのビルA/Bプレビュー。プレビュー上30%／編集シート下70%。本体実装は `maps/map-builder.js`、`maps/map-labels.js` 等 |
| OSM | 本番OSMはタグ閲覧・ローカル下書き・確認まで。**本番OSM APIへの送信は未実装**。テストOSMはOAuth 2.0＋PKCE経由のコピーと、既存POIの未設定 `level`（0〜8）の新規追加だけ送信可能 |
| タグ差分保存 | [`maps/osm-pending-changes.js`](../komorebi3d/maps/osm-pending-changes.js) の `komorebi3d:osm-tag-changes:v2:<type>/<id>` に1要素1キー。`osmVersion:null` は未送信ローカル確認、正整数は将来の本番保存成功記録。新Geofabrik地図に1回だけ重畳し、実際の本番記録のみ反映確認後に自動開放 |

## 3. 変更時に守ること
- GitHub `main` がコードの正本。**作成・変更・削除・コミットには、対象と目的を示してユーザーの明示的な許可を得る。** 今回のSTATUS整理以外の変更は承認済みとみなさない。
- **固定Engine参照 `56bb2bc2743f5a4441fa28783becf4e6fa6fbc4e`、森、地図原本、OAuth／PKCE、本番OSMの未送信方針、地図JSONログ**を保護する。
- パネルUIは先にmockで要件・表示を確認し、承認後に共有UIをdevへ反映。3D・地図・描画処理はdevで直接開発する。mockは3Dを起動しない。
- v2保存データは旧v1キーを自動移行・一括削除しない。必要な場合のみlocalStorage管理から個別操作。ストレージ全消去はしない。
- コード変更、ローカルテスト、GitHub Actions、GitHub Pages、iPhone Safari実機PASSは**別々の確認結果**。実機PASSの推測・拡大解釈をしない。

## 4. 経緯として残すエッセンス
- **2026-11-08：** Komorebi 3D v0.7／共通Engine統合版のiPhone Safari実機PASSが安定基準。
- **描画最適化：** 近距離優先・段階生成からStep 5-Gまで進み、ユーザーのSafari実機PASSを受領。次は隣接タイルの設計・実装が大きなテーマ。
- **UI正本：** 共通UI部品をmockとdevで共有。公開時にはゲームHTMLを自動再生成・上書きしない。
- **OSM編集：** テスト環境への限定書き込みと、本番未送信のローカル編集プレビューを分離。Geofabrik反映待ちの表示・保存はこの境界を守る。

## 5. 次チャットの開始手順
1. [`docs/rules/README.md`](rules/README.md) と関連ルールを読む。
2. **このページの「次にやること」から**ユーザーの現在の希望を確認する。終了した作業は繰り返さない。
3. 対象ファイルをGitHub最新 `main` から取得して現状を照合し、小さな変更単位で進める。
4. 実装したときはActions・[ゲーム画面](https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html)・[モック](https://shuma-fujita.github.io/komorebi/komorebi3d/mock.html)を案内し、検証結果を混同せず報告する。
5. 方針変更や実機PASS後に、このSTATUSの**未完了・次の作業だけを更新**。詳細な試行錯誤を先頭に追記しない。
