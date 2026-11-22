# 🌳 Komorebi 3D｜現在地・次の開発

> 更新：2026-11-22。ここは**次のチャッピーが最初に読む作業案内**。今後やることを最優先に、現行仕様・注意点・経緯の要点だけを記す。試行錯誤の時系列や廃止済みの仕組みは掲載しない。仕様の正本はGitHub `main` の実コード、恒久的な運用ルールは [`docs/rules/`](rules/README.md)。

## 1. 次にやること（優先順）

### ① GitHub Actionsの定時起動を診断する（最優先・結果待ち）
- **対象：** 毎日10:17 JSTに関東Geofabrik PBFを取得するワークフローA（`.github/workflows/geofabrik-kanto-pbf-manual.yml`）。2026-11-22 10:17 JSTの定時実行は確認できず、調査時点では `schedule` 起動履歴0件。手動実行の成功と自動起動の成功を混同しない。
- **現在の検証：** 一時的な `.github/workflows/diagnose-schedule-trigger-20261122.yml` が11/22 **13:07〜15:52 JSTに15分間隔で12回**の `schedule` を待つ。PBF取得・JSON生成・Git書き込みはしない。**11/22 16:30 JST以降**にActionsの `event=schedule` と診断runの有無を照合する。実際の検証結果はまだ記録していない。
- **次の判断：** 起動ありならA本体との差を調べる。0件でもGitHub側の遅延・スキップ・スケジュール登録・actor等を切り分け、原因が確定したと断言しない。A→B（松戸2km生成）→C（比較JSON公開）→Pagesの連鎖と、配信されるJSONの更新は別々に確認する。
- **必須後片付け：** この一時診断ワークフローは翌年11/22にも実行され得るため、検証後は削除する（削除時もユーザーに変更内容を伝える）。

### ② 直近の地図・OSM編集変更を実機で確認
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
