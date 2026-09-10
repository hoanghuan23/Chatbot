# Direct và related events

`POST /api/chat` và `GET /api/search` trả kết quả direct. Entity phải khớp
**toàn bộ** tên hoặc alias đã chuẩn hóa (không phân biệt hoa/thường, dấu và
khoảng trắng trong tên), có `HAS_PARTICIPANT` từ EventMention/Event hoặc
`MENTIONS` từ Post chỉ chứa một event. Bài có dữ liệu ở cả hai schema được đếm
bằng các event khác nhau, không đếm hai lần cùng event. Truy vấn không có bộ
lọc entity/location vẫn trả danh sách sự kiện mới nhất như trước.

## Lấy sự kiện liên quan

Gọi `POST /api/search/related` với `query` từ response tìm kiếm chính:

```json
{
  "query": {"location": "Hà Nội", "entity": null, "hours": 48},
  "limit": 10,
  "cursor": null
}
```

Có thể chỉ truyền `entity` thay cho `location`. Ít nhất một trường phải không
rỗng. Nếu có cả hai, cả hai bộ lọc phải thỏa. Danh sách entity vẫn dùng OR.
Related tìm qua tên entity chứa từ khóa, description/content hoặc một cạnh
`PART_OF`/`IN_REGION` giữa các LOCATION. Bằng chứng chỉ thuộc bài viết được dùng
khi bài có một event. Event đã thuộc tập direct của cùng truy vấn và khoảng
thời gian bị loại khỏi related trên mọi trang, kể cả có bằng chứng ở nguồn khác.

Mỗi phần tử `results` có `relation_reasons`; direct trả `[]`, related trả ít
nhất một lý do. Ví dụ một lý do trong kết quả về Đại học Y Hà Nội:

```json
{
  "kind": "entity_name_match",
  "query_field": "location",
  "query_term": "hà nội",
  "via_entity": {
    "id": "<entity_id, hoặc elementId nếu thiếu entity_id>",
    "name": "Đại học Y Hà Nội",
    "type": "ORGANIZATION"
  },
  "evidence_field": "entity.name",
  "excerpt": null,
  "post": {"platform": "facebook", "platform_id": "<id bài viết>"},
  "relationship": null,
  "label": "Liên quan qua: Đại học Y Hà Nội"
}
```

- `entity_name_match`: có entity trung gian thực sự trong graph.
- `text_match`: `via_entity` là `null`, `excerpt` chứa từ khóa trong văn bản
  gốc; `evidence_field` là `mention.description`, `event.description` hoặc
  `post.content`. Label ghi rõ khớp từ khóa trong nội dung/mô tả.
- `location_hierarchy`: `via_entity` là địa điểm con, `relationship` là
  `PART_OF` hoặc `IN_REGION`; entity cha khớp chính xác từ khóa truy vấn.

`query_term` là từ khóa đã chuẩn hóa. Lý do được hợp nhất và loại trùng giữa
các nguồn/schema; mỗi lý do vẫn giữ định danh bài nguồn. Frontend có thể dùng
`label` để hiển thị, hoặc nhóm theo `via_entity.id` và giữ các bằng chứng chi tiết.

## Phân trang

Giữ nguyên `has_more`, `next_cursor`, `start_index`. Cursor phiên bản **2**;
related dùng scope `related_events`. Client chuyển nguyên cursor về đúng
endpoint cùng query; không cần giải mã. Cursor cũ, thiếu phiên bản hoặc sai
luồng trả HTTP 400 và yêu cầu tìm kiếm lại. Request thiếu cả location và entity
cho related trả HTTP 422.

Không có migration dữ liệu. Quan hệ trực tiếp đã lưu trong graph tiếp tục là
bằng chứng direct; thay đổi này không sửa quan hệ extraction bị gán sai.
