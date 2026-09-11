# cnnd Chat UI

Giao diện khung chat cnnd được xây dựng bằng React và Vite. Tin nhắn được gửi tới Neo4j Chat Search API và trạng thái hội thoại chỉ được giữ trong phiên trình duyệt.

Khi backend trả `query.intent: "locate_event"`, giao diện dùng `location_events`, mỗi `event_key` là một thẻ sự kiện. Hiển thị đầy đủ chuỗi địa điểm với nhãn “Địa điểm được nhắc tới” và đối chiếu `source_ids` trong cùng sự kiện để chỉ ra bài viết cung cấp từng địa điểm.
Danh sách “Bài viết nguồn” có thể mở rộng để xem các dòng tên nguồn (`source_name`, dự phòng bằng `post_platform`), thời gian `posted_at` theo giờ Việt Nam và biểu tượng liên kết gọn nhẹ. Thời gian thiếu hoặc không hợp lệ được ẩn; thời gian không có múi giờ được hiểu là UTC như các kết quả sự kiện khác. Nội dung nguồn xuất hiện khi rê chuột vào tên nguồn. Địa điểm được nhắc tới chưa xác nhận là nơi xảy ra sự kiện; chỉ báo thiếu địa điểm khi `location_status` là `unknown`.
Khi danh sách sự kiện rỗng, hiển thị `answer` hoặc trạng thái không tìm thấy. Không render `location_candidates`. Nhánh này dùng `POST /api/chat` với `limit: 10` sự kiện, không có nút phân trang hoặc tìm sự kiện liên quan.

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
