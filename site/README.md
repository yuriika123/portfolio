# Yuta Okuno — ポートフォリオサイト

Three.jsのトップ展示、作品一覧・カテゴリーフィルター、作品別ページを持つ静的サイトです。Viteでビルドし、GitHub ActionsからGitHub Pagesへ公開します。

公開用リポジトリにはサイト本体だけを含みます。Mac用Portfolio Editorと元プロジェクトの履歴・下書き・未使用素材は別途ローカルで保管します。以下のアプリ操作・Swiftテストは、アプリを含む元プロジェクトで利用する手順です。

## セットアップ・開発・ビルド

Node.js・npmが必要です。GitHub Actionsと同じNode.js 24系を基準にします。リポジトリのルートから実行します。

```sh
cd site
npm ci
npm run dev
```

表示されたURLをブラウザで開きます。現在の公開設定ではルート `/` を使います。開発サーバーを終了してから、必要に応じて次を実行します。

```sh
npm test
npm run build
npm run preview
```

`npm run dev` と `npm run build` の前にページを自動生成します。`npm run preview` は既存の `dist/` を配信するため、変更後は先にビルドしてください。`npm run generate` で生成だけを実行できます。

## 編集元と生成物

| 場所 | 役割 |
| --- | --- |
| `content/portfolio.json` | 作品・カテゴリー・セクション。作品編集の正本 |
| `content/publishing.json` | GitHub保存先と公開URL |
| `templates/home.html` | トップページ、プロフィール・About・SNS・連絡先 |
| `templates/header.html`、`templates/footer.html` | 共通ナビゲーション・フッター |
| `templates/work.html` | 作品ページの外枠 |
| `src/style.css` | レイアウト・見た目 |
| `src/main.js` | フィルター、戻るリンク、動画の読み込み・エラー表示 |
| `src/sphere.js` | トップのThree.jsモーション |
| `public/assets/works/` | 取り込み済みの画像・公開用MP4・ポスター |
| `scripts/generate-pages.js` | データ検証、ページ・sitemap・robots生成 |
| `scripts/images.js` | 画像の寸法取得・WebP変換・キャッシュ |
| `scripts/publishing.js` | 公開URL・ベースパスの解決 |
| `scripts/seo.js` | canonical・OGP・構造化データ等 |
| `scripts/preview-server.js` | Macアプリ用のMP4 Range対応プレビュー配信 |
| `vite.config.js` | 複数ページのビルドと公開素材の選別 |

`index.html`、`works/`、`public/sitemap.xml`、`public/robots.txt` は生成物です。テンプレート・作品データ・公開設定を編集して生成し直してください。`works/.generated-pages.json` で生成ページを管理し、削除・URL変更された作品の旧ページを除去します。

`dist/` は公開用ビルド出力です。`public/assets/optimized/` と `.image-variants.json` は画像変換キャッシュです。生成出力・キャッシュを直接修正しても再生成で失われます。ローカル元プロジェクトでは `index.html` はGitで追跡し、`works/`・`dist/`・画像変換キャッシュは無視しています。

## 作品データとページ

元プロジェクトではPortfolio Editorから編集します。JSONを直接変更した場合は `npm run generate` またはビルドで検証・生成してください。アプリを同時に開いている場合は再読み込みが必要です。

- `schemaVersion` は現在1。カテゴリーと作品を保持する。
- 配列の上から掲載し、カテゴリーは複数指定できる。
- `id` は `/works/<id>/` の名前。変更すると旧生成ページを削除し、リダイレクトは作らない。
- `published: false` は下書き。掲載作品はタイトル・カテゴリー・有効な動画が必要。
- 追加セクションは見出し・画像・関連動画・説明文の順に表示する。

本文は空行で段落を分けます。キャプションは画像説明と代替テキストに使います。ローカル画像の寸法は自動取得し、外部画像は固定比率の枠を確保します。一覧の縦動画は4:3の枠の中に縦の構図を残して表示します。

## YouTube・ローカル動画・サムネイル

`videoURL` はYouTube URLまたは取り込み済みの `/assets/works/.../*.mp4` を使います。任意の外部動画URLを埋め込む構成ではありません。追加セクションの関連動画も同じ方式です。

YouTubeは再生ボタンを押してから埋め込みを読み込みます。埋め込みが拒否された場合はエラー案内と直接リンクを表示します。ローカル動画はブラウザの標準コントロールで再生します。

元プロジェクトのPortfolio EditorではMOV・MP4・M4VをAVFoundationで公開用MP4（最大1080p、H.264／AAC）へ変換します。先頭フレームの `*-poster.jpg` と縦横判定も作成し、元ファイルは変更しません。変換できない形式はエラーになります。取り込んだMP4とポスターを一緒に保管してください。

作品の `thumbnailURL` でカスタム画像を設定できます。未指定ならYouTubeのサムネイルまたは自動生成ポスターを使います。アプリは動画の差し替え時にカスタムサムネイルを保持します。カスタム画像は一覧とローカル動画のポスターに反映します。

