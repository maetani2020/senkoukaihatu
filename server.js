const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// 静的ファイルを public 相当のディレクトリ（今回はプロジェクトルート）から提供
app.use(express.static(__dirname));

// ルートは home.html （もしくは index.html）を表示 （ファイル名に応じて変更可能）
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html")); // 例: home.htmlがTOPの場合
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});