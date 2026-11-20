# OSMテスト環境OAuth：GitHub Actions Secretsによる公開

KomorebiはGitHub Pagesで公開するブラウザアプリ。OAuth 2.0 + PKCE (S256) を維持しつつ、利用者にはClient IDを入力させない。

## 管理者による一度だけの設定

1. OSMテスト環境で登録済みのKomorebi用OAuthアプリの **Client ID（Client Secretではない）** を確認する。
2. GitHubの `shuma-fujita/komorebi` → **Settings → Secrets and variables → Actions → New repository secret** で、名前 `OSM_TEST_CLIENT_ID`、値にClient IDを登録する。**値をGitのソース、Actionsログ、このドキュメントへ書かない。**
3. GitHubの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に切り替える。これまでのブランチ公開のままではSecretをサイトに挿入できない。
4. **Actions → Deploy Komorebi Pages (OAuth config from Secret) → Run workflow** を実行（または次のmain更新を待つ）。実行成功後に公開ゲーム画面 `https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html` を開く。
5. 「テスト環境へログイン」→ OSMテスト環境で認証 → ゲーム画面へ戻る → 「確認してコピーを作成」を確認する。

## 仕組みと注意

- リポジトリの `komorebi3d/maps/osm-test-client-config.js` は常に空のプレースホルダー。Actionsは公開用アーティファクトの同じパスに、Secretから作ったJSファイルを書き込む。**リポジトリやコミット履歴にはClient IDを保存しない。**
- Secretが未登録・無効なら、Pagesワークフローは公開前に失敗する。リポジトリ内のプレースホルダーではログイン不可で、設定不足を表示する。
- **公開したWebページのJSやOAuth認証URLからClient IDは確認できる。** Client IDは公開クライアント識別子であり、秘匿情報ではない。GitHub Actions Secretsはソースとコミット履歴への混入を防止するための手段。
- Client Secret、OSMパスワード、アクセストークン、PKCE verifierは絶対にSecretの代わりに入れない。
- OAuthアプリの登録済みリダイレクトURIは `https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html` と一致させる。アプリはテストサーバー `https://master.apis.dev.openstreetmap.org` の `write_api` を使う。
- 認証トークンは既存どおりブラウザの `sessionStorage` に保存。OSM本番APIへの書き込みは行わない。
- 設定後の動作確認までは、OAuthログインが成功したと判断しない。