Macアプリのプレビューは動画のMIMEとHTTP Rangeに対応し、再生・途中へのシークができます。再生確認はHTTPサーバー経由で行ってください。

## 画像の軽量化と公開素材

ローカルPNG・JPEG・WebPはページ生成時に480・960・1440pxを上限とするWebPを作り、`srcset` で表示幅に応じて読み込みます。小さい画像は拡大しません。元画像は編集用に保持します。SVG・GIF・アニメーション画像・外部画像はそのまま使います。

本番ビルドは `public/` 全体をコピーせず、掲載作品が参照する動画・画像の変換版と、favicon・sitemap・robotsなど必要な共通ファイルだけを出力します。元の静止画像は原則そのまま配信せず、OGPも公開される変換版を参照します。下書き専用・未使用素材は `dist/` に含みません。公開作品と共有する素材は配信されます。

ブラウザへ作品JSON自体は配信せず、生成済みHTMLとフィルターに必要なカテゴリーIDを使います。公開用Gitには再ビルドに必要な掲載作品JSONと参照元素材を含みます。「GitHubに含めるソース」と「ブラウザへ配信するdist」は別です。

## トップのモーション

`src/sphere.js` は元のopenFrameworks作品をThree.js／WebGLに移したものです。350個の球、配置式、周期、色域、不透明度、回転を元にし、ノイズ・乱数の種・初期の向きは元作品と異なります。

画面外では描画を休止します。動きを減らすOS設定、手動停止、WebGL非対応時の静止画表示に対応しています。元ソースとアドオンは編集用元プロジェクトの `reference/oF/` にあり、サイト専用の公開リポジトリには含まれません。

## 公開URL・サブパス・SEO

現在の設定は `content/publishing.json` の `repository: yuriika123/portfolio` と `siteURL: https://yuta-okuno.me` です。生成処理は末尾スラッシュとベースパスを解決し、ページ・画像・動画・フィルター後の戻るリンク・OGP・sitemapをルート `/` に合わせます。

環境変数 `SITE_URL` があればJSONより優先します。GitHub Actionsではconfigure-pagesが返す実際の `base_url` を渡します。Mac内の公開設定も `https://yuta-okuno.me` に設定済みです。Viteのソース参照はVite側で変換し、生成HTMLの公開素材・リンクは生成処理がベースパスを付けます。

`scripts/seo.js` は氏名・活動名・SNS・canonical・OGP・構造化データを管理します。`npm run generate` で掲載作品だけを含むsitemapとrobotsを生成します。URL変更後は再生成・ビルドし、canonicalとsitemapを確認してください。

検索サービスへの登録には、その時点で実際に公開しているURLとsitemapを使います。sitemapは `https://yuta-okuno.me/sitemap.xml`、robotsは `https://yuta-okuno.me/robots.txt` です。独自ドメインの取得自体は検索登録の前提ではありません。検索への掲載・順位は保証されません。

## GitHub Pagesへの公開

リポジトリルートの `.github/workflows/pages.yml` は `main` へのpushまたは手動実行で動きます。Node.js 24で `npm ci` → `npm test` → `npm run build` を実行し、`site/dist/` をPagesへ配信します。PagesのSourceはGitHub Actionsです。

元プロジェクトのPortfolio Editorは、認証、ローカルコミット、サイト専用書き出し、必要なら公開リポジトリ作成、push、Pages設定、公開開始をGUIで行います。公開用Gitは元プロジェクトとは独立した `.github-publish-workspace/` にあり、アプリや元のGit履歴は送信しません。この公開用フォルダは直接編集せず、元プロジェクトを編集して書き出します。

独自ドメインはGitHubのSettings → Pagesとドメイン取得先のDNSで設定します。リポジトリ名が `portfolio` でも `https://yuta-okuno.me/` に接続できます。GitHub Actions方式ではCNAMEファイルは不要です。設定手順は[GitHub公式ドキュメント](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)を参照してください。

アップロード完了とデプロイ完了は別です。GitHub Actionsまたはアプリの「公開状況を確認」で結果を確認し、実際の公開URLでトップ・作品ページ・画像・動画を確認します。

## 検証と切り分け

`npm test` はプレビューサーバーの動画Range配信、サブパス、公開URLとSEOリンクを確認します。`npm run build` はデータ検証・ページ生成・画像変換・公開素材の選別まで実行します。

アプリを含む元プロジェクトでは、サイト依存を用意した上で `cd ../PortfolioEditor && swift test` を実行すると、保存・素材取り込み・サイト専用公開の統合テストも実行できます。サイト専用の公開リポジトリではSwiftテストは実行しません。

表示が更新されない場合は編集元を確認して再生成・ビルドします。画像・動画の404は参照パスと `siteURL` のベースパス、Pagesの失敗はActionsのログを確認してください。下書きが見えない場合は `published` と掲載条件を確認します。素材を手動削除する前には、掲載作品・下書き双方の参照とバックアップを確認してください。
