# cnnd Chat UI

Giao diện khung chat cnnd được xây dựng bằng React và Vite. Tin nhắn được gửi tới Neo4j Chat Search API và trạng thái hội thoại chỉ được giữ trong phiên trình duyệt.

## Chạy dự án

Yêu cầu Node.js 18 trở lên.

```bash
npm install
npm run dev
```

Trong môi trường phát triển, Vite chuyển tiếp các request `/api/*` tới backend tại
`http://127.0.0.1:8001`. Vì vậy cần khởi động backend trước khi gửi tin nhắn.

Kiểm tra trước khi phát hành:

```bash
npm test
npm run build
```
