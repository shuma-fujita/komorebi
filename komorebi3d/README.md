# Komorebi 3D

Komorebi Engineを利用するモバイル向け3Dゲームです。

## ゲーム正本・ビルドの運用（2026-11-21）

- **ゲームの唯一の編集元・公開対象は `komorebi3d/dev.html`。** GitHub Actionsはコミットされたファイルを再生成せず、そのままPagesの公開アーティファクトへコピーする。
- **`dev.template.html` は廃止・削除済み。** ゲームをテンプレートから生成する作業は禁止。古いOverpass処理をデプロイで復活させないため、生成経路ごと撤去した。
- **`build-dev.mjs` はモック専用。** `dev.html` の共通UI（パネル・レイアウト・CSS）を読み取り、ゲーム表示領域を黒いダミーに置換して `mock.html` を生成する。ゲーム処理は読み込まず、Canvasも生成しない。モック固有のUI動作は `mock-ui.js`、表示スタイルは `panels/game.mock.css`、タッチUIは `panels/game.touch.html` を使用する。旧 `mock.template.html` は削除済み。引数なし・`--mode=mock` のみ生成可能で、`--mode=dev` は拒否される。
- OAuthの共通Client IDは既存どおりGitHub Actions Secretsから**公開アーティファクトの設定ファイルにのみ挿入**する。GitHubの正本 `dev.html` やOSM本番・テスト認証処理へは挿入しない。
- GitHub Actionsは `node komorebi3d/build-dev.mjs --check` で **ゲーム正本とmockのUI同期**を検査し、不一致なら公開前に停止する。ゲームの再生成は絶対にしない。
- ゲーム動作とGitHub Actionsのデプロイ成功、iPhone Safari実機PASSは個別に確認し、`docs/STATUS.md` に記録する。

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
