# Komorebi 3D

Komorebi Engineを利用するモバイル向け3Dゲームです。

## UI要件定義からゲーム実装までの運用（2026-11-21）

**設計順序はmock先行。** ゲームロジックの正本は引き続き `komorebi3d/dev.html` に一つだけ置く。UIの正本は共通部品に置き、完成済みゲームJSをテンプレートから再生成しない。

1. **mockで要件定義・UI調整：** `page-shell.html`、`panels/*.html`、`common.css`、`layout.css`、`theme.css`、`panels/*.css` の共有UI部品を編集。ゲーム用・mock専用の表示領域はそれぞれ `panels/game.html`／`panels/game.mock.html` に分離。
2. **mockを生成：** `node komorebi3d/build-ui.mjs --mock`。黒いダミーゲーム画面・3D Canvasなし・ゲームエンジンなしの `mock.html` を生成する。mock専用の操作表示は `mock-ui.js`。この段階では `dev.html` を変えない。
3. **UI承認後にdevへ同期：** `node komorebi3d/build-ui.mjs --sync-dev`。共有CSSとパネルHTML部分だけを `dev.html` に同期し、ゲーム本体のJavaScriptや固定Engine参照は維持する。mockも再生成する。
4. **検証：** `node komorebi3d/build-ui.mjs --check-mock`（mockのみ）、`node komorebi3d/build-ui.mjs --check`（dev・mock両方）。Pages Actionsでも両方の一致を検査。不一致時は公開前に停止する。

**禁止事項：** デプロイ時に `dev.html` を上書き再生成しない。mockにゲームエンジン・3D Canvasを導入しない。`dev.template.html`、`mock.template.html`、旧 `build-dev.mjs` は廃止。固定Engine・森林・2km地図原本、OAuth/PKCE、GitHub Actions SecretsのClient ID挿入はこのUIビルドとは独立して維持する。

ゲーム動作、UIの見た目、Actions公開、iPhone Safari実機PASSは別々に確認し、`docs/STATUS.md` に記録する。

## 現在の安定基準：v0.7

**Komorebi 3D v0.7**（v0.7のテストHTMLは整理済みで、このリポジトリにはありません。現在の開発版は **[dev.html](https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html)**）

2026-11-08、iPhone Safari実機テスト **PASS**。Input・Camera・Renderer・Core・Collisionを`main`に統合したEngineから読み込みます。

### 操作・確認項目

- 左スティック：カメラ方向に合わせて移動
- 右スティック：カメラの向き・上下角度を変更
- 左右の回転ボタン、リセット
- 木・家の壁・地面境界での衝突
- 家への出入り、階段、屋内での視点追従
- A（WebGL）・B（Three.js）・A/B同時比較。初期表示は **B**。

## 保護している安定版（最新＋1世代前）

| ファイル | 位置付け |
| --- | --- |
| `komorebi3d-app-v07-engine-main-test.html` | **現在の安定基準／実機PASS** |
| `komorebi3d-app-v06-core-test.html` | 旧統合版／実機PASS |

通常保存するゲームHTMLは **`dev.html`（開発版）＋最新PASS版＋1世代前PASS版** の3種類です。さらに古いバージョンが必要な場合は、Gitのコミット履歴から復元します。

新しいPASS版ができたら、最新と前世代を残し、2世代前はGit履歴を確認して整理します。通常の`archive/`バックアップブランチは作りません。詳細は [開発ステータス](../docs/STATUS.md) を参照してください。

## 現在の開発用ページ

**[固定開発URL dev.html](https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html)** — ゲームv0.7を元にした開発版。コミット情報・JST時刻表示を実装済み（実機再確認待ち）。

## ソースと依存

このゲームの現在のページは単体HTMLにシーン構築とゲーム固有の家・階段ルールを保持し、共通のInput、Camera、Renderer、Core、Collisionを`../engine/`のモジュールから取り込む構成です。

Web公開版では、ブラウザ上のES moduleの読み込みを安定させるため、`main`で作成された特定コミットを指すCDNの固定URLを使用しています。エンジンのソース本体は[engine/](../engine/)にあります。

**注意:** ファイル名の`-test`は正式なアプリ名ではなく開発・検証の識別子です。v0.7実機PASS後もWebGLや接続環境が違う端末は別途確認が必要です。
