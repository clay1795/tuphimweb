# 🚀 Hướng dẫn Deploy TuPhim Distribution Web lên VPS

## 🖥️ Server miễn phí được đề xuất

| Server | Gói miễn phí | Phù hợp |
|--------|-------------|---------|
| **Oracle Cloud Always Free** ⭐ | 2 x AMD VM 1GB RAM, **vĩnh viễn** | ✅ Tốt nhất — không giới hạn thời gian |
| **Railway.app** | $5 credit/tháng | ✅ Deploy nhanh nhất |
| **Render.com** | 750h/tháng (ngủ sau 15p) | ⚠️ Chậm khi wakeup |

> **Khuyến nghị: Dùng Oracle Cloud** — tạo tài khoản free tại https://oracle.com/cloud/free

---

## Bước 1: Chuẩn bị VPS (Ubuntu 22.04)

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PM2
sudo npm install -g pm2

# Cài Nginx
sudo apt install -y nginx

# Cài Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Cài zsign (để ký IPA)
sudo apt install -y clang git libssl-dev
git clone https://github.com/zhlynn/zsign.git /tmp/zsign
cd /tmp/zsign && make && sudo cp zsign /usr/local/bin/
zsign -v  # kiểm tra
```

---

## Bước 2: Upload code lên server

```bash
# Trên máy local — tạo zip (bỏ qua node_modules và storage)
cd d:\IT\TuPhim-Distribution-Web
# Zip toàn bộ thư mục rồi upload qua SCP/FileZilla

# Trên server — giải nén
sudo mkdir -p /var/www/tuphim
cd /var/www/tuphim
# Giải nén file zip vào đây

# Hoặc dùng git:
# git init && git remote add origin <your-repo-url>
# git pull origin main
```

---

## Bước 3: Copy certificate files

```bash
# Upload cert_legacy.p12 và cert.mobileprovision lên server
# Đặt tại /var/www/tuphim/certificate/

mkdir -p /var/www/tuphim/certificate
# Upload qua SCP:
# scp "d:\IT\TuPhim-Ophim-Backup\certificate\cert_legacy.p12" user@server:/var/www/tuphim/certificate/
# scp "d:\IT\TuPhim-Ophim-Backup\certificate\cert.mobileprovision" user@server:/var/www/tuphim/certificate/
```

---

## Bước 4: Cấu hình .env

```bash
cd /var/www/tuphim
node deploy/setup.js
# Nhập: username, password admin, admin URL path, domain
# File .env sẽ tự động được tạo
```

---

## Bước 5: Cài dependencies và test

```bash
cd /var/www/tuphim/server
npm install

# Test chạy thử
node server.js
# Kiểm tra: curl http://localhost:3001/api/health
# Nên thấy: {"status":"ok","version":"2.1.0"}

# Ctrl+C để thoát
```

---

## Bước 6: Cấu hình Nginx

```bash
# Copy config
sudo cp /var/www/tuphim/deploy/nginx.conf /etc/nginx/sites-available/tuphim.online
sudo ln -s /etc/nginx/sites-available/tuphim.online /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tạm thời comment SSL (để test trước khi có cert)
sudo nano /etc/nginx/sites-available/tuphim.online
# Comment 2 dòng ssl_certificate và thêm listen 80 vào server block 443

# Test config
sudo nginx -t

# Nếu ok, reload
sudo systemctl reload nginx
```

---

## Bước 7: Trỏ DNS tuphim.online

Vào DNS manager của domain provider:
```
Type: A Record
Host: @ (root domain)
Value: <IP của VPS>
TTL: 300

Type: A Record  
Host: www
Value: <IP của VPS>
TTL: 300
```

Đợi DNS propagate (5–30 phút), sau đó test: `curl http://tuphim.online`

---

## Bước 8: Cài SSL với Certbot

```bash
# Sau khi DNS đã trỏ đúng
sudo certbot --nginx -d tuphim.online -d www.tuphim.online

# Certbot sẽ tự động cập nhật nginx.conf với SSL
# Auto-renew đã được cài tự động

# Restore full SSL config
sudo nginx -t && sudo systemctl reload nginx
```

---

## Bước 9: Chạy với PM2

```bash
cd /var/www/tuphim

# Tạo thư mục logs
mkdir -p logs

# Start với PM2
pm2 start deploy/ecosystem.config.js

# Auto-start khi server reboot
pm2 startup
pm2 save

# Kiểm tra
pm2 status
pm2 logs tuphim
```

---

## Bước 10: Kiểm tra hoàn tất ✅

```bash
# API health
curl https://tuphim.online/api/health

# Test login admin
curl -X POST https://tuphim.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_admin","password":"your_password"}'
```

Mở browser:
- 🌐 Trang chính: `https://tuphim.online`
- 🔐 Admin login: `https://tuphim.online/qltv-tp8x2024/login.html`
- 📊 Admin panel: tự redirect sau login

---

## Lệnh quản lý PM2

```bash
pm2 status          # Xem trạng thái
pm2 restart tuphim  # Restart server
pm2 logs tuphim     # Xem logs
pm2 stop tuphim     # Dừng server
```

---

## Cài zsign để ký IPA thật

Khi ký IPA thật (không phải demo mode):

```bash
# Kiểm tra zsign hoạt động
zsign -v

# Test ký thủ công (thay bằng đường dẫn thật)
zsign -k /var/www/tuphim/certificate/cert_legacy.p12 -p 1 \
      -m /var/www/tuphim/certificate/cert.mobileprovision \
      -o /tmp/signed.ipa -z 9 /var/www/tuphim/storage/ipa/yourapp.ipa
```

Nếu ký thành công → server sẽ tự dùng zsign cho mọi request UDID tiếp theo.

---

## Cấu trúc thư mục trên server

```
/var/www/tuphim/
├── index.html              ← Trang cài đặt
├── assets/logo.png         ← Logo TuPhim
├── scripts/app.js
├── styles/main.css
├── qltv-tp8x2024/          ← Admin panel (URL bí mật)
│   ├── login.html
│   └── index.html
├── admin/admin.css
├── admin/admin.js
├── certificate/            ← cert_legacy.p12 + cert.mobileprovision
├── server/                 ← Node.js backend
│   ├── server.js
│   ├── .env               ← MẬT KHẨU — KHÔNG CHIA SẺ
│   ├── data/              ← JSON database
│   └── storage/           ← IPA, APK files
├── deploy/
│   ├── nginx.conf
│   └── ecosystem.config.js
└── logs/
```
