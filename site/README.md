# Yuta Okuno — ポートフォリオサイト

Three.jsのトップ展示、作品一覧とカテゴリーフィルター、作品別ページを持つ静的サイトです。

## 開発・ビルド

```sh
cd site
npm ci
npm run dev
npm run build
```

`npm run dev` と `npm run build` の前に、作品データから一覧と作品ページを生成します。
公開用ファイルは `dist/` に出力されます。生成される `index.html`・`works/`・`dist/` は編集せず、テンプレートと作品データを変更してください。

## 作品の管理

Mac用のPortfolio Editorから編集します。データ本体は `content/portfolio.json` です。
配列の上から順に掲載し、`published: false` の作品は下書きとして保存します。
`id` は `/works/作品名/` の名前です。カテゴリーは複数選択できます。
追加セクションは見出し・画像・関連動画・説明文の順に表示します。
再生ボタンを押すとYouTubeを読み込みます。YouTube側で埋め込みが拒否された場合は、エラー案内と直接リンクを表示します。

データを直接編集した場合は `npm run generate` でHTMLを更新します。
プロフィール・SNS・連絡先は `templates/home.html`、共通ナビゲーションは `templates/header.html` と `templates/footer.html`、作品ページの外枠は `templates/work.html`、レイアウトは `src/style.css` にあります。

## トップのモーション

`src/sphere.js` は元のopenFrameworks作品をThree.js / WebGLに移したものです。
350個の球、配置式、周期、色域、不透明度、回転を元にしています。ノイズ、乱数の種、初期の向きは元作品と異なります。
画面外では描画を休止し、動きを減らす設定・手動停止・WebGL非対応時の静止画表示に対応します。
元作品のソースとアドオンは `../reference/oF/` にあります。

GitHub Pagesの公開構成は末尾を参照してください。

## 検索エンジン向け設定

独自ドメイン取得前の公開URLは `https://yuriika123.github.io/portfolio/` です。`scripts/seo.js` で、氏名・活動名・SNS・canonical・OGP・構造化データを管理します。
プロフィールには Yuta Okuno、奥野 雄太、yuriika、yuriika123 を表示しています。
`npm run generate` で、掲載中の作品だけを含む `public/sitemap.xml` と `public/robots.txt` を自動生成します。
GitHub Pagesへ公開した後、Google Search Consoleでドメインの所有権を確認し、`https://yuta-okuno.me/sitemap.xml` を送信してください。
本番の独自ドメインがまだ接続されていない間は、検索への反映を確認できません。検索への掲載・順位は保証されません。

## 公開データと画像

ブラウザに作品JSONは配信せず、カテゴリーIDだけをHTMLに出力します。本番ビルドには掲載中の作品が参照するローカル画像と共通画像のみを含めます。下書き専用・未使用の画像はMac内に保持し、`dist/` にはコピーしません（公開作品と共有する画像は配信されます）。公開時は必ず最新の `dist/` を使用してください。

追加画像の寸法はビルド時に自動取得します。外部URLの画像には固定比率の枠を確保します。キャプションは画像説明と代替テキストに使います。一覧の縦動画は4:3の枠の中に縦の構図を残して表示します。

Swiftアプリとの保存・生成・ビルドの統合テストは `cd ../PortfolioEditor && swift test` で実行できます。先に `npm ci` でサイト依存を用意してください。

## 動画ファイルと画像の軽量化

Portfolio Editorの「動画ファイルを選ぶ…」からMOV・MP4・M4Vを取り込めます。MacのAVFoundationで公開用MP4（最大1080p）に変換し、先頭フレームのサムネイルと縦横判定を自動作成します。元ファイルは変更しません。追加セクションにも「関連動画ファイルを選ぶ…」があります。変換できない形式ではエラーを表示し、取り込みを取り消します。

作品データの `videoURL` にはYouTube URLまたは取り込み済みの `/assets/works/.../*.mp4` が入ります。動画本体と `*-poster.jpg` はセットで管理してください。動画は再生操作後に読み込み、ブラウザの標準コントロールで再生します。本番出力には掲載中の作品が使う動画のみを含めます。

ローカルのPNG・JPEG・WebPは生成時に480・960・1440pxを上限とするWebP画像に変換し、画面幅に応じて読み込みます（小さい画像は拡大しません）。元画像は編集用に保持し、公開用には変換画像だけを含めます。SVG・GIF・アニメーション画像・外部画像はそのままです。生成画像は `public/assets/optimized/`、対応表は `.image-variants.json` に保存され、Git管理から除外します。OGPも公開される変換画像を参照します。

Portfolio EditorのプレビューはMP4の動画形式とHTTP Rangeリクエストに対応し、再生・途中へのシークができます。配信処理の回帰テストは `npm test` で実行します。動画の差し替え時にも、選択済みのカスタムサムネイルを保持します。

## GitHub Pagesへの公開

`.github/workflows/pages.yml` がmainへのpushで `npm ci`・テスト・ビルドを実行し、掲載作品だけを含む `site/dist` をPagesへ配信します。リポジトリのPagesのSourceはGitHub Actionsです。Portfolio Editorの「GitHub・公開」でリポジトリ作成・認証・設定・アップロードを操作できます。

現在の設定は `content/publishing.json` にあります。独自ドメイン取得前のURLは `https://yuriika123.github.io/portfolio/` です。生成ページ・画像・カテゴリー移動・動画・OGP・sitemapはこのサブパスに対応します。ローカルプレビューも `/portfolio/` から開きます。独自ドメインのルートへ移す場合は設定の `siteURL` を変更してください。本番のActionsではconfigure-pagesの `base_url` を `SITE_URL` に渡すため、GitHubの公開先に合わせて生成します。まだ取得していない独自ドメイン用のCNAMEは追加していません。

GitHubへのアップロードにはサイト専用のGit履歴を使います。編集アプリ、Mac内の元リポジトリの履歴、下書き、未使用の素材は送信しません。
